 -- Create ENUM types for feedback system

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE feedback_type AS ENUM ('bug', 'enhancement');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_priority') THEN
        CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_status') THEN
        CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
    END IF;
END
$$;

-- Create feedback_items table
CREATE TABLE IF NOT EXISTS public.feedback_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Removed direct FK to auth.users to avoid potential issues with RLS/permissions during creation, will rely on RLS for created_by linkage conceptually
    type feedback_type NOT NULL,
    title TEXT,
    description TEXT,
    priority feedback_priority NOT NULL,
    status feedback_status NOT NULL DEFAULT 'open',
    affected_area TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    attachments_metadata JSONB,
    app_version TEXT,
    user_impact_details TEXT,
    CONSTRAINT fk_feedback_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL -- Assuming created_by refers to a profile id linked to an auth.user
);

-- Add Row Level Security (RLS) to feedback_items table
-- Enable RLS
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

-- Policies for feedback_items:
-- 1. Admins can do anything.
DROP POLICY IF EXISTS "Allow admins full access" ON public.feedback_items;
CREATE POLICY "Allow admins full access"
ON public.feedback_items
FOR ALL
TO authenticated
USING (
    -- Check 1: Direct JWT 'role' claim (if you set this up in Supabase Auth Hooks)
    (SELECT auth.jwt()->>'role') = 'admin'
    OR
    -- Check 2: 'role' within 'app_metadata' from the JWT
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
)
WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin'
    OR
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
);


-- 2. Authenticated users can read all items.
DROP POLICY IF EXISTS "Allow authenticated users to read all feedback" ON public.feedback_items;
CREATE POLICY "Allow authenticated users to read all feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (true);

-- Grant usage on ENUM types to authenticated role if not already granted
GRANT USAGE ON TYPE feedback_type TO authenticated;
GRANT USAGE ON TYPE feedback_priority TO authenticated;
GRANT USAGE ON TYPE feedback_status TO authenticated;

-- Grant permissions on feedback_items table
GRANT SELECT ON public.feedback_items TO authenticated;
-- For INSERT, UPDATE, DELETE by admins, RLS policy "Allow admins full access" will gate this.
-- Granting to service_role allows backend functions (if any) to operate with elevated privileges.
GRANT INSERT, UPDATE, DELETE ON public.feedback_items TO service_role; 

-- Add comments to table and columns
COMMENT ON TABLE public.feedback_items IS 'Stores bug reports and enhancement requests submitted by users.';
COMMENT ON COLUMN public.feedback_items.id IS 'Unique identifier for the feedback item.';
COMMENT ON COLUMN public.feedback_items.created_at IS 'Timestamp of when the item was created.';
COMMENT ON COLUMN public.feedback_items.created_by IS 'ID of the user (profile ID, linked to auth.user) who logged the item.';
COMMENT ON COLUMN public.feedback_items.type IS 'Type of feedback: ''bug'' or ''enhancement''.';
COMMENT ON COLUMN public.feedback_items.title IS 'A concise title for the item.';
COMMENT ON COLUMN public.feedback_items.description IS 'Detailed description of the bug or enhancement.';
COMMENT ON COLUMN public.feedback_items.priority IS 'Priority level of the item: ''low'', ''medium'', ''high'', ''critical''.';
COMMENT ON COLUMN public.feedback_items.status IS 'Current status of the item: ''open'', ''in_progress'', ''resolved'', ''closed'', ''wont_fix''.';
COMMENT ON COLUMN public.feedback_items.affected_area IS 'Optional: e.g., "Dashboard", "Content Creation", "API".';
COMMENT ON COLUMN public.feedback_items.steps_to_reproduce IS 'Optional: Steps to reproduce a bug.';
COMMENT ON COLUMN public.feedback_items.expected_behavior IS 'Optional: Expected behavior for a bug report.';
COMMENT ON COLUMN public.feedback_items.actual_behavior IS 'Optional: Actual behavior observed for a bug report.';
COMMENT ON COLUMN public.feedback_items.attachments_metadata IS 'Optional: JSONB to store metadata about any attachments (e.g., filenames, URLs from Supabase Storage).';
COMMENT ON COLUMN public.feedback_items.app_version IS 'Optional: Application version where the bug was observed or for which the enhancement is relevant.';
COMMENT ON COLUMN public.feedback_items.user_impact_details IS 'Optional: Notes on how users are affected or the potential benefits of an enhancement.';