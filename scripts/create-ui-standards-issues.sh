#!/bin/bash

# UI Standards Compliance Issues
echo "Creating individual UI standards compliance issues..."

# Issue 1: Inconsistent Page Padding
gh issue create --title "[UI Standards] Inconsistent Page Padding Across Dashboard" --body "## Priority: 🔴 CRITICAL

**UI Standard Violated:** Section 0.4 - Page Width and Padding

**Description:** Pages use different padding values instead of the standard \`px-4 sm:px-6 lg:px-8 py-6\`

**Affected Pages:**
- \`/dashboard\` - Uses \`p-4 md:p-8 pt-6\`
- \`/dashboard/templates\` - Missing padding entirely
- Other pages have correct padding

**Required Fix:**
1. Create a standardized page wrapper component
2. Apply consistent padding: \`px-4 sm:px-6 lg:px-8 py-6\`
3. Ensure all pages use this wrapper

**Impact:** Visual inconsistency and poor user experience across pages"

# Issue 2: Missing Page Descriptions
gh issue create --title "[UI Standards] Missing Required Page Descriptions" --body "## Priority: 🔴 CRITICAL

**UI Standard Violated:** Section 1.2 - Page Titles & Descriptions

**Description:** Multiple pages missing the required descriptive paragraph below h1 title

**Affected Pages:**
- \`/dashboard\` (home page)
- \`/dashboard/brands\`
- \`/dashboard/templates\`
- \`/dashboard/users\`

**Required Fix:**
Add descriptive paragraph below each h1 title explaining the page purpose:
\`\`\`tsx
<h1>Page Title</h1>
<p className=\"text-muted-foreground\">
  Brief description of what users can do on this page.
</p>
\`\`\`

**Example:**
- Brands page: \"View, manage, and create new client Brands.\"
- Templates: \"Create and manage content templates for consistent content creation.\""

# Issue 3: Inconsistent Breadcrumb Implementation
gh issue create --title "[UI Standards] Breadcrumbs Missing or Inconsistently Positioned" --body "## Priority: 🔴 CRITICAL

**UI Standard Violated:** Section 1.1 - Consistent Breadcrumbs

**Description:** Breadcrumbs are missing on some pages and inconsistently positioned on others

**Issues:**
- \`/dashboard/content/new\` - No breadcrumbs at all
- \`/dashboard/content\` - Breadcrumbs outside of page header
- \`/dashboard/users\` - Separate Breadcrumbs component

**Required Fix:**
1. Add breadcrumbs to ALL nested pages
2. Position consistently below global header/at top of main content
3. Include brand avatar in breadcrumb trail when applicable
4. Make all segments except current page clickable links

**Example:**
Dashboard > Content > Create New Content"

# Issue 4: Missing Back Buttons on Detail Pages
gh issue create --title "[UI Standards] Back Buttons Missing from Detail/Edit Pages" --body "## Priority: 🟡 HIGH

**UI Standard Violated:** Section 1.3 - \"Back\" Buttons

**Description:** Detail and edit pages lack back navigation buttons

**Affected Pages:**
- \`/dashboard/content/new\`
- \`/dashboard/brands/[brandId]/edit\`
- Other edit/detail pages

**Required Fix:**
Add consistent back button in top-left of main content area:
\`\`\`tsx
<Button variant=\"ghost\" size=\"sm\" onClick={() => router.back()}>
  <ArrowLeft className=\"h-4 w-4 mr-2\" />
  Back
</Button>
\`\`\`

**Positioning:** Left of or above the page title"

# Issue 5: No Active Brand Context Display
gh issue create --title "[UI Standards] Active Brand Context Not Displayed" --body "## Priority: 🔴 CRITICAL

**UI Standard Violated:** Section 2.1 - Active Brand Display

**Description:** When working with brand-specific content, the active brand is not prominently displayed

**Affected Pages:**
- \`/dashboard/content/new\` (when creating for specific brand)
- \`/dashboard/content\` (when filtered by brand)
- Brand-specific workflow pages

**Required Fix:**
1. Create ActiveBrandIndicator component
2. Display brand avatar + name prominently
3. Use brand color as subtle accent (with accessibility checks)
4. Position below breadcrumbs or integrated with page header

**Example Implementation:**
\`\`\`tsx
<div className=\"flex items-center gap-2 p-3 rounded-md border\">
  <BrandAvatar brand={activeBrand} size=\"sm\" />
  <span>Working in: {activeBrand.name}</span>
</div>
\`\`\`"

# Issue 6: Form Action Buttons Not Following Standards
gh issue create --title "[UI Standards] Form Buttons Not Positioned Correctly" --body "## Priority: 🟡 HIGH

**UI Standard Violated:** Section 3.1 - Standard Action Buttons & Positioning

**Description:** Form action buttons not consistently positioned bottom-right with proper hierarchy

**Issues:**
- Long forms lack sticky footer for buttons
- Some forms have buttons in wrong order
- Card actions not right-aligned

**Required Fix:**
1. Primary action (Save/Create) - bottom-right, prominent style
2. Secondary action (Cancel) - left of primary, ghost style
3. Implement sticky footer for long forms:
\`\`\`tsx
<div className=\"sticky bottom-0 bg-background border-t p-4 flex justify-end gap-2\">
  <Button variant=\"ghost\">Cancel</Button>
  <Button>Save Changes</Button>
</div>
\`\`\`"

# Issue 7: Inconsistent Date Formatting
gh issue create --title "[UI Standards] Date Formatting Not Following Standards" --body "## Priority: 🟠 MEDIUM

**UI Standard Violated:** Section 4.6 - Date & Time Formatting

**Description:** Dates don't follow the standard format (omit year for current year)

**Current Implementation:**
Always shows full date: \`dd MMMM yyyy\`

**Required Implementation:**
- Current year: \`dd Mmmm\` (e.g., \"21 May\")
- Other years: \`dd Mmmm yyyy\` (e.g., \"21 May 2023\")

**Fix Required:**
Create utility function:
\`\`\`typescript
function formatDate(date: Date): string {
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  
  if (currentYear === dateYear) {
    return format(date, 'dd MMMM');
  }
  return format(date, 'dd MMMM yyyy');
}
\`\`\`"

# Issue 8: Empty States Not Following Pattern
gh issue create --title "[UI Standards] Empty States Missing Icons and Centering" --body "## Priority: 🟠 MEDIUM

**UI Standard Violated:** Section 4.3 - Empty States

**Description:** Empty states don't follow the centered icon + message + CTA pattern

**Affected Components:**
- Brands list empty state
- Content list empty state
- Templates empty state

**Required Pattern:**
\`\`\`tsx
<div className=\"flex flex-col items-center justify-center py-12 text-center\">
  <Icon className=\"h-12 w-12 text-muted-foreground mb-4\" />
  <h3 className=\"text-lg font-medium mb-2\">No items found</h3>
  <p className=\"text-muted-foreground mb-4\">
    Get started by creating your first item.
  </p>
  <Button>Create New</Button>
</div>
\`\`\`"

# Issue 9: Touch Targets Too Small on Mobile
gh issue create --title "[UI Standards] Interactive Elements Below 44x44px Touch Target" --body "## Priority: 🟡 HIGH

**UI Standard Violated:** Section 5.2 - Touch-Friendly Target Sizes

**Description:** Several interactive elements don't meet minimum 44x44px touch target

**Issues:**
- Delete buttons in cards
- Icon-only buttons
- Close buttons on modals
- Table row actions

**Required Fix:**
1. Ensure all clickable elements have min 44x44px tap area
2. Add padding if visual size is smaller
3. Test on actual mobile devices

**Example Fix:**
\`\`\`tsx
<Button
  size=\"icon\"
  className=\"h-11 w-11\" // 44px = 11 * 4px
>
  <TrashIcon className=\"h-4 w-4\" />
</Button>
\`\`\`"

# Issue 10: Tables Not Mobile Responsive
gh issue create --title "[UI Standards] Data Tables Don't Adapt to Mobile Screens" --body "## Priority: 🟡 HIGH

**UI Standard Violated:** Section 5.1 - Responsive Layout Principles

**Description:** Tables remain horizontally scrollable on mobile without adaptation

**Affected Pages:**
- \`/dashboard/content\` - Content table
- \`/dashboard/users\` - Users table
- Other data tables

**Required Fix:**
Implement responsive table pattern:
1. On mobile, convert to stacked cards
2. Or add clear scroll indicators
3. Prioritize key information

**Example Card Pattern:**
\`\`\`tsx
// Mobile view
<div className=\"md:hidden\">
  {data.map(item => (
    <Card className=\"mb-2\">
      <CardContent className=\"pt-6\">
        <div className=\"space-y-2\">
          <div className=\"font-medium\">{item.title}</div>
          <div className=\"text-sm text-muted-foreground\">
            Status: {item.status}
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
\`\`\`"

# Issue 11: Loading States Inconsistent
gh issue create --title "[UI Standards] Mix of Spinners and Skeletons for Loading" --body "## Priority: 🟠 MEDIUM

**UI Standard Violated:** Section 4.4 - Loading Indicators

**Description:** Inconsistent use of loading indicators across the app

**Current State:**
- Some pages use spinners
- Some use skeleton screens
- Some have no loading state

**Required Fix:**
1. Standardize on skeleton screens for better perceived performance
2. Create reusable skeleton components
3. Use consistent loading patterns:
   - Tables: Table skeleton
   - Cards: Card skeleton
   - Forms: Form skeleton

**Benefits:**
- Better perceived performance
- Maintains layout during loading
- Reduces layout shift"

# Issue 12: Missing ARIA Labels and Focus States
gh issue create --title "[UI Standards] Accessibility Issues with Interactive Elements" --body "## Priority: 🔴 CRITICAL

**UI Standard Violated:** Section 6.7 - Accessibility (WCAG 2.1 AA)

**Description:** Multiple accessibility violations found

**Issues:**
1. Icon-only buttons missing aria-labels
2. Focus states not visible enough
3. Form inputs missing proper labels
4. No skip navigation link

**Required Fixes:**
1. Add aria-labels to all icon buttons:
\`\`\`tsx
<Button aria-label=\"Delete item\">
  <TrashIcon />
</Button>
\`\`\`

2. Enhance focus states:
\`\`\`css
:focus-visible {
  outline: 2px solid theme('colors.ring');
  outline-offset: 2px;
}
\`\`\`

3. Add skip navigation link:
\`\`\`tsx
<a href=\"#main-content\" className=\"sr-only focus:not-sr-only\">
  Skip to main content
</a>
\`\`\`"

echo "UI standards compliance issues created successfully!"