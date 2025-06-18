-- Create security_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_timestamp ON public.security_logs(timestamp);
CREATE INDEX idx_security_logs_ip_address ON public.security_logs(ip_address);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view security logs
CREATE POLICY "Super admins can view all security logs" ON public.security_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Service role can insert logs
CREATE POLICY "Service role can insert security logs" ON public.security_logs
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT INSERT ON public.security_logs TO service_role;
GRANT SELECT ON public.security_logs TO authenticated;

-- Create a function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.security_logs (event_type, user_id, ip_address, details)
    VALUES (p_event_type, COALESCE(p_user_id, auth.uid()), p_ip_address, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;