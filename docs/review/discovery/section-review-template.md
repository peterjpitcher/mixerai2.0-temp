---
title: {{SECTION_NAME}} Deep Dive
description: Discovery notes, risks, and remediation plan for {{ROUTE_PREFIX}}.
last_updated: {{DATE}}
stage: discovery
---

# {{SECTION_NAME}} – Deep Dive Review

## Scope
- Entry points: {{ROUTE_PREFIX}}
- Key components/APIs: _list the relevant files, services, and data sources_
- Assumptions or exclusions: _note anything out of scope_

## Architecture & Data Flow
- **Rendering model**: _Server vs client components, suspense boundaries_
- **Data sources**: _Supabase tables, RPCs, external APIs_
- **State holders**: _React Query keys, contexts, local state_
- **Critical dependencies**: _auth helpers, notifications, background jobs_

## Findings & Recommendations

### High Priority
- **Issue title**  
  - File(s): `path/to/file.tsx:line`  
  - Impact: _business/user risk_  
  - Fix: _concrete remediation steps_  
  - Verification: _tests or manual flows to run_

### Medium Priority
- _Repeat structure above_

### Low Priority / Enhancements
- _Repeat structure above_

## Performance & Observability Notes
- _Profiling observations, logging gaps, caching opportunities_

## Testing Gaps
- _List missing unit/integration/e2e coverage and suggested additions_
- Suggested commands:  
  1. `npm run lint`  
  2. `npm run test -- <subset>`  
  3. _Manual flow checklist_

## Open Questions / Follow-Ups
- _Outstanding decisions, data needed from other teams_

## Next Actions
1. _Immediate steps to address top findings_
2. _Dependencies or approvals required_
3. _When ready for implementation, move this file to `../waiting/` and update `stage` in frontmatter_

