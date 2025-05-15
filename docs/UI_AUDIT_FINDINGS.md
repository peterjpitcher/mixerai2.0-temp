# MixerAI Dashboard UI Audit & Recommended Changes

**Date: 21 May 2024**
**Based on: UI_STANDARDS.md Version 1.0**

This document outlines findings and recommended changes to align the MixerAI Dashboard (`/dashboard` and its subpages) with the established UI Standards. Each section details areas for review and specific updates required.

## A. Global Dashboard Implementation (Affecting all pages)

These changes typically involve the main dashboard layout file (e.g., `src/app/dashboard/layout.tsx`) and global CSS/theme configurations.

1.  **Standard 0.1 (Global Header):**
    *   **Verify/Implement:** A consistent Global Header.
    *   **Content:** MixerAI logo, user profile access.
    *   **Branding:** If a global brand context is active and displayed here, include the active Brand Avatar and Name (UI Standard 2.1, 2.3).
2.  **Standard 0.1 (Main Sidebar Navigation):**
    *   **Verify/Implement:** Fixed Main Sidebar Navigation.
    *   **Content:** Links to all primary dashboard sections (UI Standard 1.5).
    *   **Branding:** If a persistent brand context is shown in the sidebar header, include Brand Avatar and Name (UI Standard 1.5, 2.1, 2.3).
3.  **Standard 0.1 (Main Content Area):**
    *   **Verify/Implement:** Clearly defined Main Content Area for all page-specific content.
4.  **Standard 0.2 (Grid System):**
    *   **Action:** Adopt and consistently apply a responsive grid system (e.g., 12-column) for layout within the Main Content Area. Document this system.
5.  **Standard 0.3 (Spacing Scale):**
    *   **Action:** Define and consistently use a spacing scale (e.g., 4px/8px increments) for all margins, padding, and gaps. Document and enforce.
6.  **Standard 6.1 (Typography System):**
    *   **Action:** Define and apply a consistent font family and typographic scale (sizes, weights, line heights for H1-H6, paragraphs, labels, etc.) application-wide.
7.  **Standard 6.2 (Consistent Colour Palette):**
    *   **Action:** Define and apply the standard application colour palette for core UI, text, backgrounds, and semantic states (success, error, etc.). Ensure Brand Colour usage (UI Standard 2.4) is an enhancement, not an override of this core palette.
8.  **Standard 6.3 (Interaction Feedback States):**
    *   **Verify/Implement:** Consistent hover, focus (highly visible), and active/pressed states for ALL interactive elements globally.
9.  **Standard 6.7 (Accessibility - Global):**
    *   **Action:** Ensure semantic HTML is used throughout. Implement a strategy for ARIA attributes where needed. Review keyboard navigation flow globally. Ensure global components (header, sidebar) are fully accessible.

## B. Page Categories & Specific Page Reviews

### B.1. Listing Pages

*   **Applies to (examples):**
    *   `src/app/dashboard/brands/page.tsx`
    *   `src/app/dashboard/content/page.tsx`
    *   `src/app/dashboard/templates/page.tsx`
    *   `src/app/dashboard/users/page.tsx`
    *   `src/app/dashboard/workflows/page.tsx`
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement if these pages are nested (e.g., if "Dashboard" is the parent). If listing brand-specific sub-items, include Brand Avatar and Name.
    *   **UI Standard 1.2 (Page Titles & Descriptions):**
        *   Ensure a clear `<h1>` Page Title (e.g., "Brands", "Content Library").
        *   Add a `<p>` Page Description below the title.
        *   If page context is tied to a specific brand (less common for top-level listings but possible for sub-listings), incorporate Brand Avatar in title and consider Brand Colour accent.
    *   **UI Standard 1.4 ("Create New" Button):** Ensure a consistently positioned (top-right of content area) and styled primary button (e.g., "New Brand", "Create Content").
    *   **UI Standard 2.1, 2.3, 2.4 (Active Brand Display):** If these pages are filtered by or display content for a *currently selected global brand*, this brand context (Avatar, Name, potential Colour accents) must be clearly displayed.
    *   **UI Standard 4.1 (Table Layout) / 4.2 (List Views):**
        *   Verify consistent table headers, cell alignment.
        *   Ensure row actions (Edit, Delete, View) use icons with tooltips and are consistently placed (rightmost column).
        *   For any cross-brand views (e.g., an admin seeing all content from all brands), each row/item *must* display the respective Brand Avatar and Name.
        *   Implement sorting and filtering controls consistently.
    *   **UI Standard 4.3 (Empty States):** Implement user-friendly empty state messages with CTAs (e.g., "No Brands found. Create New Brand").
    *   **UI Standard 4.4 (Loading Indicators):** Use consistent loading indicators (skeleton screens preferred for tables/lists).
    *   **UI Standard 4.5 (Iconography):** Ensure all icons are from the defined library and action icons have tooltips.
    *   **UI Standard 4.6 (Date & Time Formatting):** All dates/times must follow `dd Mmmm` or `dd Mmmm yyyy` format.
    *   **UI Standard 5 (Mobile & Responsive):** Ensure tables/lists are responsive (horizontal scroll or reflow to cards).

