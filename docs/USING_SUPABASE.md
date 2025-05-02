# Setting Up Supabase for MixerAI 2.0

This guide explains how to set up and use Supabase with MixerAI 2.0.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up for an account if you don't have one already.
2. Create a new project with a name of your choice (e.g., "mixerai-2").
3. Set a strong database password when prompted.
4. Choose a region close to your users for better performance.
5. Wait for your project to be created (this can take a few minutes).

## 2. Get Your Supabase Credentials

Once your project is created, you'll need to find these credentials:

1. **Supabase URL**: Located in the API section of your project settings.
   - Usually in the format: `https://[your-project-id].supabase.co`

2. **Supabase Anon Key**: Located in the API section under "Project API Keys".
   - Use the "anon" key (public) for client-side authentication.

3. **Supabase Service Role Key**: Located in the API section under "Project API Keys".
   - Use the "service_role" key (private) for server-side operations.

## 3. Set Up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" section.
2. Click "New Query" and paste the contents of the `supabase-schema.sql` file.
3. Run the query to create all necessary tables and set up Row Level Security (RLS).

## 4. Configure MixerAI to Use Supabase

Use the built-in configuration tool:

```bash
# From the root directory
./update-supabase-config.sh
```

Or manually create a `.env` file in the `mixerai-2.0` directory with:

```
# Supabase Configuration - Remote Database
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Flag to use direct PostgreSQL connection (false for Supabase)
USE_DIRECT_POSTGRES=false
```

## 5. Create a Test User

1. In the Supabase dashboard, go to the "Authentication" > "Users" section.
2. Click "Invite user" and enter an email address.
3. Set a secure password.
4. The user will need to verify their email before they can log in.

## 6. Add Test Data

You can add test data by running SQL queries in the Supabase SQL Editor or by using the application to create brands, content types, and content.

### Example: Adding a Test Brand

```sql
INSERT INTO brands (name, website_url, country, language)
VALUES ('Test Brand', 'https://example.com', 'United Kingdom', 'English');
```

### Example: Giving a User Access to a Brand

```sql
-- First, get the user_id from the auth.users table
SELECT id FROM auth.users WHERE email = 'your.email@example.com';

-- Then, get the brand_id from the brands table
SELECT id FROM brands WHERE name = 'Test Brand';

-- Finally, insert a permission record
INSERT INTO user_brand_permissions (user_id, brand_id, role)
VALUES 
  ('user-id-from-first-query', 'brand-id-from-second-query', 'admin');
```

## 7. Additional Supabase Features

### Authentication Options

Supabase offers multiple authentication methods:

- Email/Password
- Magic Link
- OAuth (Google, GitHub, etc.)

To enable additional methods, go to "Authentication" > "Providers" in your Supabase dashboard.

### Storage

MixerAI can use Supabase Storage for file uploads:

1. Create a new bucket in the "Storage" section of your Supabase dashboard.
2. Set up appropriate RLS policies for the bucket.

### Edge Functions

For advanced functionality, you can use Supabase Edge Functions:

1. Install the Supabase CLI: `npm install -g supabase`
2. Initialize Edge Functions: `supabase functions new my-function`

## 8. Troubleshooting

### Common Issues

1. **Login Error: "supabaseUrl is required"**
   - Make sure your `.env` file has the correct `NEXT_PUBLIC_SUPABASE_URL` value.
   - Check that the URL starts with `https://`.

2. **Permission Denied Errors**
   - Check your RLS policies and ensure the user has the correct permissions.
   - Verify that user-brand permissions have been set up correctly.

3. **CORS Errors**
   - In your Supabase dashboard, go to "API" > "Settings" and add your application URL to the allowed origins.

### Getting Help

If you encounter issues not covered here, you can:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Join the [Supabase Discord community](https://discord.supabase.com)
3. File an issue in the MixerAI GitHub repository 