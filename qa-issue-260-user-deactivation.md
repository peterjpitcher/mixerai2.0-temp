# QA Issue #260: Deactivate User Option Missing

**Status:** CLOSED  
**Priority:** P2: Medium  
**Labels:** QA failed, ready for QA

## Issue Description
For the "User" entity, the UI currently provides a Delete option, but the Deactivate User option mentioned in the test cases is missing.

## Steps to Reproduce
1. Go to https://mixerai.orangejelly.co.uk/dashboard
2. Navigate to the User section
3. Select any user from the list
4. Observe the available actions/options for the selected user

## Expected Behavior
Deactivate User options should be available as per the test case requirements.

## Actual Behavior
For the "User" entity, the UI currently provides a Delete option, but the Deactivate User option mentioned in the test cases is missing.

## Comprehensive Technical Analysis

### Files Investigated
1. `src/app/dashboard/users/[id]/page.tsx` (User detail page with action menu)
2. `src/app/dashboard/users/page.tsx` (User list page)
3. `src/app/api/users/[id]/route.ts` (User API endpoints)
4. `src/types/supabase.ts` (Database types)
5. `supabase/migrations/` (Database schema files)

### Current Implementation Deep Dive

#### 1. Current User Actions Menu (src/app/dashboard/users/[id]/page.tsx)

The dropdown menu only has Edit and Delete options (lines 309-329):

