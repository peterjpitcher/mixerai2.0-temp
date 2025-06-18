# Workflow Assignee Mandatory Changes

## Overview
Implementation of GitHub issue #114: Making the assignee field mandatory in workflows to ensure all workflow steps have clear ownership and accountability.

## Changes Made

### 1. Frontend Validation

#### New Workflow Creation Page (`src/app/dashboard/workflows/new/page.tsx`)
- Added asterisk (*) to "Assign Users" label to indicate it's a required field
- Added validation in `validateWorkflow()` function to check each step has at least one assignee
- Added visual indicator (red border box with message) when a step has no assignees
- Error message: "No assignees added. At least one assignee is required for this step."

#### Edit Workflow Page (`src/app/dashboard/workflows/[id]/edit/page.tsx`)
- Same changes as the new workflow page
- Ensures consistency across creation and editing workflows

### 2. Backend Validation

#### Create Workflow API (`src/app/api/workflows/route.ts`)
- Added validation in POST endpoint before processing steps
- Returns 400 error if any step lacks assignees
- Error message format: `Step "[step name]" must have at least one assignee`

#### Update Workflow API (`src/app/api/workflows/[id]/route.ts`)
- Added same validation in PUT endpoint
- Ensures existing workflows cannot be saved without assignees

### 3. User Experience Improvements

- Clear visual feedback with red error box when assignees are missing
- Required field indicator (*) on the label
- Validation error toast messages that specify which step needs assignees
- Save/Create button remains enabled but shows error on click if validation fails

## Testing

### Test Scripts Created
1. `scripts/test-workflow-assignee-validation.js` - Tests API validation
2. `scripts/check-workflows-without-assignees.js` - Checks existing workflows for compliance

### How to Test
1. Try creating a workflow without adding assignees to see validation errors
2. Try editing an existing workflow and removing all assignees
3. Verify that workflows with assignees can still be created/updated normally

## Migration Considerations

- Existing workflows without assignees will need to be updated
- Run `node scripts/check-workflows-without-assignees.js` to identify affected workflows
- Consider adding a migration script or manual process to update existing workflows

## Benefits

1. **Accountability**: Every workflow step has a clear owner
2. **Prevents Oversight**: Tasks won't be lost or overlooked
3. **Better Tracking**: Improved workflow management and visibility
4. **Consistent Data**: Ensures data integrity across the system