-- Migration
ALTER TABLE public.content
ADD COLUMN fields JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.content.fields IS 'Stores data for custom fields defined in a content template.';

-- Optional: Add a GIN index for performance if we anticipate querying the JSONB fields directly.
-- CREATE INDEX idx_content_fields_gin ON public.content USING GIN (fields);

-- Rollback is not explicitly defined in Supabase migrations, but for clarity:
-- To reverse this, you would run:
-- ALTER TABLE public.content
-- DROP COLUMN fields; 