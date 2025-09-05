# MixerAI 2.0 - QA Issues Analysis & Fix Report
*Date: December 2024*  
*Total Issues: 20 (8 Critical, 12 Medium)*

---

## 🔴 CRITICAL ISSUES (P1 - High Priority)

### Issue #261: Deleted Users Appear in Workflow Assignment [QA BLOCKED]
**Problem:** When assigning users to workflow steps, deleted/deactivated users still appear in the dropdown, allowing invalid assignments.

**Current Code:**
```typescript
// src/app/api/users/search/route.ts
const { data: users } = await supabase
  .from('users')
  .select('id, email, full_name')
  .ilike('email', `%${searchTerm}%`)
  .limit(10);
```

**Root Cause:** No filtering for user status or deletion state.

**Fix Required:**
```typescript
const { data: users } = await supabase
  .from('users')
  .select('id, email, full_name, status')
  .ilike('email', `%${searchTerm}%`)
  .is('deleted_at', null)  // Add deletion check
  .eq('status', 'active')  // Add status check
  .limit(10);
```

---

### Issue #254: Workflow Role Assignments Not Persisting
**Problem:** User roles assigned during workflow creation don't save correctly on first attempt. Works only after subsequent edit.

**Current Code:**
```typescript
// Workflow creation RPC
const rpcParams = {
  workflow_name: body.name,
  workflow_steps: body.steps.map(step => ({
    name: step.name,
    type: step.type,
    assigned_user_ids: step.assignedUserIds,
    // Missing: role field not being passed
  }))
};
```

**Fix Required:**
```typescript
const rpcParams = {
  workflow_name: body.name,
  workflow_steps: body.steps.map(step => ({
    name: step.name,
    type: step.type,
    assigned_user_ids: step.assignedUserIds,
    assigned_roles: step.assignedRoles, // Add role persistence
    step_metadata: {
      roles: step.assignedRoles,
      permissions: step.permissions
    }
  }))
};
```

---

### Issue #252: Workflow Email Notifications Not Sent
**Problem:** No emails sent when content moves through workflow approval stages.

**Current Implementation Gap:**
```typescript
// src/app/api/content/[id]/workflow-action/route.ts
if (action === 'approve') {
  // Update workflow status
  await updateWorkflowStatus(contentId, 'approved');
  // MISSING: Email notification to next reviewer
}
```

**Fix Required:**
```typescript
import { NotificationHelpers } from '@/lib/notifications';

if (action === 'approve') {
  await updateWorkflowStatus(contentId, 'approved');
  
  // Add email notification
  const nextStep = await getNextWorkflowStep(contentId);
  if (nextStep?.assignedUsers) {
    for (const userId of nextStep.assignedUsers) {
      await NotificationHelpers.reviewRequired({
        userId,
        contentId,
        contentTitle: content.title,
        workflowStep: nextStep.name,
        brandName: brand.name
      });
    }
  }
}
```

---

### Issue #248: Brand Placeholder Buttons Not Clickable
**Problem:** In template designer, brand placeholder insertion buttons appear but don't respond to clicks.

**Current Code:**
```typescript
// src/components/template/field-designer-original.tsx
<Button
  size="xs"
  variant="outline"
  className="text-xs"
  // onClick handler missing or not bound properly
>
  Brand Name
</Button>
```

**Fix Required:**
```typescript
<Button
  size="xs"
  variant="outline"
  className="text-xs"
  type="button" // Prevent form submission
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    insertBrandDataOrPlaceholder('{{brand_name}}');
  }}
>
  Brand Name
</Button>
```

---

### Issue #247: AI Features Checkbox State Lost
**Problem:** "Brand Context for AI" checkbox appears unchecked when editing template, even if it was checked during creation.

**Current Code:**
```typescript
// Template save doesn't include AI features
const templateData = {
  name: formData.name,
  inputFields: formData.inputFields,
  outputFields: formData.outputFields,
  // AI features missing
};
```