### B.2. Create Pages ("New" item forms)

*   **Applies to (examples):**
    *   `src/app/dashboard/brands/new/page.tsx`
    *   `src/app/dashboard/content/new/page.tsx`
    *   `src/app/dashboard/templates/new/page.tsx`
    *   `src/app/dashboard/users/invite/page.tsx` (specific create form)
    *   `src/app/dashboard/workflows/new/page.tsx`
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement breadcrumbs (e.g., `Dashboard > Brands > New Brand`). Include Brand Avatar/Name if creating an item *for* a pre-selected brand.
    *   **UI Standard 1.2 (Page Titles & Descriptions):**
        *   Clear `<h1>` (e.g., "Create New Brand").
        *   `<p>` description guiding the user.
        *   If relevant, include Brand Avatar in title and Brand Colour accent (UI Standard 2.3, 2.4).
    *   **UI Standard 1.3 ("Back" Button):** Implement a "Back" button (top-left) to return to the corresponding listing page.
    *   **UI Standard 2.1, 2.3, 2.4 (Active Brand Display):** If creating an entity under a specific pre-selected brand, ensure this brand context (Avatar, Name, Colour accents) is prominent.
    *   **UI Standard 3 (Forms & User Input):**
        *   **3.1 (Action Buttons):** "Create" (or similar) button bottom-right, "Cancel" button to its left. Ensure consistent styling. Consider sticky footer for long forms.
        *   **3.2 (Field Labels):** Positioned above fields.
        *   **3.3 (Placeholder Text):** Use for examples only, not instructions.
        *   **3.4 (Helper Text):** Implement for complex fields.
        *   **3.5 (Required Field Indication):** Use asterisks.
        *   **3.6 (Input Styling):** Ensure all form elements are consistent.
        *   **3.7 (Validation Messages):** Inline, below fields. Optional summary for many errors.
        *   **3.8 (Loading/Saving States):** Implement for the "Create" button during submission.
    *   **UI Standard 5 (Mobile & Responsive):** Ensure forms are usable on mobile devices.

### B.3. Edit Pages

*   **Applies to (examples):**
    *   `src/app/dashboard/brands/[id]/edit/page.tsx`
    *   `src/app/dashboard/content/[id]/edit/page.tsx`
    *   `src/app/dashboard/users/[id]/edit/page.tsx`
    *   `src/app/dashboard/workflows/[id]/edit/page.tsx`
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement (e.g., `Dashboard > Brands > [Brand Avatar] [Brand Name] > Edit`).
    *   **UI Standard 1.2 (Page Titles & Descriptions):**
        *   Clear `<h1>` (e.g., "Edit [Brand Avatar] [Brand Name]"). Include Brand Avatar.
        *   `<p>` description.
        *   Consider Brand Colour accent for the title/header area (UI Standard 2.4).
    *   **UI Standard 1.3 ("Back" Button):** Implement a "Back" button.
    *   **UI Standard 2.1, 2.3, 2.4 (Active Brand Display):** The entity being edited (Brand, Content for a Brand, etc.) defines the active brand context. This (Avatar, Name, potential Colour accents) must be very clear.
    *   **UI Standard 3 (Forms & User Input):**
        *   **3.1 (Action Buttons):** "Save Changes" button bottom-right, "Cancel" to its left. Confirmation dialog for "Cancel" if changes are unsaved.
        *   Apply all other points from 3.2 to 3.8 as for Create Pages.
    *   **UI Standard 5 (Mobile & Responsive):** Ensure forms are usable on mobile.

