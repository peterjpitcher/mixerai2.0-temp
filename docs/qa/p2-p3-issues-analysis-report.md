# P2 and P3 Issues Analysis Report

## Executive Summary

This report analyzes 10 remaining issues (8 P2 Medium priority, 2 P3 Low priority) that failed QA testing. These issues primarily involve missing validation enforcement, incomplete feature implementations, and UI/UX inconsistencies. Unlike the P1 critical issues which involved system failures, these P2/P3 issues focus on feature gaps and validation requirements that were specified but not fully implemented.

## Priority 2 (Medium) Issues - QA Failed

### Issue #269: Template Image Restriction Not Enforced

**Issue Type**: Validation Bypass  
**Component**: Content Editor / Rich Text Fields  
**Impact**: Template constraints are not being respected, allowing unauthorized content types

#### Problem Description
When creating a content template with a rich text output field where "Allow Images" is explicitly unchecked, users can still insert images during the content generation phase. This defeats the purpose of template-level content restrictions.

#### Current Implementation
```typescript
// src/components/content/quill-editor.tsx
export function QuillEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
  allowImages = true  // <-- Hardcoded default, ignores template config
}: QuillEditorProps) {
  // Quill initialization with toolbar
  const quill = new Quill(editorRef.current!, {
    modules: {
      toolbar: readOnly ? false : [
        ['image', 'video'],  // Always includes image button
        // ... other toolbar items
      ]
    }
  });
}
```

#### Root Cause Analysis
1. The `QuillEditor` component has a hardcoded default of `allowImages = true`
2. Template field configuration is not being passed through the component hierarchy
3. The toolbar configuration doesn't dynamically adjust based on field restrictions
4. No runtime validation prevents image insertion via paste or drag-and-drop

#### Proposed Solution

**Step 1: Database Schema Update**
```sql
-- Ensure template output fields store allow_images configuration
ALTER TABLE content_templates 
ADD COLUMN IF NOT EXISTS output_field_config jsonb DEFAULT '{}';

-- Example structure:
-- {
--   "fields": [
--     {
--       "key": "content",
--       "type": "rich_text",
--       "allow_images": false,
--       "allow_videos": false,
--       "allow_links": true
--     }
--   ]
-- }
```

**Step 2: Template Field Renderer Updates**
```typescript
// src/components/content/template-field-renderer.tsx
interface FieldConfig {
  allow_images?: boolean;
  allow_videos?: boolean;
  allow_links?: boolean;
  max_length?: number;
  max_rows?: number;
}

const renderField = (field: TemplateField) => {
  if (field.type === 'rich_text') {
    return (
      <QuillEditor
        value={value}
        onChange={onChange}
        allowImages={field.config?.allow_images ?? true}
        allowVideos={field.config?.allow_videos ?? false}
        allowLinks={field.config?.allow_links ?? true}
      />
    );
  }
  // ... other field types
};
```

**Step 3: QuillEditor Component Enhancement**
```typescript
// src/components/content/quill-editor.tsx
const QuillEditor = ({ allowImages, allowVideos, ...props }) => {
  // Build toolbar based on permissions
  const toolbarModules = useMemo(() => {
    const modules = [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
    ];
    
    const mediaButtons = [];
    if (allowImages) mediaButtons.push('image');
    if (allowVideos) mediaButtons.push('video');
    if (mediaButtons.length > 0) {
      modules.push(mediaButtons);
    }
    
    return modules;
  }, [allowImages, allowVideos]);
  
  // Also handle paste events to strip unauthorized content
  useEffect(() => {
    if (quillRef.current && !allowImages) {
      quillRef.current.clipboard.addMatcher('IMG', (node, delta) => {
        // Strip image from pasted content
        return new Delta();
      });
    }
  }, [allowImages]);
};
```

---

### Issue #268: Max Rows Validation Not Working for Long Text Fields

**Issue Type**: Input Validation Failure  
**Component**: Form Fields / Textarea  
**Impact**: Users can exceed intended content limits, potentially breaking layouts or exceeding storage limits

#### Problem Description
When configuring a long text input field with a maximum row limit (e.g., max_rows = 2), users can still enter unlimited rows of text. The restriction is only visual (textarea height) but doesn't prevent additional content.

#### Current Implementation
```typescript
// src/components/form/textarea-field.tsx
<textarea
  rows={field.config?.max_rows || 5}  // Only affects visual height
  value={value}
  onChange={(e) => setValue(e.target.value)}  // No validation
  className={className}
/>
```

#### Root Cause Analysis
1. `max_rows` is only used for the visual `rows` attribute
2. No validation logic prevents additional line breaks
3. No user feedback when approaching or exceeding the limit
4. Backend doesn't validate the constraint either

#### Proposed Solution

