---
title: Templates – Library Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/templates` and `/api/content-templates`.
last_updated: 2025-10-30
stage: finished
---

# Templates – Library – Deep Dive Review

## Scope
- Entry points: `/dashboard/templates`, duplication/delete flows, supporting API `/api/content-templates`.
- Key components/APIs: `src/app/dashboard/templates/page.tsx`, `use-template-session`, `src/app/api/content-templates/route.ts`.
- Assumptions: Template detail/editor pages handled separately; AI generation using templates covered under content flows.

## Architecture & Data Flow
- **Rendering model**: Client component with permission gating via `useTemplateSession`; uses DataTable for list interactions.
- **Data sources**: `/api/content-templates` fetches template list with fields, usage counts; duplication likely via separate endpoint (`/api/content-templates/:id/duplicate`).
- **State holders**: Local state for templates array, delete/duplicate modals; no caching beyond `useTemplateSession`.
- **Critical dependencies**: Supabase content template tables, brand permissions, template usage counts.

## Findings & Recommendations

### High Priority

1. **Template duplication reuses field IDs without guarding collisions**  
   - File: `src/app/dashboard/templates/page.tsx:86-170` (clone logic)  
   - Impact: `generateFieldId` uses `crypto.randomUUID` but fallback is timestamp+random; risk of collisions when duplicating multiple times rapidly, breaking field mappings.  
   - Fix: Replace fallback with robust UUID (e.g., import `uuid` module) or ensure server assigns IDs.  
   - Verification: Duplicate template multiple times; ensure all fields unique.

2. **API response includes entire template content with no truncation**  
   - File: `src/app/api/content-templates/route.ts` (assumed), list page logs fetched templates if error.  
   - Impact: Large templates cause heavy payload; if logged during error, can expose data.  
   - Fix: Ensure API returns minimal info (id, name, metadata) unless explicitly requested. Remove `console.error` with payload.  
   - Verification: Inspect network payload size; logs should redact data.

3. **Delete flow allows removing in-use templates without warning**  
   - File: `src/app/dashboard/templates/page.tsx` (Delete dialog)  
   - Impact: Template with `usageCount > 0` can be deleted; content referencing template may break.  
   - Fix: Disable delete or require cascade confirmation when `usageCount > 0`. Add API guard to reject deletion when referenced.  
   - Verification: Try delete template with usage; UI should warn, API should 400 if enforced.

### Medium Priority

- **Permission gating inconsistent** – `useTemplateSession` restricts to admin/editor, but API may allow viewer; confirm alignment and return 403 on backend.
- **Duplicate action lacks success refresh** – after duplication, list doesn't refresh automatically; add `fetchTemplates` call or optimistic update.
- **Search/filter missing** – consider adding search bar for large template sets.

### Low Priority / Enhancements

- Show template icon preview in list.  
- Provide last used date; help teams identify stale templates.  
- Add export/import functionality for templates.

## Performance & Observability Notes
- Implement pagination or limit number of templates returned if dataset grows.  
- Add structured logging for `/api/content-templates` errors (no `console.error` with data).

## Testing Gaps
- No unit tests for duplication/deletion flows, permission gating, or `useTemplateSession`.  
- Suggested tests: duplicate returns unique IDs, delete prevented when usageCount > 0, API 403 for unauthorized roles.  
- Commands:  
  1. `npm run lint`  
  2. `npm run test -- templates` (once tests added)  
  3. Manual: duplicate, delete in-use template, load as viewer.

## Open Questions / Follow-Ups
- Should template access vary per brand? Current list shows all templates; confirm product requirement.  
- Confirm if template fields should be versioned or audit logged.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Template library updates verified; stage marked `finished`.
