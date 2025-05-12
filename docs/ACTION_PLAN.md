# MixerAI 2.0a - Code Review Action Plan

This document outlines a prioritized, phased plan to address the issues identified in `docs/CODE_REVIEW_ISSUES.md`.

## Phase 0: Immediate Critical Security & Functionality Blockers [COMPLETED]

**Goal**: Stabilize the application, close major security holes, and unblock core user flows.

1.  **[COMPLETED] Security - Unauthenticated API Endpoints (CRITICAL)**:
    *   **Related Issues**: #90, #122, #126, #132, #134, #135, #136.
    *   **Action**: Applied `withAuth` and `withAdminAuth` as appropriate.

2.  **[COMPLETED] Security - SSRF Vulnerability (CRITICAL)**:
    *   **Related Issue**: #116 (`/api/proxy`)
    *   **Action**: Implemented basic denylisting for private IP ranges.

3.  **[COMPLETED] Functionality Blocker - Missing API Routes (CRITICAL)**:
    *   **Related Issues**: #188, #189, #190.
    *   **Action**: Implemented `/api/content-types`, `/api/content/generate/article-titles`, `/api/content/generate/keywords`.

4.  **[COMPLETED] Functionality Blocker - Save Content Not Implemented (CRITICAL)**:
    *   **Related Issues**: #154, #93.
    *   **Action**: Implemented `PUT /api/content/[id]` and connected save functionality in edit page.

5.  **[COMPLETED] Functionality Blocker - Redirect Loop on New Brand Page (CRITICAL)**:
    *   **Related Issue**: #146.
    *   **Action**: Removed redirect and added placeholder form UI.

6.  **[COMPLETED] Functionality Blocker - Registration Form UI Not Implemented (CRITICAL)**:
    *   **Related Issue**: (Previously #171).
    *   **Action**: Implemented UI for registration form inputs.

7.  **[COMPLETED] Functionality Blocker - Missing Post-Invite Confirmation Logic (CRITICAL)**:
    *   **Related Issue**: #179.
    *   **Action**: Implemented `/api/auth/complete-invite` and called from client to handle post-invite steps.

8.  **[COMPLETED] Build Configuration - TypeScript & ESLint Errors**: 
    *   **Related Issues**: #3, #4.
    *   **Action**: Set `ignoreBuildErrors: false` for TypeScript and ESLint.

## Phase 1: Core Functionality & Stability [IN PROGRESS - KEY ITEMS ADDRESSED]

**Goal**: Ensure all primary user workflows are functional, stable, and reasonably performant.

1.  **[COMPLETED] RichTextEditor Integration (CRITICAL DEPENDENCY)**:
    *   **Related Issue**: #38.
    *   **Action**: Installed `react-quill`, created wrapper, and integrated into `ArticleGeneratorForm` and `ContentEditPage`.

2.  **[PARTIALLY COMPLETED - Initial steps taken] `ArticleGeneratorForm` - Core Logic & Refactor**: 
    *   **Related Issues**: #40 (Overly complex), #41 (setTimeout chain), #42 (SEO keyword check), #43 (import).
    *   **Action**: Refactored `autoGenerateAllFields` to use `async/await`. Extracted `ArticleDetailsSidebar` component. Reliable keyword check deferred.

3.  **[COMPLETED] API Performance - User Search**: 
    *   **Related Issue**: #106 (Inefficient User Search in `/api/users/search`).
    *   **Action**: Refactored `/api/users/search` to query `profiles` table directly and efficiently.

4.  **[PARTIALLY COMPLETED - Initial steps taken] Data Integrity - Atomic Operations**: 
    *   **Related Issues**: #83, #87, #91, #103, #109, #120, #124, #125.
    *   **Action**: Addressed brand deletion (#87) atomicity by refactoring API to call an RPC (DB function `delete_brand_and_dependents` needs creation). Other operations require similar treatment.

5.  **[PARTIALLY COMPLETED - Initial steps taken] Role System Clarification & Implementation**: 
    *   **Related Issues**: #97, #100, #101, #104, #108, #168.
    *   **Action**: Introduced `isBrandAdmin` helper for brand-specific admin checks (used in `PUT/DELETE /api/brands/[id]`). Switched `/api/users/fix-role` to global `withAdminAuth`. Full audit pending.

6.  **[PARTIALLY COMPLETED - Initial steps taken] Type Safety - Core Data Structures**: 
    *   **Related Issues**: Many `any` type issues (e.g., #44, #113).
    *   **Action**: Created `src/types/models.ts` with core types (`Brand`, `UserProfile`, `Workflow`, `Notification`). Refactored `ArticleGeneratorForm` for `Brand[]`. Broader refactoring pending.

7.  **[COMPLETED] Toast System Consolidation**: 
    *   **Related Issues**: #53, #68, #145.
    *   **Action**: Removed Radix toast system. Sonner is now the sole toast system, and relevant components updated.

## Phase 2: UI/UX Refinements, Consistency, and Lower Priority Bugs

**Goal**: Improve user experience, code consistency, and address remaining functional gaps.

1.  **Styling Consistency - Colors & Icons**: 
    *   **Related Issues**: Many issues on hardcoded colors/icons (e.g., #45, #47, #48, #49, #57, #60, #61, #62, #64, #75, #76, #78, #147, #148, #152, #153, #160, #161, #173, #174, #175, #177, #182, #183, #184).
    *   **Action**: Systematically replace hardcoded colors with theme-based Tailwind classes or CSS variables. Replace inline SVGs with icons from the `Icons` component.

2.  **Date Formatting Standardization**: 
    *   **Related Issue**: #187 (Consolidated).
    *   **Action**: Refactor all date displays to use `date-fns`.

3.  **Non-Functional UI Elements**: 
    *   **Related Issues**: #150 (Content Search), #163 (User Page Export/Import), #130 (Brand Page Export/Import).
    *   **Action**: Implement functionality or remove/disable these elements.

4.  **API Response Consistency (Remaining Checks)**: 
    *   **Related Issue**: #2.
    *   **Action**: Final pass over all API routes for strict adherence to standard response format.

5.  **Form Enhancements & Minor UI Bugs**: 
    *   Address issues like #164 (unnecessary `mounted` state), #114 & #115 (Metadata generator keyword/scraping feedback), #122 (User Invite partial success handling).
    *   Review UI component usage based on specific page contexts.

6.  **Semantic HTML & Accessibility**: 
    *   **Related Issue**: #28 (`CardTitle` semantics).
    *   **Action**: Ensure `CardTitle` and similar components render appropriate HTML. Review overall accessibility.

7.  **Update Static Content & Documentation**: 
    *   **Related Issues**: #73, #74 (Outdated Terms, Privacy, Release Notes). #52 (Outdated component README).
    *   **Action**: Update user-facing static content and internal documentation.

## Phase 3: Lower Priority & Codebase Health

**Goal**: Address remaining minor issues, clean up dead code, and perform final optimizations.

1.  **Review Test/Demo Pages & API Test Routes**: 
    *   **Related Issues**: #79 (OpenAI Test sub-components), ensure test APIs (#117-#119, #120-#125, #127-#131, #132-#143 from prior numbering) are removed or secured.
    *   **Action**: Clean up or secure these routes/pages.

2.  **Code Cleanup**: 
    *   Remove dead/commented-out code (e.g., Issue #9, #119, #126).
    *   Address minor considerations (e.g., `node-fetch` usage, `cheerio`/`jsdom` bundling).

3.  **Final Polish**: 
    *   Address any remaining low-priority bugs or UI inconsistencies.
    *   Performance profiling and optimization if needed. 