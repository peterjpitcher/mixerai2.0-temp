#!/bin/bash

# Accessibility & Error Handling Issues
echo "Creating individual accessibility and error handling issues..."

# Issue 1: Missing ARIA Labels
gh issue create --title "[A11y] Missing ARIA Labels for Interactive Elements" --body "## Priority: 🔴 CRITICAL

**Description:** Multiple interactive elements lack proper ARIA labels for screen readers.

**Affected Components:**
- Icon-only buttons in \`/src/components/button.tsx\`
- BrandIcon in \`/src/components/brand-icon.tsx\` - missing role and aria-label
- Navigation items missing aria-expanded and aria-current

**Fix Required:**
\`\`\`tsx
<Button aria-label=\"Delete item\">
  <TrashIcon />
</Button>

<div role=\"img\" aria-label=\"Brand icon\">
  {initial}
</div>
\`\`\`"

# Issue 2: No Error Boundaries
gh issue create --title "[Error Handling] No React Error Boundaries Implemented" --body "## Priority: 🔴 CRITICAL

**Description:** Application lacks error boundaries causing full app crashes.

**Impact:**
- Component errors crash entire app
- No graceful error recovery
- Poor user experience
- Difficult debugging

**Fix:** Implement ErrorBoundary components at strategic points:
- Root level
- Route level
- Feature level"

# Issue 3: Focus Management Issues
gh issue create --title "[A11y] Poor Focus Management in Dialogs and Forms" --body "## Priority: 🔴 CRITICAL

**Description:** Focus not properly managed during user interactions.

**Issues:**
- Dialogs don't trap focus
- Focus not moved to error messages
- Focus lost on route changes
- No focus restoration after dialog close

**Fix Required:**
- Implement focus trap in modals
- Auto-focus error messages
- Manage focus on navigation"

# Issue 4: Keyboard Navigation Problems
gh issue create --title "[A11y] Components Not Fully Keyboard Accessible" --body "## Priority: 🟡 HIGH

**Description:** Several components can't be used with keyboard only.

**Problems:**
- Select component scroll buttons not keyboard accessible
- No skip links for navigation
- Tab order issues in forms
- Disabled buttons don't indicate why

**Fix:** Ensure all interactive elements are keyboard accessible"

# Issue 5: Color Contrast Issues
gh issue create --title "[A11y] Potential WCAG Color Contrast Violations" --body "## Priority: 🟡 HIGH

**Description:** Some UI elements may not meet WCAG AA contrast requirements.

**Suspected Issues:**
- Dialog close button with accent foreground
- Alert warning variant colors
- Muted text on various backgrounds

**Action Required:**
- Test all color combinations
- Ensure 4.5:1 ratio for normal text
- Ensure 3:1 ratio for large text"

# Issue 6: Poor Error Messages
gh issue create --title "[UX] Technical Error Messages Shown to Users" --body "## Priority: 🟡 HIGH

**Description:** Error messages are technical and unhelpful for users.

**Examples:**
- \"Database connection error\"
- \"An unexpected error occurred\"
- Stack traces shown to users

**Fix:** Implement user-friendly error messages with:
- Clear explanation
- Suggested actions
- Contact support option"

# Issue 7: Screen Reader Compatibility
gh issue create --title "[A11y] Components Lose Semantic Meaning for Screen Readers" --body "## Priority: 🟠 MEDIUM

**Description:** Some components don't properly convey meaning to assistive technology.

**Issues:**
- ResponsiveTable loses table semantics on mobile
- Empty states not announced
- Loading states not announced

**Fix:** Maintain semantic HTML and use ARIA when needed"

# Issue 8: Missing Loading States
gh issue create --title "[UX] No Loading States or Timeouts for Async Operations" --body "## Priority: 🟠 MEDIUM

**Description:** Async operations lack loading indicators and timeout handling.

**Problems:**
- No timeout for API requests
- Missing loading skeletons
- No progress for long operations

**Fix:** Implement consistent loading states with timeouts"

# Issue 9: Unhandled Edge Cases
gh issue create --title "[Error Handling] Multiple Unhandled Edge Cases" --body "## Priority: 🟠 MEDIUM

**Description:** Several edge cases not properly handled.

**Issues:**
- No handling for very large datasets
- Race conditions in concurrent requests
- Memory leaks from uncleaned effects
- No offline handling

**Fix Required:**
- Add pagination for large lists
- Cancel requests on unmount
- Implement offline queue"

# Issue 10: Animation Preferences
gh issue create --title "[A11y] Animations Don't Respect User Motion Preferences" --body "## Priority: 🟢 LOW

**Description:** Animations continue even when user prefers reduced motion.

**Fix Required:**
\`\`\`css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
\`\`\`"

echo "Accessibility and error handling issues created successfully!"