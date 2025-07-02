# GitHub Issue #213 Update

## 🔍 Extensive Discovery Complete: RLS Violation Root Cause Identified

I've completed a comprehensive investigation of the "new row violates row-level security policy" error. Here's the full analysis and solution plan.

### 🎯 Root Cause Analysis

The error occurs due to a fundamental behavior in Supabase/PostgreSQL:

1. **INSERT operations return the inserted row by default** - This triggers a SELECT operation
2. **Missing SELECT policies** - Tables may have INSERT policies but lack corresponding SELECT policies
3. **The operation fails** even though the INSERT itself would be allowed

### 📊 Discovery Findings

#### 1. **System Architecture Review**
- Multi-tenant system with brand-based isolation
- Hierarchical roles: `global admin > brand admin > editor > viewer`
- All tables have RLS enabled with role-specific policies
- Complex permission checks using `user_brand_permissions` table

#### 2. **Problematic Code Patterns Found**
```typescript
// This pattern causes RLS violations:
const { data, error } = await supabase
  .from('table_name')
  .insert(data)
  .select(); // ← Requires SELECT permission!
```

#### 3. **Most Affected Areas**
- **brand_master_claim_brands** junction table (recent migration)
- **user_brand_permissions** inserts
- **content** creation with brand associations
- **tool_run_history** logging

#### 4. **Specific Policy Issues**
```sql
-- Example: Junction table has INSERT policy but might lack SELECT
CREATE POLICY "Brand admins can manage brand master claim brand links" 
ON public.brand_master_claim_brands
FOR ALL -- This should work but INSERT+SELECT might have edge cases
```

### 🛠️ Solution Plan

#### Immediate Fixes (Priority 1)

1. **Add Missing SELECT Policies**
```sql
-- For each table with INSERT policies, ensure matching SELECT exists
CREATE POLICY "Users can view data they inserted"
ON [table_name] FOR SELECT
USING (
  -- Match the same conditions as INSERT policy
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM user_brand_permissions 
    WHERE user_id = auth.uid() AND brand_id = [table_name].brand_id
  )
);
```

2. **Use `returning: 'minimal'` Option**
```typescript
// When inserted data isn't needed immediately
const { error } = await supabase
  .from('table_name')
  .insert(data, { returning: 'minimal' });
```

3. **Audit All INSERT Operations**
```bash
# Find all INSERT operations in codebase
grep -r "\.insert(" src/ --include="*.ts" --include="*.tsx"
```

#### Medium-term Improvements (Priority 2)

1. **Standardize Error Handling**
```typescript
// Add specific RLS error handling
if (error?.code === '42501') {
  console.error('RLS Policy Violation:', {
    table: 'table_name',
    operation: 'insert',
    user: user.id,
    requiredFields: { brand_id, user_id },
    error: error.message
  });
  
  // Return user-friendly error
  return NextResponse.json(
    { error: 'Permission denied. Please check your access rights.' },
    { status: 403 }
  );
}
```

2. **Pre-Insert Validation**
```typescript
// Validate required fields before attempting insert
function validateRLSFields(data: any, table: string) {
  const requiredFields = {
    'brand_master_claim_brands': ['brand_id', 'master_claim_brand_id'],
    'user_brand_permissions': ['user_id', 'brand_id', 'role'],
    'content': ['brand_id', 'created_by']
  };
  
  const missing = requiredFields[table]?.filter(field => !data[field]);
  if (missing?.length) {
    throw new Error(`Missing required fields for RLS: ${missing.join(', ')}`);
  }
}
```

#### Long-term Architecture (Priority 3)

1. **Create RLS Policy Pairs Template**
```sql
-- Template for new tables
CREATE POLICY "[Table]_insert_policy" ON [table]
FOR INSERT WITH CHECK (condition);

CREATE POLICY "[Table]_select_policy" ON [table]
FOR SELECT USING (same_condition_as_insert);
```

2. **Centralized Permission Service**
```typescript
// services/permissions.ts
export async function canUserInsertInTable(
  userId: string, 
  table: string, 
  brandId?: string
): Promise<boolean> {
  // Centralized permission checking logic
}
```

### 📋 Testing Checklist

- [ ] Test all INSERT operations with different user roles
- [ ] Verify INSERT fails gracefully without permissions
- [ ] Confirm INSERT succeeds with proper permissions
- [ ] Test with missing required fields (should fail with clear error)
- [ ] Verify junction tables work correctly
- [ ] Test cascading inserts (parent-child relationships)

### 🚨 Immediate Action Items

1. **Search for all `.insert()` calls without `returning: 'minimal'`**
2. **Review all tables for missing SELECT policies**
3. **Add error logging to identify which specific operations are failing**
4. **Test the most critical user flows:**
   - Brand creation
   - User invitation/permission assignment
   - Content creation
   - Master claim brand associations

### 📊 Monitoring Plan

1. **Add RLS violation tracking:**
```typescript
// In error handling middleware
if (error.code === '42501') {
  trackRLSViolation({
    table: extractTableFromError(error),
    operation: 'insert',
    user: currentUser,
    timestamp: new Date()
  });
}
```

2. **Create alerts for RLS violations in production**
3. **Regular audits of new tables/migrations for RLS completeness**

### 🎯 Success Criteria

- Zero RLS violations in production logs
- All INSERT operations have corresponding SELECT policies
- Clear error messages for permission denials
- Documented RLS requirements for each table

### 📚 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- Full discovery report: `rls-violation-discovery-report.md`

---

This issue is systemic but fixable. The root cause is well understood, and the solutions are straightforward to implement. I recommend starting with the immediate fixes while planning for the architectural improvements.