# UI Review: Dashboard - New Workflow Page

**Page:** `/dashboard/workflows/new`
**File:** `src/app/dashboard/workflows/new/page.tsx`

**Review Date:** October 24, 2023
**Reviewer:** AI Assistant

This review assesses the New Workflow page against the UI standards documented in `docs/UI_STANDARDS.md`.

## 0. Global Page Layout & Structure

*   **0.1. Standard Page Regions:**
    *   Global Header & Main Sidebar: Assumed handled by `layout.tsx`.
    *   Main Content Area: The root `div` uses `px-4 sm:px-6 lg:px-8 py-6 space-y-6`. This adheres to **0.4 Consistent Padding**.
*   **0.2. Overall Grid System:**
    *   The main form sections (Workflow Details, Workflow Steps) are in a single column grid (`grid-cols-1 gap-6`).
    *   Within "Workflow Details", a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4`) is used for fields. This is good.
*   **0.3. Consistent Spacing Scale:**
    *   The page uses `space-y-6` for major sections. Within cards, `gap-4` and `space-y-2`, `space-y-3` are used. `RoleSelectionCards` uses `space-y-2` and `gap-2`. Spacing appears consistent.
*   **0.4. Page Width and Padding:**
    *   **Full Width:** No artificial width constraints on the page root.
    *   **Consistent Padding:** `px-4 sm:px-6 lg:px-8 py-6` is applied, which is correct.

## 1. Navigation & Structure

*   **1.1. Consistent Breadcrumbs:**
    *   **Presence & Content:** A `Breadcrumbs` component is used: `items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Workflows", href: "/dashboard/workflows" }, { label: "New" }]}`. Correct path, with the current page "New" not linked.
    *   **Positioning:** Appears at the top of the content area.
    *   **Note:** Same placeholder `Breadcrumbs` component as noted for the listing page. (Ref **1.1**)
*   **1.2. Page Titles & Descriptions:**
    *   **Page Title (`<h1>`):**
        *   **Presence & Content:** `h1` with "Create New Workflow".
        *   **Positioning:** Below breadcrumbs, left-aligned. A Brand Icon is displayed alongside when a brand is selected, which is a nice touch for context (Ref **2.1, 2.3**).
    *   **Page Description (`<p>`):**
        *   **Presence & Content:** `p` tag with "Design and configure a new content approval workflow." An additional line shows selected brand name. Good.
        *   **Positioning:** Directly below the `<h1>`.
*   **1.3. "Back" Buttons:**
    *   **Presence:** A back button with an `ArrowLeft` icon is present.
        ```tsx
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/workflows')} aria-label="Back to Workflows">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        ```
    *   **Functionality:** Navigates to `/dashboard/workflows`.
    *   **Positioning:** Top-left, aligned with the Page Title. This is excellent and per **1.3**.
*   **1.4. "Create New" / Primary List Action Button:**
    *   Not applicable for a creation page.

## 2. Branding & Contextual Information

*   **2.1. Active Brand Display:**
    *   When a brand is selected, its name appears below the page description, and its `BrandIcon` appears next to the Page Title. This is good contextual information.
*   **2.3. Brand Avatar Usage Guidelines:**
    *   `BrandIcon` is used next to the page title when a brand is selected. This is good.
    *   Brand selection dropdown items show a colored circle (derived from brand color) and brand name. This aids recognition.
*   **2.4. Brand Colour Application Guidelines:**
    *   Brand color is used for the small circle in the brand `Select` dropdown. This is a subtle and appropriate use.

## 3. Forms & User Input

*   **3.1. Standard Action Buttons & Positioning in Forms:**
    *   **Primary Action:** "Create Workflow" button.
        *   **Styling:** Standard `Button` component.
        *   **Positioning:** Located in a sticky footer `div` at the bottom-right. This is good for long forms (**3.1**).
    *   **Secondary Action:** "Cancel" button.
        *   **Styling:** `variant="outline"`.
        *   **Positioning:** To the left of the primary action button in the sticky footer.
    *   **Button Grouping:** Buttons are grouped in the sticky footer.
