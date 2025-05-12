-- Migration: Create function for atomic content template deletion and updating associated content
-- Timestamp: e.g. $(date +%Y%m%d%H%M%S)

CREATE OR REPLACE FUNCTION public.delete_template_and_update_content(template_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update content items associated with this template
  UPDATE public.content
  SET template_id = NULL,
      status = 'rejected', -- Ensures content reflects template removal
      updated_at = NOW()
  WHERE template_id = template_id_to_delete;

  -- Delete the content template itself
  DELETE FROM public.content_templates
  WHERE id = template_id_to_delete;

  -- Check if the template was actually deleted. 
  -- If NOT FOUND, it means the template_id_to_delete didn't exist or RLS prevented deletion.
  IF NOT FOUND THEN
    RAISE WARNING 'Content template with ID % not found or not deleted during delete_template_and_update_content.', template_id_to_delete;
    -- Depending on requirements, you might want to RAISE EXCEPTION here if the template must exist.
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in delete_template_and_update_content for template %: % - %', template_id_to_delete, SQLSTATE, SQLERRM;
    RAISE; -- Re-raise the exception to ensure transaction rollback
END;
$$;

COMMENT ON FUNCTION public.delete_template_and_update_content(uuid) 
IS 'Atomically deletes a content template and updates associated content items (sets template_id to NULL and status to rejected).'; 