### B.4. Detail/View Pages (Non-edit views of a single entity)

*   **Applies to (examples, assuming these are view pages):**
    *   `src/app/dashboard/content/[id]/page.tsx` (if it's a view page, not edit)
    *   `src/app/dashboard/templates/[id]/page.tsx` (if it's a view page, not edit)
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement (e.g., `Dashboard > Content > [Content Title]`). If content is brand-specific, include Brand Avatar/Name in breadcrumbs.
    *   **UI Standard 1.2 (Page Titles & Descriptions):**
        *   Clear `<h1>` (e.g., "[Content Title]").
        *   `<p>` description.
        *   If brand-specific, include Brand Avatar in/near title and consider Brand Colour accent.
    *   **UI Standard 1.3 ("Back" Button):** Implement.
    *   **UI Standard 1.4 style button for primary action on this page (e.g. "Edit this template")**
    *   **UI Standard 2.1, 2.3, 2.4 (Active Brand Display):** If viewing a brand-specific entity, its context (Avatar, Name, Colour accents) must be clear.
    *   **UI Standard 4 (Data Display):**
        *   Structure information clearly. Use consistent typography and spacing.
        *   Apply date/time formatting (4.6).
        *   If displaying charts/visualisations for this entity, apply brand colour (4.7).
    *   **UI Standard 5 (Mobile & Responsive):** Ensure view is responsive.

### B.5. Specific Static/Information Pages

*   **Applies to (examples):**
    *   `src/app/dashboard/account/page.tsx`
    *   `src/app/dashboard/help/page.tsx`
    *   `src/app/dashboard/my-tasks/page.tsx`
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement (e.g., `Dashboard > Account Settings`).
    *   **UI Standard 1.2 (Page Titles & Descriptions):** Ensure clear `<h1>` and `<p>` description.
    *   **Forms (if present, e.g., Account page):** Apply all relevant standards from Section 3.
    *   **Data Display (if present, e.g., My Tasks):** Apply relevant standards from Section 4 (lists, empty states, loading, date formatting).
    *   **UI Standard 5 (Mobile & Responsive):** Ensure usability.

### B.6. Tools Pages

*   **Applies to (examples):**
    *   `src/app/dashboard/tools/alt-text-generator/page.tsx`
    *   `src/app/dashboard/tools/content-transcreator/page.tsx`
    *   `src/app/dashboard/tools/metadata-generator/page.tsx`
*   **Recommended Changes & Verifications:**
    *   **UI Standard 1.1 (Breadcrumbs):** Implement (e.g., `Dashboard > Tools > Alt Text Generator`).
    *   **UI Standard 1.2 (Page Titles & Descriptions):** Ensure clear `<h1>` and `<p>` description for each tool.
    *   **UI Standard 1.3 ("Back" Button):** If these are full pages, a "Back" button to a "Tools" overview page (if one exists) or Dashboard home.
    *   **UI Standard 2.1, 2.3, 2.4 (Active Brand Display):** If a tool operates within the context of a selected Brand (e.g., transcreator using brand's tone of voice), this brand context (Avatar, Name, Colour accents) must be prominent. If tools are brand-agnostic, this may not apply.
    *   **UI Standard 3 (Forms & User Input):** These pages will likely contain forms. Apply all relevant standards from Section 3 meticulously (action buttons, labels, placeholders, validation, etc.).
    *   **UI Standard 5 (Mobile & Responsive):** Ensure tools are usable on mobile.

## C. Overarching Review Points for All Pages

*   **Standard 4.5 (Iconography):** Audit all icons used. Ensure they are from the chosen library, used consistently, and all interactive icons have tooltips.
*   **Standard 6.4 (Modals & Pop-ups):** Review all modal dialogs. Ensure they have clear titles, dismissal methods (X, Cancel, Esc), and action buttons follow form button standards (primary right, secondary left). Overlay dimming.
*   **Standard 6.5 (Notifications & Toasts):** Review all toast/notification implementations for consistent positioning, styling (semantic colours, icons), and dismissibility.
*   **Standard 6.6 (Performance):** Identify any pages or components known to be slow and flag for optimisation (image optimisation, code splitting, etc.).
*   **Standard 6.7 (Accessibility - Page Specific):**
    *   For each page, review for logical heading structure.
    *   Check form accessibility (labels linked to inputs, `aria-required`).
    *   Ensure sufficient colour contrast on page-specific elements, especially those using Brand Colours.
    *   Provide alt text for all meaningful images.

This audit provides a roadmap for aligning the dashboard with the UI standards. Each point represents a task or verification step. It's recommended to tackle global changes first, then move through page categories.

## D. Detailed Page Audits & Fixes

### D.1. `src/app/dashboard/brands/page.tsx` - Brands Listing Page

**Current Status (Inferred from Code):**

*   Displays a list of brands, grouped by country.
*   Shows brand name, language, content count, and a brand icon/color.
*   Provides "View", "Edit", and "Delete" actions per brand.
*   Includes search functionality.
*   Handles loading, error, and empty states.
*   Has an "Add Brand" button.
*   Has "Export" and "Import" buttons (functionality not fully clear from this file alone).

**Specific UI Standards Alignment - Findings & Recommended Fixes:**

1.  **Standard 1.1 (Breadcrumbs):**
    *   **Finding:** No breadcrumbs component implemented.
    *   **Fix:** Add a breadcrumbs component at the top of the main content area. For this page, it would likely be `Dashboard > Brands`.
        *   *Code Example (Conceptual - depends on your breadcrumb component):*
            ```tsx
            <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands" }]} />
            ```

2.  **Standard 1.2 (Page Titles & Descriptions):**
    *   **Finding (Title):** `<h1>Brands</h1>` exists. Class `text-3xl font-bold tracking-tight` is used. This seems to align with "prominent page title."
    *   **Verification:** Ensure this styling is consistent with the defined H1 style in the global typography system (Standard 6.1).
    *   **Finding (Description):** No `<p>` page description below the title.
    *   **Fix:** Add a descriptive paragraph below the `<h1>`.
        *   *Code Example:*
            ```tsx
            // Below the <h1>Brands</h1>
            <p className="text-muted-foreground mt-2">
              View, manage, and create new client Brands. Brands help organize content and maintain distinct identities.
            </p>
            ```
    *   **Branding:** This is a top-level listing, so Brand Avatar/Colour in the title is not applicable unless a global brand filter is active (see point 4).

3.  **Standard 1.4 ("Create New" Button):**
    *   **Finding:** An "Add Brand" button (`<Button asChild><Link href="/brands/new">Add Brand</Link></Button>`) is present. It's in a `div` with `flex justify-between items-center` along with the `<h1>`. This generally aligns with top-right placement.
    *   **Verification:** Confirm its styling matches the primary action button style defined globally. Ensure it's consistently top-right across all listing pages.

4.  **Standard 2.1, 2.3, 2.4 (Active Brand Display):**
    *   **Finding:** This page lists all brands, so a *single* "active brand display" is not relevant here unless the entire dashboard can be filtered by a globally selected brand. If such a global filter exists and is active, its context (Avatar, Name, Colour) should be displayed prominently, potentially in the global header or a persistent sub-header. The current code does not suggest such a global filter.

5.  **Standard 4.1 (Table Layout) / 4.2 (List Views - Cards Used Here):**
    *   **Layout:** Uses a card-based grid layout (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`). This is acceptable per Standard 4.2.
    *   **Brand Identification in Cards:**
        *   **Avatar:** `BrandIcon` component is used, taking `name` and `brand_color`. This aligns with displaying a brand avatar/icon (Standard 2.3). Verify fallback behavior of `BrandIcon`.
        *   **Name:** `CardTitle` displays `brand.name`.
    *   **Card Content:** Displays language, content count (as text and a simple progress bar using `brand_color`).
    *   **Row Actions (Card Footer Actions):**
        *   "View", "Edit" buttons are present with icons and text.
        *   "Delete" button is present with an icon and text.
        *   **Finding:** Icons are SVGs directly in the JSX.
        *   **Fix:** Replace inline SVGs with icons from the consistent icon library (Standard 4.5). Ensure tooltips are added for these icon buttons if the text label is ever removed or for icon-only variants on smaller screens.
            *   *Example for Edit icon (conceptual):*
                ```tsx
                // import { EditIcon } from '@/components/icons'; // Or your library path
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/brands/${brand.id}/edit`}>
                    <Icon name="edit" className="mr-2 h-4 w-4" /> {/* Assuming a generic Icon component */}
                    Edit
                  </Link>
                </Button>
                ```
    *   **Sorting & Filtering:**
        *   **Search:** `Input placeholder="Search brands..."` is present. (Standard 4.1).
        *   **Sorting:** Brands are grouped by country, and countries are sorted alphabetically. Brands within countries are not explicitly sorted by name in the rendering loop but could be (e.g., `brands.sort((a,b) => a.name.localeCompare(b.name)).map(...)`).
        *   **Filtering Controls:** Only search is present. If other filters (e.g., by language) are needed, they should be added consistently.

6.  **Standard 4.3 (Empty States):**
    *   **Finding:**
        *   `EmptyState` component: Good implementation with icon, title ("No brands yet"), description, and CTA ("Add Your First Brand").
        *   Filtered empty state: "No brands found" message when search yields no results.
    *   **Verification:** Ensure visual styling of these empty states is consistent with global empty state design.

7.  **Standard 4.4 (Loading Indicators):**
    *   **Finding:** A loading spinner with text "Loading brands..." is implemented.
    *   **Recommendation:** While acceptable, consider if a skeleton screen resembling the card layout (Standard 4.4 prefers skeleton screens for lists/tables) would provide a better perceived performance for this page. If a simple spinner is the global standard, ensure its consistency.

8.  **Standard 4.5 (Iconography):**
    *   **Finding:** As noted in 5.c, action button icons are inline SVGs. "Export" and "Import" buttons also use inline SVGs. The `ErrorState` and `EmptyState` components use inline SVGs.
    *   **Fix:** Replace all inline SVGs with icons from the chosen global icon library. Ensure all interactive icons have tooltips.

9.  **Standard 4.6 (Date & Time Formatting):**
    *   **Finding:** No dates are explicitly displayed on the brand cards in the provided code. If `created_at` or `updated_at` were to be displayed, they must follow the `dd Mmmm` or `dd Mmmm yyyy` format.

10. **Standard 5 (Mobile & Responsive):**
    *   **Finding:** The card grid uses responsive classes (`md:grid-cols-2 lg:grid-cols-3`).
    *   **Verification:** Thoroughly test on various screen sizes. Ensure tap targets on cards (buttons) meet the 44x44 CSS pixels requirement (Standard 5.2). Ensure text remains legible (Standard 5.3).

11. **Additional Observations:**
    *   **"Export" and "Import" Buttons:** These are present. Their functionality needs to adhere to general UI consistency (e.g., feedback on action, error handling).
    *   **Delete Dialog (`AlertDialog`):** This seems well-structured with title, description, and actions ("Cancel", "Delete"/"Delete All").
        *   **Standard 6.4 (Modals):** Verify title clarity, dismissal methods (Cancel button, Esc key responsiveness - check `AlertDialog` component). Action buttons are correctly positioned (Primary/Destructive right, Cancel left).
        *   **Standard 3.1 (Button Styling for Modals):** Destructive action button uses `className="bg-destructive text-destructive-foreground hover:bg-destructive/90"`. Ensure this is the standard for destructive actions.
    *   **Toast Notifications (`sonner`):** Used for success/error messages.
        *   **Standard 6.5 (Notifications):** Ensure consistent positioning, styling, and dismissibility as per global standards for toasts.

**Summary of Key Actions for `src/app/dashboard/brands/page.tsx`:**

*   Implement Breadcrumbs.
*   Add a Page Description paragraph.
*   Standardize all icons using a central library and ensure tooltips for action icons.
*   Consider upgrading loading state to skeleton screens if that's the preferred pattern.
*   Verify responsive behavior and tap target sizes thoroughly.
*   Ensure all interactive elements meet global styling for typography, color, and interaction feedback states (hover, focus, active).

### D.2. `src/app/dashboard/brands/new/page.tsx` - Create New Brand Page

**Current Status (Inferred from Code):**

*   A multi-tab form ("Basic Details", "Brand Identity") for creating a new brand.
*   Includes fields for name, website, country, language, brand colour, brand identity, tone, guardrails, and content vetting agencies.
*   Allows searching and adding "Brand Admins".
*   Features a "Generate Brand Identity" capability.
*   Has "Cancel" and "Create Brand" buttons in the header-like section.
*   Each tab/card also has a footer with a "Create Brand" (or similar) button.

**Specific UI Standards Alignment - Findings & Recommended Fixes:**

1.  **Standard 1.1 (Breadcrumbs):**
    *   **Finding:** No breadcrumbs component implemented.
    *   **Fix:** Add a breadcrumbs component at the top of the main content area, before the header-like section containing the title and global action buttons. For this page, it would be `Dashboard > Brands > Create New Brand`.
        *   *Code Example (Conceptual):*
            ```tsx
            // At the very top of the returned <div>
            <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands", href: "/dashboard/brands" }, { label: "Create New Brand" }]} />
            // Followed by the <div className="space-y-6">...
            ```

2.  **Standard 1.2 (Page Titles & Descriptions):**
    *   **Finding (Title & Description):** A `<h1>Create New Brand</h1>` and a `<p>Define the details for your new brand.</p>` exist. These are well-placed together with a `BrandIcon`.
    *   **Verification (Title):** Ensure the styling of `<h1>` (`text-3xl font-bold tracking-tight`) matches the global H1 style.
    *   **Verification (Description):** Ensure the styling of `<p>` (`text-muted-foreground`) matches the global page description style.
    *   **Branding (Avatar):** The `BrandIcon` is used next to the title, dynamically updating with `formData.name` and `formData.brand_color`. This aligns with Standard 2.3 for visual context.
    *   **Branding (Colour Accent):** No explicit brand colour accent on the title itself, but the dynamic `BrandIcon` serves a similar purpose here. This is acceptable.

3.  **Standard 1.3 ("Back" Button):**
    *   **Finding:** No dedicated "Back" button in the top-left of the content area. A "Cancel" button exists in the top-right action group, which navigates to `/dashboard/brands`.
    *   **Fix/Clarification:**
        *   Per Standard 1.3, a "Back" button is typically top-left.
        *   Per Standard 3.1, a "Cancel" button is part of the form actions group (bottom-right, or sticky footer/header).
        *   The current "Cancel" button in the top-right header-like section is functional but blurs these two standards.
    *   **Recommendation:**
        1.  Implement a dedicated "Back" button (icon or icon+text) in the top-left, perhaps to the left of the `BrandIcon` and Title/Description block. This button should perform `router.back()` or navigate to `/dashboard/brands`.
        2.  The main form action buttons ("Create Brand" and a corresponding "Cancel") should be in the bottom-right of the entire form area (or a sticky footer as per Standard 3.1), not in the top header section. The current "Cancel" in the header section could be removed if a proper "Back" button and a form-level "Cancel" are implemented. *Alternatively, if the top action bar is intended to be a sticky header for form actions, then the "Cancel" button is correctly grouped with "Create Brand", but a separate "Back" navigation element (top-left of content area) is still recommended for consistency.*

4.  **Standard 2.1, 2.3, 2.4 (Active Brand Display):**
    *   **Finding:** This page is for *creating* a new brand, so there isn't an "active brand" context in the same way as an edit page. The `BrandIcon` next to the title dynamically reflecting the entered name and colour is a good preview and serves this purpose well for a creation form.

5.  **Standard 3 (Forms & User Input):**
    *   **3.1 (Standard Action Buttons & Positioning):**
        *   **Finding:**
            *   Top-right header: "Cancel" and "Create Brand" buttons.
            *   Card Footers (within Tabs): "Create Brand & Continue" (Basic Details tab) and "Create Brand" (Identity tab). This is duplicative and potentially confusing. The "Basic Details" footer button has different text.
        *   **Fix:**
            *   Consolidate form action buttons. There should be one primary "Create Brand" button and one "Cancel" button for the entire form.
            *   **Ideal Placement:** Bottom-right of the entire page/form area, potentially in a sticky footer if the form can be long (Standard 3.1).
            *   Remove the action buttons from the individual `CardFooter` sections within the tabs.
            *   The "Cancel" button should confirm if there are unsaved changes before navigating away.
        *   **Styling:** `Create Brand` is primary. `Cancel` is `variant="outline"`. This is good.
    *   **3.2 (Field Labels):**
        *   **Finding:** `<Label>` components are used (e.g., `<Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>`). This is good.
        *   **Verification:** Ensure all form fields have corresponding, correctly positioned labels.
    *   **3.3 (Placeholder Text):**
        *   **Finding:** Placeholders like "Enter brand name", "https://example.com" are used. These seem to be examples, which is correct.
        *   **Verification:** Double-check that no placeholder is used as a substitute for a label.
    *   **3.4 (Helper/Instructional Text):**
        *   **Finding:** Some labels include instructional text in a `span` (e.g., "Brand Admins <span className="text-muted-foreground text-xs">(Optional)</span>"). The "Generate Brand Identity" section has a `<p>` tag for instructions.
        *   **Fix/Refinement:** For field-specific instructions not part of the label itself, use dedicated helper text elements below the input, styled consistently (Standard 3.4). The paragraph under "Generate Brand Identity" is good. The "(Optional)" text can remain with the label if that's the chosen style for brevity.
    *   **3.5 (Required Field Indication):**
        *   **Finding:** `<span className="text-destructive">*</span>` is used for "Brand Name".
        *   **Verification:** Ensure all truly mandatory fields for brand creation are marked this way.
    *   **3.6 (Input Styling):**
        *   **Finding:** Uses `@/components/input`, `@/components/textarea`, `@/components/select`, custom color input.
        *   **Verification:** Ensure all these components (including the custom color input) adhere to the globally defined consistent visual style for form elements.
    *   **3.7 (Validation Messages):**
        *   **Finding:** `toast.error()` is used for validation (e.g., "Brand name is required.").
        *   **Fix:** While toasts can supplement, primary validation messages should appear inline, directly below or next to the respective fields (Standard 3.7). Toasts are better for submission success/failure messages.
            *   *Example: If brand name is empty on blur, show a message under the brand name input.*
    *   **3.8 (Loading/Saving States):**
        *   **Finding:** The "Create Brand" button shows `<Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...` when `isSaving` is true. This is good. Similar for `isGenerating`.

6.  **Tabs Component (`TabsList`, `TabsTrigger`, `TabsContent`):**
    *   **Finding:** Tabs are used for "Basic Details" and "Brand Identity".
    *   **Verification:** Ensure the Tabs component itself is styled consistently with any other tab usage in the application and is accessible (keyboard navigation, ARIA attributes).

7.  **Cards within Tabs (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`):**
    *   **Finding:** Content within tabs is structured using Cards.
    *   **Verification:** Ensure card styling is consistent. As noted (5.a), CardFooters containing action buttons should likely be removed in favor of global form actions. CardTitles and CardDescriptions within forms should follow a consistent hierarchy.

8.  **Iconography (Standard 4.5):**
    *   **Finding:** `Loader2`, `X`, `PlusCircle` from `lucide-react` are used.
    *   **Verification:** Ensure `lucide-react` is the chosen global icon library. If so, this is good. If not, replace with icons from the standard library. Ensure any interactive icons used (like `X` for removing URLs or admins) have tooltips if their function isn't immediately obvious from context alone.

9.  **Mobile & Responsive (Standard 5):**
    *   **Finding:** Uses `md:grid-cols-2` for some form layouts.
    *   **Verification:** Thoroughly test the entire form flow on various screen sizes. Ensure inputs are easily tappable, labels are clear, and the tabbed interface works well on mobile.

**Summary of Key Actions for `src/app/dashboard/brands/new/page.tsx`:**

*   Implement Breadcrumbs.
*   Refactor action buttons ("Create Brand", "Cancel"):
    *   Provide a single set of these buttons, ideally at the bottom of the form (sticky if form is long).
    *   Remove duplicative buttons from CardFooters within Tabs.
    *   Consider adding a dedicated "Back" button (top-left).
*   Implement inline validation messages for form fields instead of relying solely on toasts.
*   Verify all form elements and components (Tabs, Cards, Inputs, Selects, Badges for admins) adhere to global styling and accessibility standards.
*   Ensure consistent use of the chosen icon library.
*   Thoroughly test responsiveness and mobile usability. 