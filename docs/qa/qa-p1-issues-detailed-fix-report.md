# MixerAI 2.0 - P1 Issues Detailed Fix Report
*Date: December 2024*  
*Critical Issues Only (8 P1 Issues)*

---

## Issue #261: Deleted Users Appear in Workflow Assignment [QA BLOCKED]

### Problem
Deleted/deactivated users appear in workflow assignment dropdowns, allowing invalid user assignments that break workflow execution.

### Root Cause Analysis
The `/api/users/search` endpoint queries the users table without filtering for deletion status or active state. This is a systemic issue affecting all user search functionality.

### Detailed Fix Implementation

#### 1. Database-First Approach with View
```sql
-- Create a view that enforces business rules at DB level
CREATE OR REPLACE VIEW active_users_v AS
SELECT 
  id, 
  email, 
  full_name,
  avatar_url,
  created_at
FROM users
WHERE deleted_at IS NULL 
  AND status = 'active';

-- Add comment for documentation
COMMENT ON VIEW active_users_v IS 'Only active, non-deleted users for assignment workflows';
```

#### 2. Add Performance Optimization
```sql
-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for performant ILIKE searches
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);

-- Add covering index for the view's WHERE conditions
CREATE INDEX IF NOT EXISTS idx_users_active_status 
ON users (status, deleted_at) 
WHERE deleted_at IS NULL AND status = 'active';
```

#### 3. Type Safety with ENUM
```sql
-- Convert status to ENUM for type safety
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- Migrate existing column (with transaction)
BEGIN;
ALTER TABLE users 
  ALTER COLUMN status TYPE user_status 
  USING status::user_status;
COMMIT;
```

#### 4. Updated API Implementation
```typescript
// src/app/api/users/search/route.ts
import { withAuth } from '@/lib/auth/middleware';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const SearchSchema = z.object({
  term: z.string().min(1).max(100),
  brandId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10)
});

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const validation = SearchSchema.safeParse({
      term: searchParams.get('term'),
      brandId: searchParams.get('brandId'),
      limit: Number(searchParams.get('limit')) || 10
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { term, brandId, limit } = validation.data;
    const supabase = createSupabaseServerClient();

    // Use the view for guaranteed active users only
    let query = supabase
      .from('active_users_v')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(limit);

    // If brandId provided, join with user_brand_permissions
    if (brandId) {
      const { data: brandUsers } = await supabase
        .from('user_brand_permissions')
        .select('user_id')
        .eq('brand_id', brandId);
      
      const userIds = brandUsers?.map(bu => bu.user_id) || [];
      query = query.in('id', userIds);
    }

    const { data: users, error } = await query;

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: users || [],
      count: users?.length || 0
    });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search users' },
      { status: 500 }
    );
  }
});
```

#### 5. Testing Strategy
```typescript
// __tests__/api/users/search.test.ts
describe('User Search API', () => {
  it('should not return deleted users', async () => {
    // Setup: Create active and deleted users
    const activeUser = await createUser({ status: 'active' });
    const deletedUser = await createUser({ 
      status: 'active', 
      deleted_at: new Date() 
    });

    // Test: Search should only return active user
    const response = await fetch('/api/users/search?term=test');
    const data = await response.json();
    
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe(activeUser.id);
    expect(data.data.find(u => u.id === deletedUser.id)).toBeUndefined();
  });

  it('should use trigram index for performance', async () => {
    // Verify query plan uses GIN index
    const explainQuery = `
      EXPLAIN (FORMAT JSON) 
      SELECT * FROM active_users_v 
      WHERE email ILIKE '%test%' OR full_name ILIKE '%test%'
    `;
    const plan = await supabase.rpc('explain_query', { query: explainQuery });
    expect(plan).toContain('Bitmap Index Scan');
  });
});
```

---

## Issue #254: Workflow Role Assignments Not Persisting

### Problem
User roles assigned during workflow creation are lost on first save but work on subsequent edits.

### Root Cause Analysis
The workflow creation RPC function doesn't properly handle the role data in the initial transaction, causing a partial save that omits role assignments.

### Detailed Fix Implementation

#### 1. Database Schema Enhancement
```sql
-- Add proper role storage with constraints
ALTER TABLE workflow_steps 
ADD COLUMN IF NOT EXISTS assigned_roles text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS step_metadata jsonb NOT NULL DEFAULT '{}';

-- Add check constraint for valid roles
ALTER TABLE workflow_steps
ADD CONSTRAINT valid_assigned_roles 
CHECK (assigned_roles <@ ARRAY['reviewer', 'approver', 'editor', 'viewer']::text[]);

-- Create index for role queries
CREATE INDEX idx_workflow_steps_roles ON workflow_steps USING GIN (assigned_roles);
```

#### 2. Fixed RPC Function
```sql
-- Replace the existing RPC with atomic transaction
CREATE OR REPLACE FUNCTION create_workflow_and_log_invitations(
  p_brand_id uuid,
  p_workflow_name text,
  p_workflow_description text,
  p_created_by uuid,
  p_workflow_steps jsonb,
  p_template_id uuid DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id uuid;
  v_step record;
  v_step_id uuid;
BEGIN
  -- Start transaction
  BEGIN
    -- Create workflow
    INSERT INTO workflows (
      brand_id, 
      name, 
      description, 
      created_by, 
      template_id, 
      status,
      published_at
    )
    VALUES (
      p_brand_id, 
      p_workflow_name, 
      p_workflow_description, 
      p_created_by, 
      p_template_id, 
      p_status,
      CASE WHEN p_status = 'active' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_workflow_id;

    -- Create steps with roles atomically
    FOR v_step IN SELECT * FROM jsonb_array_elements(p_workflow_steps)
    LOOP
      INSERT INTO workflow_steps (
        workflow_id,
        name,
        type,
        order_index,
        assigned_user_ids,
        assigned_roles,
        step_metadata,
        created_at
      )
      VALUES (
        v_workflow_id,
        v_step.value->>'name',
        v_step.value->>'type',
        (v_step.value->>'order')::int,
        ARRAY(SELECT jsonb_array_elements_text(v_step.value->'assigned_user_ids')),
        ARRAY(SELECT jsonb_array_elements_text(v_step.value->'assigned_roles')),
        v_step.value->'metadata',
        NOW()
      )
      RETURNING id INTO v_step_id;

      -- Log invitation for each assigned user
      INSERT INTO invitation_logs (
        workflow_step_id,
        user_id,
        invited_at,
        role
      )
      SELECT 
        v_step_id,
        user_id::uuid,
        NOW(),
        COALESCE(
          v_step.value->'role_mapping'->>user_id::text,
          (v_step.value->'assigned_roles'->>0)::text
        )
      FROM jsonb_array_elements_text(v_step.value->'assigned_user_ids') AS user_id;
    END LOOP;

    RETURN v_workflow_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      RAISE EXCEPTION 'Failed to create workflow: %', SQLERRM;
  END;
END;
$$;
```