```typescript
// Lines 307-331: Current action menu implementation
<div className="flex space-x-2">
  {userId && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={touchFriendly('tableAction')}>
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/users/${userId}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> Edit User
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setShowDeleteDialog(true)} 
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

#### 2. Delete Dialog Implementation (lines 173-209)

The current implementation only handles hard deletion:

```typescript
// Delete handler
const handleDelete = async () => {
  if (!user) return;
  
  setIsDeleting(true);
  try {
    const response = await apiFetch(`/api/users/${user.id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('User deleted successfully');
      router.push('/dashboard/users');
    } else {
      throw new Error(data.error || 'An unknown error occurred during deletion');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    toast.error(`Failed to delete user: ${(error as Error).message}`);
  } finally {
    setIsDeleting(false);
  }
};

// Delete confirmation dialog (rendered at bottom of component)
<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete User</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete {user?.full_name || user?.email}? 
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
        Cancel
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deleting...
          </>
        ) : (
          'Delete User'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 3. Current Database Schema Analysis

Looking at the Supabase types, the user table doesn't have deactivation fields:

```typescript
// From src/types/supabase.ts (inferred from usage)
interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  brand_permissions?: BrandPermission[];
  job_title?: string;
  company?: string;
  // Notice: No is_active, deactivated_at, or status field
}
```

#### 4. API Endpoint Analysis (src/app/api/users/[id]/route.ts)

The DELETE endpoint performs hard deletion:

```typescript
// Current DELETE implementation (simplified)
export const DELETE = withRouteAuth(async (req: NextRequest, user: User, context) => {
  const { params } = context;
  
  // Permission check
  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Hard delete from database
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', params.id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
});
```

### Root Cause Analysis

The deactivation feature was **never implemented**. The system only supports:
1. **Hard Deletion**: Permanently removes user from database
2. **No Soft Delete**: No way to temporarily disable users
3. **No Status Tracking**: No field to mark users as active/inactive

This is a **missing feature** rather than a bug. The test cases assumed functionality that doesn't exist.

### Complete Implementation Plan

#### Step 1: Database Schema Changes

Add deactivation fields to the users table:

```sql
-- Migration: Add deactivation support to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES public.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Update RLS policies to filter inactive users by default
CREATE POLICY "Active users only by default" ON public.users
  FOR SELECT
  USING (is_active = true OR auth.uid() = id OR 
         EXISTS (
           SELECT 1 FROM public.users admin 
           WHERE admin.id = auth.uid() 
           AND admin.user_metadata->>'role' = 'admin'
         ));
```

#### Step 2: Add Deactivation UI Components

```typescript
// Add deactivation state and dialog
const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
const [isDeactivating, setIsDeactivating] = useState(false);
const [deactivationReason, setDeactivationReason] = useState('');

// Add deactivation handler
const handleDeactivate = async () => {
  if (!user) return;
  
  setIsDeactivating(true);
  try {
    const response = await apiFetch(`/api/users/${user.id}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deactivationReason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('User deactivated successfully');
      // Refresh user data to show deactivated state
      fetchUser();
      setShowDeactivateDialog(false);
    } else {
      throw new Error(data.error || 'Failed to deactivate user');
    }
  } catch (error) {
    console.error('Error deactivating user:', error);
    toast.error(`Failed to deactivate user: ${(error as Error).message}`);
  } finally {
    setIsDeactivating(false);
  }
};

// Update dropdown menu (add between Edit and Delete)
<DropdownMenuContent align="end">
  <DropdownMenuItem asChild>
    <Link href={`/dashboard/users/${userId}/edit`}>
      <Edit className="mr-2 h-4 w-4" /> Edit User
    </Link>
  </DropdownMenuItem>
  
  {user?.is_active ? (
    <DropdownMenuItem 
      onClick={() => setShowDeactivateDialog(true)}
      className="text-warning"
    >
      <UserX className="mr-2 h-4 w-4" /> Deactivate User
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem 
      onClick={handleReactivate}
      className="text-success"
    >
      <UserCheck className="mr-2 h-4 w-4" /> Reactivate User
    </DropdownMenuItem>
  )}
  
  <DropdownMenuSeparator />
  
  <DropdownMenuItem 
    onClick={() => setShowDeleteDialog(true)} 
    className="text-destructive"
  >
    <Trash2 className="mr-2 h-4 w-4" /> Delete User
  </DropdownMenuItem>
</DropdownMenuContent>

// Add deactivation dialog
<Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Deactivate User</DialogTitle>
      <DialogDescription>
        Deactivating {user?.full_name || user?.email} will prevent them from 
        logging in and accessing the system. You can reactivate them later.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for deactivation (optional)</Label>
        <Textarea
          id="reason"
          value={deactivationReason}
          onChange={(e) => setDeactivationReason(e.target.value)}
          placeholder="e.g., Employee left company, Temporary suspension..."
          rows={3}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
        Cancel
      </Button>
      <Button 
        variant="warning"
        onClick={handleDeactivate}
        disabled={isDeactivating}
      >
        {isDeactivating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deactivating...
          </>
        ) : (
          'Deactivate User'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Step 3: Create Deactivation API Endpoints

```typescript
// src/app/api/users/[id]/deactivate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRouteAuth } from '@/lib/auth/route-handlers';

export const POST = withRouteAuth(async (req: NextRequest, user: User, context) => {
  const { params } = context as { params: { id: string } };
  const { reason } = await req.json();
  
  try {
    // Check permissions
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can deactivate users' },
        { status: 403 }
      );
    }
    
    // Prevent self-deactivation
    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseServerClient();
    
    // Update user status
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        deactivation_reason: reason || null
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'user.deactivated',
        performed_by: user.id,
        target_id: params.id,
        metadata: { reason }
      });
    
    // Revoke all active sessions for the deactivated user
    await supabase.auth.admin.signOut(params.id);
    
    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Deactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
});

// src/app/api/users/[id]/reactivate/route.ts
export const POST = withRouteAuth(async (req: NextRequest, user: User, context) => {
  const { params } = context as { params: { id: string } };
  
  try {
    // Check permissions
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can reactivate users' },
        { status: 403 }
      );
    }
    
    const supabase = createSupabaseServerClient();
    
    // Update user status
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: true,
        reactivated_at: new Date().toISOString(),
        reactivated_by: user.id
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'user.reactivated',
        performed_by: user.id,
        target_id: params.id
      });
    
    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Reactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reactivate user' },
      { status: 500 }
    );
  }
});
```

#### Step 4: Update User List to Show Status

```typescript
// In src/app/dashboard/users/page.tsx
// Add status badge to user list
<TableCell>
  {user.is_active ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="secondary">Deactivated</Badge>
  )}
</TableCell>

// Add filter for active/inactive users
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

