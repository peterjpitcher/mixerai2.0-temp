-- Migration to create user_tasks table and associated index

CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  workflow_step_id TEXT NOT NULL, -- Stores the identifier of the step (currently 0-based index)
  workflow_step_name TEXT,
  status TEXT DEFAULT 'pending', -- e.g., pending, in_progress, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  CONSTRAINT uq_user_content_step UNIQUE (user_id, content_id, workflow_step_id) -- Prevent duplicate tasks for the same user, content, and step
);

COMMENT ON TABLE user_tasks IS 'Stores tasks assigned to users for specific content workflow steps.';
COMMENT ON COLUMN user_tasks.workflow_step_id IS 'Identifier of the workflow step, currently expected to be the 0-based index of the step in the workflow.steps JSONB array.';
COMMENT ON COLUMN user_tasks.status IS 'Status of the task, e.g., pending, in_progress, completed, rejected.';

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id_status ON user_tasks(user_id, status);

-- Trigger function to automatically update updated_at for user_tasks
CREATE OR REPLACE FUNCTION update_user_tasks_modtime()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_user_tasks_modtime ON user_tasks;
CREATE TRIGGER trigger_update_user_tasks_modtime
BEFORE UPDATE ON user_tasks
FOR EACH ROW
EXECUTE PROCEDURE update_user_tasks_modtime(); 