**Fix Required:**
```typescript
const templateData = {
  name: formData.name,
  inputFields: formData.inputFields.map(field => ({
    ...field,
    aiFeatures: {
      useBrandIdentity: field.useBrandIdentity || false,
      useToneOfVoice: field.useToneOfVoice || false,
      useGuardrails: field.useGuardrails || false
    }
  })),
  outputFields: // Same mapping for output fields
};

// On load:
const loadedField = {
  ...fieldData,
  useBrandIdentity: fieldData.aiFeatures?.useBrandIdentity || false,
  // Map other AI features
};
```

---

### Issue #238: Alt Text Language Detection Shows Wrong Language
**Problem:** French text in images shows "en" instead of "fr" in detected language column.

**Current Code:**
```typescript
// Language determined from URL, not content
const detectedLanguage = getLangCountryFromUrl(imageUrl); // Returns "en" for .com domains
return {
  altText: generatedText,
  detectedLanguage: detectedLanguage // Wrong source
};
```

**Fix Required:**
```typescript
// Use AI's actual language detection
const aiResponse = await generateAltText(imageUrl, {
  detectLanguage: true
});

return {
  altText: aiResponse.text,
  detectedLanguage: aiResponse.detectedLanguage || 'en' // Use AI detection
};
```

---

### Issue #237: Alt Text "Open Image Link" Error 1011
**Problem:** Clicking "Open Image Link" causes CORS/security error page.

**Current Code:**
```typescript
// Complex HTML injection causing security issues
const newWindow = window.open('', '_blank');
newWindow.document.write(`
  <html><body><img src="${imageUrl}" /></body></html>
`);
```

**Fix Required:**
```typescript
// Simple direct navigation
const handleOpenImage = (imageUrl: string) => {
  try {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    // Fallback: Create download link
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }
};
```

---

### Issue #233: Template Dropdown Shows No Templates
**Problem:** Content creation template dropdown is empty, no templates displayed.

**Current Code:**
```typescript
// API returns different structure than expected
// Frontend expects:
const templates = response.templates;

// But API returns:
return NextResponse.json({ 
  success: true, 
  data: templatesArray // Mismatch!
});
```

**Fix Required:**
```typescript
// Option 1: Fix API response
return NextResponse.json({ 
  success: true, 
  templates: templatesArray // Match expected key
});

// Option 2: Fix frontend
const templates = response.data || response.templates || [];
```

---

## 🟡 MEDIUM PRIORITY ISSUES (P2)

### Issue #269: "Allow Images" Checkbox Not Enforced
**Problem:** Rich text editor allows image insertion even when checkbox is unchecked.

**Current Code:**
```typescript
// Default allows images unless explicitly false
<QuillEditor
  allowImages={richTextOptions?.allowImages !== false} // Defaults to true
/>
```

**Fix Required:**
```typescript
// Only allow if explicitly enabled
<QuillEditor
  allowImages={richTextOptions?.allowImages === true} // Defaults to false
/>
```

---

### Issue #268: Max Rows Limit Not Enforced
**Problem:** Text areas accept more rows than configured maximum.

**Current Code:**
```typescript
// Property name mismatch
const maxRows = longTextOptions?.maxRows; // Looking for 'maxRows'
// But template stores as 'rows'
```

**Fix Required:**
```typescript
// Standardize property name
const maxRows = longTextOptions?.maxRows || longTextOptions?.rows;

// Enforce in textarea
<textarea
  rows={Math.min(currentRows, maxRows)}
  onInput={(e) => {
    const lineCount = e.target.value.split('\n').length;
    if (lineCount > maxRows) {
      e.target.value = e.target.value.split('\n').slice(0, maxRows).join('\n');
    }
  }}
/>
```

---

### Issue #267: AI Suggestions Exceed Max Length
**Problem:** AI-generated text ignores character limit constraints.

**Current Code:**
```typescript
// Weak constraint in prompt
const prompt = `Generate text (max ${maxLength} characters)`;
// Then harsh truncation
if (result.length > maxLength) {
  result = result.substring(0, maxLength); // Cuts mid-word
}
```

