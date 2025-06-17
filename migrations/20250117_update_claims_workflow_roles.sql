-- Migration: Update Claims Workflow Roles
-- Description: Updates the role constraint for claims workflow steps to include new roles
-- Date: 2025-01-17

-- Drop the existing constraint
ALTER TABLE public.claims_workflow_steps 
DROP CONSTRAINT IF EXISTS claims_workflow_steps_role_check;

-- Add the new constraint with updated roles
ALTER TABLE public.claims_workflow_steps 
ADD CONSTRAINT claims_workflow_steps_role_check 
CHECK (role IN ('admin', 'editor', 'viewer', 'legal', 'compliance', 'marketing', 'lrc', 'bdt', 'mat', 'sme'));

-- Update the comment to reflect new roles
COMMENT ON COLUMN public.claims_workflow_steps.role IS 'Role required to complete this step (includes legal, lrc, bdt, mat, sme)';