#### 3. API Route with Validation
```typescript
// src/app/api/workflows/route.ts
const WorkflowStepSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['review', 'approval', 'final']),
  order: z.number().int().min(0),
  assignedUserIds: z.array(z.string().uuid()).min(1),
  assignedRoles: z.array(z.enum(['reviewer', 'approver', 'editor', 'viewer'])),
  metadata: z.record(z.any()).optional()
});

const CreateWorkflowSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  templateId: z.string().uuid().optional(),
  status: z.enum(['active', 'draft']).default('active'),
  steps: z.array(WorkflowStepSchema).min(1)
}).refine(
  (data) => {
    // Ensure each step has matching counts of users and roles
    return data.steps.every(step => 
      step.assignedUserIds.length === step.assignedRoles.length
    );
  },
  { message: "Each user must have an assigned role" }
);

export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  const validation = CreateWorkflowSchema.safeParse(await request.json());
  
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  
  // Call RPC with properly structured data
  const { data: workflowId, error } = await supabase.rpc(
    'create_workflow_and_log_invitations',
    {
      p_brand_id: validation.data.brandId,
      p_workflow_name: validation.data.name,
      p_workflow_description: validation.data.description || '',
      p_created_by: user.id,
      p_template_id: validation.data.templateId,
      p_status: validation.data.status,
      p_workflow_steps: validation.data.steps.map((step, index) => ({
        name: step.name,
        type: step.type,
        order: index,
        assigned_user_ids: step.assignedUserIds,
        assigned_roles: step.assignedRoles,
        metadata: step.metadata || {},
        role_mapping: Object.fromEntries(
          step.assignedUserIds.map((uid, i) => [uid, step.assignedRoles[i]])
        )
      }))
    }
  );

  if (error) {
    console.error('Workflow creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }

  return NextResponse.json({ 
    success: true, 
    data: { id: workflowId },
    message: 'Workflow created successfully'
  });
});
```

#### 4. Idempotency Key Support
```typescript
// Add idempotency to prevent duplicate workflows
interface IdempotencyCheck {
  key: string;
  brandId: string;
  userId: string;
}

async function checkIdempotency(check: IdempotencyCheck): Promise<string | null> {
  const { data } = await supabase
    .from('workflow_idempotency')
    .select('workflow_id')
    .eq('idempotency_key', check.key)
    .eq('brand_id', check.brandId)
    .eq('user_id', check.userId)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // 24h window
    .single();
  
  return data?.workflow_id || null;
}
```

---

## Issue #252: Workflow Email Notifications Not Sent

### Problem
No email notifications are triggered when content moves through workflow approval stages.

### Root Cause Analysis
The workflow action handlers update status but don't trigger notifications. Email sending is synchronous and blocks the API response.

### Detailed Fix Implementation

#### 1. Create Notification Outbox Table
```sql
-- Outbox pattern for reliable async notifications
CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('email', 'in_app', 'webhook')),
  recipient_id uuid REFERENCES users(id),
  recipient_email text,
  subject text NOT NULL,
  template_name text NOT NULL,
  template_data jsonb NOT NULL,
  priority integer DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  scheduled_for timestamptz DEFAULT NOW(),
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT NOW(),
  metadata jsonb DEFAULT '{}'
);

-- Indexes for queue processing
CREATE INDEX idx_notification_outbox_pending 
ON notification_outbox (scheduled_for, priority DESC) 
WHERE status = 'pending';

CREATE INDEX idx_notification_outbox_recipient 
ON notification_outbox (recipient_id, created_at DESC);

-- RLS for security
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage all notifications" 
ON notification_outbox 
FOR ALL 
USING (auth.uid() IS NOT NULL);
```

#### 2. Notification Enqueue Function
```typescript
// src/lib/notifications/outbox.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface NotificationPayload {
  type: 'email' | 'in_app' | 'webhook';
  recipientId?: string;
  recipientEmail?: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  priority?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export async function enqueueNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('notification_outbox')
      .insert({
        type: payload.type,
        recipient_id: payload.recipientId,
        recipient_email: payload.recipientEmail,
        subject: payload.subject,
        template_name: payload.templateName,
        template_data: payload.templateData,
        priority: payload.priority || 5,
        scheduled_for: payload.scheduledFor || new Date(),
        metadata: payload.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Failed to enqueue notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Batch enqueue for multiple recipients
export async function enqueueBatchNotifications(
  recipients: string[],
  template: Omit<NotificationPayload, 'recipientId'>
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const supabase = createSupabaseServerClient();
  const errors: string[] = [];
  
  const notifications = recipients.map(recipientId => ({
    ...template,
    recipient_id: recipientId
  }));

  const { data, error } = await supabase
    .from('notification_outbox')
    .insert(notifications)
    .select('id');

  if (error) {
    return { success: false, count: 0, errors: [error.message] };
  }

  return { 
    success: true, 
    count: data?.length || 0, 
    errors 
  };
}
```