**Step 1: Frontend Validation Hook**
```typescript
// src/hooks/use-text-validation.ts
export const useTextValidation = (config: FieldConfig) => {
  const validateText = useCallback((text: string): ValidationResult => {
    const errors: string[] = [];
    let validatedText = text;
    
    // Check max rows
    if (config.max_rows) {
      const lines = text.split('\n');
      if (lines.length > config.max_rows) {
        errors.push(`Maximum ${config.max_rows} rows allowed`);
        validatedText = lines.slice(0, config.max_rows).join('\n');
      }
    }
    
    // Check max length
    if (config.max_length && text.length > config.max_length) {
      errors.push(`Maximum ${config.max_length} characters allowed`);
      validatedText = text.substring(0, config.max_length);
    }
    
    return { 
      isValid: errors.length === 0,
      errors,
      validatedText 
    };
  }, [config]);
  
  return { validateText };
};
```

**Step 2: Enhanced Textarea Component**
```typescript
// src/components/form/validated-textarea.tsx
const ValidatedTextarea = ({ field, value, onChange }) => {
  const { validateText } = useTextValidation(field.config);
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState(1);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const validation = validateText(newValue);
    
    if (!validation.isValid) {
      setError(validation.errors[0]);
      // Optionally prevent invalid input
      if (field.config.strict_validation) {
        onChange(validation.validatedText);
        return;
      }
    } else {
      setError(null);
    }
    
    onChange(newValue);
    setLineCount(newValue.split('\n').length);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Enter key if at max rows
    if (e.key === 'Enter' && field.config?.max_rows) {
      const currentLines = value.split('\n').length;
      if (currentLines >= field.config.max_rows) {
        e.preventDefault();
        setError(`Maximum ${field.config.max_rows} rows reached`);
      }
    }
  };
  
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={field.config?.max_rows || 5}
        className={cn(
          "w-full",
          error && "border-red-500"
        )}
      />
      {field.config?.max_rows && (
        <div className="text-xs text-gray-500 mt-1">
          {lineCount} / {field.config.max_rows} rows
        </div>
      )}
      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </div>
  );
};
```

**Step 3: Backend Validation**
```typescript
// src/app/api/content/route.ts
const validateFieldConstraints = (field: any, value: string) => {
  if (field.type === 'long_text' && field.config) {
    if (field.config.max_rows) {
      const lineCount = (value.match(/\n/g) || []).length + 1;
      if (lineCount > field.config.max_rows) {
        throw new Error(`Field ${field.name} exceeds maximum rows (${field.config.max_rows})`);
      }
    }
    if (field.config.max_length && value.length > field.config.max_length) {
      throw new Error(`Field ${field.name} exceeds maximum length (${field.config.max_length})`);
    }
  }
};
```

---

### Issue #267: AI Suggestions Exceed Max Length Constraints

**Issue Type**: AI Integration Issue  
**Component**: AI Content Generation  
**Impact**: AI-generated content violates field constraints, requiring manual editing

#### Problem Description
When a template field has a max_length constraint (e.g., 5 characters for a product code), the AI suggestion feature generates content that exceeds this limit. The AI is not aware of field-level constraints.

#### Current Implementation
```typescript
// src/lib/azure/openai.ts
const generateSuggestion = async (fieldName: string, context: any) => {
  const prompt = `Generate content for field: ${fieldName}
    Context: ${JSON.stringify(context)}`;
  
  // No constraint information passed to AI
  const response = await openai.complete(prompt);
  return response.text;
};
```

#### Root Cause Analysis
1. Field constraints are not included in the AI prompt
2. No post-processing to enforce constraints on AI output
3. AI model doesn't understand the semantic meaning of constraints
4. No feedback loop to regenerate if constraints are violated

#### Proposed Solution

**Step 1: Enhanced AI Prompt Builder**
```typescript
// src/lib/ai/prompt-builder.ts
interface FieldConstraints {
  max_length?: number;
  min_length?: number;
  max_rows?: number;
  format?: string; // e.g., 'email', 'url', 'phone'
  pattern?: string; // regex pattern
  examples?: string[];
}

export const buildConstrainedPrompt = (
  field: TemplateField,
  context: any
): string => {
  const parts = [`Generate content for field: ${field.name}`];
  
  // Add type-specific instructions
  switch (field.type) {
    case 'short_text':
      parts.push('Provide a brief, concise text.');
      break;
    case 'long_text':
      parts.push('Provide a detailed text.');
      break;
    case 'number':
      parts.push('Provide a numeric value.');
      break;
  }
  
  // Add constraints
  if (field.config?.max_length) {
    parts.push(`CRITICAL: Maximum ${field.config.max_length} characters.`);
    parts.push(`The response MUST NOT exceed ${field.config.max_length} characters.`);
  }
  
  if (field.config?.min_length) {
    parts.push(`Minimum ${field.config.min_length} characters required.`);
  }
  
  if (field.config?.max_rows) {
    parts.push(`Maximum ${field.config.max_rows} lines/rows.`);
    parts.push('Do not include line breaks beyond this limit.');
  }
  
  if (field.config?.format) {
    parts.push(`Format: ${field.config.format}`);
    if (field.config.format === 'email') {
      parts.push('Provide a valid email address (e.g., user@example.com)');
    }
  }
  
  if (field.config?.examples && field.config.examples.length > 0) {
    parts.push(`Examples: ${field.config.examples.join(', ')}`);
  }
  
  // Add context
  parts.push(`Context: ${JSON.stringify(context)}`);
  
  return parts.join('\n');
};
```

