# Workflow Behavior When Content Templates Are Deleted

## Summary
**Workflows are NOT deleted when their associated content templates are deleted.** This is by design to preserve business continuity and data integrity.

## Current Behavior

### When a Content Template is Deleted:

1. **Workflows remain intact**
   - The workflow's `template_id` field is set to `NULL` (due to `ON DELETE SET NULL` foreign key constraint)
   - The workflow continues to exist and can still be used
   - No data loss occurs

2. **Content items are updated**
   - All content items using the deleted template have their:
     - `template_id` set to `NULL`
     - `status` changed to `'rejected'`
     - `updated_at` timestamp refreshed
   - This is handled by the `delete_template_and_update_content` database function

3. **UI handles orphaned workflows gracefully**
   - Workflows without templates display "No template" in the UI
   - Users can still edit and use orphaned workflows
   - The workflow edit page allows selecting "No Template" as a valid option

## Database Schema

### Foreign Key Constraints:
```sql
-- Workflows table
ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_template_id_fkey" 
    FOREIGN KEY ("template_id") 
    REFERENCES "public"."content_templates"("id") 
    ON DELETE SET NULL;

-- Content table
ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_template_id_fkey" 
    FOREIGN KEY ("template_id") 
    REFERENCES "public"."content_templates"("id");
    
ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_workflow_id_fkey" 
    FOREIGN KEY ("workflow_id") 
    REFERENCES "public"."workflows"("id") 
    ON DELETE SET NULL;
```

## Key Design Decisions

1. **Preservation over Deletion**: Workflows are preserved to maintain business continuity
2. **Graceful Degradation**: Workflows can operate without templates
3. **Content Safety**: Content is rejected rather than deleted, preserving audit trails
4. **User Flexibility**: Users can continue using workflows even after template deletion

## Impact on System

### Positive:
- No data loss when templates are deleted
- Workflows remain available for future use
- Audit trail is preserved
- Users can reassign templates to orphaned workflows

### Considerations:
- Orphaned workflows may accumulate over time
- Users need to manually manage orphaned workflows
- Content rejection may require manual review

## API Support

- The `/api/workflows/orphaned-assignments` endpoint helps identify orphaned user assignments
- Workflows API supports workflows with `null` template_id
- UI components handle orphaned workflows gracefully

## Recommendations for Users

1. **Before deleting a template**, consider:
   - Which workflows use this template
   - Whether to reassign workflows to a different template first
   - Impact on existing content items

2. **After deleting a template**:
   - Review orphaned workflows in the workflows list
   - Decide whether to keep, update, or delete orphaned workflows
   - Check rejected content items that were using the template

3. **Best Practices**:
   - Regularly review and clean up orphaned workflows
   - Consider archiving templates instead of deleting them
   - Document why templates were deleted for future reference