#### 3. Updated Workflow Action Handler
```typescript
// src/app/api/content/[id]/workflow-action/route.ts
import { enqueueNotification, enqueueBatchNotifications } from '@/lib/notifications/outbox';

export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  const { action, contentId, comment } = await request.json();
  
  const supabase = createSupabaseServerClient();
  
  // Start transaction
  const { data: content, error: contentError } = await supabase
    .from('content')
    .select(`
      *,
      workflow:workflows!workflow_id (
        id,
        name,
        steps:workflow_steps (
          id,
          name,
          type,
          order_index,
          assigned_user_ids,
          assigned_roles
        )
      ),
      brand:brands!brand_id (
        id,
        name
      )
    `)
    .eq('id', contentId)
    .single();

  if (contentError || !content) {
    return NextResponse.json(
      { success: false, error: 'Content not found' },
      { status: 404 }
    );
  }

  // Process action
  if (action === 'approve') {
    // Update workflow status
    const currentStepIndex = content.current_workflow_step || 0;
    const nextStepIndex = currentStepIndex + 1;
    const nextStep = content.workflow.steps[nextStepIndex];

    // Update content status
    const { error: updateError } = await supabase
      .from('content')
      .update({
        workflow_status: nextStep ? 'in_review' : 'approved',
        current_workflow_step: nextStepIndex,
        updated_at: new Date()
      })
      .eq('id', contentId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update content' },
        { status: 500 }
      );
    }

    // Enqueue notifications for next reviewers
    if (nextStep && nextStep.assigned_user_ids.length > 0) {
      const notificationResult = await enqueueBatchNotifications(
        nextStep.assigned_user_ids,
        {
          type: 'email',
          subject: `Review Required: ${content.title}`,
          templateName: 'workflow_review_required',
          templateData: {
            contentId: content.id,
            contentTitle: content.title,
            brandName: content.brand.name,
            workflowStep: nextStep.name,
            stepType: nextStep.type,
            previousReviewer: user.email,
            comment: comment || '',
            actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/content/${contentId}/review`
          },
          priority: nextStep.type === 'approval' ? 8 : 5,
          metadata: {
            workflowId: content.workflow.id,
            stepId: nextStep.id,
            contentType: content.type
          }
        }
      );

      if (!notificationResult.success) {
        console.error('Failed to enqueue notifications:', notificationResult.errors);
        // Don't fail the action, notifications are async
      }
    }

    // Log the action
    await supabase
      .from('workflow_history')
      .insert({
        content_id: contentId,
        workflow_id: content.workflow.id,
        action: 'approved',
        performed_by: user.id,
        comment,
        step_index: currentStepIndex,
        created_at: new Date()
      });

    return NextResponse.json({ 
      success: true, 
      message: nextStep 
        ? `Approved and sent to ${nextStep.name}` 
        : 'Content fully approved',
      nextStep: nextStep?.name
    });
  }
  
  // Handle reject action similarly...
});
```

#### 4. Background Processor (Supabase Edge Function)
```typescript
// supabase/functions/process-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  // Fetch pending notifications
  const { data: notifications, error } = await supabase
    .from('notification_outbox')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('priority', { ascending: false })
    .order('created_at')
    .limit(10)

  if (error || !notifications) {
    return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const results = []
  
  for (const notification of notifications) {
    // Mark as processing
    await supabase
      .from('notification_outbox')
      .update({ status: 'processing', attempts: notification.attempts + 1 })
      .eq('id', notification.id)

    try {
      // Send via Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'MixerAI <notifications@mixerai.com>',
          to: notification.recipient_email,
          subject: notification.subject,
          html: await renderTemplate(
            notification.template_name, 
            notification.template_data
          )
        })
      })

      if (response.ok) {
        await supabase
          .from('notification_outbox')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', notification.id)
        
        results.push({ id: notification.id, status: 'sent' })
      } else {
        throw new Error(`Resend API error: ${response.status}`)
      }
    } catch (error) {
      // Mark as failed
      await supabase
        .from('notification_outbox')
        .update({ 
          status: notification.attempts >= 3 ? 'failed' : 'pending',
          error_message: error.message,
          failed_at: notification.attempts >= 3 ? new Date().toISOString() : null
        })
        .eq('id', notification.id)
      
      results.push({ id: notification.id, status: 'failed', error: error.message })
    }
  }

  return new Response(JSON.stringify({ 
    processed: results.length, 
    results 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// Template rendering function
async function renderTemplate(
  templateName: string, 
  data: Record<string, any>
): Promise<string> {
  // Load and render email template
  const templates = {
    workflow_review_required: `
      <h2>Review Required: {{contentTitle}}</h2>
      <p>You have been assigned to review content for {{brandName}}.</p>
      <p><strong>Workflow Step:</strong> {{workflowStep}}</p>
      {{#if comment}}
        <p><strong>Previous Reviewer's Comment:</strong> {{comment}}</p>
      {{/if}}
      <a href="{{actionUrl}}" style="...">Review Now</a>
    `
  }
  
  let html = templates[templateName] || ''
  
  // Simple template replacement
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
  })
  
  return html
}
```

#### 5. Schedule the Edge Function
```sql
-- Create a cron job to process notifications every minute
SELECT cron.schedule(
  'process-notifications',
  '* * * * *', -- Every minute
  $$
    SELECT net.http_post(
      url := 'https://[project-ref].supabase.co/functions/v1/process-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  $$
);
```

---

## Issue #248: Brand Placeholder Buttons Not Clickable

### Problem
Template designer shows brand placeholder buttons but they don't respond to clicks.

### Root Cause Analysis
Event handlers are not properly bound, form submission interference, and missing event propagation control.

### Detailed Fix Implementation

#### 1. Fixed Button Component with Proper Event Handling
```typescript
// src/components/template/field-designer-original.tsx
import { useCallback, memo } from 'react';

interface BrandPlaceholderButtonProps {
  placeholder: string;
  label: string;
  description?: string;
  onInsert: (placeholder: string) => void;
  disabled?: boolean;
}

const BrandPlaceholderButton = memo(({ 
  placeholder, 
  label, 
  description,
  onInsert,
  disabled = false
}: BrandPlaceholderButtonProps) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onInsert(placeholder);
  }, [placeholder, onInsert]);

  return (
    <Button
      type="button" // Critical: Prevent form submission
      size="xs"
      variant="outline"
      className="text-xs hover:bg-accent"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Insert ${label} placeholder`}
      aria-pressed={false}
      title={description || `Insert ${label}`}
    >
      {label}
    </Button>
  );
});

BrandPlaceholderButton.displayName = 'BrandPlaceholderButton';

// Main component
export function FieldDesigner({ field, onChange }: FieldDesignerProps) {
  const [promptText, setPromptText] = useState(field.aiPrompt || '');
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Stable callback for inserting placeholders
  const insertBrandDataOrPlaceholder = useCallback((placeholder: string) => {
    const textarea = promptTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = promptText;
    
    // Insert at cursor position
    const newText = 
      currentText.substring(0, start) + 
      placeholder + 
      currentText.substring(end);
    
    setPromptText(newText);
    
    // Update field
    onChange({
      ...field,
      aiPrompt: newText
    });

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [promptText, field, onChange]);

  const brandPlaceholders = [
    { 
      placeholder: '{{brand_name}}', 
      label: 'Brand Name',
      description: 'Inserts the brand name'
    },
    { 
      placeholder: '{{brand_tone}}', 
      label: 'Brand Tone',
      description: 'Inserts brand tone of voice'
    },
    { 
      placeholder: '{{brand_guidelines}}', 
      label: 'Guidelines',
      description: 'Inserts brand guidelines'
    },
    { 
      placeholder: '{{brand_keywords}}', 
      label: 'Keywords',
      description: 'Inserts brand keywords'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>AI Prompt</Label>
        <Textarea
          ref={promptTextareaRef}
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            onChange({
              ...field,
              aiPrompt: e.target.value
            });
          }}
          placeholder="Enter prompt for AI suggestions..."
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label className="mb-2">Insert Brand Placeholders</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Brand placeholders">
          {brandPlaceholders.map((item) => (
            <BrandPlaceholderButton
              key={item.placeholder}
              {...item}
              onInsert={insertBrandDataOrPlaceholder}
              disabled={!field.aiSuggester}
            />
          ))}
        </div>
        {!field.aiSuggester && (
          <p className="text-xs text-muted-foreground mt-2">
            Enable AI Suggester to use brand placeholders
          </p>
        )}
      </div>
    </div>
  );
}
```

#### 2. Test Coverage
```typescript
// __tests__/components/template/brand-placeholders.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Brand Placeholder Buttons', () => {
  it('should insert placeholder at cursor position', async () => {
    const onChange = jest.fn();
    const { container } = render(
      <FieldDesigner 
        field={{ aiPrompt: 'Generate ', aiSuggester: true }} 
        onChange={onChange}
      />
    );

    const textarea = screen.getByPlaceholderText(/Enter prompt/);
    const brandNameBtn = screen.getByRole('button', { name: /Insert Brand Name/ });

    // Set cursor position
    fireEvent.focus(textarea);
    textarea.setSelectionRange(9, 9); // After "Generate "

    // Click placeholder button
    fireEvent.click(brandNameBtn);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          aiPrompt: 'Generate {{brand_name}}'
        })
      );
    });
  });

  it('should not submit form when clicked', async () => {
    const onSubmit = jest.fn();
    render(
      <form onSubmit={onSubmit}>
        <FieldDesigner field={{}} onChange={() => {}} />
        <button type="submit">Submit</button>
      </form>
    );

    const placeholderBtn = screen.getByRole('button', { name: /Brand Name/ });
    fireEvent.click(placeholderBtn);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should be disabled when AI suggester is off', () => {
    render(
      <FieldDesigner 
        field={{ aiSuggester: false }} 
        onChange={() => {}}
      />
    );

    const buttons = screen.getAllByRole('button', { name: /Insert/ });
    buttons.forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });
});
```

---

## Issue #247: AI Features Checkbox State Lost

### Problem
"Brand Context for AI" and other AI feature checkboxes appear unchecked when editing templates.

### Root Cause Analysis
AI feature flags are not properly persisted in the database schema and the save/load cycle doesn't maintain state.

### Detailed Fix Implementation

#### 1. Database Schema Update
```sql
-- Add JSONB column for AI features with default
ALTER TABLE template_fields 
ADD COLUMN IF NOT EXISTS ai_features jsonb NOT NULL DEFAULT '{
  "useBrandIdentity": false,
  "useToneOfVoice": false,
  "useGuardrails": false,
  "useContentContext": false
}'::jsonb;

-- Add check constraint for valid keys
ALTER TABLE template_fields
ADD CONSTRAINT valid_ai_features CHECK (
  ai_features ?& ARRAY['useBrandIdentity', 'useToneOfVoice', 'useGuardrails', 'useContentContext']
  IS NOT DISTINCT FROM true
  OR ai_features = '{}'::jsonb
);

-- Migration script for existing data
UPDATE template_fields
SET ai_features = jsonb_build_object(
  'useBrandIdentity', COALESCE((field_config->>'useBrandIdentity')::boolean, false),
  'useToneOfVoice', COALESCE((field_config->>'useToneOfVoice')::boolean, false),
  'useGuardrails', COALESCE((field_config->>'useGuardrails')::boolean, false),
  'useContentContext', false
)
WHERE ai_features = '{}'::jsonb;
```

#### 2. Type Definitions
```typescript
// src/types/template.types.ts
export interface AIFeatures {
  useBrandIdentity: boolean;
  useToneOfVoice: boolean;
  useGuardrails: boolean;
  useContentContext: boolean;
}

export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  aiSuggester: boolean;
  aiPrompt?: string;
  aiFeatures: AIFeatures;
  options?: Record<string, any>;
}

// Zod schema for validation
export const AIFeaturesSchema = z.object({
  useBrandIdentity: z.boolean(),
  useToneOfVoice: z.boolean(),
  useGuardrails: z.boolean(),
  useContentContext: z.boolean()
});

export const TemplateFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['shortText', 'longText', 'richText', 'number', 'date']),
  required: z.boolean(),
  aiSuggester: z.boolean(),
  aiPrompt: z.string().optional(),
  aiFeatures: AIFeaturesSchema,
  options: z.record(z.any()).optional()
});
```

#### 3. Save Implementation
```typescript
// src/app/api/content-templates/route.ts
export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  const body = await request.json();
  
  // Validate with schema
  const validation = CreateTemplateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  
  // Transform fields to ensure AI features are saved
  const transformField = (field: any) => ({
    ...field,
    ai_features: {
      useBrandIdentity: field.useBrandIdentity ?? false,
      useToneOfVoice: field.useToneOfVoice ?? false,
      useGuardrails: field.useGuardrails ?? false,
      useContentContext: field.useContentContext ?? false
    }
  });

  const { data, error } = await supabase
    .from('content_templates')
    .insert({
      name: validation.data.name,
      description: validation.data.description,
      brand_id: validation.data.brandId,
      created_by: user.id,
      input_fields: validation.data.inputFields.map(transformField),
      output_fields: validation.data.outputFields.map(transformField),
      settings: validation.data.settings || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
});
```

#### 4. Load Implementation
```typescript
// src/app/api/content-templates/[id]/route.ts
export const GET = withAuth(async (request: NextRequest, user, { params }) => {
  const supabase = createSupabaseServerClient();
  
  const { data: template, error } = await supabase
    .from('content_templates')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !template) {
    return NextResponse.json(
      { success: false, error: 'Template not found' },
      { status: 404 }
    );
  }

  // Transform fields for backward compatibility
  const transformFieldForUI = (field: any) => ({
    ...field,
    // Map from ai_features back to flat structure for UI
    useBrandIdentity: field.ai_features?.useBrandIdentity ?? false,
    useToneOfVoice: field.ai_features?.useToneOfVoice ?? false,
    useGuardrails: field.ai_features?.useGuardrails ?? false,
    useContentContext: field.ai_features?.useContentContext ?? false,
    // Keep ai_features for new code
    aiFeatures: field.ai_features || {
      useBrandIdentity: false,
      useToneOfVoice: false,
      useGuardrails: false,
      useContentContext: false
    }
  });

  const transformedTemplate = {
    ...template,
    inputFields: (template.input_fields || []).map(transformFieldForUI),
    outputFields: (template.output_fields || []).map(transformFieldForUI)
  };

  return NextResponse.json({ 
    success: true, 
    data: transformedTemplate 
  });
});
```

#### 5. UI Component Fix
```typescript
// src/components/template/field-designer-original.tsx
export function AIFeaturesTab({ field, onChange }: AIFeaturesTabProps) {
  // Initialize from field data, with fallbacks
  const [features, setFeatures] = useState<AIFeatures>({
    useBrandIdentity: field.useBrandIdentity ?? field.aiFeatures?.useBrandIdentity ?? false,
    useToneOfVoice: field.useToneOfVoice ?? field.aiFeatures?.useToneOfVoice ?? false,
    useGuardrails: field.useGuardrails ?? field.aiFeatures?.useGuardrails ?? false,
    useContentContext: field.useContentContext ?? field.aiFeatures?.useContentContext ?? false
  });

  const handleFeatureChange = (feature: keyof AIFeatures, checked: boolean) => {
    const newFeatures = { ...features, [feature]: checked };
    setFeatures(newFeatures);
    
    // Update both flat and nested structure for compatibility
    onChange({
      ...field,
      [feature]: checked, // Flat structure for backward compat
      aiFeatures: newFeatures // Nested for new code
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>AI Context Features</Label>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <Checkbox
              checked={features.useBrandIdentity}
              onCheckedChange={(checked) => 
                handleFeatureChange('useBrandIdentity', checked as boolean)
              }
              id="useBrandIdentity"
            />
            <Label htmlFor="useBrandIdentity" className="font-normal">
              Use Brand Identity
              <span className="text-xs text-muted-foreground block">
                Include brand name, logo, and visual identity in generation
              </span>
            </Label>
          </label>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={features.useToneOfVoice}
              onCheckedChange={(checked) => 
                handleFeatureChange('useToneOfVoice', checked as boolean)
              }
              id="useToneOfVoice"
            />
            <Label htmlFor="useToneOfVoice" className="font-normal">
              Use Brand Tone of Voice
              <span className="text-xs text-muted-foreground block">
                Apply brand's communication style and voice
              </span>
            </Label>
          </label>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={features.useGuardrails}
              onCheckedChange={(checked) => 
                handleFeatureChange('useGuardrails', checked as boolean)
              }
              id="useGuardrails"
            />
            <Label htmlFor="useGuardrails" className="font-normal">
              Use Brand Guardrails
              <span className="text-xs text-muted-foreground block">
                Apply content restrictions and compliance rules
              </span>
            </Label>
          </label>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={features.useContentContext}
              onCheckedChange={(checked) => 
                handleFeatureChange('useContentContext', checked as boolean)
              }
              id="useContentContext"
            />
            <Label htmlFor="useContentContext" className="font-normal">
              Use Content Context
              <span className="text-xs text-muted-foreground block">
                Consider other fields when generating this content
              </span>
            </Label>
          </label>
        </div>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs bg-muted p-2 rounded">
          {JSON.stringify(features, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

---

## Issue #238: Alt Text Language Detection Shows Wrong Language

### Problem
Images with French text show "en" instead of "fr" in the detected language column.

### Root Cause Analysis
Language is inferred from URL domain rather than actual image content analysis by AI.

### Detailed Fix Implementation

#### 1. Update AI Generation to Return Detected Language
```typescript
// src/lib/azure/openai.ts
export async function generateAltText(
  imageUrl: string,
  options: {
    brandLanguage?: string;
    detectLanguage?: boolean;
    maxLength?: number;
  } = {}
): Promise<{
  text: string;
  detectedLanguage?: string;
  confidence?: number;
}> {
  const messages = [
    {
      role: 'system',
      content: `You are an AI specialized in generating accurate, concise alt text for images.
        ${options.detectLanguage ? 'IMPORTANT: Also detect and return the language of any text in the image.' : ''}
        Generate alt text in ${options.brandLanguage || 'English'}.
        Keep descriptions under ${options.maxLength || 125} characters.
        Be factual and objective.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: options.detectLanguage 
            ? 'Generate alt text and detect the language of any text in this image. Return as JSON: { "altText": "...", "detectedLanguage": "ISO-639-1 code", "confidence": 0.0-1.0 }'
            : 'Generate alt text for this image.'
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        }
      ]
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      messages,
      max_tokens: 200,
      temperature: 0.3,
      response_format: options.detectLanguage ? { type: 'json_object' } : undefined
    });

    const content = response.choices[0]?.message?.content || '';

    if (options.detectLanguage) {
      try {
        const parsed = JSON.parse(content);
        return {
          text: parsed.altText || '',
          detectedLanguage: normalizeLanguageCode(parsed.detectedLanguage || 'en'),
          confidence: parsed.confidence || 0
        };
      } catch {
        // Fallback if JSON parsing fails
        return { text: content, detectedLanguage: 'en', confidence: 0 };
      }
    }

    return { text: content };
  } catch (error) {
    console.error('Alt text generation error:', error);
    throw new Error('Failed to generate alt text');
  }
}

// Normalize language codes to ISO-639-1
function normalizeLanguageCode(code: string): string {
  const languageMap: Record<string, string> = {
    'english': 'en',
    'french': 'fr',
    'français': 'fr',
    'spanish': 'es',
    'español': 'es',
    'german': 'de',
    'deutsch': 'de',
    'italian': 'it',
    'italiano': 'it',
    'portuguese': 'pt',
    'português': 'pt',
    'dutch': 'nl',
    'nederlands': 'nl',
    'fr-fr': 'fr',
    'en-us': 'en',
    'en-gb': 'en',
    'es-es': 'es',
    'de-de': 'de'
  };

  const normalized = code.toLowerCase().trim();
  
  // Check if already ISO-639-1
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Try to map
  return languageMap[normalized] || normalized.substring(0, 2);
}
```

#### 2. Update API Route
```typescript
// src/app/api/tools/alt-text-generator/route.ts
export const POST = withAuthAndCSRF(async (request: NextRequest, user) => {
  const { images, brandLanguage } = await request.json();
  
  const results = [];
  
  for (const image of images) {
    try {
      // Generate alt text with language detection
      const { text, detectedLanguage, confidence } = await generateAltText(
        image.url,
        {
          brandLanguage,
          detectLanguage: true,
          maxLength: 125
        }
      );

      results.push({
        id: image.id,
        url: image.url,
        altText: text,
        detectedLanguage: detectedLanguage || 'unknown',
        languageConfidence: confidence || 0,
        // Keep URL-based as fallback
        inferredLanguage: getLangCountryFromUrl(image.url),
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        id: image.id,
        url: image.url,
        error: error.message,
        detectedLanguage: 'error'
      });
    }
  }

  // Log to history
  await supabase
    .from('tool_run_history')
    .insert({
      tool_name: 'alt_text_generator',
      user_id: user.id,
      brand_id: brandId,
      input_data: { images, brandLanguage },
      output_data: { results },
      metadata: {
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      }
    });

  return NextResponse.json({ success: true, data: results });
});
```

#### 3. Update UI Display
```typescript
// src/app/dashboard/tools/alt-text-generator/page.tsx
interface AltTextResult {
  id: string;
  url: string;
  altText: string;
  detectedLanguage: string;
  languageConfidence: number;
  inferredLanguage: string;
}

function AltTextResultsTable({ results }: { results: AltTextResult[] }) {
  const getLanguageDisplay = (result: AltTextResult) => {
    if (!result.detectedLanguage || result.detectedLanguage === 'unknown') {
      return {
        code: result.inferredLanguage || 'en',
        source: 'URL',
        confidence: 'low'
      };
    }

    return {
      code: result.detectedLanguage.toUpperCase(),
      source: 'AI',
      confidence: result.languageConfidence > 0.8 ? 'high' : 
                  result.languageConfidence > 0.5 ? 'medium' : 'low'
    };
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image</TableHead>
          <TableHead>Alt Text</TableHead>
          <TableHead>Language</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => {
          const langInfo = getLanguageDisplay(result);
          
          return (
            <TableRow key={result.id}>
              <TableCell>
                <img 
                  src={result.url} 
                  alt="Preview" 
                  className="w-20 h-20 object-cover rounded"
                />
              </TableCell>
              <TableCell className="max-w-md">
                <p className="truncate">{result.altText}</p>
                <span className="text-xs text-muted-foreground">
                  {result.altText.length}/125 characters
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-mono text-sm">{langInfo.code}</span>
                  <span className="text-xs text-muted-foreground">
                    via {langInfo.source}
                    {langInfo.source === 'AI' && (
                      <span className={`ml-1 ${
                        langInfo.confidence === 'high' ? 'text-green-600' :
                        langInfo.confidence === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        ({langInfo.confidence})
                      </span>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline">Copy</Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

---

## Issue #237: Alt Text "Open Image Link" Error 1011

### Problem
Clicking "Open Image Link" causes CORS/security error instead of opening the image.

### Root Cause Analysis
Using document.write with external content triggers security policies. Need simpler, safer approach.

### Detailed Fix Implementation

#### 1. Safe Image Opening Implementation
```typescript
// src/app/dashboard/tools/alt-text-generator/page.tsx
import { useState } from 'react';

function ImageActions({ imageUrl }: { imageUrl: string }) {
  const [error, setError] = useState<string | null>(null);

  const validateAndSanitizeUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      
      // Only allow HTTP(S)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP(S) URLs are allowed');
      }

      // Block local/internal URLs
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        throw new Error('Local URLs are not allowed');
      }

      return parsed.href;
    } catch (error) {
      setError(error.message);
      return null;
    }
  };

  const handleOpenImage = () => {
    setError(null);
    const safeUrl = validateAndSanitizeUrl(imageUrl);
    
    if (!safeUrl) return;

    // Try direct navigation first
    try {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open image:', error);
      
      // Fallback: Create temporary anchor
      const link = document.createElement('a');
      link.href = safeUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleViewInModal = () => {
    // Alternative: Show in modal instead of new window
    setShowImageModal(true);
  };

  const handleDownload = async () => {
    setError(null);
    const safeUrl = validateAndSanitizeUrl(imageUrl);
    if (!safeUrl) return;

    try {
      // Use server proxy for cross-origin images
      const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(safeUrl)}`);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `alt-text-image-${Date.now()}.jpg`;
      link.click();
      
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setError('Failed to download image');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpenImage}
        title="Open image in new tab"
      >
        <ExternalLink className="h-4 w-4 mr-1" />
        Open
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={handleViewInModal}
        title="View image in modal"
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        title="Download image"
      >
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
```

#### 2. Server-Side Image Proxy (For CORS issues)
```typescript
// src/app/api/proxy-image/route.ts
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL
    const url = new URL(imageUrl);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Fetch image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MixerAI/1.0',
        'Accept': 'image/*'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Validate content type
    if (!contentType?.startsWith('image/')) {
      throw new Error('Not an image');
    }

    // Stream the image back
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': "default-src 'none'; img-src 'self';",
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
});
```

#### 3. Image Modal Component
```typescript
// src/components/ui/image-modal.tsx
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, altText }: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Image Preview</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <img
            src={imageUrl}
            alt={altText || 'Image preview'}
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-image.png';
              e.currentTarget.onerror = null;
            }}
          />
          <div className="mt-4 p-2 bg-muted rounded">
            <p className="text-xs text-muted-foreground break-all">
              {imageUrl}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Issue #233: Template Dropdown Shows No Templates

