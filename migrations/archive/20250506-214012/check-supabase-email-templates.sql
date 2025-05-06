-- Script to check Supabase email templates
-- Email template issues can prevent invitations from working properly

-- 1. Check if we can access the auth.templates table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'templates'
  ) THEN
    RAISE NOTICE 'auth.templates table exists and is accessible.';
  ELSE
    RAISE NOTICE 'auth.templates table does not exist or is not accessible.';
  END IF;
END $$;

-- 2. Check email templates if accessible
DO $$
BEGIN
  -- This block might fail if we don't have access to auth.templates
  BEGIN
    RAISE NOTICE 'Checking email templates...';
    
    -- Check for template customization
    PERFORM 1 FROM auth.templates 
    WHERE template = 'invite' LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE 'Invite template has been customized.';
    ELSE
      RAISE NOTICE 'No customized invite template found (using default).';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cannot query auth.templates: %', SQLERRM;
  END;
END $$;

-- 3. Check email settings in supabase_functions.secrets if accessible
DO $$
BEGIN
  -- This block might fail if we don't have access to the secrets table
  BEGIN
    RAISE NOTICE 'Checking email settings...';
    
    -- Check if SMTP is configured
    PERFORM 1 FROM pg_tables WHERE tablename = 'secrets' AND schemaname = 'supabase_functions';
    
    IF FOUND THEN
      RAISE NOTICE 'supabase_functions.secrets table exists, can check email settings.';
    ELSE
      RAISE NOTICE 'Cannot access supabase_functions.secrets table to check email settings.';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cannot check email settings: %', SQLERRM;
  END;
END $$;

-- 4. Check user confirmation settings in auth.config
DO $$
BEGIN
  -- This block might fail if we don't have access to auth.config
  BEGIN
    RAISE NOTICE 'Checking auth configuration...';
    
    PERFORM 1 FROM pg_tables WHERE tablename = 'config' AND schemaname = 'auth';
    
    IF FOUND THEN
      RAISE NOTICE 'auth.config table exists, can check authentication settings.';
      
      -- Look for specific email-related settings
      SELECT * FROM auth.config 
      WHERE parameter IN (
        'mailer_autoconfirm',
        'mailer_secure_email_change_enabled',
        'mailer_urlpaths_invite',
        'smtp_admin_email',
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_pass',
        'smtp_max_frequency'
      );
    ELSE
      RAISE NOTICE 'Cannot access auth.config table to check authentication settings.';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cannot check auth configuration: %', SQLERRM;
  END;
END $$; 