-- Migration: Add workflow user assignments

-- First, check if our workflow steps schema supports user assignments
DO $$
BEGIN
  -- This is an example of how a workflow step should look, with user assignments:
  -- {
  --   "id": 1,
  --   "name": "Draft Review",
  --   "description": "Initial review by the content author",
  --   "role": "editor",
  --   "approvalRequired": true,
  --   "assignees": [
  --     {"email": "user1@example.com", "id": "user-uuid-if-exists"},
  --     {"email": "user2@example.com", "id": "user-uuid-if-exists"}
  --   ]
  -- }

  -- Since we're storing workflow steps in a JSONB column,
  -- we don't need to change the database schema, but we do need to make sure
  -- our application code handles the workflow step assignees correctly.

  -- However, we should create a separate table to track invitations for users
  -- who aren't yet in the system
  
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'workflow_invitations'
  ) THEN
    CREATE TABLE workflow_invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      step_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      invite_token TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      UNIQUE(workflow_id, step_id, email)
    );
  END IF;
END
$$; 