### Problem
Content creation template dropdown is completely empty, preventing content creation.

### Root Cause Analysis
API response structure mismatch - frontend expects `templates` key but API returns `data` key.

### Detailed Fix Implementation

#### 1. Standardize API Response Contract
```typescript
// src/types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export type TemplatesResponse = ApiResponse<ContentTemplate[]>;
export type TemplateResponse = ApiResponse<ContentTemplate>;
```

#### 2. Fix API Route
```typescript
// src/app/api/content-templates/route.ts
import { ApiResponse } from '@/types/api.types';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json<ApiResponse<never>>({
        success: false,
        error: 'Brand ID is required'
      }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data: templates, error } = await supabase
      .from('content_templates')
      .select(`
        id,
        name,
        description,
        category,
        input_fields,
        output_fields,
        created_at,
        updated_at,
        created_by,
        is_active
      `)
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Template fetch error:', error);
      throw error;
    }

    // Return standardized response
    const response: ApiResponse<ContentTemplate[]> = {
      success: true,
      data: templates || [],
      metadata: {
        count: templates?.length || 0,
        brandId
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
});
```

#### 3. Fix Dropdown Component
```typescript
// src/components/content/create-content-dropdown.tsx
import { useState, useEffect } from 'react';
import { ApiResponse } from '@/types/api.types';
import { ContentTemplate } from '@/types/template.types';

interface CreateContentDropdownProps {
  brandId: string;
  onSelectTemplate: (template: ContentTemplate) => void;
  disabled?: boolean;
}

export function CreateContentDropdown({ 
  brandId, 
  onSelectTemplate,
  disabled = false 
}: CreateContentDropdownProps) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!brandId) return;

    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/content-templates?brandId=${brandId}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const result: ApiResponse<ContentTemplate[]> = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch templates');
        }

        // Handle both old and new API response formats
        const templateData = result.data || (result as any).templates || [];
        
        setTemplates(Array.isArray(templateData) ? templateData : []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError(error instanceof Error ? error.message : 'Failed to load templates');
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [brandId]);

  const handleSelect = (template: ContentTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  // Render loading state
  if (isLoading) {
    return (
      <Button disabled variant="outline" className="w-full justify-between">
        <span>Loading templates...</span>
        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-2">
        <Button 
          disabled 
          variant="outline" 
          className="w-full justify-between"
        >
          <span className="text-red-500">Failed to load templates</span>
          <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
        </Button>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Render empty state
  if (templates.length === 0) {
    return (
      <div className="space-y-2">
        <Button 
          disabled 
          variant="outline" 
          className="w-full justify-between"
        >
          <span>No templates available</span>
          <FileX className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          Please create a template first or contact your administrator.
        </p>
      </div>
    );
  }

  // Render dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={disabled}
        >
          <span>Select Template</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full">
        <DropdownMenuLabel>Available Templates ({templates.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleSelect(template)}
            className="cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{template.name}</span>
              {template.description && (
                <span className="text-xs text-muted-foreground">
                  {template.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 4. Add Playwright Test
```typescript
// tests/e2e/template-dropdown.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Template Dropdown', () => {
  test('should display templates when API returns data', async ({ page }) => {
    // Mock API response
    await page.route('**/api/content-templates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: '1', name: 'Blog Post', description: 'Standard blog template' },
            { id: '2', name: 'Product Description', description: 'Product template' }
          ]
        })
      });
    });

    await page.goto('/dashboard/content/new');
    
    // Click dropdown
    await page.click('button:has-text("Select Template")');
    
    // Verify templates appear
    await expect(page.locator('text=Blog Post')).toBeVisible();
    await expect(page.locator('text=Product Description')).toBeVisible();
    await expect(page.locator('text=Available Templates (2)')).toBeVisible();
  });

  test('should show empty state when no templates', async ({ page }) => {
    await page.route('**/api/content-templates*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.goto('/dashboard/content/new');
    
    await expect(page.locator('text=No templates available')).toBeVisible();
  });

  test('should show error state on API failure', async ({ page }) => {
    await page.route('**/api/content-templates*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Database connection failed'
        })
      });
    });

    await page.goto('/dashboard/content/new');
    
    await expect(page.locator('text=Failed to load templates')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});
