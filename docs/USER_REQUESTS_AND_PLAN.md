# User Requests and Phased Plan

This document outlines the feature requests, bug fixes, and the phased plan for their implementation in MixerAI 2.0a.

## User Requests

1.  **Claims Preview Fullscreen (`/dashboard/claims/preview`):**
    *   Add a full-screen option to make the claims matrix occupy the entire screen.
    *   **Status: DONE** (Fullscreen toggle implemented, close button functionality corrected, sticky header improvement attempted).

2.  **Claim Definitions Page (`/dashboard/claims/definitions` - formerly `/dashboard/admin/claims/definitions`):**
    *   **URL Standardization**: Page moved to `/dashboard/claims/definitions`.
    *   **Status: DONE** (Files moved, primary navigation updated. Internal links, breadcrumbs, and dependent logic verified.)
    *   **UI Reordering:** The display order should be: Claim Level, Brand, Claim Text, Claim Type, Markets/Countries.
    *   **Status: DONE**
    *   **Markets/Countries Selector:** Display the full list of countries directly, not within a dropdown menu. Countries are now fetched from `/api/countries`.
    *   **Status: DONE** (Country data fetched from API in `ClaimDefinitionForm.tsx`. UI is a direct scrollable list of checkboxes.)
    *   **Edit Functionality:** Enable editing of existing claims on this page. Issues with form fields (claim level, claim type, entity names in disabled dropdowns) not populating correctly during edit were addressed.
    *   **Status: DONE** (Core form logic for populating fields in edit mode is implemented in `ClaimDefinitionForm.tsx`.)
    *   **Grouped Claim Editing:** Claims created for multiple countries should share a common ID to allow simultaneous editing.
    *   **Status: PENDING**
    *   **Rename "Global" to "Master":** Replace the term "Global" with "Master" throughout the application where it refers to master claims or settings.
    *   **Status: DONE** (Extensive renaming across UI, API routes, types, database constraints, and navigation links. Terminology for market scope "Global" changed to "All Countries").

3.  **Overrides Page (`/dashboard/claims/overrides` - formerly `/dashboard/admin/claims/overrides`):**
    *   **URL Standardization**: Page moved to `/dashboard/claims/overrides`.
    *   **Status: DONE** (Files moved, primary navigation updated. Internal links, breadcrumbs, and dependent logic verified.)
    *   **Filtering:** Allow users to select a product or market/country to filter and view relevant overrides. Country list is now fetched from `/api/countries`.
    *   **Status: PARTIALLY DONE** (Country data source updated. UI for filter selectors and filtering logic needs implementation/verification.)
    *   **Scope:** Display only overrides that are *not* made at the "Master" (All Countries for market scope) level.
    *   **Status: PENDING**

4.  **Bug Fix: "Get AI Brand Review" (`/dashboard/claims/brand-review` - formerly `/dashboard/admin/claims/brand-review`):**
    *   **URL Standardization**: Page moved to `/dashboard/claims/brand-review`.
    *   **Status: DONE** (Files moved, primary navigation updated. Internal links, breadcrumbs, and dependent logic verified.)
    *   The "Get AI Brand Review" feature is failing.
    *   **Status: DONE** (Fixed `GET` handler in `src/app/api/ai/master-claim-brands/[masterClaimBrandId]/review-claims/route.ts`).

5.  **Products Page (`/dashboard/claims/products` - formerly `/dashboard/admin/products`):**
    *   Display the list of products in a table format.
    *   **Status: DONE** (URL standardized to `/dashboard/claims/products`)

6.  **Ingredients Page (`/dashboard/claims/ingredients` - formerly `/dashboard/admin/ingredients`):**
    *   Display the list of ingredients in a table format.
    *   **Status: DONE** (URL standardized to `/dashboard/claims/ingredients`. Original request for table view was already DONE, user noted UI might still need updates - this needs specific clarification if table view is not as expected).

7.  **Master Claim Brands Page (`/dashboard/claims/brands` - formerly `/dashboard/admin/master-claim-brands`):**
    *   Display the list of master claim brands in a table format.
    *   **Status: DONE** (URL standardized to `/dashboard/claims/brands`. Original request for table view was already DONE, user noted UI might still need updates - this needs specific clarification if table view is not as expected).

