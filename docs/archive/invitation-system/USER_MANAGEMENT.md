# User Management in MixerAI 2.0

This document outlines the user management system in MixerAI 2.0, including user roles, the invitation process, profile management, and database requirements.

## User Roles

MixerAI 2.0 supports three user roles:

1. **Admin**: Full access to all features, including user management, brands, workflows, and content.
2. **Editor**: Can create and edit content, review content, and manage workflows.
3. **Viewer**: Read-only access to content and workflows.

## User Invitation Process

### Sending Invitations

1. Only users with Admin role can invite new users.
2. Navigate to `/users` and click the "Invite User" button.
3. Complete the invitation form:
   - Email address (required)
   - Full name (optional)
   - Role (required: Admin, Editor, or Viewer)
   - Assign to Brand (optional)
4. When submitted, an invitation email is sent to the user with a unique link.

### Accepting Invitations

1. The invitee receives an email with a link to accept the invitation.
2. Clicking the link takes them to `/auth/confirm?token=[token]`.
3. On this page, the user must set:
   - Full name (if not already provided)
   - Job title (required)
   - Password (required)
4. After setting these details, the user's account is activated and they are redirected to the dashboard.

## User Profile Fields

The user profile contains the following fields:

| Field Name | Description | Required | Location |
|------------|-------------|----------|----------|
| id | Unique identifier | Yes | auth.users, profiles |
| email | User's email address | Yes | auth.users, profiles |
| full_name | User's full name | Yes | auth.users (metadata), profiles |
| job_title | User's job title or role | Yes | auth.users (metadata), profiles |
| avatar_url | URL to user's profile picture | No | profiles |
| role | System role (admin, editor, viewer) | Yes | user_brand_permissions |
| created_at | Account creation timestamp | Yes | auth.users, profiles |
| updated_at | Last update timestamp | Yes | profiles |

### Job Title Field

The `job_title` field is required for all users and is stored in:

1. `auth.users` table as part of the user metadata
2. `profiles` table as a dedicated column

This field was added to the system after the initial release, so existing databases may need a migration to add this column.

## Database Requirements

### Profiles Table Structure

The `profiles` table must include the `job_title` column:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Running the Migration Script

If your database is missing the `job_title` column, you can add it using the migration script:

```bash
# For local PostgreSQL database
./scripts/run-job-title-migration.sh

# For Supabase, copy and run the SQL in the Supabase dashboard
cat migrations/add_job_title_if_missing.sql
```

The migration script is idempotent and can be run multiple times without causing errors.

## Managing Users

### Viewing Users

Admin users can view all users in the system by navigating to `/users`. This page displays:

- User name and avatar
- Email address
- System role
- Last login time
- Actions (Edit, Delete)

### Editing Users

1. Click the "Edit" button for a user on the users page.
2. Admin users can modify:
   - Full name
   - Job title
   - System role
3. Users can edit their own profiles but cannot change their role.

### Deleting Users

1. Only Admin users can delete other users.
2. Users cannot delete their own accounts.
3. When a user is deleted:
   - Their auth account is removed
   - Their profile record is deleted
   - Their brand permissions are removed
   - Content they created remains but is disassociated from the creator

## API Endpoints

The user management system exposes these API endpoints:

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/users` | GET | List all users | Admin only |
| `/api/users/[id]` | GET | Get a specific user | Self or Admin |
| `/api/users/[id]` | PUT | Update user | Self or Admin |
| `/api/users/[id]` | DELETE | Delete user | Admin only (not self) |
| `/api/users/invite` | POST | Invite new user | Admin only |

## Troubleshooting

### Missing job_title Column

If users are encountering errors when setting up their profiles after accepting invitations, it may be because the `job_title` column is missing from the `profiles` table. Run the migration script to fix this issue.

### Invitation Emails Not Arriving

1. Check the Supabase email logs in the dashboard.
2. Verify that the email templates are configured correctly.
3. Ensure the site URL in Supabase auth settings matches your application URL.

### Permission Issues

If users cannot access features they should have access to:

1. Check their role in the `user_brand_permissions` table.
2. Ensure they have been assigned to the appropriate brands.
3. Verify that the highest role is being correctly calculated in the API. 