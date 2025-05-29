# UI Standards Review: `src/app/dashboard/layout.tsx`

Date: 2024-07-26

This document outlines the findings from a UI standards review of the main dashboard layout file (`src/app/dashboard/layout.tsx`) against the guidelines defined in `docs/UI_STANDARDS.md`.

## Overall Assessment

The `DashboardLayout` component provides a good foundational structure for the dashboard area, incorporating several key requirements from the UI standards, such as a global header, main content area with padding, and considerations for mobile navigation. User authentication and display are handled with loading states and fallbacks.

## Compliance with UI Standards

### Compliant Sections:

*   **0.1. Standard Page Regions - Global Header:** Present, fixed, contains logo and user actions.
*   **0.1. Standard Page Regions - Main Sidebar Navigation:** `UnifiedNavigation` component included.
*   **0.1. Standard Page Regions - Main Content Area:** `<main>` element present for page content.
*   **0.4. Page Width and Padding - Consistent Padding:** `<main>` tag uses `p-4 sm:p-6`.
*   **1.5. Main Sidebar Navigation - Presence & Behaviour:** `UnifiedNavigation` and `BottomMobileNavigation` suggest responsive handling.
*   **2.3. Brand Avatar Usage Guidelines - Fallback (User Avatar):** `UserCircle2` icon used as fallback for user avatar.
*   **2.3. Brand Avatar Usage Guidelines - Accessibility (User Avatar):** `alt` text provided for user avatar.
*   **6.3. Interaction Feedback States - Hover States:** Applied to "Log out" and "Get Help" buttons.
*   **6.6. Performance - Optimisations (Image):** MixerAI logo and user avatars use `next/image` (with a conditional plain `<img>` for Dicebear).
*   **6.7. Accessibility (A11Y) - Semantic HTML:** Good usage of semantic elements like `<header>`, `<main>`.

### Partially Compliant / Needs Clarification / Areas for Improvement:

*   **0.1. Global Page Regions - Global Header - Active Brand Display:**
    *   **Observation:** The layout doesn't display an *active brand* in the global header. The standard mentions this for when "a global brand context is active".
    *   **Recommendation:** Clarify if a global brand context should always be visible in the header. If so, this needs to be added. If brand context is per-page or section, then current implementation is fine for the layout.
*   **0.1. Standard Page Regions - Main Content Area - Full Width:**
    *   **Observation:** The `<main>` tag itself is flexible (`flex-1`). The header's inner `div` has `w-full mx-auto px-4`, which is fine for header content, but ensure no unintended max-width constraints are inherited by the main content area from parent elements not seen in this file.
    *   **Status:** Likely compliant, but worth keeping in mind for overall page structure.
*   **User Avatar `<img>` vs `next/image` (Related to 2.3):**
    *   **Observation:** User avatars from `api.dicebear.com` use `<img>`, while others use `next/image`.
    *   **Recommendation:** For consistency and to leverage Next.js image optimisation for all external images, configure `remotePatterns` in `next.config.js` to allow the Dicebear domain and use `<Image>` for all user avatars.
*   **Notifications (Standard 6.5):**
    *   **Observation:** The `NotificationCenter` component import is commented out. `sonnerToast` is used for sign-out messages.
    *   **Recommendation:** Review the strategy for global notifications. If `sonnerToast` is the chosen method, ensure it's used consistently for all notifications as per Standard 6.5. If `NotificationCenter` was intended for a more comprehensive system, decide on its inclusion or removal.

### Items to be Checked on Individual Pages/Components:

The following standards are not directly applicable to this layout file but depend on its children or other components:

*   **1.1. Consistent Breadcrumbs**
*   **1.2. Page Titles & Descriptions**
*   **1.5. Main Sidebar Navigation - Active State** (Depends on `UnifiedNavigation` internal logic)
*   **2.1. Active Brand Display (Contextual Header/Indicator in Main Content)**
*   **General Adherence:** Typography (6.1), Colour Palette (6.2) will require ongoing checks across all components.

## Specific Points from `UI_STANDARDS.md`

*   **Standard 0.4 (Page Padding):** The `<main className="flex-1 p-4 sm:p-6 ...">` meets this requirement.
*   **Standard 1.5 (Main Sidebar Navigation):** `UnifiedNavigation` and `BottomMobileNavigation` are included. Responsiveness and active state indication within `UnifiedNavigation` would need separate verification if its code is reviewed.
*   **Standard 2.3 (Brand Avatar Usage - User Avatar):** Good fallbacks and alt text for user avatars in the header. Recommendation made above for consistent `next/image` usage.
*   **Standard 3.8 (Loading/Saving States for Buttons):** Implemented well for user info display and logout button in the header.
*   **Standard 5.1 (Responsive Layout Principles):** Presence of `BottomMobileNavigation` suggests this is addressed.

## Non-Standard Related Observations:

*   **Domain Verification Container:** A development-only `div` with `id="domain-verification-container"` is present. Its functionality is outside UI standards review but noted.
*   **`router.refresh()` on Sign Out:** Good practice for ensuring UI consistency after sign-out.

## Summary of Recommendations:

1.  **Clarify Global Brand Display:** Decide if an active brand should be displayed in the main header and implement if necessary.
2.  **Standardise User Avatar Component:** Update to use `next/image` for all user avatars, including those from Dicebear, by configuring `next.config.js`.
3.  **Finalise Notification Strategy:** Determine the consistent approach for user notifications (e.g., rely solely on `sonnerToast` or reinstate/replace `NotificationCenter`).
4.  **Verify `UnifiedNavigation`:** When reviewing shared components, ensure `UnifiedNavigation` correctly implements active state indication and responsiveness.

This review focuses on the layout structure. Child pages and components will require their own reviews to ensure full compliance with the UI standards. 