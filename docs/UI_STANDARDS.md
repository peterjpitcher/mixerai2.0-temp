# MixerAI Dashboard UI Standards

**Version: 2.0**
**Date: 17 December 2024**

This document outlines the definitive User Interface (UI) and User Experience (UX) standards for the MixerAI application's dashboard area (`/dashboard` and its subpages). Adherence to these standards is crucial for maintaining consistency, usability, and a professional user experience across the platform. All new development and UI revisions must conform to these guidelines.

## Table of Contents
1. [Global Page Layout & Structure](#0-global-page-layout--structure)
2. [Navigation & Structure](#1-navigation--structure)
3. [Branding & Contextual Information](#2-branding--contextual-information)
4. [Forms & User Input](#3-forms--user-input-for-createedit-pages)
5. [Data Display](#4-data-display-lists-tables-detail-views)
6. [Mobile & Responsive Standards](#5-mobile--responsive-standards)
7. [General UI & UX](#6-general-ui--ux-visuals-interactions-accessibility)
8. [Component Library](#7-component-library)
9. [Specific Component Guidelines](#8-specific-component-guidelines)
10. [Page-Specific Standards](#9-page-specific-standards)

## 0. Global Page Layout & Structure

*   **0.1. Standard Page Regions:** All dashboard pages will consist of:
    *   **Global Header (Optional but Recommended):** A consistent bar at the top of the viewport, potentially containing the MixerAI application logo, user profile access (displaying user avatar/name, leading to account settings/logout), the active Brand Avatar and Name (if a global brand context is active, see 2.1, 2.3), and global search functionality. Remains fixed or scrolls with the page.
    *   **Main Sidebar Navigation:** Fixed on the left side of the viewport on desktop screens. Contains links to all primary dashboard sections. (See section 1.5)
    *   **Main Content Area:** The central area of the page where specific page content, forms, and data are displayed. This area will house breadcrumbs, page titles, descriptions, and the core functionality of the page. **It should utilize the full width available from the overall dashboard layout, with consistent internal padding applied (see 0.4).**
*   **0.2. Overall Grid System:** Employ a consistent responsive grid system (e.g., a 12-column grid) for the Main Content Area to ensure harmonious alignment and distribution of UI elements. This system must be documented (e.g., in the component library or a separate design system document).
*   **0.3. Consistent Spacing Scale:** Utilise a defined spacing scale (e.g., based on 4px or 8px increments: 4px, 8px, 12px, 16px, 24px, 32px, etc.) for all margins, padding, and gaps between UI elements to maintain visual rhythm and clarity. This scale must be documented and strictly followed.
*   **0.4. Page Width and Padding:**
    *   **Full Width:** Dashboard pages within the Main Content Area should not be artificially constrained in width (e.g., avoid using `container` or `max-w-` classes directly on page roots that would prevent content from using available space defined by the main dashboard layout).
    *   **Consistent Padding:** All page content within the Main Content Area should have consistent internal padding. This is ideally handled by the primary dashboard layout component that wraps page content. If not, each page root `div` should apply a standard padding class set (e.g., `px-4 sm:px-6 lg:px-8 py-6` or a project-defined equivalent like `p-6 md:p-8`). This ensures a consistent margin around the content on all sides, regardless of screen size.
    *   **Vertical Spacing:** Consistent vertical spacing between elements (e.g., between header, cards, sections) should be maintained using the defined spacing scale (0.3), typically applied via margin-top/bottom or a `space-y-*` utility on parent containers.

## 1. Navigation & Structure

*   **1.1. Consistent Breadcrumbs:**
    *   **Presence:** Always displayed on pages nested within the dashboard hierarchy (i.e., any page that is not a top-level section accessible directly from the Main Sidebar Navigation).
    *   **Content:** Shows the navigational path from the main "Dashboard" landing page to the current page (e.g., `Dashboard > Brands > [Brand Avatar] [Specific Brand Name] > Edit Content`). The active Brand Avatar (see 2.3) should appear next to the Brand Name in the breadcrumb trail. Each part of the breadcrumb trail representing a previous page must be a link. The current page name in the breadcrumbs is not linked.
    *   **Positioning:** Directly below the Global Header (if present), or at the very top of the Main Content Area, spanning its width.
    *   **Implementation:** Use semantic HTML (`<nav>` with `aria-label="Breadcrumb"`), separated by forward slashes or chevrons.
*   **1.2. Page Titles & Descriptions:**
    *   **Page Title (`<h1>`):**
        *   **Presence:** Every page within the Main Content Area must have a unique and descriptive `<h1>` title.
        *   **Content:** Clearly states the purpose of the page (e.g., "Manage Brands", "Create New Content Template", "Edit User Profile for [Brand Avatar] [Specific Brand Name]"). For pages specific to a Brand, the Brand Avatar (see 2.3) should appear alongside the Brand Name if included in the title.
        *   **Positioning:** The most prominent text element at the top of the Main Content Area, directly below the Breadcrumbs. Left-aligned. A subtle accent using the active Brand Colour (see 2.4) may be used near or as part of the title styling for brand-specific pages, ensuring accessibility.
        *   **Styling:** Font size 2.5rem (40px) on desktop, 2rem (32px) on mobile. Font weight 700-800.
    *   **Page Description (`<p>`):**
        *   **Presence:** Every page must have a short descriptive paragraph directly below the `<h1>` Page Title.
        *   **Content:** Provides brief context about the page's purpose or guides the user on primary actions (e.g., "View, manage, and create new client Brands.", "Use this form to define the structure and fields for a new Content Template.").
        *   **Positioning:** Directly below the `<h1>` Page Title, left-aligned. Styled distinctly from the title (e.g., smaller font size, standard paragraph text weight/colour).
        *   **Styling:** Font size 1rem (16px), color `text-gray-600` in light mode, `text-gray-400` in dark mode.
*   **1.3. "Back" Buttons:**
    *   **Presence:** All pages that represent a step away from a primary listing or a parent view (e.g., Brand edit pages, Content creation forms, User detail views) must have a clearly labelled "Back" button or an icon-based back arrow (e.g., left-pointing arrow).
    *   **Functionality:** Returns the user to the immediate previous page in their navigation history or to a logical parent page (e.g., from "Edit Brand" page back to the "Brands" listing page).
    *   **Positioning:** Consistently placed in the top-left of the Main Content Area, typically to the left of, or directly above, the Page Title (`<h1>`).
    *   **Implementation:** Use a ghost/outline button style with arrow icon and optional text label.
*   **1.4. "Create New" / Primary List Action Button (e.g., for Brands, Content, Templates):**
    *   **Presence:** On main listing pages (e.g., the page listing all Brands, all Content items, all Templates), a primary button to initiate the creation of a new entity should be present.
    *   **Labeling:** Clear and action-oriented, specific to the entity (e.g., "New Brand", "Create Content", "New Template").
    *   **Positioning:** Consistently in the top-right corner of the Main Content Area, often aligned horizontally with the Page Title or Breadcrumbs.
    *   **Styling:** Primary button style with brand-appropriate accent color.
*   **1.5. Main Sidebar Navigation:**
    *   **Presence:** Persistently visible on the left side of the screen on desktop views.
    *   **Behaviour:** Collapses into a "hamburger" menu icon on smaller screens (tablets, mobile). This icon should be located in the top-left of the Global Header, or top-left of the Main Content Area if no Global Header exists.
    *   **Content:** Contains links to all top-level sections of the dashboard (e.g., Dashboard Home, Brands, Content, Content Templates, Users, Workflows, Settings). If a persistent brand context is displayed in the sidebar header, it may include the active Brand Avatar and Name (see 2.1, 2.3).
    *   **Active State:** The currently active navigation item (corresponding to the user's current location in the app) must be clearly visually indicated (e.g., different background colour, bold text, a contrasting accent line).
    *   **Width:** Fixed at 256px on desktop, full screen overlay on mobile.
*   **1.6. Brand Selection Controls (e.g., Dropdowns, Switchers):**
    *   **Presence:** If UI elements allow users to switch the active Brand context (e.g., a dropdown menu).
    *   **Visuals:** Such controls must display both the Brand Name and the Brand Avatar (see 2.3) for each selectable brand to aid quick recognition.
    *   **Implementation:** Use custom dropdown component with search functionality for > 10 brands.

## 2. Branding & Contextual Information

*   **2.1. Active Brand Display (Contextual Header/Indicator):**
    *   **Presence:** When a user is performing tasks specifically related to a single Brand (e.g., editing Brand details, creating or viewing Content for *that* Brand), the name and avatar (see 2.3) of the active Brand must be clearly and unambiguously visible. This serves as a constant contextual reminder.
    *   **Positioning:** Displayed prominently within the Main Content Area. This could be as part of a dedicated sub-header element (e.g., `Active Brand: [Brand Avatar] [Brand Name]`) directly below the breadcrumbs or integrated near the Page Title.
    *   **Styling Accent:** The active Brand Colour (see 2.4) can be used subtly as an accent for this display element (e.g., a border, background highlight for the avatar container, or a coloured icon within the indicator), provided all accessibility and contrast requirements (see 2.4.1, 6.7) are met.
*   **2.2. Other Contextual Information (e.g., Selected Content Type):**
    *   **Presence:** If other selections made by the user dictate the page's context or the behaviour of forms (e.g., "Selected Content Type: Blog Post" when creating new Content), this information should also be clearly visible.
    *   **Positioning:** Near the Page Title or adjacent to the specific section of the page or form it applies to.
*   **2.3. Brand Avatar Usage Guidelines:**
    *   **Purpose:** To provide an immediate visual cue for the active or referenced Brand, enhancing context and recognition.
    *   **Clarity & Size:** Avatars/logos must be clear and recognizable even at small sizes (e.g., 24x24px, 32x32px). Consider providing guidelines for logo simplification if complex logos are uploaded.
    *   **Standard Sizes:**
        *   Small: 24x24px (navigation, compact lists)
        *   Medium: 32x32px (standard lists, forms)
        *   Large: 48x48px (page headers, detail views)
        *   Extra Large: 64x64px (brand profile pages)
    *   **Fallback:** A consistent fallback mechanism is mandatory if a Brand Avatar is not available or fails to load. Options:
        *   Brand initials (e.g., "BN" for "Brand Name") displayed within a consistently styled container (e.g., a circle with a default background colour).
        *   A generic placeholder brand icon.
    *   **Accessibility:**
        *   Avatars must not be the sole means of identifying a Brand; they should always accompany the Brand Name in text.
        *   If implemented as `<img>` tags, they must have appropriate `alt` text (e.g., `alt="[Brand Name] logo"` or `alt=""` if purely decorative and the name is adjacent).
    *   **Consistency:** Apply avatars with consistent styling (e.g., shape - square, rounded, circle; size relative to accompanying text) in all designated locations.
    *   **Performance:** Optimize avatar image assets (format, compression) to prevent degradation of page load performance, especially if used in lists.
*   **2.4. Brand Colour Application Guidelines:**
    *   **Purpose:** To subtly reinforce Brand context and provide a degree of visual customisation, enhancing the user's connection to the Brand they are working with.
    *   **Accessibility & Contrast (Critical):**
        *   Any use of Brand Colour as a background for text, or for text itself, *must* strictly adhere to WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text) against its direct background/foreground.
        *   A mechanism to check or enforce this is highly recommended (e.g., programmatically checking contrast or providing admin warnings for non-compliant colours).
        *   If a user-selected Brand Colour is non-compliant for a specific use case (e.g., text on brand colour background), a predefined accessible fallback colour (or a calculated accessible variant of the brand colour) *must* be used.
        *   Brand Colour should *never* be the sole means of conveying information or indicating a state.
    *   **Consistency of Core UI:** Global UI elements (main navigation, primary application-wide action buttons not specific to a brand task, global alerts) should generally *not* use the active Brand Colour. They must maintain their standard application palette for overall consistency and to avoid user confusion. Brand Colour is for contextual enhancement.
    *   **Subtlety & Purpose:** Apply Brand Colour purposefully and subtly (e.g., minor accents, borders, specific icons). Overuse can lead to a visually noisy, fragmented, or inaccessible interface.
    *   **Dark Mode:** If a dark mode is implemented, the application of Brand Colours will require separate consideration and testing to ensure they work harmoniously and remain accessible. Some colours may need adjusted variants for dark mode.
    *   **User-Selected Colours:** The system must gracefully handle a wide spectrum of user-inputted Brand Colours. This reinforces the critical need for accessibility checks and fallback strategies.
    *   **Legibility:** Ensure that text placed on or near brand-coloured elements remains highly legible.

## 3. Forms & User Input (for Create/Edit Pages)

*   **3.1. Standard Action Buttons & Positioning in Forms:**
    *   **Primary Action (e.g., "Save Changes", "Create Brand", "Update Template", "Publish Content"):**
        *   **Styling:** Visually distinct as the main call to action for the form (e.g., solid background colour using the application's primary action colour).
        *   **Positioning:** Placed in the bottom-right corner of the form area. For very long forms, these action buttons should reside in a "sticky" footer bar that remains visible as the user scrolls the form content.
        *   **Standard Sizes:** 
            *   Height: 40px (desktop), 44px (mobile)
            *   Minimum width: 120px
            *   Padding: 12px 24px
    *   **Secondary Action (e.g., "Cancel", "Discard Changes"):**
        *   **Styling:** Less prominent than the primary action (e.g., an outline/ghost button style, or a subtle background/text colour).
        *   **Functionality:** Discards any unsaved changes (a confirmation dialog *must* be used if changes have been made) and returns the user to the previous logical page (e.g., the corresponding listing page).
        *   **Positioning:** Immediately to the left of the Primary Action button.
    *   **Other Form-Specific Actions (e.g., "Save as Draft", "Preview Content"):**
        *   **Positioning:** If applicable, position these to the left of the "Cancel" button. Maintain consistent styling for such tertiary actions, distinct from both primary and cancel actions.
    *   **Button Grouping:** All main form submission/cancellation buttons (Primary, Cancel, and other global form actions) must be visually grouped together.
*   **3.2. Field Labels:**
    *   **Presence:** All input fields (text, number, password, etc.), select dropdowns, text areas, radio button groups, and checkbox groups must have clear, concise, and permanently visible labels.
    *   **Positioning:** 
        *   **Standard fields:** Positioned to the left of the input field, inline on the same row. Use a consistent label width (e.g., `w-32` or `w-40` depending on content) with right-aligned text for visual alignment of all fields.
        *   **Textareas and complex fields:** May use top-aligned labels when the field requires full width.
        *   **Mobile:** On screens < 640px, labels stack above fields to conserve horizontal space.
    *   **Layout:** Use grid or flex layouts with consistent spacing between label and field (e.g., `gap-4`).
    *   **Styling:** Font weight 500, font size 0.875rem (14px), color `text-gray-700` (light mode).
*   **3.3. Placeholder Text:**
    *   **Usage:** Should *only* be used to provide *examples* of the expected input format or content (e.g., for a "Website URL" field, placeholder could be `e.g., https://www.example.com`).
    *   **Avoidance:** Must *not* be used as a substitute for field labels or to provide critical instructions. Placeholder text disappears upon user input or focus, making it unreliable for persistent information.
    *   **Styling:** Color `text-gray-400`, italicized.
*   **3.4. Helper/Instructional Text:**
    *   **Presence:** For complex fields or where additional guidance beyond the label is necessary (e.g., explaining formatting rules, character limits), use a dedicated helper text element.
    *   **Positioning:** Directly below the associated input field, positioned before any validation messages for that field. Styled subtly (e.g., smaller font size, slightly lighter text colour than standard paragraph text).
    *   **Styling:** Font size 0.75rem (12px), color `text-gray-500`.
*   **3.5. Required Field Indication:**
    *   **Visual Cue:** Clearly mark all mandatory fields. The standard method is an asterisk (`*`) placed directly after the field label text (e.g., "Brand Name *").
    *   **Accessibility:** Ensure this requirement is also conveyed programmatically to assistive technologies (e.g., via the `aria-required="true"` attribute on the input field).
    *   **Color:** Red (`text-red-500`).
*   **3.6. Consistent Input Styling:** 
    *   **Text Inputs:**
        *   Height: 40px
        *   Border: 1px solid `border-gray-300`
        *   Border radius: 6px
        *   Padding: 8px 12px
        *   Focus state: Blue border (`border-blue-500`) with subtle shadow
    *   **Textareas:**
        *   Min height: 80px
        *   Same border and padding as text inputs
        *   Resize: vertical only
    *   **Select Dropdowns:**
        *   Same height and styling as text inputs
        *   Custom arrow icon
    *   **Checkboxes/Radio Buttons:**
        *   Size: 16x16px
        *   Custom styled with brand accent on selection
        *   Label padding-left: 8px
*   **3.7. Validation Messages:**
    *   **Inline Messages:** Display clear, concise, user-friendly validation messages directly below the respective field upon error. Success messages (e.g., "Username available") can also be shown inline if appropriate.
    *   **Summary (Optional but Recommended for Long/Complex Forms):** For forms with many potential errors, a summary of all current validation errors can be displayed at the top of the form, above the first field. Each error message in the summary should ideally link to the respective field.
    *   **Timing:** Implement client-side validation for immediate user feedback (e.g., on blur or on input for certain rules). Server-side validation must always be the ultimate source of truth for data integrity and security.
    *   **Styling:** 
        *   Error: Red text (`text-red-600`), red border on field
        *   Success: Green text (`text-green-600`), green border on field
        *   Warning: Yellow text (`text-yellow-600`), yellow border on field
*   **3.8. Loading/Saving States for Buttons:**
    *   **Feedback:** Buttons that trigger asynchronous operations (e.g., "Save", "Submit", "Create") must provide clear visual feedback during the processing state.
    *   **Implementation:** This typically involves disabling the button to prevent multiple submissions and showing a loading indicator (e.g., a spinner icon replacing or appearing alongside the button text, or the button text changing to "Saving...", "Processing...").
    *   **Spinner:** Use consistent spinner component, 16x16px for buttons.
*   **3.9. Form Layout Patterns:**
    *   **Inline Label Layout (Default):**
        ```html
        <div class="grid grid-cols-12 gap-4 items-center">
          <label class="col-span-3 text-right">Field Name</label>
          <input class="col-span-9" />
        </div>
        ```
    *   **Consistent Label Width:** All labels in a form should have the same width for visual alignment:
        *   Short forms: `w-32` (128px)
        *   Standard forms: `w-40` (160px)
        *   Forms with long labels: `w-48` (192px)
    *   **Form Sections:** Group related fields with consistent spacing:
        *   Between fields: `space-y-4`
        *   Between sections: `space-y-8`
    *   **Responsive Behavior:**
        *   Desktop (>= 640px): Inline labels
        *   Mobile (< 640px): Stack labels above fields
    *   **Complex Field Exceptions:**
        *   Rich text editors: Label above
        *   File uploads: Label above
        *   Multi-select with many options: Label above

## 4. Data Display (Lists, Tables, Detail Views)

*   **4.1. Consistent Table Layout (for tabular data like lists of Brands, Users, Content items):**
    *   **Headers:** Clear, concise column headers. Text within headers should be left-aligned by default.
    *   **Cell Alignment:** Text content within table cells should be left-aligned. Numerical data or date/time values should be right-aligned or consistently aligned to facilitate easy scanning and comparison.
    *   **Row Actions:** 
        *   **Three-dot menu pattern (Required):** All row actions must be contained within a single three-dot (ellipsis) dropdown menu button in the rightmost column.
        *   **Menu button:** Use a consistent icon button with three vertical dots (⋮) or three horizontal dots (⋯), 32x32px click target.
        *   **Dropdown content:** Menu items should include icon + text label (e.g., "✏️ Edit", "👁️ View", "🗑️ Delete").
        *   **Common actions order:** View/Edit, Duplicate (if applicable), Delete (separated by divider).
        *   **Destructive actions:** Delete and other destructive actions must be visually distinct (red text) and placed last with a separator above.
        *   **Never use:** Individual icon buttons for each action - this creates visual clutter and accessibility issues.
    *   **Brand Identification (in cross-brand views):** If a table lists items from multiple Brands (e.g., an administrator's overview), each row should include the corresponding Brand Avatar (see 2.3) and Name for clear identification.
    *   **Sorting & Filtering:** Where applicable (for most data tables), provide controls for sorting table data by column (indicated by sort icons in column headers). Filtering controls (e.g., search input, dropdown filters for status) should be positioned consistently above the table.
    *   **Row Height:** Minimum 48px for comfortable interaction.
    *   **Hover State:** Subtle background color change on row hover.
    *   **Selection:** Checkbox in leftmost column for multi-select tables.
*   **4.2. List Views (Non-tabular, e.g., Card Layouts):** 
    *   **Card Structure:**
        *   Border: 1px solid `border-gray-200`
        *   Border radius: 8px
        *   Padding: 16px
        *   Shadow: `shadow-sm` on hover
    *   **Card Grid:** 
        *   Gap: 16px between cards
        *   Responsive columns: 1 (mobile), 2 (tablet), 3-4 (desktop)
*   **4.3. Empty States:**
    *   **Presence:** When a list, table, or data view has no data to display (e.g., no Brands created, no Content matching filters), a clear and user-friendly "empty state" message must be shown.
    *   **Content:** Should explain why the area is empty (e.g., "No Brands found. Get started by creating one.") and, if applicable, provide a clear call to action (e.g., a button or link to "Create New Brand").
    *   **Positioning:** Centred within the area where the data would normally appear. May include a relevant icon or illustration.
    *   **Styling:** 
        *   Icon/Illustration: 64x64px minimum
        *   Title: Font size 1.125rem (18px), font weight 600
        *   Description: Font size 0.875rem (14px), color `text-gray-500`
*   **4.4. Loading Indicators for Data Areas:**
    *   **Presence:** When data is being fetched asynchronously for a table, list, or detail view, an appropriate loading indicator must be displayed.
    *   **Types:** 
        *   **Skeleton Screens:** Preferred for lists and tables
        *   **Spinners:** For small areas or quick loads
        *   **Progress Bars:** For operations with known duration
    *   **Positioning:** The loading indicator should occupy the space where the data will eventually load, or be displayed as an overlay if more appropriate.
*   **4.5. Consistent Iconography:**
    *   **Library:** Use Lucide React icons consistently throughout the application.
    *   **Sizes:** 
        *   Small: 16x16px (inline with text, buttons)
        *   Medium: 20x20px (standard actions)
        *   Large: 24x24px (primary actions, empty states)
    *   **Usage:** Icons should be used purposefully to enhance comprehension, provide quick visual cues for actions, and save space – not merely for decoration. Ensure icons are universally understood or always paired with text/tooltips.
    *   **Tooltips:** All interactive icons (especially action icons like edit, delete, view) must have descriptive tooltips that appear on hover/focus to clarify their function.
*   **4.6. Date & Time Formatting:**
    *   **Dates:**
        *   **Primary Format (Recommended for all dates):** `MMMM d, yyyy` (e.g., "December 17, 2024", "May 3, 2023"). This format provides maximum clarity with full month name, numeric day without leading zero, and full year.
        *   **Alternative Format (Legacy - being phased out):** `dd MMMM yyyy` (e.g., "21 May 2023", "03 December 2024"). While still acceptable, new implementations should use the primary format.
        *   **Short Format (for space-constrained areas only):** `MMM d, yyyy` (e.g., "Dec 17, 2024", "May 3, 2023"). Use abbreviated month names only when space is limited.
        *   **Relative dates for recent items:** "2 hours ago", "Yesterday", "3 days ago" (up to 7 days)
    *   **Times (If Displayed alongside dates or independently):** Use a consistent format (e.g., `HH:mm` for 24-hour format or `h:mm a` for 12-hour format with AM/PM). If timezone is relevant and not implicitly the user's local time, it should be clearly indicated (e.g., UTC, PST).
    *   **Implementation:** Use date-fns library with format string `'MMMM d, yyyy'` for consistency across the application.
    *   **Avoidance:** Strictly avoid ambiguous numerical date formats like `05/08/2023` or `12/17/2024`. Never use formats that could be confused between different locales (MM/DD/YYYY vs DD/MM/YYYY).
*   **4.7. Brand-Specific Data Visualisations (Charts, Graphs):**
    *   **Presence:** If the dashboard includes charts or data visualisations representing data specific to the active Brand.
    *   **Colour Usage:** The primary data series in such visualisations (e.g., bars in a bar chart, lines in a line chart) should utilise the active Brand Colour (see 2.4), ensuring sufficient contrast with chart backgrounds and other data series if present.
    *   **Accessibility:** Ensure charts are accessible, providing alternative text, data tables, or other means for users who cannot perceive or interact with them visually. Brand colour should not be the only way to differentiate data series.

## 5. Mobile & Responsive Standards

*   **5.1. Responsive Breakpoints:**
    *   **Mobile:** < 640px (sm)
    *   **Tablet:** 640px - 1024px (md)
    *   **Desktop:** > 1024px (lg)
    *   **Wide Desktop:** > 1280px (xl)
*   **5.2. Responsive Layout Principles:**
    *   The dashboard interface must be designed and implemented to adapt gracefully to various screen sizes, ensuring good usability on desktop, tablet, and common mobile viewports.
    *   **Content Reflow:** Page content must reflow to fit the available screen width, avoiding horizontal scrolling of the main page body.
    *   **Navigation Adaptation:** The Main Sidebar Navigation (see 1.5) will collapse into a "hamburger" menu icon on smaller screens (typically tablet portrait and mobile).
    *   **Table Adaptation:** On small screens, data tables should either become horizontally scrollable (with a clear visual indication of scrollability at the table edges) or reflow into a stacked/card-based layout where each original row becomes a distinct, vertically arranged card displaying its data.
*   **5.3. Touch-Friendly Target Sizes:** All interactive elements (buttons, links, form inputs, icons intended for direct interaction) must have a minimum tap target size of 44x44 CSS pixels. Ensure adequate spacing (gutters) between distinct tap targets to prevent accidental presses.
*   **5.4. Legible Font Sizes:** Font sizes must remain legible on smaller screens. Text should not require users to zoom in to read. Test on actual devices. Avoid using font sizes below a defined minimum threshold for body text on mobile (e.g., 14px is a common minimum, but this should be tested within the chosen typography).
*   **5.5. Content Prioritisation on Small Screens:** On smaller screens, prioritise displaying the most critical information and actions. Secondary information or less frequently used actions may be collapsed by default, hidden behind a "View More" or similar affordance, or moved into secondary menus/sheets.
*   **5.6. Device Capabilities:** Leverage native device capabilities where they offer a superior user experience (e.g., native date pickers on mobile if they are well-suited to the application's needs), but ensure a consistent and functional fallback for desktop environments or where native components are not ideal.
*   **5.7. Interaction Patterns for Touch:** Use common and intuitive mobile interaction patterns (e.g., clear visual feedback on tap). Avoid relying on hover states to reveal critical information or actions, as hover is not a standard interaction on most touch devices. If hover reveals supplementary info on desktop, ensure an alternative access method (e.g., tap to reveal) on touch devices.

## 6. General UI & UX (Visuals, Interactions, Accessibility)

*   **6.1. Typography System:**
    *   **Font Family:** Inter for UI text, system fonts as fallback
    *   **Typographic Scale:**
        *   **Display:** 3rem (48px), weight 800
        *   **H1:** 2.5rem (40px), weight 700
        *   **H2:** 2rem (32px), weight 600
        *   **H3:** 1.5rem (24px), weight 600
        *   **H4:** 1.25rem (20px), weight 500
        *   **Body:** 1rem (16px), weight 400
        *   **Small:** 0.875rem (14px), weight 400
        *   **Caption:** 0.75rem (12px), weight 400
    *   **Line Heights:** 
        *   Headings: 1.2
        *   Body text: 1.5
        *   Small text: 1.4
*   **6.2. Consistent Colour Palette:**
    *   **Primary Colors:**
        *   Primary: `#2563eb` (blue-600)
        *   Primary Hover: `#1d4ed8` (blue-700)
        *   Primary Light: `#dbeafe` (blue-100)
    *   **Semantic Colors:**
        *   Success: `#10b981` (emerald-500)
        *   Error: `#ef4444` (red-500)
        *   Warning: `#f59e0b` (amber-500)
        *   Info: `#3b82f6` (blue-500)
    *   **Neutral Colors:**
        *   Text Primary: `#111827` (gray-900)
        *   Text Secondary: `#6b7280` (gray-500)
        *   Border: `#e5e7eb` (gray-200)
        *   Background: `#f9fafb` (gray-50)
*   **6.3. Interaction Feedback States:**
    *   **Hover States:** All interactive elements (links, buttons, clickable table rows, navigation items) must have clear and distinct visual hover states (e.g., change in background colour, text underline, subtle shadow).
    *   **Focus States:** All interactive elements must have a highly visible focus state, distinct from the hover state, to aid keyboard navigation. This is critical for accessibility and often takes the form of a prominent outline or ring around the element.
    *   **Active/Pressed States:** Buttons and other clickable elements should have a distinct visual state when they are actively being pressed or clicked by the user (e.g., a slight change in colour, size, or shadow).
    *   **Disabled States:** Opacity 50%, cursor not-allowed.
*   **6.4. Modals & Pop-ups (Dialogs):**
    *   **Purposeful Use:** Use modals (dialogs) sparingly, only for focused tasks, critical confirmations (e.g., before a destructive action like "Delete Brand"), or displaying essential information that requires immediate user attention and blocks interaction with the rest of the page. Avoid using modals for complex, multi-step processes or lengthy forms where a dedicated page would be more appropriate.
    *   **Structure & Dismissal:** Modals must always have:
        *   A clear, descriptive title.
        *   An obvious and consistent method for dismissal (e.g., an "X" icon button typically in the top-right corner of the modal header, a "Cancel" or "Close" button within the modal footer, and responsiveness to the `Escape` key).
    *   **Action Buttons (within modals):** Positioned in the bottom-right of the modal footer (Primary action rightmost, Secondary/Cancel action to its left), following the same styling and prominence rules as standard form buttons (see 3.1).
    *   **Overlay:** Modals should appear above a dimmed page overlay (scrim) to visually separate them from the page content and focus user attention.
    *   **Sizes:**
        *   Small: 400px max-width
        *   Medium: 600px max-width (default)
        *   Large: 800px max-width
        *   Full: 95% viewport width
*   **6.5. Notifications & Toasts:**
    *   **Usage:** For providing non-intrusive feedback to the user about background operations, successful actions, or minor alerts that don't require immediate interaction (e.g., "Brand saved successfully," "Content publish scheduled," "Error: Could not connect to server").
    *   **Positioning:** Consistently positioned in a specific area of the viewport (e.g., appearing in the top-right or bottom-centre). Multiple toasts should stack vertically in a predictable manner and be individually dismissible by the user or auto-dismiss after an appropriate, short period (e.g., 3-7 seconds).
    *   **Styling:** Use semantic colours (green for success, red for error, yellow for warning, blue for info) and clear icons to quickly convey the nature of the notification.
    *   **Implementation:** Use Sonner toast library with consistent configuration.
*   **6.6. Performance:**
    *   **Load Times:** Strive for fast initial page load times and quick, responsive transitions between different views within the dashboard.
    *   **Interaction Responsiveness:** UI interactions (button clicks, input typing, opening modals) should feel immediate and responsive without noticeable lag.
    *   **Optimisations:** Implement standard web performance best practices: optimise images (format, compression, responsive images), minify CSS and JavaScript, leverage browser caching, consider code splitting for large JavaScript bundles, and optimise API data payloads.
*   **6.7. Accessibility (A11Y) - WCAG 2.1 Level AA as Minimum Target:**
    *   **Keyboard Navigation:** All interactive elements and functionality must be navigable and operable using only a keyboard, in a logical and predictable tab order.
    *   **Semantic HTML:** Use HTML elements according to their intended semantic meaning (e.g., `<nav>` for navigation blocks, `<button>` for actions, `<main>` for main page content, `<article>` for self-contained content pieces).
    *   **ARIA Attributes:** Use ARIA (Accessible Rich Internet Applications) attributes appropriately where native HTML semantics are insufficient to describe the role, state, or properties of custom UI components or dynamic content (e.g., for custom dropdowns, tab panels, alert messages).
    *   **Colour Contrast:** Ensure sufficient colour contrast between text and its background (minimum 4.5:1 for normal-sized text, 3:1 for large text - 18pt or 14pt bold). Use tools to check and verify contrast ratios.
    *   **Alternative Text:** Provide descriptive `alt` text for all meaningful images that convey information. Images that are purely decorative should have an empty `alt=""` attribute.
    *   **Form Labels & Accessibility:** Ensure all form inputs are programmatically associated with their visible labels (e.g., using `for` attribute on `<label>` or `aria-labelledby`).

## 7. Component Library

All UI components should be built using the shadcn/ui component library as the foundation, with consistent customizations:

*   **7.1. Base Components (from shadcn/ui):**
    *   Button
    *   Input
    *   Select
    *   Textarea
    *   Checkbox
    *   Radio Group
    *   Switch
    *   Label
    *   Card
    *   Dialog (Modal)
    *   Dropdown Menu
    *   Toast
    *   Table
    *   Tabs
    *   Avatar
    *   Badge
    *   Progress
    *   Skeleton
    *   Tooltip
    *   Form

*   **7.2. Custom Components (built on shadcn/ui):**
    *   **DataTable:** Enhanced table with sorting, filtering, pagination
        *   Always includes three-dot action menu in rightmost column
        *   Consistent row height and hover states
        *   Built-in empty state handling
        *   Responsive behavior for mobile
    *   **BrandSelector:** Dropdown with avatar and search
    *   **RichTextEditor:** React Quill wrapper with consistent styling
    *   **FileUpload:** Drag-and-drop with preview
    *   **DatePicker:** Consistent date selection
    *   **ActionButtons:** Grouped form action buttons
    *   **EmptyState:** Consistent empty data display
    *   **PageHeader:** Title, description, and actions
    *   **BreadcrumbNav:** Navigation breadcrumbs
    *   **LoadingSpinner:** Consistent loading indicator
    *   **ActionMenu:** Three-dot dropdown menu for table row actions

## 8. Specific Component Guidelines

*   **8.1. Rich Text Editor (React Quill):**
    *   **Toolbar:** Limited to essential formatting options
    *   **Height:** Min 200px, max 600px with scroll
    *   **Modules:** Bold, italic, lists, links, headers (h2, h3)
    *   **Styling:** Match application typography when rendered

*   **8.2. File Upload Components:**
    *   **Drag & Drop:** Clear drop zone with dashed border
    *   **File Types:** Display accepted types clearly
    *   **Size Limits:** Show maximum file size
    *   **Progress:** Upload progress bar
    *   **Preview:** Thumbnail for images, icon for other files

*   **8.3. Product/Claim Selectors:**
    *   **Search:** Real-time filtering
    *   **Hierarchy:** Show parent-child relationships
    *   **Multi-select:** Checkboxes with select all option
    *   **Selected Items:** Tag display with remove option

*   **8.4. Workflow Builder:**
    *   **Drag & Drop:** Visual feedback during drag
    *   **Connections:** Clear flow lines between steps
    *   **Step States:** Visual indicators for active/completed/error
    *   **Zoom Controls:** For complex workflows

*   **8.5. Action Menu (Three-dot menu):**
    *   **Button:** Three vertical dots icon, ghost button style
    *   **Size:** 32x32px minimum click target
    *   **Position:** Always rightmost column in tables
    *   **Menu Items:**
        *   Icon (16x16px) + Label format
        *   Padding: 8px 12px per item
        *   Hover state with background highlight
    *   **Destructive Actions:**
        *   Separated with divider
        *   Red text color (`text-red-600`)
        *   Confirmation dialog required

## 9. Page-Specific Standards

*   **9.1. Dashboard Home:**
    *   **Widgets:** Card-based layout with consistent sizing
    *   **Metrics:** Large numbers with trend indicators
    *   **Quick Actions:** Prominent buttons for common tasks
    *   **Activity Feed:** Chronological with user avatars

*   **9.2. Brand Pages:**
    *   **Brand Header:** Large avatar, name, and key metrics
    *   **Tab Navigation:** For sections (Overview, Content, Settings)
    *   **Color Preview:** Visual swatches with accessibility indicators

*   **9.3. Content Generation:**
    *   **Template Selection:** Card grid with previews
    *   **Form Sections:** Collapsible with progress indicators
    *   **AI Status:** Loading states with helpful messages
    *   **Preview Panel:** Side-by-side or modal preview

*   **9.4. Claims Management:**
    *   **Hierarchy View:** Tree structure with expand/collapse
    *   **Matrix View:** Grid layout for market overrides
    *   **Bulk Actions:** Select multiple with action toolbar

*   **9.5. User Management:**
    *   **Role Badges:** Color-coded by permission level
    *   **Last Active:** Relative timestamps
    *   **Bulk Invite:** CSV upload with validation preview

## Version History

- **Version 2.3** (17 December 2024): Updated date formatting standard to use `MMMM d, yyyy` format (e.g., "December 17, 2024") as the primary format for all dates. This format provides better clarity and avoids locale-specific ambiguity.
- **Version 2.2** (17 December 2024): Added requirement for three-dot action menu pattern in tables instead of individual icon buttons. Added ActionMenu component specifications.
- **Version 2.1** (17 December 2024): Updated form layout to use inline labels (labels to the left of fields) instead of stacked labels to reduce form length. Added detailed form layout patterns.
- **Version 2.0** (17 December 2024): Added comprehensive component definitions, specific guidelines for forms, data display, mobile standards, and page-specific requirements. Added implementation details for all UI elements.
- **Version 1.0** (21 May 2024): Initial UI standards document establishing foundational guidelines.

This document will serve as the foundational guide for all UI/UX development within the MixerAI dashboard. It should be reviewed periodically and updated as the application evolves.