# Supabase Storage Setup Guide

This guide helps you fix the storage bucket errors for avatar and brand logo uploads.

## Error Summary

The following errors were encountered:
1. **Brand Logo Upload**: `400 Bad Request - Bucket not found`
2. **Avatar Upload**: `403 Unauthorized - new row violates row-level security policy`

## Quick Fix

### Option 1: Using the Supabase Dashboard (Recommended)

1. **Log into your Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Create Storage Buckets**
   - Navigate to Storage in the left sidebar
   - Click "New bucket" and create:
     - **Bucket 1**: `avatars`
       - Public: Yes
       - File size limit: 5MB
       - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
     - **Bucket 2**: `brand-logos`
       - Public: Yes
       - File size limit: 10MB
       - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/svg+xml

3. **Set Up Storage Policies**
   - Go to Storage > Policies
   - For `avatars` bucket, create these policies:
     - **SELECT** (Read): Enable for `public`
     - **INSERT** (Upload): Enable for `authenticated` with condition:
       ```sql
       (auth.uid()::text = (string_to_array(name, '/'))[1])
       ```
     - **UPDATE**: Enable for `authenticated` with same condition as INSERT
     - **DELETE**: Enable for `authenticated` with same condition as INSERT
   
   - For `brand-logos` bucket, create these policies:
     - **SELECT** (Read): Enable for `public`
     - **INSERT** (Upload): Enable for `authenticated`
     - **UPDATE**: Enable for `authenticated`
     - **DELETE**: Enable for `authenticated`

### Option 2: Using SQL Editor

1. Go to SQL Editor in your Supabase Dashboard
2. First, check your current setup: Run `scripts/check-storage-setup.sql`
3. Then run the safe version: `scripts/create-storage-buckets-safe.sql`
   - This script drops existing policies before recreating them
   - Use this if you get "policy already exists" errors

### Option 3: Using the Setup Script

```bash
# Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env file
node scripts/setup-storage-buckets.js
```

Note: This script creates the buckets but you'll still need to manually create the policies in the dashboard.

## File Path Updates

The upload components have been updated to use the correct file paths:
- **Avatar uploads**: Files are now stored in `{userId}/{filename}` format
- **Brand logo uploads**: Files are now stored directly as `{filename}` in the bucket

## Testing

After setting up the buckets and policies:

1. **Test Avatar Upload**:
   - Go to Dashboard > Account Settings
   - Try uploading a profile photo
   - Should work without errors

2. **Test Brand Logo Upload**:
   - Go to Dashboard > Brands > Edit any brand
   - Try uploading a brand logo
   - Should work without errors

## Troubleshooting

### "Policy already exists" Error

If you get `ERROR: 42710: policy "..." already exists`:
1. Use `scripts/create-storage-buckets-safe.sql` instead - it drops existing policies first
2. Or manually drop the policies in SQL Editor before creating new ones
3. Run `scripts/check-storage-setup.sql` to see what policies currently exist

### Other Common Issues

If you still get errors:

1. **Check bucket names**: Ensure buckets are named exactly `avatars` and `brand-logos`
2. **Check policies**: Verify all 4 policies exist for each bucket
3. **Check authentication**: Ensure you're logged in when testing
4. **Check file types**: Only upload supported image formats
5. **Check file sizes**: Avatar max 5MB, Logo max 10MB

## Additional Notes

- Both buckets are public for read access (anyone can view uploaded images)
- Only authenticated users can upload/modify files
- Avatar uploads are restricted so users can only modify their own avatars
- Brand logos can be uploaded/modified by any authenticated user (you may want to restrict this further based on brand permissions)

## Next.js Configuration

After setting up storage buckets, you need to add your Supabase hostname to `next.config.js`:

```javascript
images: {
  remotePatterns: [
    // ... other patterns
    {
      protocol: 'https',
      hostname: 'YOUR_SUPABASE_PROJECT_ID.supabase.co',
    },
  ],
},
```

Replace `YOUR_SUPABASE_PROJECT_ID` with your actual Supabase project ID (the part before `.supabase.co` in your Supabase URL).

**Note**: After updating `next.config.js`, restart your development server for the changes to take effect.

## Profile Creation

If users don't have a profile record (which stores the full name and avatar URL), the account page will now automatically create one when they first visit it. You can also run the migration:

```bash
# Run the migration to create profiles for existing users
psql $DATABASE_URL < supabase/migrations/20241217_create_missing_profiles.sql
```

This migration will:
1. Create profile records for all existing users who don't have one
2. Set up a trigger to automatically create profiles for new users

## Known Issues Fixed

### Brand Logo Not Persisting
Fixed an issue where brand logos would upload successfully but not save to the database. The API routes now properly handle the `logo_url` field when creating and updating brands.