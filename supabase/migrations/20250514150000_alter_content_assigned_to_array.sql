-- Drop the existing foreign key constraint on content.assigned_to
-- The name 'content_assigned_to_fkey' is taken from the error message.
-- If it's different in your schema, adjust accordingly.
ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_assigned_to_fkey;

-- Alter content.assigned_to to store an array of UUIDs
ALTER TABLE public.content
ALTER COLUMN assigned_to TYPE UUID[]
USING CASE
  WHEN assigned_to IS NULL THEN NULL
  ELSE ARRAY[assigned_to::UUID] -- Ensure casting to UUID before array creation if it wasn't already strictly UUID
END;

-- Update comment to reflect the change (optional but good practice)
COMMENT ON COLUMN public.content.assigned_to IS 'Array of user IDs assigned to the current step of the content. No direct FK to profiles; integrity checked by app.';

-- Note: Ensure your main schema definition file (e.g., supabase-schema.sql or schema.sql)
-- is also updated manually if you use it as a source of truth for the overall schema.
-- This script focuses on the live database alteration.
-- Specifically, content.current_step should be UUID and content.assigned_to should be UUID[]. 