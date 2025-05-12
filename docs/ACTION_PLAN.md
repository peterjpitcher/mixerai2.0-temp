# MixerAI 2.0a - Code Review Action Plan

This document outlines a prioritized, phased plan to address the issues identified in `docs/CODE_REVIEW_ISSUES.md`.

## Phase 0: Immediate Critical Security & Functionality Blockers [COMPLETED]

**Goal**: Stabilize the application, close major security holes, and unblock core user flows.

1.  **[COMPLETED] Security - Unauthenticated API Endpoints (CRITICAL)**:
    *   **Related Issues**: #90, #122, #126, #132, #134, #135, #136 (from CODE_REVIEW_ISSUES.md, numbers refer to the consolidated list that will be generated).
    *   **Action**: Immediately apply `withAuth` to all unauthenticated test/diagnostic API routes and the `/api/workflows/[id]` and `/api/content-templates/[id]` GET routes.
    *   **Further Action**: Implement admin-only authorization for all test/diagnostic routes and sensitive operational routes like `/api/env-check`, `/api/test-connection` (Issues #117, #118, #125, #127, #129). This requires reviewing/implementing `requireAdmin()` (Issue #72).

2.  **[COMPLETED] Security - SSRF Vulnerability (CRITICAL)**:
    *   **Related Issue**: #116 (`/api/proxy`)
    *   **Action**: Implement strict allowlisting or robust denylisting for the proxy endpoint immediately.

3.  **[COMPLETED] Functionality Blocker - Missing API Routes (CRITICAL)**:
    *   **Related Issues**: #188 (`/api/content-types`), #189 (`/api/content/generate/article-titles`), #190 (`/api/content/generate/keywords`).
    *   **Action**: Implement these missing API routes as they are dependencies for core content generation features in `ArticleGeneratorForm`.

4.  **[COMPLETED] Functionality Blocker - Save Content Not Implemented (CRITICAL)**:
    *   **Related Issues**: #154 (`src/app/dashboard/content/[id]/edit/page.tsx`), dependent on API Issue #93 (Missing PUT for `/api/content/[id]`).
    *   **Action**: Implement the `PUT /api/content/[id]` API route and connect the "Save Changes" functionality in the content edit page.

5.  **[COMPLETED] Functionality Blocker - Redirect Loop on New Brand Page (CRITICAL)**:
    *   **Related Issue**: #146 (`src/app/dashboard/brands/new/page.tsx`).
    *   **Action**: Remove the redirect and implement the actual brand creation form UI on this page.

6.  **[COMPLETED] Functionality Blocker - Registration Form UI Not Implemented (CRITICAL)**:
    *   **Related Issue**: (Previously #171) Refers to issue in `src/app/auth/register/page.tsx` where form UI is missing.
    *   **Action**: Implement the UI for the registration form inputs.

7.  **[COMPLETED] Functionality Blocker - Missing Post-Invite Confirmation Logic (CRITICAL)**:
    *   **Related Issue**: #179 (`src/app/auth/confirm/page.tsx`).
    *   **Action**: Implement the backend API endpoint and client-side call to handle post-invite confirmation steps (updating permissions, invitation status).

8.  **[COMPLETED] Build Configuration - TypeScript & ESLint Errors**: 
    *   **Related Issues**: #3, #4.
    *   **Action**: Set `ignoreBuildErrors: false` for both TypeScript and ESLint in `next.config.js` and fix any errors that surface during the build.

## Phase 1: Core Functionality & Stability

**Goal**: Ensure all primary user workflows are functional, stable, and reasonably performant.

1.  **RichTextEditor Integration (CRITICAL DEPENDENCY)**:
    *   **Related Issue**: #38.
    *   **Action**: Locate, restore, or implement/select and integrate the `RichTextEditor`. This is a prerequisite for properly addressing issues in `ArticleGeneratorForm` and content editing.

2.  **`ArticleGeneratorForm` - Core Logic & Refactor**: 
    *   **Related Issues**: #40 (Overly complex), #41 (setTimeout chain), #42 (SEO keyword check), #43 (import).
    *   **Action**: Begin refactoring `ArticleGeneratorForm` into smaller components/hooks. Replace `setTimeout` chains with `async/await`. Implement a reliable way to check keywords in content (dependent on `RichTextEditor` capabilities or server-side processing).

3.  **API Performance - User Search**: 
    *   **Related Issue**: #106 (Inefficient User Search in `/api/users/search`).
    *   **Action**: Refactor the user search API to avoid fetching all users. Implement a more scalable solution.

4.  **Data Integrity - Atomic Operations**: 
    *   **Related Issues**: #83, #87, #91, #103, #109, #120, #124, #125.
    *   **Action**: Prioritize the most critical non-atomic operations. Investigate and implement database transactions or more robust error handling/rollback mechanisms. Focus on user deletion and brand/template cascade deletes first.

5.  **Role System Clarification & Implementation**: 
    *   **Related Issues**: #97, #100, #101, #104, #108, #168.
    *   **Action**: Define the role model clearly (global vs. brand-specific). Update API authorization checks and role update logic. Review/Implement `requireAdmin()` (#72).

6.  **Type Safety - Core Data Structures**: 
    *   **Related Issues**: Many `any` type issues (e.g., #44, #113, #150, #151, #155, #156, #158, #166, #168, #170, #171, #172, #173, #174, #175, #176, #177).
    *   **Action**: Implement the shared types proposed for `User`, `Brand`, `Workflow`, `Notification` in `src/types/`. Start refactoring key components and API routes to use these strong types. Parse `Json` fields safely.

7.  **Toast System Consolidation**: 
    *   **Related Issues**: #53, #68, #145.
    *   **Action**: Decide on Sonner as the single toast system. Remove Radix-based toast components. Update `RootLayout` and all components to use Sonner.

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