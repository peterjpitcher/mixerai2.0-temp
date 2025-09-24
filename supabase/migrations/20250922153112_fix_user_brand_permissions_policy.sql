DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_brand_permissions'
      AND policyname = 'Users can view brand permissions'
  ) THEN
    DROP POLICY "Users can view brand permissions" ON public.user_brand_permissions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_brand_permissions'
      AND policyname = 'Users can view own brand permissions'
  ) THEN
    CREATE POLICY "Users can view own brand permissions"
    ON public.user_brand_permissions
    FOR SELECT
    USING (
      auth.role() = 'service_role'
      OR user_id = auth.uid()
    );
  END IF;
END $$;
