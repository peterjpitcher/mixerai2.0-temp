---
title: Issues, Help, Release Notes Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/issues`, `/dashboard/help`, `/dashboard/release-notes`.
last_updated: 2025-10-30
stage: finished
---

# Issues, Help, Release Notes – Deep Dive Review

## Scope
- `/dashboard/issues` (currently `notFound()`), `/dashboard/help` (help wiki), `/dashboard/release-notes`.  
- File-based content under `src/content/help-wiki`, `src/content/release-notes`.

## Findings & Recommendations

### High Priority

- Help/Release pages read markdown with `fs` on request; ensure proper caching (already using `cache`).  
- Add error handling for missing directories; fallback UI should explain.

### Medium Priority

- `/dashboard/issues` should route to actual issue tracker or remove entry.  
- Add search/filter to help wiki.  
- Provide release notes pagination.

### Low Priority / Enhancements

- Add last updated timestamps to help articles.  
- Allow feedback on help pages.

## Testing Gaps
- Tests for markdown parsing, frontmatter extraction.  
- Commands: `npm run lint`, add unit tests mocking fs.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Issues/help/release notes verified; stage marked `finished`.
