#!/bin/bash

# Performance Issues
echo "Creating individual performance issues..."

# Issue 1: Large Component Files
gh issue create --title "[Performance] ContentGeneratorForm is 900+ lines" --body "## Priority: 🔴 CRITICAL

**Description:** Massive component file causing slow builds and poor performance.

**File:** \`/src/components/content/content-generator-form.tsx\` (976 lines)

**Issues:**
- Slow hot module replacement
- Difficult to maintain and test
- Poor code splitting
- Memory intensive

**Fix Required:** Split into smaller, focused components:
- BrandSelector
- TemplateFields
- AIGenerationPanel
- OutputPreview"

# Issue 2: FieldDesigner Component
gh issue create --title "[Performance] FieldDesigner Component is 1400+ lines" --body "## Priority: 🔴 CRITICAL

**Description:** Extremely large component affecting performance and maintainability.

**File:** \`/src/components/template/field-designer.tsx\` (1479 lines)

**Impact:** 
- Very slow component updates
- Large bundle size
- Memory leaks possible

**Fix:** Refactor into multiple smaller components with clear responsibilities"

# Issue 3: N+1 Query Problem
gh issue create --title "[Performance] N+1 Query Problem in Users List" --body "## Priority: 🔴 CRITICAL

**Description:** Users API fetches profiles individually causing multiple database queries.

**Location:** \`/src/app/api/users/route.ts\`

**Issue:** For N users, makes N+1 queries to database

**Fix Required:**
- Use JOIN queries
- Implement data loader pattern
- Add query batching"

# Issue 4: Missing React.memo
gh issue create --title "[Performance] Components Missing React.memo Optimization" --body "## Priority: 🟡 HIGH

**Description:** Heavy components re-render unnecessarily due to missing memoization.

**Affected Components:**
- BrandIcon
- FieldDesigner
- ContentGeneratorForm
- ProductSelect

**Fix:** Add React.memo to pure components and useMemo for expensive computations"

# Issue 5: No Lazy Loading
gh issue create --title "[Performance] No Code Splitting or Lazy Loading" --body "## Priority: 🟡 HIGH

**Description:** All routes and components loaded upfront, causing large initial bundle.

**Issues:**
- 2.5MB+ initial bundle size
- Slow first page load
- Unnecessary code loaded

**Fix Required:**
- Implement React.lazy for routes
- Dynamic imports for heavy components
- Split vendor bundles"

# Issue 6: Unoptimized Images
gh issue create --title "[Performance] Images Not Optimized with Next.js Image" --body "## Priority: 🟡 HIGH

**Description:** Using standard img tags instead of Next.js Image component.

**Issues:**
- No lazy loading
- No automatic format optimization
- No responsive images
- Large image downloads

**Fix:** Replace all img tags with next/image component"

# Issue 7: Missing Debouncing
gh issue create --title "[Performance] API Calls Not Debounced in Search/Forms" --body "## Priority: 🟠 MEDIUM

**Description:** Search and form inputs trigger API calls on every keystroke.

**Affected Areas:**
- Product search
- Brand search
- Content generation

**Fix:** Implement debouncing (300-500ms) for all search inputs"

# Issue 8: State Management
gh issue create --title "[Performance] Excessive Re-renders from Poor State Management" --body "## Priority: 🟠 MEDIUM

**Description:** Component state changes cause unnecessary re-renders of entire trees.

**Example:** ContentGeneratorForm has 20+ useState calls

**Fix Required:**
- Consolidate related state
- Use useReducer for complex state
- Consider state management library"

# Issue 9: Bundle Size
gh issue create --title "[Performance] Large Bundle Size (2.5MB+)" --body "## Priority: 🟠 MEDIUM

**Description:** Application bundle is too large for optimal performance.

**Issues:**
- Importing entire libraries
- Duplicate dependencies
- No tree shaking
- Development code in production

**Fix Required:**
- Analyze bundle with webpack-bundle-analyzer
- Remove unused dependencies
- Implement proper tree shaking"

# Issue 10: No Virtualization
gh issue create --title "[Performance] Long Lists Not Virtualized" --body "## Priority: 🟠 MEDIUM

**Description:** Rendering hundreds of items without virtualization.

**Affected:**
- Content list pages
- User lists
- Product selection dropdowns

**Fix:** Implement react-window or similar for lists over 50 items"

# Issue 11: API Response Caching
gh issue create --title "[Performance] No Caching Strategy for API Responses" --body "## Priority: 🟢 LOW

**Description:** API responses not cached, causing redundant network requests.

**Issues:**
- Same data fetched multiple times
- No stale-while-revalidate
- No optimistic updates

**Fix Required:**
- Implement React Query or SWR
- Add proper cache headers
- Enable HTTP caching"

echo "Performance issues created successfully!"