-- Addresses infinite recursion in RLS policy for user_brand_permissions
-- Original problematic policy: "Admins can manage permissions"
-- This script provides SQL to drop the problematic policy and recreate it
-- using a global admin check based on user_metadata.role from the JWT.

-- IMPORTANT: Review your existing policies and backup your schema before applying DDL changes.

-- Step 1: Drop the existing problematic policy.
-- Ensure you have the correct policy name and schema if it differs.
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_brand_permissions;

-- Step 2: Recreate the policy for managing user_brand_permissions.
-- This version allows users whose user_metadata.role is 'admin' (from JWT) 
-- to perform ALL operations (SELECT, INSERT, UPDATE, DELETE).
-- Adjust FOR command and TO roles as necessary for your security model.
CREATE POLICY "Global Admins can manage user_brand_permissions"
ON public.user_brand_permissions
FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
TO authenticated -- Or specify roles like 'service_role' if API handles all auth
USING (((auth.jwt()->>'user_metadata')::jsonb->>'role') = 'admin')
WITH CHECK (((auth.jwt()->>'user_metadata')::jsonb->>'role') = 'admin');

-- Note on the "Everyone can view user brand permissions" (SELECT with USING true):
-- This policy allows any authenticated user to read any record in user_brand_permissions.
-- If this is too permissive, you might want to:
-- 1. Drop it: DROP POLICY IF EXISTS "Everyone can view user brand permissions" ON public.user_brand_permissions;
-- 2. And rely on the "Global Admins can manage user_brand_permissions" for SELECT access too (as it's FOR ALL).
-- OR create a more restrictive SELECT policy, e.g., users can only see their own permissions:
-- CREATE POLICY "Users can view their own brand permissions"
-- ON public.user_brand_permissions
-- FOR SELECT
-- TO authenticated
-- USING (auth.uid() = user_id);

-- Choose the SELECT policy approach that best fits your application's requirements.
-- The primary fix for recursion is replacing the old "Admins can manage permissions" policy.

SELECT 'RLS policy update script for user_brand_permissions generated. Please review and apply to your Supabase project.'; 