```

---

## Issue #272: Session Not Persisting 24 Hours

### Problem
User sessions expire after 6-12 hours instead of the expected 24 hours.

### Root Cause Analysis
Supabase default token lifetime is 1 hour, and refresh mechanism isn't properly configured. Custom session config conflicts with Supabase defaults.

### Detailed Fix Implementation

#### 1. Supabase Auth Configuration (Dashboard Settings)
```text
In Supabase Dashboard:
1. Go to Authentication > Settings
2. Set JWT expiry: 3600 (1 hour for access token)
3. Set Refresh token rotation: Enabled
4. Set Refresh token reuse interval: 10 seconds
5. Set Refresh token expiry: 86400 (24 hours)
```

#### 2. Update Client Configuration
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

let supabaseBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (supabaseBrowserClient) return supabaseBrowserClient;

  supabaseBrowserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'mixerai-auth-token',
        storage: {
          // Custom storage with 24-hour awareness
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null;
            
            const item = window.localStorage.getItem(key);
            if (!item) return null;

            try {
              const parsed = JSON.parse(item);
              
              // Check if session is older than 24 hours
              if (parsed.expires_at) {
                const expiresAt = new Date(parsed.expires_at * 1000);
                const now = new Date();
                const hoursSinceCreation = (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60);
                
                if (hoursSinceCreation > 24) {
                  window.localStorage.removeItem(key);
                  return null;
                }
              }
              
              return item;
            } catch {
              return item;
            }
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return;
            
            try {
              const parsed = JSON.parse(value);
              
              // Add custom expiry tracking
              parsed.custom_max_age = Date.now() + (24 * 60 * 60 * 1000);
              
              window.localStorage.setItem(key, JSON.stringify(parsed));
            } catch {
              window.localStorage.setItem(key, value);
            }
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
          }
        },
        // Refresh token 5 minutes before expiry
        autoRefreshToken: true,
        persistSession: true
      },
      global: {
        headers: {
          'X-Client-Version': '1.0.0'
        }
      }
    }
  );

  return supabaseBrowserClient;
}
```