*   **3.2. Field Labels:**
    *   **Presence:** `Label` components are used for most inputs: Workflow Name, Status, Brand, Content Template, Workflow Description, Step Name, Step Description, Assigned Role, Assignees.
    *   **Positioning:** Generally above their respective inputs.
*   **3.3. Placeholder Text:**
    *   Used effectively: e.g., "e.g., Blog Post Approval" for Workflow Name, "Briefly describe what this workflow is for..." for description, etc.
*   **3.4. Helper/Instructional Text:**
    *   Used for Content Template select: "Link this workflow to a template..."
    *   Used for "Optional Step" switch: "This step is optional..."
    *   Assignee search results provide context like "No users found matching..."
*   **3.5. Required Field Indication:**
    *   Not explicitly marked with asterisks. Validation catches missing required fields (name, brand, step name, role) and shows toasts. Standard **3.5** recommends visual cue (asterisk).
*   **3.6. Consistent Input Styling:**
    *   Uses standard components (`Input`, `Textarea`, `Select`, `Switch`, `Button`) which should ensure consistent styling.
*   **3.7. Validation Messages:**
    *   **Client-side:** Validation function `validateWorkflow()` shows `toast.error` messages upon attempting to save.
    *   **Inline Messages:** No specific inline validation messages below fields before save attempt. Errors are shown via global toasts.
    *   **Standard 3.7** recommends inline messages directly below fields. Toasts are good for summaries or server errors, but inline provides more immediate context.
*   **3.8. Loading/Saving States for Buttons:**
    *   **Save Button:** Shows "Saving..." with a `Loader2` spinner when `isSaving` is true. Button is disabled.
    *   **Auto-Generate Description Button:** Shows "Generating..." with `Loader2` when `stepDescLoading[index]` is true. Button is disabled.
    *   This is well-implemented.

## 4. Data Display (Lists, Tables, Detail Views)

*   **Workflow Steps List:**
    *   Steps are displayed in bordered sections, not a table.
    *   Each step is numbered.
    *   Action icons (Move Up/Down, Delete) are present and icon-only. `aria-label` is used, which is good for **4.5**.
*   **Assignees:**
    *   Displayed as `Badge` components with a remove icon (`XCircle`).
    *   `aria-label` on remove button is good.
*   **User Search Results:**
    *   Displayed in a `Card` as a list of clickable buttons.
*   **4.3. Empty States:**
    *   Workflow Steps: "No steps defined... Click 'Add Step'..." - Clear and provides CTA.
    *   Brand Select: If no brands and user is not global admin: "You are not an admin for any brands." Placeholder: "No brands assigned".
    *   Brand Select: If no brands and user is global admin: Helper text "No brands found. Create one?" with link.
    *   Content Template Select: Placeholder changes based on context (e.g. "Select a brand first", "Loading templates...", "All templates are in use for this brand.").
    *   These are generally well-handled.
*   **4.4. Loading Indicators for Data Areas:**
    *   Initial page load: `Loader2` with "Loading user data..." or "Loading initial data...".
    *   Brand workflows loading: `isLoadingBrandWorkflows` disables template dropdown, placeholder shows "Loading templates...".
    *   User search: `userSearchLoading` shows `Loader2` with "Searching users...".
    *   Step description generation: `stepDescLoading` used for button state.
*   **4.5. Consistent Iconography:**
    *   Icons used: `ChevronDown`, `ChevronUp`, `Plus`, `Trash2`, `XCircle`, `Loader2`, `ArrowLeft`, `ShieldAlert`, `UserPlus`, `Search`. All from `lucide-react`. Consistency is good.
    *   Icon-only buttons generally have `aria-label`.
*   **4.6. Date & Time Formatting:** Not applicable for this form.

## 5. Mobile & Responsive Standards

