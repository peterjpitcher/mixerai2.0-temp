# Structured Content Migration Plan

## Overview
This document describes how to migrate the entire content generation pipeline so that generated output is stored and exchanged as **normalised content objects** (`{ html, plain, wordCount, charCount }`) instead of raw strings. Follow the steps in order. Each step lists the affected files, the changes required, and validation notes.

---

## 1. Shared Utilities
1.1 Verify `src/lib/content/html-normalizer.ts` exists. If it doesn’t, create it using the current implementation from the main branch. This module must export:
- `normalizeFieldContent(raw: string, fieldType: string)` returning `{ html, plain, wordCount, charCount }`.
- `extractFirstHtmlValue(raw: string)` to unwrap JSON-wrapped strings.
- `GeneratedContentClasses` (class names) for styling.

1.2 Ensure `src/app/globals.css` defines styles for `mix-generated-heading-*`, `mix-generated-paragraph`, `mix-generated-list`, and `mix-generated-list-item` with consistent margins. These classes are already in place but double-check after merge conflicts.

> ✅ **Validation**: `npx eslint src/lib/content/html-normalizer.ts` and run `npx eslint src/app/globals.css`.

---

## 2. Server Helpers (Azure)
Goal: `generateContentFromTemplate` should return `Record<string, NormalizedContent>`.

2.1 **Imports**
- Replace ad-hoc sanitiser imports with the helper:
  ```ts
  import { normalizeFieldContent, extractFirstHtmlValue, type NormalizedContent } from '@/lib/content/html-normalizer';
  ```

2.2 **Utility Removal**
- Remove local functions that duplicate normaliser logic (`stripHtmlWrappers`, `normalizeHeadings`, `countWords`, `extractWordRange`, etc.).
- Replace `validateAndPostProcess` usage with `normalizeFieldContent` for the appropriate field type.

2.3 **Return Shape**
- Change `const out: Record<string, string>` to `Record<string, NormalizedContent>`.
- Wherever content is parsed (initial response, fallback JSON parsing, section fallback, retry loops), call `normalizeFieldContent(candidate, field.type)` and assign the result.
- Track char-count violations using the `charCount` in the normalised object (keep existing constraints for min/max characters).

2.4 **Single-field HTML path**
- When a template has one HTML field, normalise `content` directly and assign to `out[field.id]`.

2.5 **Retry logic**
- When regenerating individual fields, normalise the response and update `out[field.id]` with the object.

> ✅ **Validation**: `npx eslint src/lib/azure/openai.ts`. Also temporarily `console.log` the returned object in `/api/content/generate` to confirm the shape during manual testing.

---

## 3. API Routes & Jobs
All endpoints must serialise/deserialise the new structure.

3.1 `/api/content/generate` (file: `src/app/api/content/generate/route.ts`)
- After calling `generateContentFromTemplate`, the returned object will already be a `Record<string, NormalizedContent>`. Remove any logic that assumes strings.
- When building `responsePayload`, include the object as `generatedOutputs`.
- Update TypeScript types if necessary (add an interface for NormalizedContent to API response typing).

3.2 `/api/content/generate-field` (file: `src/app/api/content/generate-field/route.ts`)
- Same approach: normalise the single field result.
- Ensure the JSON response is `{ success, output_field_id, generated_content: NormalizedContent }` rather than `generated_text`.

3.3 Any other jobs/routes that touch generated content (search repo for `generatedOutputs` and `generated_text` inside `src/app/api`). Update them to expect or produce the new object.

> ✅ **Validation**: For each API, run the route via Thunder Client/Postman and check the JSON structure matches the new contract.

---

## 4. Client State & Props
Update React state/props throughout the UI.

4.1 **Type Definitions**
- In `src/types/template.ts` (or a new `NormalizedContent` type file), export the interface so the client can use it.

4.2 **Content Generator Form** (`src/components/content/content-generator-form.tsx`)
- Change `generatedOutputs` state to `Record<string, NormalizedContent>`.
- When saving state (`setGeneratedOutputs`), assign the object returned from the API.
- Wherever we render or edit content, use `generatedOutputs[field.id]?.html` (rich text) and `generatedOutputs[field.id]?.plain` (plain text fields).
- Update the payload for `/api/content` save calls to store the full object.
- Update regenerate handler to expect `data.generated_content` instead of `data.generated_text` and normalise the response if needed.

4.3 **Generated Content Preview** (`src/components/content/generated-content-preview.tsx`)
- Accept `Record<string, NormalizedContent>` prop. Render `value.html` in Quill and `value.plain` for plain text.

4.4 **Approval Workflow / Content Edit Pages**
- Anywhere `generatedOutputs` is read from `content.content_data`, ensure it supports both the old string format and the new object (use `normalizeFieldContent` when loading legacy entries). Key files:
  - `src/app/dashboard/content/[id]/page.tsx`
  - `src/app/dashboard/content/[id]/edit/page.tsx`
  - `src/components/content/content-approval-workflow.tsx`

4.5 **Quill Editor**
- Update props: `value` should be a normalised object or its `.html` value.
- If reusing the component in plain text contexts, ensure it handles receiving either string or object by normalising before setting.

> ✅ **Validation**: Run `npx eslint` on the touched components. Manually generate content in the UI; inspect the network response and ensure the editor displays content correctly with the heading picker reflecting the selection.

---

## 5. Database Compatibility / Migration
5.1 **Schema Update**
- If `content_data.generatedOutputs` is stored as JSON, no schema change is needed—the new object is still JSON serialisable.

5.2 **Backfill Script (optional but recommended)**
- Create a one-time script (e.g. `scripts/migrate-generated-outputs.ts`) that loads existing records, normalises string-valued outputs using `normalizeFieldContent`, and updates the row.
- Alternatively, keep compatibility code in the loaders (step 4.4) and defer migration.

5.3 **Testing**
- After migration, load a few historical content entries to confirm rendering works without shims.

---

## 6. Documentation
- Update developer docs (`docs/features/content-generation-flow.md` and `docs/api/content-generation.md`) to describe the new response shape.
- Note that all `generatedOutputs[fieldId]` entries are objects with `html`, `plain`, etc.

---

## 7. Testing & QA Checklist
- `npm run lint`
- `npm run test` (if applicable)
- Manual tests:
  - Generate new Breed Guide content, confirm headings render and the JSON payload shows normalised objects.
  - Retry individual fields and check the response payload and UI update.
  - Save content and open it in the approval workflow and content edit page to ensure it still renders.
  - Load existing (pre-migration) content to confirm compatibility.

---

## 8. Rollout Notes
- Deploy to staging, run smoke tests on breed guide and other templates.
- If running a backfill, execute it once staging validation is complete, then redeploy so the code no longer needs shims.
- Monitor logs post-deploy for errors referencing `generatedOutputs` or JSON parsing failures.

Good luck! Ping the senior engineer if anything unexpected surfaces during the backfill or API refactor.
