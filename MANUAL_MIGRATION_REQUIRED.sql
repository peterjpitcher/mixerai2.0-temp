-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Add completed_workflow_steps column to claims table
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS completed_workflow_steps INTEGER DEFAULT 0 NOT NULL;

-- Update the column comment
COMMENT ON COLUMN claims.completed_workflow_steps IS 'Number of workflow steps that have been completed for this claim';

-- Update any existing claims to have the correct completed steps count based on their workflow history
UPDATE claims c
SET completed_workflow_steps = (
  SELECT COUNT(DISTINCT cwh.step_name)
  FROM claim_workflow_history cwh
  WHERE cwh.claim_id = c.id
    AND cwh.action_status = 'approved'
    AND cwh.step_name IS NOT NULL
)
WHERE c.workflow_id IS NOT NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_claims_completed_workflow_steps ON claims(completed_workflow_steps);

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'claims' AND column_name = 'completed_workflow_steps';