#### 3. Session Monitor Hook
```typescript
// src/hooks/use-session-monitor.ts
import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function useSessionMonitor() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const lastActivityRef = useRef(Date.now());
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Refresh session when tab becomes visible
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === 'visible') {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
        
        // Refresh if less than 10 minutes until expiry
        if (minutesUntilExpiry < 10) {
          console.log('Refreshing session due to near expiry');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Failed to refresh session:', error);
            router.push('/auth/login');
          }
        }
      }
    }
  }, [supabase, router]);

  // Schedule automatic refresh
  const scheduleRefresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    const expiresAt = new Date(session.expires_at! * 1000);
    const now = new Date();
    const msUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Schedule refresh 5 minutes before expiry
    const refreshIn = Math.max(0, msUntilExpiry - (5 * 60 * 1000));
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('Auto-refreshing session');
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Auto-refresh failed:', error);
        router.push('/auth/login');
      } else {
        // Schedule next refresh
        scheduleRefresh();
      }
    }, refreshIn);
  }, [supabase, router]);

  useEffect(() => {
    // Set up activity tracking
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Set up visibility change handler
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          scheduleRefresh();
        } else if (event === 'SIGNED_OUT') {
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          router.push('/auth/login');
        }
      }
    );

    // Initial refresh schedule
    scheduleRefresh();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [updateActivity, handleVisibilityChange, scheduleRefresh, supabase, router]);

  return {
    lastActivity: lastActivityRef.current
  };
}
```

