-- Create workflow_status enum type
DO $$ BEGIN
    CREATE TYPE public.workflow_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Add status column to workflows table
ALTER TABLE public.workflows
ADD COLUMN IF NOT EXISTS status public.workflow_status NOT NULL DEFAULT 'draft';

-- Optional: Add an index on the new status column if frequent filtering by status is expected
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);

-- Comment on the new column
COMMENT ON COLUMN public.workflows.status IS 'The current status of the workflow (e.g., active, draft, archived).'; 