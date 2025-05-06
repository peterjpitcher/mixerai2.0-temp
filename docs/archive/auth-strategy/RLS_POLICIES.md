# Row-Level Security (RLS) Policies

This document outlines the Row-Level Security (RLS) policies implemented in the MixerAI 2.0 application to secure database tables. These policies ensure that users can only access data they are authorized to, even if API routes are bypassed.

## Overview

Row-Level Security is a PostgreSQL feature that allows us to restrict which rows a user can access in a table. This provides an additional layer of security beyond API-level authorization checks.

## Implementation

### Brands Table

```sql
-- Enable RLS on the brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read brands they created
CREATE POLICY brands_select_own ON brands
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can update brands they created
CREATE POLICY brands_update_own ON brands
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete brands they created
CREATE POLICY brands_delete_own ON brands
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Allow admin users to read all brands
CREATE POLICY brands_select_admin ON brands
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to update all brands
CREATE POLICY brands_update_admin ON brands
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to delete all brands
CREATE POLICY brands_delete_admin ON brands
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));
```

### Content Table

```sql
-- Enable RLS on the content table
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read content they created
CREATE POLICY content_select_own ON content
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can update content they created
CREATE POLICY content_update_own ON content
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete content they created
CREATE POLICY content_delete_own ON content
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Users can read content for brands they have access to
CREATE POLICY content_select_brand_access ON content
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM brands 
    WHERE brands.id = content.brand_id 
    AND (
      brands.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_brand_permissions
        WHERE user_brand_permissions.brand_id = brands.id
        AND user_brand_permissions.user_id = auth.uid()
      )
    )
  ));

-- Policy: Allow admin users to read all content
CREATE POLICY content_select_admin ON content
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to update all content
CREATE POLICY content_update_admin ON content
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to delete all content
CREATE POLICY content_delete_admin ON content
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));
```

### User Profiles Table

```sql
-- Enable RLS on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admin users can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Admin users can update all profiles
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));
```

## Testing RLS Policies

To test these policies, you can use the Supabase dashboard to impersonate different users:

1. **Admin Impersonation Test**:
   ```sql
   -- As admin user
   SET LOCAL ROLE authenticated;
   SET LOCAL "request.jwt.claims" TO '{"sub": "<admin-user-id>"}';
   SELECT * FROM brands; -- Should see all brands
   ```

2. **Regular User Impersonation Test**:
   ```sql
   -- As regular user
   SET LOCAL ROLE authenticated;
   SET LOCAL "request.jwt.claims" TO '{"sub": "<regular-user-id>"}';
   SELECT * FROM brands; -- Should only see brands created by this user
   ```

3. **Anonymous User Test**:
   ```sql
   -- As anonymous user
   SET LOCAL ROLE anon;
   SELECT * FROM brands; -- Should return empty result unless public access policy exists
   ```

## Implementation Scripts

These policies should be applied when setting up the database or during a migration. You can use the following script to apply these policies:

```bash
#!/bin/bash
# Apply RLS policies to database

export PGPASSWORD=your_password

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f rls_policies.sql
```

Where `rls_policies.sql` contains all the SQL statements above.

## Best Practices

1. **Default Deny**: Always disable public access by default and explicitly grant permissions
2. **Principle of Least Privilege**: Grant only the minimum access needed
3. **Test Thoroughly**: Test all policies with different user roles
4. **Document All Policies**: Keep this document updated with all RLS policies
5. **Review Regularly**: Periodically review policies for security gaps

## Conclusion

These RLS policies provide a critical security layer in our application. By implementing them, we ensure that data access is controlled at the database level, independent of our API security. 