const filteredUsers = users.filter(user => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'active') return user.is_active !== false;
  if (statusFilter === 'inactive') return user.is_active === false;
  return true;
});
```

#### Step 5: Update Authentication Middleware

```typescript
// In src/lib/auth/middleware.ts
// Check if user is active during login
export async function validateUserSession(userId: string) {
  const supabase = createSupabaseServerClient();
  
  const { data: user } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', userId)
    .single();
  
  if (!user?.is_active) {
    throw new Error('Your account has been deactivated. Please contact an administrator.');
  }
  
  return true;
}
```

### Visual Status Indicators

```typescript
// Add visual indicator for deactivated users
{!user.is_active && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>User Deactivated</AlertTitle>
    <AlertDescription>
      This user was deactivated on {formatDate(user.deactivated_at)} 
      {user.deactivation_reason && (
        <span className="block mt-1">
          Reason: {user.deactivation_reason}
        </span>
      )}
    </AlertDescription>
  </Alert>
)}
```

### Testing Requirements

1. **Unit Tests**:
   - Test deactivation/reactivation API endpoints
   - Test permission checks (only admins can deactivate)
   - Test self-deactivation prevention

2. **Integration Tests**:
   - Test that deactivated users cannot log in
   - Test that deactivated users are filtered from lists
   - Test session revocation on deactivation

3. **E2E Tests**:
   - Full deactivation flow from UI
   - Reactivation flow
   - Verify audit logging

### Additional Considerations for Senior Review

1. **Cascade Effects**:
   - What happens to content created by deactivated users?
   - Should workflow assignments be reassigned?
   - How to handle pending invitations from deactivated users?

2. **Compliance & Legal**:
   - Data retention policies for deactivated users
   - Right to be forgotten vs audit trail requirements
   - Export user data before deactivation?

3. **Performance Impact**:
   - Index on is_active field for query performance
   - Consider archiving old deactivated users
   - Impact on existing queries that don't filter by status

4. **Business Logic**:
   - Auto-deactivation after X days of inactivity?
   - Bulk deactivation capabilities?
   - Scheduled deactivation (e.g., contractor end date)?

5. **Security Considerations**:
   - Immediate session termination on deactivation
   - API token revocation
   - Clear browser cache/cookies

6. **UX Improvements**:
   - Show last activity before deactivation
   - Email notification to deactivated user?
   - Deactivation history/audit trail in UI

### Migration Strategy

1. **Phase 1**: Add database fields with defaults (all users active)
2. **Phase 2**: Deploy API endpoints
3. **Phase 3**: Update UI with deactivation options
4. **Phase 4**: Update authentication middleware
5. **Phase 5**: Add filtering and status indicators

### Recommended Approach

Implement the full solution as described, but consider:
1. **Start with soft delete only** - Don't remove hard delete yet
2. **Add feature flag** - Roll out gradually to test
3. **Audit everything** - Log all deactivation/reactivation events
4. **Clear communication** - Update user documentation
5. **Backward compatibility** - Ensure existing integrations work

This is a significant feature addition that touches authentication, authorization, and user management. It requires careful planning and testing to ensure no disruption to existing users.

---

## Senior Developer Feedback

### TL;DR

The feature is genuinely **missing** (not a visibility bug). Implement **soft-deactivate** with one tiny schema change, a pair of API endpoints, a UI action, and a session check. Avoids risky hard delete, works with your existing auth, and is easy to QA.

### 1. Minimal Schema (One Column + Index)

Add a single flag to `public.users` and index it. No need to over-specify audit columns day one.

```sql
-- 20250830_add_is_active_to_users.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users (is_active);
```

*Why:* keeps queries snappy and gives you an unambiguous switch. You can add `deactivated_at/by` later if you want fuller audit.

### 2. Two Tiny Endpoints (Deactivate / Reactivate)

Server-only, admin-gated, and revokes sessions when deactivating.

```typescript
// src/app/api/users/[id]/deactivate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRouteAuth } from '@/lib/auth/route-handlers';

