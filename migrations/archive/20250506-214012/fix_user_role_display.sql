-- Migration: Fix user role display in the user dashboard
-- This script ensures that all admin users have the correct role in user_brand_permissions

-- First, identify which users are not showing the correct role
DO $$
DECLARE
    admin_emails TEXT[] := array['your-admin-email@example.com']; -- Replace with actual admin emails
    current_user_id UUID;
    admin_email TEXT;
BEGIN
    -- For reference, output all current admin roles
    RAISE NOTICE 'Current Admin Users:';
    FOR admin_email, current_user_id IN 
        SELECT au.email, au.id
        FROM auth.users au
        JOIN user_brand_permissions ubp ON au.id = ubp.user_id
        WHERE ubp.role = 'admin'
    LOOP
        RAISE NOTICE 'Admin: % (ID: %)', admin_email, current_user_id;
    END LOOP;
    
    -- Ensure all users in the admin_emails array have admin permissions
    FOREACH admin_email IN ARRAY admin_emails
    LOOP
        -- Get user ID from email
        SELECT id INTO current_user_id FROM auth.users WHERE email = admin_email;
        
        IF current_user_id IS NOT NULL THEN
            -- Check if user exists in profiles table
            IF EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id) THEN
                -- Check if the user has any brand permissions
                IF EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = current_user_id) THEN
                    -- Update any existing permissions to admin
                    UPDATE user_brand_permissions 
                    SET role = 'admin'
                    WHERE user_id = current_user_id AND role != 'admin';
                    
                    RAISE NOTICE 'Updated permissions for user: % (ID: %)', admin_email, current_user_id;
                ELSE
                    -- If no permissions exist, add one for each brand
                    INSERT INTO user_brand_permissions (user_id, brand_id, role)
                    SELECT current_user_id, id, 'admin' FROM brands;
                    
                    RAISE NOTICE 'Created admin permissions for user: % (ID: %)', admin_email, current_user_id;
                END IF;
            ELSE
                RAISE NOTICE 'User with email % exists in auth.users but not in profiles table', admin_email;
            END IF;
        ELSE
            RAISE NOTICE 'User with email % not found', admin_email;
        END IF;
    END LOOP;
    
    -- Optional: ensure all users have at least some brand permission
    -- This prevents issues where users have no brand permissions at all
    -- Only for users that exist in both auth.users and profiles tables
    FOR current_user_id IN
        SELECT au.id 
        FROM auth.users au
        JOIN profiles p ON au.id = p.id
        WHERE au.id NOT IN (SELECT DISTINCT user_id FROM user_brand_permissions)
    LOOP
        -- Get the first brand as default
        INSERT INTO user_brand_permissions (user_id, brand_id, role)
        SELECT current_user_id, id, 'viewer' FROM brands LIMIT 1;
        
        RAISE NOTICE 'Added default viewer permission for user ID: %', current_user_id;
    END LOOP;
    
    -- Report on potentially problematic users (in auth but not in profiles)
    RAISE NOTICE 'Users in auth.users but missing from profiles:';
    FOR admin_email, current_user_id IN
        SELECT email, id
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM profiles)
    LOOP
        RAISE NOTICE 'Missing profile: % (ID: %)', admin_email, current_user_id;
    END LOOP;
    
    RAISE NOTICE 'User role fix completed successfully';
END
$$; 