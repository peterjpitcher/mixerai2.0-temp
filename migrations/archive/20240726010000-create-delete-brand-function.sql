-- Migration: Create function for atomic brand deletion
-- Timestamp: Generates a unique ID for the migration, e.g. $(date +%Y%m%d%H%M%S)

CREATE OR REPLACE FUNCTION public.delete_brand_and_dependents(brand_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete associated user_brand_permissions
  DELETE FROM public.user_brand_permissions WHERE brand_id = brand_id_to_delete;

  -- Delete associated workflows (this will set content.workflow_id to NULL due to ON DELETE SET NULL)
  -- It will also cascade to workflow_invitations if that table has ON DELETE CASCADE for workflow_id.
  DELETE FROM public.workflows WHERE brand_id = brand_id_to_delete;
  
  -- Delete the brand itself (this will cascade to content.brand_id due to ON DELETE CASCADE)
  DELETE FROM public.brands WHERE id = brand_id_to_delete;

  -- Check if the brand was actually deleted. If not, it means it wasn't found or some RLS prevented it.
  IF NOT FOUND THEN
    RAISE WARNING 'Brand with ID % not found or not deleted during delete_brand_and_dependents.', brand_id_to_delete;
    -- You might want to raise an exception here if not finding the brand is a critical error for the function's contract
    -- RAISE EXCEPTION 'Brand not found: %', brand_id_to_delete;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (optional, requires appropriate logging setup in Postgres)
    RAISE WARNING 'Error in delete_brand_and_dependents for brand %: % - % ', brand_id_to_delete, SQLSTATE, SQLERRM;
    -- Re-raise the exception to ensure transaction rollback and alert the caller
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.delete_brand_and_dependents(uuid) 
IS 'Atomically deletes a brand and its direct dependents like user_brand_permissions and workflows. Content linked to the brand is cascade deleted. Content linked to workflows of the brand has its workflow_id set to NULL.'; 