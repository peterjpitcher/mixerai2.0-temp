-- Migration to add user_id column to workflow_invitations and create invitation status view
-- The workflow_invitations table already exists with all required columns except user_id

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workflow_invitations' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE workflow_invitations ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for faster lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_email ON workflow_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_expires_at ON workflow_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_status ON workflow_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_user_id ON workflow_invitations(user_id);

-- Create a view to get invitation status for users
CREATE OR REPLACE VIEW user_invitation_status AS
SELECT DISTINCT ON (p.id)
    p.id,
    p.email,
    p.full_name,
    au.last_sign_in_at,
    wi.expires_at,
    wi.status as invitation_status,
    CASE 
        WHEN au.last_sign_in_at IS NOT NULL THEN 'active'
        WHEN wi.expires_at < NOW() THEN 'expired'
        WHEN wi.status = 'pending' THEN 'pending'
        ELSE 'no_invitation'
    END as user_status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN workflow_invitations wi ON p.email = wi.email
ORDER BY p.id, COALESCE(wi.created_at, au.created_at) DESC;

-- Grant permissions on the view
GRANT SELECT ON user_invitation_status TO authenticated;