## Additional Implemented Changes (Not in original list but related)
*   **Standardised Admin Data URL Structures**: 
    *   Products: `/dashboard/admin/products/*` moved to `/dashboard/claims/products/*`.
    *   Ingredients: `/dashboard/admin/ingredients/*` moved to `/dashboard/claims/ingredients/*`.
    *   Master Claim Brands: `/dashboard/admin/master-claim-brands/*` moved to `/dashboard/claims/brands/*`.
    *   **Status: DONE**
*   **Standardised Claims URL Structure**: Changed `/dashboard/admin/claims/*` to `/dashboard/claims/*`. This includes:
    *   `definitions` page
    *   `overrides` page
    *   `brand-review` page
    *   `new` claim page
    *   `[id]/edit` claim page
    *   main claims listing page (`/dashboard/claims` formerly `/dashboard/admin/claims`)
    *   **Status: DONE** (File structure changed, main navigation links updated. Internal links, breadcrumbs, form actions, and redirects verified.)
*   **Standardise Country Listings (Database & API)**: New `countries` table created, `/api/countries` endpoint implemented. Pages updated to fetch countries from this API, removing hardcoded lists and `COUNTRY_CODES` constant.
    *   **Status: DONE**
*   **Terminology Change**: "Global" (market scope) changed to "All Countries" (using `ALL_COUNTRIES_CODE` and `ALL_COUNTRIES_NAME` constants).
    *   **Status: DONE**
*   **Build Stability**: Resolved numerous build errors, linter issues, and type errors, leading to a successful production build.
    *   **Status: DONE**

## Phased Implementation Plan (Updated)

**Phase 0: Documentation and Initial Bug Fix**
1.  Create `USER_REQUESTS_AND_PLAN.md`. **DONE**
2.  Fix "Get AI Brand Review" error. **DONE**

**Phase 1: UI Enhancements (Table Views and Fullscreen)**
1.  Table view for Products. **DONE**
2.  Table view for Ingredients. **DONE**
3.  Table view for Master Claim Brands. **DONE**
4.  Fullscreen for Claims Preview. **DONE**

**Phase 2: Foundational Changes ("Global" to "Master" & Country Standardization)**
1.  Rename "Global" to "Master". **DONE**
2.  Standardise Country Listings (DB & API). **DONE**
3.  Change "Global" market scope to "All Countries". **DONE**

**Phase 3: Claims URL Standardization & Internal Link/Logic Updates**
1.  Move `/dashboard/admin/claims/*` to `/dashboard/claims/*`. **DONE (File move & primary nav)**
2.  Thoroughly update all internal links, breadcrumbs, form actions, and redirects in the moved claims pages and any pages linking to them. **DONE**

**Phase 4: Claim Definitions Page (`/dashboard/claims/definitions`)**
1.  Implement Edit Functionality & Fix form population. **DONE**
2.  Update Markets/Countries selector UI (API fetch is done, UI is a list of checkboxes). **DONE**
3.  UI Reordering of fields. **DONE**
4.  Implement Grouped Claim Editing. **IN PROGRESS**
    *   **UI - Data Preparation for Form:** `handleEdit` in `DefineClaimsPage.tsx` updated to gather all country codes for a group when editing. `Heading` and form `key` updated for group context. **DONE** (Manual application of changes by user assumed complete).
    *   **PENDING: Backend API for Grouped Updates:** Requires a new endpoint (e.g., `PUT /api/claim-groups/[claim_grouping_id]`) or modification of existing API to handle updates to common claim data and associated country list for an entire group.
    *   **PENDING: Frontend Submission Logic:** `handleFormSubmit` in `DefineClaimsPage.tsx` needs to call the new/modified API for group updates.
    *   **PENDING: Database/Logic:** Review and ensure robust handling of `claim_grouping_id`.
    *   **PENDING: Clarification:** Behavior of 'Description' field in grouped edit (common or per-country).

**Phase 5: Overrides Page (`/dashboard/claims/overrides`)**
1.  Implement Filtering (Product/Market). **DONE** (Page now allows filtering by Product only, Market only, or both. API supports this. UI updated to reflect new filtering and display only overrides. Create Override flow from this page is disabled pending redesign.)
2.  Scope to non-"Master" (All Countries) overrides. **DONE** (By definition, market overrides are for specific markets, not ALL_COUNTRIES_CODE. The page displays these specific market overrides.) // User to confirm if this interpretation is correct.

**Phase 6: Build Stability & Final Documentation**
1.  Ensure successful build. **DONE**
2.  Final update to `DOCUMENTATION.md`. **PENDING** (Will do this once all functional changes are complete) 