export const POST = withRouteAuth(async (_req: NextRequest, currentUser, { params }) => {
  if (currentUser.user_metadata?.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Only admins can deactivate users' }, { status: 403 });

  if (currentUser.id === params.id)
    return NextResponse.json({ success: false, error: 'You cannot deactivate your own account' }, { status: 400 });

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', params.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

  // Kill existing sessions
  try { await supabase.auth.admin.signOut(params.id); } catch { /* best-effort */ }

  return NextResponse.json({ success: true });
});
```

```typescript
// src/app/api/users/[id]/reactivate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withRouteAuth } from '@/lib/auth/route-handlers';

export const POST = withRouteAuth(async (_req: NextRequest, currentUser, { params }) => {
  if (currentUser.user_metadata?.role !== 'admin')
    return NextResponse.json({ success: false, error: 'Only admins can reactivate users' }, { status: 403 });

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', params.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
});
```

### 3. UI: Add "Deactivate / Reactivate" to the User Actions

One extra menu item + a simple confirm dialog. Keep *Delete* (hard delete) as a separate, clearly destructive path.

```tsx
// src/app/dashboard/users/[id]/page.tsx (within the actions menu)
<DropdownMenuContent align="end">
  <DropdownMenuItem asChild>
    <Link href={`/dashboard/users/${userId}/edit`}>
      <Edit className="mr-2 h-4 w-4" /> Edit User
    </Link>
  </DropdownMenuItem>

  {user?.is_active ? (
    <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)}>
      <UserX className="mr-2 h-4 w-4" /> Deactivate User
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem onClick={handleReactivate}>
      <UserCheck className="mr-2 h-4 w-4" /> Reactivate User
    </DropdownMenuItem>
  )}

  <DropdownMenuSeparator />

  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
    <Trash2 className="mr-2 h-4 w-4" /> Delete User
  </DropdownMenuItem>
</DropdownMenuContent>
```

```tsx
// handlers + dialog (snippet)
const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
const [isDeactivating, setIsDeactivating] = useState(false);

const handleDeactivate = async () => {
  if (!user) return;
  setIsDeactivating(true);
  const res = await apiFetch(`/api/users/${user.id}/deactivate`, { method: 'POST' });
  const data = await res.json();
  setIsDeactivating(false);
  if (!data.success) return toast.error(data.error || 'Failed to deactivate');
  toast.success('User deactivated');
  router.refresh();
  setShowDeactivateDialog(false);
};

const handleReactivate = async () => {
  if (!user) return;
  const res = await apiFetch(`/api/users/${user.id}/reactivate`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) return toast.error(data.error || 'Failed to reactivate');
  toast.success('User reactivated');
  router.refresh();
};

// Dialog
<Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Deactivate User</DialogTitle>
      <DialogDescription>
        This will immediately sign the user out and block access until reactivated.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>Cancel</Button>
      <Button onClick={handleDeactivate} disabled={isDeactivating}>
        {isDeactivating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deactivating…</>) : 'Deactivate User'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Also show status on the profile/list:

```tsx
{/* detail header badge */}
{user?.is_active === false && <Badge variant="secondary">Deactivated</Badge>}

// list cell
<TableCell>{user.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Deactivated</Badge>}</TableCell>
```

### 4. Session Gate (Prevent Deactivated Users from Using the App)

Add a single check where you already resolve the current user (middleware or server layout). If the DB row says inactive, end the session and bounce.

```typescript
// e.g., in a shared server util called during layout/middleware
export async function assertActiveUserOrThrow(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', userId)
    .single();

  if (error || data?.is_active === false) {
    // Best-effort: kill their current session
    try { await supabase.auth.signOut(); } catch {}
    throw new Error('Account deactivated');
  }
}
```

Call this wherever you already gate access; show a friendly message on redirect: *"Your account has been deactivated. Please contact an administrator."*

*(Optional later: tighten RLS to filter out inactive users from lists by default. Not required to pass QA.)*

### QA Acceptance Checklist

- [ ] "Deactivate User" appears in the user actions menu when the user is active
- [ ] Clicking **Deactivate** confirms, then the user status flips to *Deactivated* and they are signed out if currently logged in
- [ ] "Reactivate User" appears for deactivated accounts and flips them back to *Active*
- [ ] The user list shows an **Active/Deactivated** badge
- [ ] Deactivated users cannot access authenticated pages; they're redirected with a clear message
- [ ] Admins only can deactivate/reactivate; self-deactivation is blocked

### Why This Is the *Minimal* Safe Slice

* One column + small index; simple endpoints; tiny UI change
* No changes to Supabase Auth schema; session revocation handled server-side
* Clear separation from destructive "Delete", so you can keep both paths

If you want to extend later (reasons, timestamps, audit log), bolt those fields on in a follow-up migration without touching the UI affordance that QA needs today.