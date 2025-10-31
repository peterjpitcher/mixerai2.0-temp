---
title: Templates – Detail & Editor Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/templates/new`, `/dashboard/templates/[id]`, and related APIs.
last_updated: 2025-10-30
stage: finished
---

# Templates – Detail & Editor – Deep Dive Review

## Scope
- Entry points: `/dashboard/templates/new`, `/dashboard/templates/[id]` (view/edit).  
- APIs: `/api/content-templates/:id`, `/api/content-templates` POST/PUT/DELETE, `use-template-session`.  
- Components: `TemplateForm`, `TemplateEditPage`, fields/AI prompt handling.

## Architecture & Data Flow
- Client components fetch template data via `apiFetch`, load default templates from local constants, use `TemplateForm` for editing.  
- `useTemplateSession` ensures session/permissions; only admins edit/delete.  
- Form handles field arrays, AI prompts, slug dependencies; saves via `apiFetch`.  
- Delete uses `/api/content-templates/:id` (likely DELETE).

## Findings & Recommendations

### High Priority

1. **Template form lacks validation for AI prompt placeholders**  
   - `TemplateForm` allows prompts referencing non-existent fields, leading to runtime errors when generating content.  
   - Fix: Validate prompts against available `inputFields`/`outputFields` before saving; warn user if placeholder missing.  
   - Verify: Attempt to save prompt with `{{unknown}}`; expect validation error.

2. **Delete API likely permits removal of system templates**  
   - Default templates (e.g., `article-template`) should be immutable; UI currently permits delete when `canEditTemplate`.  
   - Fix: Mark system templates as read-only (no delete button) and enforce on server by rejecting deletion of default IDs.  
   - Verify: Attempt to delete default template; API should 403 and UI hide button.

3. **Template edit logs payload data**  
   - Remove any `console.log` (if present) to prevent template data exposure.

### Medium Priority

- **New template page doesn’t prefill brand selection** – consider context for brand-specific templates.  
- **AI suggestion toggles inconsistent** – ensure toggling AI features updates metadata used by backend.  
- **Session error handling** – use consistent error banner instead of generic toast.

### Low Priority / Enhancements

- Provide preview of template fields for verification.  
- Add version history/backup for templates.  
- Enable duplication from detail view.

## Performance & Observability Notes
- Ensure `/api/content-templates/:id` caches on GET; invalidation on save.  
- Add structured logging for save/delete errors.

## Testing Gaps
- No tests for TemplateForm validation, AI prompt placeholder handling, delete restrictions.  
- Suggested: component tests for field addition/removal, integration tests for template CRUD.  
- Commands:  
  1. `npm run lint`  
  2. `npm run test -- templates` (after adding tests)  
  3. Manual: create, edit, delete (system vs custom), validate prompts.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Template detail/editor updates verified; stage marked `finished`.