**Fix Required:**
```typescript
const prompt = `Generate text with EXACTLY ${maxLength} characters or less. 
This is a strict requirement. Do not exceed ${maxLength} characters.`;

// Retry logic
let attempts = 0;
while (result.length > maxLength && attempts < 3) {
  result = await generateWithShorterPrompt(maxLength);
  attempts++;
}

// Smart truncation as last resort
if (result.length > maxLength) {
  result = smartTruncate(result, maxLength); // Preserve word boundaries
}
```

---

### Issue #266: Unexpected "Title" Field Appears
**Problem:** A "Title" field appears in output section without being configured.

**Likely Cause:**
```typescript
// Hardcoded default field
const defaultOutputFields = [
  { id: 'title', name: 'Title', type: 'shortText', required: true },
  ...userDefinedFields
];
```

**Fix Required:**
```typescript
// Use only user-defined fields
const outputFields = userDefinedFields; // No defaults
```

---

### Issue #262: Workflow Status Shows "Draft" Instead of "Active"
**Problem:** Workflows saved as "Active" appear as "Draft" when reopened.

**Current Code:**
```typescript
// Save sends 'active' but load shows 'draft'
const [status, setStatus] = useState('active'); // Default
// But loaded data might override incorrectly
```

**Fix Required:**
```typescript
// Ensure status persists correctly
const saveWorkflow = async (data) => {
  const payload = {
    ...data,
    status: data.status || 'active', // Preserve status
    published_at: data.status === 'active' ? new Date() : null
  };
};

// On load:
setStatus(workflow.status || 'draft'); // Use saved status
```

---

### Issue #260: Missing "Deactivate User" Option
**Problem:** Only "Delete User" shown, no deactivation option.

**Current Implementation:**
```typescript
<DropdownMenu>
  <DropdownMenuItem>Edit User</DropdownMenuItem>
  <DropdownMenuItem className="text-red-600">Delete User</DropdownMenuItem>
  {/* Missing: Deactivate option */}
</DropdownMenu>
```

**Fix Required:**
```typescript
<DropdownMenu>
  <DropdownMenuItem>Edit User</DropdownMenuItem>
  <DropdownMenuItem onClick={handleDeactivate}>
    Deactivate User
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem className="text-red-600">
    Delete User (Permanent)
  </DropdownMenuItem>
</DropdownMenu>

const handleDeactivate = async () => {
  await fetch(`/api/users/${userId}/deactivate`, { method: 'POST' });
  // Update UI
};
```

---

### Issue #257: User Activity Log Not Limited to 30 Days
**Problem:** Shows all historical activity instead of last 30 days.

**Current Code:**
```typescript
// No date filtering
const { data: activities } = await supabase
  .from('user_activity')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Fix Required:**
```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: activities } = await supabase
  .from('user_activity')
  .select('*')
  .eq('user_id', userId)
  .gte('created_at', thirtyDaysAgo.toISOString()) // Add date filter
  .order('created_at', { ascending: false });
```

---

### Issue #255: Brand Assignment Missing in Edit Mode
**Problem:** Can't modify user's brand assignments when editing.

**Fix Required:**
```typescript
// Add brand assignment component to edit form
<FormField
  label="Assigned Brands"
  name="brandIds"
>
  <MultiSelect
    options={availableBrands}
    selected={userBrands}
    onChange={setUserBrands}
  />
</FormField>
```

---

### Issue #241: Invitation Link Redirects to Login
**Problem:** Should redirect to password setup, not login.

**Current Code:**
```typescript
// Invitation token not properly handled
if (invitationToken) {
  redirect('/auth/login'); // Wrong destination
}
```

**Fix Required:**
```typescript
if (invitationToken) {
  // Validate token
  const invitation = await validateInvitation(invitationToken);
  if (invitation.valid) {
    redirect(`/auth/accept-invite?token=${invitationToken}`);
  }
}
```

---

### Issue #239: Alt Text Image Preview Not Working
**Problem:** Image preview broken, URLs truncated.

**Fix Required:**
```typescript
// Ensure full URL displayed and preview works
<div className="image-preview">
  {imageUrl && (
    <>
      <img 
        src={imageUrl} 
        alt="Preview"
        onError={(e) => {
          e.target.style.display = 'none';
          setPreviewError(true);
        }}
      />
      <input 
        value={imageUrl} 
        readOnly
        className="w-full" // Full width to show complete URL
      />
    </>
  )}
