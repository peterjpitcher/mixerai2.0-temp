CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS SETOF auth.users -- Returns a table matching the auth.users structure
AS $$
BEGIN
  RETURN QUERY SELECT au.* FROM auth.users au WHERE lower(au.email) = lower(user_email) LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_by_email(TEXT) IS 'Retrieves a user directly from auth.users by email, case-insensitive. To be called by service_role. Returns SETOF auth.users to match table structure.'; 