**Step 2: Post-Processing and Validation**
```typescript
// src/lib/ai/response-processor.ts
export const processAIResponse = (
  response: string,
  field: TemplateField
): ProcessedResponse => {
  let processed = response.trim();
  const warnings: string[] = [];
  
  // Enforce max_length
  if (field.config?.max_length && processed.length > field.config.max_length) {
    warnings.push(`AI response exceeded max length (${processed.length} > ${field.config.max_length})`);
    
    // Intelligent truncation
    if (field.type === 'short_text') {
      // Try to truncate at word boundary
      processed = processed.substring(0, field.config.max_length);
      const lastSpace = processed.lastIndexOf(' ');
      if (lastSpace > field.config.max_length * 0.8) {
        processed = processed.substring(0, lastSpace);
      }
    } else {
      // Hard truncation for codes, IDs, etc.
      processed = processed.substring(0, field.config.max_length);
    }
  }
  
  // Enforce max_rows
  if (field.config?.max_rows) {
    const lines = processed.split('\n');
    if (lines.length > field.config.max_rows) {
      warnings.push(`AI response exceeded max rows (${lines.length} > ${field.config.max_rows})`);
      processed = lines.slice(0, field.config.max_rows).join('\n');
    }
  }
  
  // Validate format
  if (field.config?.format) {
    const isValid = validateFormat(processed, field.config.format);
    if (!isValid) {
      warnings.push(`AI response doesn't match required format: ${field.config.format}`);
    }
  }
  
  return {
    value: processed,
    warnings,
    requiresRegeneration: warnings.length > 0
  };
};
```

**Step 3: Retry Logic with Constraints**
```typescript
// src/lib/ai/suggestion-service.ts
export const generateConstrainedSuggestion = async (
  field: TemplateField,
  context: any,
  maxRetries = 3
): Promise<string> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = buildConstrainedPrompt(field, context);
    
    // Add stricter instructions on retry
    if (attempt > 0) {
      prompt += `\n\nIMPORTANT: Previous attempt failed constraints. `;
      prompt += `You MUST generate exactly ${field.config.max_length} characters or less.`;
    }
    
    const response = await callAI(prompt);
    const processed = processAIResponse(response, field);
    
    if (!processed.requiresRegeneration) {
      return processed.value;
    }
    
    console.warn(`AI suggestion attempt ${attempt + 1} failed constraints:`, processed.warnings);
  }
  
  // Final fallback: return truncated version
  return processAIResponse(response, field).value;
};
```

---

### Issue #266: Unexpected "Title" Field Appears in Output

**Issue Type**: UI/Data Inconsistency  
**Component**: Content Generation Form  
**Impact**: Confusing UX with fields appearing that weren't configured

#### Problem Description
When creating content from a template, a "Title" field appears in the output section even though it was never added during template creation. This creates confusion and inconsistency with the template design.

#### Current Implementation
```typescript
// src/components/content/content-generator-form.tsx
const ContentGeneratorForm = ({ template }) => {
  // Title field is hardcoded
  return (
    <form>
      <div className="space-y-4">
        {/* Title always appears */}
        <FormField
          name="title"
          label="Title"
          required
        />
        
        {/* Template fields */}
        {template.output_fields.map(field => (
          <TemplateField key={field.id} field={field} />
        ))}
      </div>
    </form>
  );
};
```

#### Root Cause Analysis
1. Legacy code assumes all content needs a title
2. Title field is hardcoded in the content generation form
3. Template configuration doesn't have a flag for title inclusion
4. Database schema requires title field (NOT NULL constraint)

#### Proposed Solution

**Step 1: Database Migration**
```sql
-- Make title optional in content table
ALTER TABLE content 
ALTER COLUMN title DROP NOT NULL;

-- Add title configuration to templates
ALTER TABLE content_templates
ADD COLUMN include_title boolean DEFAULT true;