</div>
```

---

### Issue #274: Alt Text Character Limit (125 chars)
**Problem:** No enforcement of 125-character limit for accessibility/SEO.

**Fix Required:**
```typescript
const MAX_ALT_TEXT_LENGTH = 125;

// In AI prompt:
const prompt = `Generate alt text under ${MAX_ALT_TEXT_LENGTH} characters...`;

// Validation:
const validateAltText = (text: string) => {
  if (text.length > MAX_ALT_TEXT_LENGTH) {
    return text.substring(0, MAX_ALT_TEXT_LENGTH - 3) + '...';
  }
  return text;
};

// UI indicator:
<span className={altText.length > 125 ? 'text-red-500' : ''}>
  {altText.length}/125 characters
</span>
```

---

### Issue #272: Session Not Persisting 24 Hours
**Problem:** Sessions expire in 6-12 hours instead of 24.

**Current Issue:**
```typescript
// Using Supabase defaults (1 hour token)
const supabase = createBrowserClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
    // Missing explicit session duration config
  }
});
```

**Fix Required:**
```typescript
// Add session monitoring and refresh
const supabase = createBrowserClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    sessionRefreshThreshold: 300, // Refresh 5 min before expiry
    storage: customStorage // Implement 24-hour aware storage
  }
});

// Add background refresh
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.auth.refreshSession();
  }
}, 30 * 60 * 1000); // Every 30 minutes
```

---

## 📊 Summary & Recommendations

### Critical Path Items (Block User Work):
1. **#233** - Template dropdown (users can't create content)
2. **#252** - Email notifications (workflow approvals stuck)
3. **#261** - Deleted users issue (invalid assignments)
4. **#272** - Session timeout (users getting logged out)

### Quick Wins (< 1 hour each):
- #269 - Change default boolean
- #260 - Add menu option
- #266 - Remove hardcoded field
- #237 - Simplify window.open

### Complex Fixes (Need careful testing):
- #254 - Workflow role persistence (database schema)
- #247, #248 - Template AI features (state management)
- #241 - Invitation flow (auth system)

### Recommended Fix Order:
**Week 1:** Fix blocking issues (#233, #252, #272)  
**Week 2:** Fix workflow issues (#261, #254)  
**Week 3:** Fix template issues (#247, #248, #269, #268, #267)  
**Week 4:** Fix remaining UI/UX issues

## Implementation Risk Matrix

| Issue | Risk | Testing Required | Database Changes |
|-------|------|-----------------|------------------|
| #233 | Low | API response validation | No |
| #252 | Medium | Email delivery testing | No |
| #261 | Low | User search filtering | No |
| #254 | High | Workflow creation flow | Yes (metadata) |
| #247/248 | Medium | Template save/load cycle | Yes (schema) |
| #272 | High | Session persistence | No |
| #241 | High | Auth flow testing | No |

## Testing Checklist for Each Fix

### Before Deployment:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases verified
- [ ] Performance impact assessed
- [ ] Security implications reviewed
- [ ] Rollback plan prepared

### After Deployment:
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify fix in production
- [ ] Update QA team
- [ ] Close GitHub issue

## Technical Debt Identified

1. **Inconsistent API Response Structures**: Need to standardize on `data` vs specific keys
2. **Missing Integration Tests**: Workflow email notifications have no tests
3. **State Management Complexity**: Template AI features need refactoring
4. **Session Management**: Should be centralized with proper monitoring
5. **Missing User Activity Tracking**: Need comprehensive audit logging

## Recommended Architecture Improvements

1. **Implement API Response Standard**:
   ```typescript
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
     metadata?: Record<string, any>;
   }
   ```

2. **Create Notification Service**:
   - Centralized email queue
   - Template management
   - Delivery tracking
   - Retry logic

3. **Improve Session Management**:
   - Custom session provider
   - Activity-based renewal
   - Proper timeout handling
   - Session analytics

4. **Add Comprehensive Testing**:
   - E2E tests for critical paths
   - Integration tests for workflows
   - Load testing for AI features
   - Security testing for auth flows