# UI Standards Review: `src/app/dashboard/content/new/page.tsx` (Create Content Page Wrapper)

Date: 2024-07-26

This document outlines the findings from a UI standards review of the `src/app/dashboard/content/new/page.tsx` file. This file primarily acts as a wrapper that handles loading states, permission checks, and then renders the main form component (`ContentGeneratorForm`).

## Overall Assessment

The page structure uses a server component (`NewContentPage`) with React Suspense to load a client component (`PageContent`). `PageContent` checks user permissions and then renders `ContentFormWithParams`, which passes URL parameters to the actual form component, `ContentGeneratorForm`. This is a robust pattern for handling loading and conditional rendering.

## Compliance with UI Standards (for this wrapper component)

### Compliant Sections:

*   **0.4. Page Width and Padding:** The root `div` within `PageContent` uses `px-4 sm:px-6 lg:px-8 py-6 space-y-6`, adhering to the standard.
*   **4.4. Loading Indicators:** 
    *   The `Suspense fallback` in `NewContentPage` provides an initial loading spinner and text ("Loading content tools...").
    *   The `PageContent` component, while `isLoadingUser` or `isCheckingPermissions`, displays skeleton loaders for a title and content area.
    *   This multi-stage loading feedback is well-implemented.
*   **Access Denied State (Similar to 4.3 Empty States):** 
    *   If the user is not allowed to create content (not an `admin` or `editor`), an "Access Denied" message is displayed. This is clear and prevents unauthorized access to the form.

### Items Dependent on `ContentGeneratorForm` Component:

The majority of the UI standards for a "create new" page would apply to the `ContentGeneratorForm` component (imported from `@/components/content/content-generator-form`). This external component requires its own separate review to assess compliance with:

*   **Standard 1.1 (Consistent Breadcrumbs)**
*   **Standard 1.2 (Page Titles & Descriptions)** - The main page title and description for creating content would likely reside here.
*   **Standard 1.3 ("Back" Buttons)**
*   **Standard 3 (Forms & User Input)** - This includes:
    *   3.1: Standard Action Buttons (e.g., "Create Content", "Save Draft", "Cancel") and their positioning.
    *   3.2: Field Labels.
    *   3.3: Placeholder Text.
    *   3.4: Helper/Instructional Text.
    *   3.5: Required Field Indication.
    *   3.6: Consistent Input Styling.
    *   3.7: Validation Messages (inline and summary).
    *   3.8: Loading/Saving States for form submission buttons.

### Potential Issues & Areas for Optimisation/Clarification (for this wrapper component):

*   **Visual Cue for Access Denied State (Relates to Standard 4.5 - Iconography):**
    *   **Observation:** The "Access Denied" message displayed by `PageContent` is text-only. A comment in the code (`// Consider adding an icon like ShieldAlert...`) notes this.
    *   **Recommendation:** Adding a relevant icon (e.g., `AlertTriangle` or `ShieldAlert` from Lucide icons) next to the "Access Denied" text would enhance its visual impact and align better with how other states (like errors or empty states) use iconography.

## Summary of Recommendations (for this wrapper component):

1.  **Enhance "Access Denied" State (4.5):** Add a suitable icon to the "Access Denied" message for better visual communication.
2.  **Schedule Review for `ContentGeneratorForm`:** The core UI for content creation resides in the external `ContentGeneratorForm` component, which needs a dedicated review against all relevant UI standards, particularly Standard 3 (Forms & User Input).

This wrapper page effectively handles initial loading and permission checks. Its full compliance regarding the content creation experience depends heavily on the `ContentGeneratorForm` component. 