-- Update existing templates to maintain backward compatibility
UPDATE content_templates 
SET include_title = true 
WHERE include_title IS NULL;
```

**Step 2: Template Designer Update**
```typescript
// src/components/template/template-designer.tsx
const TemplateDesigner = () => {
  const [includeTitle, setIncludeTitle] = useState(true);
  
  return (
    <div>
      {/* Template settings section */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-title"
                checked={includeTitle}
                onCheckedChange={setIncludeTitle}
              />
              <Label htmlFor="include-title">
                Include Title Field
                <span className="text-sm text-gray-500 ml-2">
                  Adds a title field to content created from this template
                </span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rest of template designer */}
    </div>
  );
};
```

**Step 3: Content Generation Form Update**
```typescript
// src/components/content/content-generator-form.tsx
const ContentGeneratorForm = ({ template }) => {
  const showTitle = template.include_title ?? true; // Default true for backward compatibility
  
  return (
    <form>
      <div className="space-y-4">
        {/* Conditionally render title */}
        {showTitle && (
          <FormField
            name="title"
            label="Title"
            required={false} // Make it optional
            placeholder="Enter content title (optional)"
          />
        )}
        
        {/* Template output fields */}
        {template.output_fields.map(field => (
          <TemplateField key={field.id} field={field} />
        ))}
      </div>
    </form>
  );
};
```

**Step 4: API Update**
```typescript
// src/app/api/content/route.ts
const createContent = async (data: any) => {
  // Validate title only if template requires it
  if (template.include_title && !data.title) {
    throw new Error('Title is required for this template');
  }
  
  // Allow null title if template doesn't include it
  const content = {
    title: template.include_title ? data.title : null,
    template_id: template.id,
    // ... other fields
  };
  
  return await supabase.from('content').insert(content);
};
```

---

### Issue #260: Missing Deactivate User Option

**Issue Type**: Missing Feature  
**Component**: User Management  
**Impact**: Cannot temporarily disable user access without permanent deletion

#### Problem Description
The user management interface only provides a "Delete" option for users, but requirements specify a "Deactivate" option. Deactivation should disable access while preserving user data and history.

#### Current Implementation
```typescript
// src/components/users/user-actions.tsx
const UserActions = ({ user }) => {
  return (
    <DropdownMenu>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => editUser(user)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => deleteUser(user)}
          className="text-red-600"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

#### Root Cause Analysis
1. No status field in user model to track active/inactive state
2. Authentication doesn't check user status
3. No UI for deactivation/reactivation
4. No audit trail for status changes

#### Proposed Solution

**Step 1: Database Schema Enhancement**
```sql
-- Add status tracking to users
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status_reason text;

-- Create status change history table
CREATE TABLE user_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  old_status text,
  new_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT NOW(),
  metadata jsonb DEFAULT '{}'
);

-- Function to deactivate user
CREATE OR REPLACE FUNCTION deactivate_user(
  p_user_id uuid,
  p_reason text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Record history
  INSERT INTO user_status_history (user_id, old_status, new_status, reason, changed_by)
  SELECT id, status, 'inactive', p_reason, p_changed_by
  FROM auth.users WHERE id = p_user_id;
  
  -- Update user status
  UPDATE auth.users 
  SET 
    status = 'inactive',
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Revoke all active sessions
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  
  -- Revoke refresh tokens
  UPDATE auth.refresh_tokens 
  SET revoked = true 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate user
CREATE OR REPLACE FUNCTION reactivate_user(
  p_user_id uuid,
  p_reason text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Record history
  INSERT INTO user_status_history (user_id, old_status, new_status, reason, changed_by)
  SELECT id, status, 'active', p_reason, p_changed_by
  FROM auth.users WHERE id = p_user_id;
  
  -- Update user status
  UPDATE auth.users 
  SET 
    status = 'active',
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status history" ON user_status_history
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );
```

**Step 2: API Endpoints**
```typescript
// src/app/api/users/[id]/deactivate/route.ts
import { withAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { z } from 'zod';

const DeactivateSchema = z.object({
  reason: z.string().optional(),
  notify_user: z.boolean().default(true)
});

export const POST = withAuth(async (request: NextRequest, user, { params }) => {
  try {
    // Check permission
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const body = await validateRequest(request, DeactivateSchema);
    const targetUserId = params.id;
    
    // Prevent self-deactivation
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Call deactivation function
    const { error } = await supabase.rpc('deactivate_user', {
      p_user_id: targetUserId,
      p_reason: body.reason,
      p_changed_by: user.id
    });
    
    if (error) throw error;
    
    // Send notification email if requested
    if (body.notify_user) {
      await sendDeactivationEmail(targetUserId, body.reason);
    }
    
    // Log admin action
    await logAdminAction({
      action: 'user_deactivated',
      target_id: targetUserId,
      actor_id: user.id,
      metadata: { reason: body.reason }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    return handleApiError(error, 'Failed to deactivate user');
  }
});

// Reactivate endpoint
export const DELETE = withAuth(async (request: NextRequest, user, { params }) => {
  // Similar structure for reactivation
  const { error } = await supabase.rpc('reactivate_user', {
    p_user_id: params.id,
    p_changed_by: user.id
  });
  
  return NextResponse.json({ 
    success: true,
    message: 'User reactivated successfully'
  });
});
```

**Step 3: UI Components**
```typescript
// src/components/users/user-actions.tsx
const UserActions = ({ user }) => {
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  
  const handleDeactivate = async () => {
    const response = await fetch(`/api/users/${user.id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ 
        reason: deactivateReason,
        notify_user: true 
      })
    });
    
    if (response.ok) {
      toast.success('User deactivated successfully');
      setShowDeactivateDialog(false);
      refreshUsers();
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editUser(user)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          
          {user.status === 'active' ? (
            <DropdownMenuItem 
              onClick={() => setShowDeactivateDialog(true)}
              className="text-orange-600"
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => reactivateUser(user)}
              className="text-green-600"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Reactivate
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Deactivation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              This will immediately revoke the user's access. They can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Reason for deactivation (optional)</Label>
              <Textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="e.g., Temporary leave, Policy violation, etc."
                rows={3}
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The user will be logged out immediately and won't be able to access the system.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

**Step 4: Authentication Middleware Update**
```typescript
// src/lib/auth/middleware.ts
export const withAuth = (handler: Handler) => {
  return async (req: NextRequest) => {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is active
    const { data: userData } = await supabase
      .from('auth.users')
      .select('status')
      .eq('id', session.user.id)
      .single();
    
    if (userData?.status !== 'active') {
      // Clear session
      await supabase.auth.signOut();
      
      return NextResponse.json({ 
        error: 'Account deactivated',
        status: userData?.status,
        message: 'Your account has been deactivated. Please contact support.'
      }, { status: 403 });
    }
    
    return handler(req, session.user);
  };
};
```

---

### Issue #257: Missing User Activity Log (Last 30 Days)

**Issue Type**: Missing Feature  
**Component**: User Profile / Analytics  
**Impact**: Cannot track user behavior or audit actions

#### Problem Description
Test cases specify that user profiles should display the last 30 days of activity, but this feature is completely missing. There's no activity tracking or display functionality.

#### Current Implementation
```typescript
// No activity tracking currently exists
// User profile shows only basic information
```

#### Proposed Solution

**Step 1: Comprehensive Activity Tracking Schema**
```sql
-- Create activity log table with partitioning for performance
CREATE TABLE user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL,
  action_category text NOT NULL,
  resource_type text,
  resource_id uuid,
  resource_name text,
  brand_id uuid REFERENCES brands(id),
  ip_address inet,
  user_agent text,
  session_id text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE user_activity_log_2024_01 PARTITION OF user_activity_log
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- Continue for each month...

-- Indexes for efficient queries
CREATE INDEX idx_activity_user_date ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_resource ON user_activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_brand ON user_activity_log(brand_id, created_at DESC);
CREATE INDEX idx_activity_category ON user_activity_log(action_category, created_at DESC);

-- Activity categories enum
CREATE TYPE activity_category AS ENUM (
  'authentication',
  'content_management',
  'workflow',
  'user_management',
  'template_management',
  'settings',
  'api_usage',
  'file_operations'
);

-- Automatic activity logging via triggers
CREATE OR REPLACE FUNCTION log_table_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_action text;
  v_resource_name text;
BEGIN
  -- Get current user from session
  v_user_id := current_setting('app.current_user_id', true)::uuid;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine action type
  CASE TG_OP
    WHEN 'INSERT' THEN v_action := 'created';
    WHEN 'UPDATE' THEN v_action := 'updated';
    WHEN 'DELETE' THEN v_action := 'deleted';
  END CASE;
  
  -- Get resource name if available
  IF NEW.name IS NOT NULL THEN
    v_resource_name := NEW.name;
  ELSIF NEW.title IS NOT NULL THEN
    v_resource_name := NEW.title;
  END IF;
  
  -- Log activity
  INSERT INTO user_activity_log (
    user_id,
    action_type,
    action_category,
    resource_type,
    resource_id,
    resource_name,
    brand_id,
    metadata
  ) VALUES (
    v_user_id,
    v_action || '_' || TG_TABLE_NAME,
    TG_ARGV[0]::text, -- Category passed as trigger argument
    TG_TABLE_NAME,
    NEW.id,
    v_resource_name,
    NEW.brand_id,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'schema', TG_TABLE_SCHEMA
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to key tables
CREATE TRIGGER log_content_activity
  AFTER INSERT OR UPDATE OR DELETE ON content
  FOR EACH ROW EXECUTE FUNCTION log_table_activity('content_management');

CREATE TRIGGER log_workflow_activity
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION log_table_activity('workflow');

CREATE TRIGGER log_template_activity
  AFTER INSERT OR UPDATE OR DELETE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION log_table_activity('template_management');
```

**Step 2: Activity Logging Service**
```typescript
// src/lib/services/activity-logger.ts
interface ActivityLog {
  action_type: string;
  action_category: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  brand_id?: string;
  metadata?: Record<string, any>;
  duration_ms?: number;
}

class ActivityLogger {
  private queue: ActivityLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor(private supabase: SupabaseClient) {
    // Batch logs every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }
  
  async log(activity: ActivityLog, userId: string, request?: Request) {
    const enrichedActivity = {
      ...activity,
      user_id: userId,
      ip_address: request?.headers.get('x-forwarded-for') || 
                  request?.headers.get('x-real-ip'),
      user_agent: request?.headers.get('user-agent'),
      session_id: request?.headers.get('x-session-id'),
      created_at: new Date().toISOString()
    };
    
    this.queue.push(enrichedActivity);
    
    // Flush immediately if queue is large
    if (this.queue.length >= 100) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    const batch = [...this.queue];
    this.queue = [];
    
    try {
      const { error } = await this.supabase
        .from('user_activity_log')
        .insert(batch);
      
      if (error) {
        console.error('Failed to log activities:', error);
        // Re-queue failed items
        this.queue.unshift(...batch);
      }
    } catch (error) {
      console.error('Activity logging error:', error);
    }
  }
  
  async getUserActivity(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await this.supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) throw error;
    
    return this.aggregateActivities(data);
  }
  
  private aggregateActivities(activities: any[]) {
    const aggregated = {
      total_actions: activities.length,
      by_category: {} as Record<string, number>,
      by_day: {} as Record<string, number>,
      by_hour: {} as Record<string, number>,
      recent_items: [] as any[],
      most_used_features: [] as any[]
    };
    
    activities.forEach(activity => {
      // By category
      aggregated.by_category[activity.action_category] = 
        (aggregated.by_category[activity.action_category] || 0) + 1;
      
      // By day
      const day = new Date(activity.created_at).toISOString().split('T')[0];
      aggregated.by_day[day] = (aggregated.by_day[day] || 0) + 1;
      
      // By hour
      const hour = new Date(activity.created_at).getHours();
      aggregated.by_hour[hour] = (aggregated.by_hour[hour] || 0) + 1;
    });
    
    // Recent items (last 10 unique resources)
    const recentMap = new Map();
    activities.forEach(activity => {
      if (activity.resource_id && !recentMap.has(activity.resource_id)) {
        recentMap.set(activity.resource_id, {
          type: activity.resource_type,
          name: activity.resource_name,
          last_accessed: activity.created_at
        });
      }
    });
    aggregated.recent_items = Array.from(recentMap.values()).slice(0, 10);
    
    // Most used features
    aggregated.most_used_features = Object.entries(aggregated.by_category)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
    
    return aggregated;
  }
}

export const activityLogger = new ActivityLogger(supabase);
```

**Step 3: Activity Display Component**
```typescript
// src/components/users/user-activity-log.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Activity, TrendingUp } from 'lucide-react';

const UserActivityLog = ({ userId }: { userId: string }) => {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  
  useEffect(() => {
    loadActivity();
  }, [userId, timeRange]);
  
  const loadActivity = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/activity?days=${timeRange}`);
      const data = await response.json();
      setActivity(data);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <Skeleton className="h-96" />;
  if (!activity) return <div>No activity data available</div>;
  
  // Prepare chart data
  const dailyData = Object.entries(activity.by_day)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actions: count
    }))
    .slice(-14); // Last 14 days for chart
  
  const hourlyData = Object.entries(activity.by_hour)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      actions: count
    }));
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Actions
                </p>
                <p className="text-2xl font-bold">
                  {activity.total_actions}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Daily Average
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(activity.total_actions / timeRange)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Most Active Hour
                </p>
                <p className="text-2xl font-bold">
                  {Object.entries(activity.by_hour)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}:00
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Active
                </p>
                <p className="text-2xl font-bold">
                  {activity.recent_items[0]?.last_accessed 
                    ? formatRelativeTime(activity.recent_items[0].last_accessed)
                    : 'Never'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="actions" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Most Used Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity.most_used_features.map((feature: any) => (
              <div key={feature.category} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {feature.category.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${(feature.count / activity.total_actions) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {feature.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Accessed Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activity.recent_items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.name || 'Unnamed'}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {item.type.replace('_', ' ')}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(item.last_accessed)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### Issue #241: Invitation Link Redirects to Login Instead of Signup

**Issue Type**: Authentication Flow Issue  
**Component**: Auth / User Onboarding  
**Impact**: New invited users cannot complete registration

#### Problem Description
When a user clicks on an invitation link from email, they are redirected to the login page instead of a password setup/signup flow. This prevents new users from completing their registration.

#### Current Implementation
```typescript
// src/app/auth/callback/route.ts
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  // Current implementation doesn't differentiate invitation flow
  return NextResponse.redirect('/login');
}
```

#### Root Cause Analysis
1. Invitation token type not being checked
2. No separate flow for first-time users
3. Missing password setup page
4. Invitation metadata not being processed

#### Proposed Solution

**Step 1: Enhanced Auth Callback Handler**
```typescript
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  
  if (!token_hash || !type) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?message=Invalid link`);
  }
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Handle different token types
  switch (type) {
    case 'invite':
    case 'signup':
      // Verify invitation token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any
      });
      
      if (error) {
        console.error('Invitation verification error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?message=${encodeURIComponent(error.message)}`
        );
      }
      
      if (data.user) {
        // Check if password is set
        const needsPasswordSetup = !data.user.user_metadata?.password_set;
        
        if (needsPasswordSetup) {
          // Store temporary session for password setup
          const response = NextResponse.redirect(
            `${requestUrl.origin}/auth/setup-password`
          );
          
          // Set a temporary cookie with user info
          response.cookies.set('pending_setup', JSON.stringify({
            user_id: data.user.id,
            email: data.user.email,
            invited_by: data.user.user_metadata?.invited_by,
            brand_id: data.user.user_metadata?.brand_id
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600 // 1 hour
          });
          
          return response;
        }
        
        // Existing user, redirect to dashboard
        return NextResponse.redirect(`${requestUrl.origin}${next}`);
      }
      break;
      
    case 'recovery':
      // Password reset flow
      const { error: resetError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery'
      });
      
      if (resetError) {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?message=${encodeURIComponent(resetError.message)}`
        );
      }
      
      return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`);
      
    case 'email':
      // Email confirmation
      const { error: emailError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email'
      });
      
      if (emailError) {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?message=${encodeURIComponent(emailError.message)}`
        );
      }
      
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
      
    default:
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?message=Unknown verification type`
      );
  }
  
  // Fallback
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
```

**Step 2: Password Setup Page**
```typescript
// src/app/auth/setup-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import Cookies from 'js-cookie';

