# File Naming Standardization

## Date: 2025-06-18

This document records the file naming standardization performed on the `/docs` directory.

## Naming Convention Adopted

All documentation files now follow **kebab-case** (lowercase with hyphens):
- All uppercase letters converted to lowercase
- Underscores (_) replaced with hyphens (-)
- Consistent, predictable naming pattern

## Files Renamed

### Core Documentation
- `README.md` → `readme.md`
- `ARCHITECTURE.md` → `architecture.md`
- `AI_TITLE_GENERATION.md` → `ai-title-generation.md`
- `DOCUMENTATION_REORGANIZATION_SUMMARY.md` → `documentation-reorganization-summary.md`
- `NAVIGATION_PERMISSIONS.md` → `navigation-permissions.md`
- `NAVIGATION_SYSTEM.md` → `navigation-system.md`
- `UI_STANDARDS_REVIEW_PLAN.md` → `ui-standards-review-plan.md`
- `UI_STANDARDS.md` → `ui-standards.md`
- `USER_FLOW_DIAGRAMS.md` → `user-flow-diagrams.md`
- `USER_FLOWS.md` → `user-flows.md`
- `user_guide.md` → `user-guide.md`

### API Documentation (`/docs/api/`)
- `API_ARCHITECTURE_REVIEW.md` → `api-architecture-review.md`

### Testing Documentation (`/docs/testing/`)
- `MANUAL_TESTING_CHECKLIST.md` → `manual-testing-checklist.md`
- `TESTING_REPORT.md` → `testing-report.md`
- `TESTING_SUMMARY.md` → `testing-summary.md`

### Setup Documentation (`/docs/setup/`)
- `STORAGE_SETUP.md` → `storage-setup.md`

### Review Folder
- `2025-06-18 Full Review/` → `2025-06-18-full-review/`
- All files within the review folder also renamed to kebab-case

## Updated References

The following files were updated to reflect the new naming convention:
1. `CLAUDE.md` - All documentation references updated
2. `index.md` - All links updated to new file names

## Benefits

1. **Consistency**: All files follow the same naming pattern
2. **Web-friendly**: Kebab-case is URL-safe and commonly used in web development
3. **Readability**: Lowercase with hyphens is easy to read
4. **Cross-platform**: Avoids potential case-sensitivity issues between operating systems
5. **Standards compliance**: Follows common documentation naming conventions

## Current Structure

```
/docs/
├── index.md
├── readme.md
├── architecture.md
├── ui-standards.md
├── user-guide.md
├── user-flows.md
├── user-flow-diagrams.md
├── navigation-permissions.md
├── navigation-system.md
├── ai-title-generation.md
├── workflow-assignee-mandatory-changes.md
├── email-template-standards.md
├── ui-standards-review-plan.md
├── documentation-reorganization-summary.md
├── file-naming-standardization.md
├── api/
│   ├── api-architecture-review.md
│   └── content-generation.md
├── testing/
│   ├── manual-testing-checklist.md
│   ├── testing-report.md
│   └── testing-summary.md
├── setup/
│   ├── storage-setup.md
│   └── migration-path-update-summary.md
└── 2025-06-18-full-review/
    └── (11 review documents in kebab-case)
```