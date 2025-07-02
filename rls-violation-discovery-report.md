# RLS Violation Discovery Report: Issue #213

Date: 2025-07-01
Developer: Claude

## Executive Summary

The "new row violates row-level security policy" error in issue #213 is a Supabase Row Level Security (RLS) policy violation that occurs during INSERT operations. Based on extensive discovery, this error happens when:

1. A user attempts to insert data without proper permissions defined in RLS policies
2. The INSERT operation returns data (default behavior) but there's no corresponding SELECT policy
3. Required fields for RLS policy evaluation (like user_id, brand_id) are missing or incorrect

## System State Analysis

### Current RLS Architecture
- **Multi-tenant system** with brand-based isolation
- **Hierarchical role system**: global admin > brand admin > editor > viewer
- **All tables have RLS enabled** with specific policies for each role
- **Complex permission checks** involving both user_brand_permissions and user metadata

### Key Tables with RLS Policies
1. **brands** - Admin-only insert/update/delete, public read
2. **content** - Editor/Admin insert/update, Admin delete, public read
3. **user_brand_permissions** - Global admin management
4. **master_claim_brands** - Global admin full access
5. **brand_master_claim_brands** - Junction table with brand-based permissions
6. **tool_run_history** - User-specific access policies

## Root Cause Analysis

### Primary Causes of RLS Violations

1. **Insert-Select Policy Mismatch**
   - Supabase INSERT operations by default return the inserted row
   - This requires both INSERT and SELECT policies
   - Missing SELECT policy causes "row violates RLS" error even when INSERT is allowed

2. **Missing Required Fields**
   - RLS policies often check user_id or brand_id
   - If these fields are null or incorrect during insert, policies fail
   - Common in junction tables or related data inserts

3. **Permission Context Issues**
   - Using wrong Supabase client (anon vs service role vs admin)
   - JWT token missing required claims
   - User metadata not properly set

4. **Cascading Permission Conflicts**
   - Related tables have different RLS policies
   - Parent-child relationships where child insert requires parent access

## Specific Problem Areas Identified

### 1. Brand Master Claim Brands Junction Table
```sql
-- Recent migration shows complex RLS policy
CREATE POLICY "Brand admins can manage brand master claim brand links" 
ON public.brand_master_claim_brands
FOR ALL
USING (
    auth.uid() IN (
        SELECT user_id FROM public.user_brand_permissions 
        WHERE brand_id = brand_master_claim_brands.brand_id AND role = 'admin'
    )
    OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);
```
**Issue**: INSERT requires brand_id to be set correctly for policy evaluation

### 2. API Route Patterns
Most API routes use `createSupabaseAdminClient()` which bypasses RLS, but some operations might be using regular client or have complex permission checks.

### 3. Common Error Scenarios
- Creating brands without proper admin role
- Inserting content without brand context
- Adding user permissions without global admin role
- Creating relationships in junction tables

## Action Plan

### Immediate Fixes

1. **Audit All INSERT Operations**
   ```typescript
   // Check for patterns like:
   const { data, error } = await supabase
     .from('table_name')
     .insert(data)
     .select(); // This requires SELECT policy!
   ```

2. **Add Missing SELECT Policies**
   ```sql
   -- For tables that only have INSERT policies
   CREATE POLICY "Users can view their inserted data"
   ON table_name FOR SELECT
   USING (auth.uid() = user_id OR conditions_matching_insert_policy);
   ```

3. **Use `returning: 'minimal'` Where Appropriate**
   ```typescript
   // When you don't need the inserted data back
   const { error } = await supabase
     .from('table_name')
     .insert(data, { returning: 'minimal' });
   ```

### Long-term Solutions

1. **Standardize RLS Policy Patterns**
   - Create consistent policy pairs (INSERT + SELECT)
   - Document required fields for each table
   - Use database functions for complex permission checks

2. **Improve Error Handling**
   ```typescript
   if (error?.code === '42501') {
     // RLS violation - provide specific error message
     console.error('RLS Policy Violation:', {
       table: 'table_name',
       operation: 'insert',
       user: user.id,
       context: { brand_id, other_fields }
     });
   }
   ```

3. **Add Pre-Insert Validation**
   ```typescript
   // Validate required fields before insert
   if (!data.brand_id || !data.user_id) {
     throw new Error('Missing required fields for RLS policy');
   }
   ```

4. **Create Helper Functions**
   ```typescript
   // Centralize permission checks
   async function canUserInsertInBrand(userId: string, brandId: string) {
     // Check user_brand_permissions
     // Return boolean
   }
   ```

## Testing Strategy

1. **Unit Tests for Each Table**
   - Test INSERT with valid permissions
   - Test INSERT without permissions (should fail)
   - Test INSERT with missing fields

2. **Integration Tests**
   - Test complete workflows (create brand → add users → create content)
   - Test permission boundaries

3. **RLS Policy Tests**
   ```sql
   -- Test policies directly in SQL
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claims.sub TO 'user-id';
   -- Try insert operations
   ```

## Monitoring & Prevention

1. **Add Detailed Logging**
   - Log all RLS violations with context
   - Track which tables/operations fail most
   - Monitor permission check performance

2. **Pre-deployment Checks**
   - Validate all new tables have proper RLS policies
   - Ensure INSERT policies have matching SELECT policies
   - Test with different user roles

3. **Documentation**
   - Document RLS requirements for each table
   - Create RLS policy templates
   - Maintain permission matrix

## Conclusion

The RLS violation error is likely caused by:
1. Missing SELECT policies for INSERT operations
2. Incorrect or missing required fields (brand_id, user_id)
3. Complex permission requirements in junction tables

The fix requires:
1. Auditing all INSERT operations
2. Adding missing SELECT policies
3. Implementing proper error handling
4. Standardizing RLS patterns across the application

This is a systemic issue that requires both immediate tactical fixes and long-term architectural improvements to prevent recurrence.