interface PasswordRequirement {
  regex: RegExp;
  text: string;
}

const passwordRequirements: PasswordRequirement[] = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[A-Z]/, text: 'One uppercase letter' },
  { regex: /[a-z]/, text: 'One lowercase letter' },
  { regex: /[0-9]/, text: 'One number' },
  { regex: /[^A-Za-z0-9]/, text: 'One special character' }
];

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Get user info from cookie
    const pendingSetup = Cookies.get('pending_setup');
    if (!pendingSetup) {
      router.push('/login');
      return;
    }
    
    try {
      const info = JSON.parse(pendingSetup);
      setUserInfo(info);
    } catch (e) {
      console.error('Failed to parse user info:', e);
      router.push('/login');
    }
  }, []);
  
  const checkPasswordStrength = (pwd: string) => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.regex.test(pwd)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    const requirements = checkPasswordStrength(password);
    if (!requirements.every(r => r.met)) {
      setError('Password does not meet all requirements');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          password_set: true,
          onboarding_completed: true
        }
      });
      
      if (updateError) throw updateError;
      
      // Clear the setup cookie
      Cookies.remove('pending_setup');
      
      // Create profile if needed
      if (userInfo) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userInfo.user_id,
            email: userInfo.email,
            full_name: userInfo.full_name || '',
            created_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
        
        // Add brand permissions if invited to specific brand
        if (userInfo.brand_id) {
          const { error: permError } = await supabase
            .from('user_brand_permissions')
            .insert({
              user_id: userInfo.user_id,
              brand_id: userInfo.brand_id,
              role: 'viewer', // Default role for invited users
              created_by: userInfo.invited_by
            });
          
          if (permError) {
            console.error('Brand permission error:', permError);
          }
        }
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const requirements = checkPasswordStrength(password);
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to MixerAI</CardTitle>
          <CardDescription>
            Please set up your password to complete registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {userInfo && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">
                  Setting up account for: <strong>{userInfo.email}</strong>
                </p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
            
            {/* Password Requirements */}
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium mb-2">Password Requirements:</p>
              <div className="space-y-1">
                {requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={req.met ? 'text-green-700' : 'text-gray-600'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !requirements.every(r => r.met)}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Issue #239: Alt Text Generator Image Preview Issues

**Issue Type**: UI/UX Bug  
**Component**: Tools / Alt Text Generator  
**Impact**: Poor user experience when working with images

#### Problem Description
The Alt Text Generator tool has two issues:
1. No image preview functionality
2. Image URLs are truncated/incomplete in the display

#### Current Implementation
```typescript
// Simplified current implementation
const AltTextGenerator = () => {
  const [imageUrl, setImageUrl] = useState('');
  
  return (
    <div>
      <Input 
        value={imageUrl} 
        onChange={(e) => setImageUrl(e.target.value)}
        className="truncate" // URLs get cut off
      />
      {/* No preview */}
    </div>
  );
};
```

#### Proposed Solution

**Step 1: Enhanced Alt Text Generator Component**
```typescript
// src/components/tools/alt-text-generator.tsx
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Upload, Link, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AltTextGenerator = () => {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [altText, setAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const supabase = createClientComponentClient();
  
  // File upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image size must be less than 10MB');
      return;
    }
    
    setError(null);
    setUploading(true);
    
    try {
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSource(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to temporary storage
      const fileName = `alt-text/${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('temp-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('temp-images')
        .getPublicUrl(fileName);
      
      setImageUrl(publicUrl);
      
      // Auto-generate alt text
      await generateAltText(publicUrl);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    },
    maxFiles: 1
  });
  
  // URL preview handler
  const handleUrlSubmit = async () => {
    if (!imageUrl) {
      setError('Please enter an image URL');
      return;
    }
    
    // Validate URL
    try {
      const url = new URL(imageUrl);
      if (!url.protocol.startsWith('http')) {
        throw new Error('URL must start with http:// or https://');
      }
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    
    setError(null);
    setImageSource(imageUrl);
    await generateAltText(imageUrl);
  };
  
  // Generate alt text
  const generateAltText = async (url: string) => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tools/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate alt text');
      }
      
      const data = await response.json();
      setAltText(data.alt_text);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alt Text Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
              <TabsTrigger value="url">Image URL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
                )}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-gray-400" />
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">
                      {isDragActive
                        ? "Drop the image here..."
                        : "Drag & drop an image here, or click to select"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports: PNG, JPG, JPEG, GIF, WebP, SVG (Max 10MB)
                    </p>
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="pr-10"
                  />
                  {imageUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => copyToClipboard(imageUrl)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Button onClick={handleUrlSubmit} disabled={!imageUrl || generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Preview'
                  )}
                </Button>
              </div>
              
              {/* Display full URL for reference */}
              {imageUrl && (
                <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
                  {imageUrl}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Image Preview */}
      {imageSource && (
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <img
                src={imageSource}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain"
                onError={() => setError('Failed to load image')}
              />
            </div>
            
            {/* Image metadata */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">URL:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-50 rounded text-xs truncate">
                    {imageUrl || imageSource}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(imageUrl || imageSource)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Generated Alt Text */}
      {altText && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Alt Text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={4}
                  placeholder="Alt text will appear here..."
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(altText)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {altText.length} characters
                </span>
                <Button
                  onClick={() => generateAltText(imageUrl || imageSource!)}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

---

## Priority 3 (Low) Issues - QA Failed

### Issue #262: Workflow Status Inconsistency (Active vs Draft)

**Issue Type**: Data Persistence Issue  
**Component**: Workflow Management  
**Impact**: Confusion about workflow state

#### Problem Description
Workflows saved with "Active" status show as "Draft" when reopened in edit/view mode.

#### Proposed Solution
```typescript
// src/app/api/workflows/[id]/route.ts
export const PUT = withAuth(async (request, user, { params }) => {
  const body = await request.json();
  
  // Preserve existing status unless explicitly changed
  const { data: current } = await supabase
    .from('workflows')
    .select('status')
    .eq('id', params.id)
    .single();
  
  const updateData = {
    ...body,
    status: body.status ?? current?.status ?? 'draft',
    updated_at: new Date().toISOString()
  };
  
  // Ensure status is returned in response
  const { data, error } = await supabase
    .from('workflows')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();
  
  return NextResponse.json({ 
    success: true, 
    workflow: data // Use DB response, not request body
  });
});
```

---

### Issue #255: Assigned Brand Checkbox Not Visible in Edit Mode

**Issue Type**: Missing UI Element  
**Component**: User Management  
**Impact**: Cannot modify user brand assignments after creation

#### Proposed Solution
```typescript
// src/components/users/user-edit-form.tsx
const UserEditForm = ({ user }) => {
  const [assignedBrands, setAssignedBrands] = useState<string[]>([]);
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands
  });
  
  // Load current assignments
  useEffect(() => {
    fetchUserBrandPermissions(user.id).then(setAssignedBrands);
  }, [user.id]);
  
  const handleSave = async () => {
    // Update brand permissions
    await fetch(`/api/users/${user.id}/brands`, {
      method: 'PUT',
      body: JSON.stringify({ brand_ids: assignedBrands })
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Other user fields */}
      
      <div>
        <Label>Assigned Brands</Label>
        <div className="space-y-2 mt-2">
          {brands?.map(brand => (
            <div key={brand.id} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand.id}`}
                checked={assignedBrands.includes(brand.id)}
                onCheckedChange={(checked) => {
                  setAssignedBrands(prev =>
                    checked
                      ? [...prev, brand.id]
                      : prev.filter(id => id !== brand.id)
                  );
                }}
              />
              <Label 
                htmlFor={`brand-${brand.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {brand.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Priority & Effort Estimation

### High Priority (Should fix immediately after P1)
1. **Issue #241** - Invitation flow (High impact on user onboarding)
2. **Issue #260** - User deactivation (Compliance/security requirement)
3. **Issue #267** - AI constraint validation (Data integrity)

### Medium Priority
4. **Issue #269** - Image restriction enforcement
5. **Issue #268** - Max rows validation
6. **Issue #257** - Activity logging (Audit requirement)
7. **Issue #266** - Title field consistency

### Low Priority
8. **Issue #239** - Alt text generator UI improvements
9. **Issue #262** - Workflow status persistence
10. **Issue #255** - Brand assignment UI

## Testing Recommendations

1. **Validation Testing**: Create comprehensive test suite for all field constraints
2. **Auth Flow Testing**: Test invitation → signup → login flow end-to-end
3. **Activity Logging**: Verify all actions are logged correctly
4. **Performance Testing**: Ensure activity queries don't impact performance
5. **UI/UX Testing**: Verify all new UI elements are responsive and accessible

## Deployment Considerations

1. **Database Migrations**: Run in order, test rollback procedures
2. **Feature Flags**: Consider rolling out activity logging gradually
3. **Monitoring**: Add alerts for failed invitations and deactivations
4. **Documentation**: Update user guides for new features
5. **Training**: Prepare admin training for user management features