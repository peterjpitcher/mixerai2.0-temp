---
title: Section Review Workflow
description: Folder structure and movement rules for section deep-dive documents.
last_updated: 2025-10-30
---

# Section Review Workflow

We track each dashboard surface through four stages. Every deep-dive document should live in exactly one of these folders:

1. **`discovery/`** – Active investigation. Notes are draft-level, checklists may be incomplete, and questions are still open.  
   - Create new section docs here using `discovery/section-review-template.md`.  
   - Update the doc as you uncover details.  
   - When the deep dive is ready for handoff (issues prioritised, remediation plan written), move the file to `waiting/`.

2. **`waiting/`** – Discovery complete; waiting for engineering action.  
   - Contains finalized analysis plus concrete remediation steps.  
   - Assigned developer should move the file to `working/` when implementation starts.

3. **`working/`** – Fixes in progress.  
   - Engineers implement recommendations and keep the doc updated with status, links to PRs, and test evidence.  
   - Once all items are resolved and verified, move the doc to `finished/`.

4. **`finished/`** – Work verified and closed.  
   - Ensure the document captures final outcomes, test commands, and any follow-up tickets.  
   - Add a completion date before moving.

## Movement Rules
- Always move the entire file between folders—do not copy so we maintain a single source of truth.
- Update the `last_updated` frontmatter date when transitioning stages.
- Log progress in `docs/section-review-tracker.md` whenever a stage changes.
- If a section regresses, move its doc backward to the appropriate stage with a note explaining why.

## Template Usage
- Duplicate `discovery/section-review-template.md` for new sections.  
- Keep headings consistent so downstream tooling can parse findings.  
- Tailor content per section but retain the structure (Scope, Data Flow, Findings with priorities, Testing, Open Questions).