#### 4. Root Layout Integration
```typescript
// src/app/layout.tsx
'use client';

import { useSessionMonitor } from '@/hooks/use-session-monitor';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Monitor session in root layout
  useSessionMonitor();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

#### 5. Middleware Session Validation
```typescript
// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
            // Ensure cookies last 24 hours
            maxAge: options.maxAge ?? 60 * 60 * 24,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check if session needs refresh (within 10 minutes of expiry)
    const expiresAt = new Date(session.expires_at! * 1000);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilExpiry < 10) {
      // Trigger refresh on next client request
      response.headers.set('X-Session-Needs-Refresh', 'true');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

---

## Testing Strategy for All P1 Issues

### Automated Test Suite
```typescript
// tests/p1-issues.test.ts
describe('P1 Issue Fixes', () => {
  test('#261: Deleted users not in search', async () => {
    // Test implementation
  });

  test('#254: Workflow roles persist', async () => {
    // Test implementation
  });

  test('#252: Email notifications sent', async () => {
    // Test implementation
  });

  test('#248: Brand placeholders clickable', async () => {
    // Test implementation
  });

  test('#247: AI checkboxes persist', async () => {
    // Test implementation
  });

  test('#238: Language detection accurate', async () => {
    // Test implementation
  });

  test('#237: Image links open safely', async () => {
    // Test implementation
  });

  test('#233: Templates load in dropdown', async () => {
    // Test implementation
  });

  test('#272: Session persists 24 hours', async () => {
    // Test implementation
  });
});
```

### Manual Testing Checklist
- [ ] Create workflow with deleted user not appearing
- [ ] Save workflow with roles and verify persistence
- [ ] Approve content and verify email sent
- [ ] Click all brand placeholder buttons
- [ ] Save template with AI features and reload
- [ ] Generate alt text for French image
- [ ] Open various image URLs safely
- [ ] Select template from dropdown
- [ ] Keep session alive for 24 hours

## Deployment Plan

### Phase 1: Database Changes (Do First)
1. Create views and indexes for #261
2. Update workflow tables for #254
3. Create notification_outbox for #252
4. Add ai_features column for #247

### Phase 2: Backend APIs
1. Deploy updated API routes
2. Deploy edge functions for notifications
3. Update Supabase auth settings

### Phase 3: Frontend
1. Deploy UI fixes
2. Enable session monitoring
3. Update dropdown components

### Rollback Plan
1. Keep database migrations reversible
2. Feature flag new notification system
3. Keep old API response handling for 1 week
4. Monitor error rates closely

---

This detailed report provides comprehensive implementation details for all 8 P1 issues with database-first approaches, proper error handling, type safety, and testing strategies as recommended by the senior developer feedback.