*   **5.1. Responsive Layout Principles:**
    *   Details card uses responsive grid. Step configuration is single column, which stacks well.
    *   `RoleSelectionCards` uses responsive grid (`grid-cols-2 md:grid-cols-3`).
*   **5.2. Touch-Friendly Target Sizes:** Likely okay due to component library, but visual check recommended.
*   **5.3. Legible Font Sizes:** Assumed via global styles.

## 6. General UI & UX

*   **6.1. Typography System:** Assumed via global styles.
*   **6.2. Consistent Colour Palette:** Assumed via global styles.
*   **6.3. Interaction Feedback States (Hover, Focus, Active):** Needs visual check for components.
*   **6.4. Modals & Pop-ups (Dialogs):** No complex modals on this page; `ConfirmDialog` and `AlertDialog` are likely used by other components or for future features, but not directly invoked in this page's primary flow, other than Toasts.
*   **6.5. Notifications & Toasts:**
    *   `toast` from `sonner` is used extensively for errors (validation, API), success messages, and info. Good usage.
*   **6.6. Performance:**
    *   Loading states are present. Debounce is used for user search.
*   **6.7. Accessibility (A11Y):**
    *   **Semantic HTML:** Use of `Label`, `Button`, `Input`, etc. is generally good. `Card` components should be semantic.
    *   **ARIA:** `aria-label` used for icon buttons. `RoleSelectionCards` uses `button` elements which is good for accessibility. `aria-label="Breadcrumb"`.
    *   **Form Labels & Accessibility:** Inputs are generally associated with `Label` components using `htmlFor` matching `id`.
    *   **Focus states** for interactive elements need to be checked visually.
    *   **Required fields** lack visual markers, as noted in **3.5**.

## Issues & Recommendations

1.  **High:** Required fields are not visually indicated with an asterisk (*) as per **3.5**. While validation exists, immediate visual cues are standard.
2.  **Medium:** Validation errors are primarily shown via global toasts. Standard **3.7** recommends inline validation messages below the respective fields for more direct feedback. Consider adding inline messages, especially for `workflow.name`, `workflow.brand_id`, `step.name`, and `step.role` upon save attempt or on blur.
3.  **Minor:** The `Breadcrumbs` component is a local placeholder. (Ref: **1.1**) - Same as listing page.
4.  **Check:** Visually confirm hover, focus, and active states for all interactive elements to ensure they meet **6.3**.
5.  **Check:** Visually inspect on mobile/tablet to ensure responsive behavior is as expected, particularly for the step configuration sections and `RoleSelectionCards`. (Ref: **5.1 - 5.3**)
6.  **Low:** Page title metadata (`// export const metadata...`) is commented out.
7.  **Enhancement:** For the assignees section, when an email is added directly (not from search), it's displayed as a badge. If this email corresponds to an existing user, it might be beneficial to fetch and display their full name for consistency with users added via search.
8.  **Clarity:** The `Switch` for "This step is optional (approval not strictly required)" has `checked={!step.approvalRequired}`. This inverted logic (checked = optional, unchecked = required) might be slightly counter-intuitive. Standard practice is usually `checked = true` for the positive assertion (e.g., "Approval Required"). Consider if renaming the label to "Approval Optional" and using `checked={step.isOptional}` (adding `isOptional` to the data model, inverse of `approvalRequired`) would be clearer, or rephrasing the label to align with `approvalRequired` directly (e.g. "Approval Required" with `checked={step.approvalRequired}`).

## Overall Assessment

The `src/app/dashboard/workflows/new/page.tsx` is a complex form page that is **mostly well-aligned** with the UI Standards. It features good layout, clear navigation elements (breadcrumbs, back button), and appropriate use of components for inputs and data display. Loading states and feedback via toasts are well-implemented. 

The main areas for improvement are the visual indication of required fields and the display of validation messages inline with fields. Addressing these would significantly enhance usability according to the defined standards. 