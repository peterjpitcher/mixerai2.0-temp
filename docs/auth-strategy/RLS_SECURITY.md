# Row Level Security (RLS) for MixerAI 2.0

This document explains the Row Level Security (RLS) policies implemented for the MixerAI 2.0 application to ensure database-level security.

## What is Row Level Security?

Row Level Security (RLS) is a feature of PostgreSQL that allows developers to define security policies that restrict which rows users can access in a database table. It ensures security rules are enforced at the database level, rather than relying solely on application code.

## Benefits of RLS

1. **Defense in Depth**: Security is implemented at both the API and database levels
2. **Reduced Attack Surface**: Even if API-level security is compromised, data remains protected
3. **Consistent Access Control**: Same security rules applied across all access paths
4. **Simplified Application Code**: Less need for filtering logic in the application

## MixerAI 2.0 RLS Implementation

### Tables with RLS Enabled

- `brands`: Brand information
- `content`: Content items
- `content_types`: Content type definitions
- `workflows`: Content workflows
- `profiles`: User profiles
- `user_brand_permissions`: User permissions for brands

### Key Policy Types

1. **View Policies**: Control which rows users can `SELECT`
2. **Modify Policies**: Control which rows users can `UPDATE`
3. **Insert Policies**: Control where users can `INSERT` new rows
4. **Delete Policies**: Control which rows users can `DELETE`

## Policy Overview

### Brands Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `brands_view_policy` | SELECT | All users can view all brands |
| `brands_modify_policy` | UPDATE | Users with admin/editor role for the brand |
| `brands_delete_policy` | DELETE | Only users with admin role for the brand |
| `brands_insert_policy` | INSERT | Only users with admin role |

### Content Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `content_view_policy` | SELECT | Users with any role for the content's brand |
| `content_modify_policy` | UPDATE | Content creator or users with admin/editor role for the brand |
| `content_insert_policy` | INSERT | Users with admin/editor role for the brand |
| `content_delete_policy` | DELETE | Content creator or users with admin role for the brand |

### Content Types Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `content_types_view_policy` | SELECT | All users |
| `content_types_modify_policy` | ALL | Only admins |

### Profiles Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `profiles_view_policy` | SELECT | All users |
| `profiles_update_policy` | UPDATE | Only the user can update their own profile |
| `profiles_insert_policy` | INSERT | System inserts profile during user registration |

### User Brand Permissions Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `permissions_view_policy` | SELECT | User's own permissions or users with admin role for the brand |
| `permissions_modify_policy` | ALL | Only users with admin role for the brand |

### Workflows Table Policies

| Policy Name | Type | Access Rule |
|-------------|------|-------------|
| `workflows_view_policy` | SELECT | Users with any role for the workflow's brand |
| `workflows_modify_policy` | ALL | Users with admin/editor role for the brand |

## Deployment

RLS policies can be deployed using the provided script:

```bash
# Deploy to local database
./scripts/deploy-rls-policies.sh local

# Deploy to production database
./scripts/deploy-rls-policies.sh production
```

## Testing

To verify the RLS policies are working as expected, use the test script:

```bash
# Test RLS on local database
./scripts/test-rls-policies.sh local

# Test RLS on production database
./scripts/test-rls-policies.sh production
```

## Common Issues

### Policies Not Applied

If RLS doesn't seem to be working, check:

1. RLS is enabled for the table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Policies exist: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Admin bypass is not enabled: `ALTER TABLE table_name FORCE ROW LEVEL SECURITY;`

### Policy Conflicts

If policies have conflicting rules, the most permissive rule wins. To debug:

1. Use the test script to verify policy behavior
2. Check all policies for a table: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`

### Client Authentication Issues

If clients are not properly authenticated:

1. Verify `auth.uid()` returns the expected user ID
2. Check that role is properly set using `SET ROLE authenticated;`
3. Verify JWT token is properly configured in the connection

## Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [MixerAI 2.0 Authentication Strategy](./AUTH_IMPLEMENTATIONS.md) 