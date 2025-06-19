# Loading Indicators Audit

## Overview
The codebase uses a mix of spinners and skeleton loaders inconsistently. According to UI best practices:
- **Skeletons** should be used for content with known structure (lists, cards, forms)
- **Spinners** should be used for indeterminate operations (API calls, submissions)

## Current Components

### 1. Spinner Component (`/src/components/spinner.tsx`)
- Custom spinner with size variants (sm, md, lg)
- Uses `animate-spin` with border styling
- Includes proper accessibility with `sr-only` label

### 2. Skeleton Component (`/src/components/ui/skeleton.tsx`)
- Simple skeleton using `animate-pulse` with `bg-muted`
- Part of shadcn/ui component library

### 3. Dashboard Skeleton (`/src/components/dashboard/dashboard-skeleton.tsx`)
- Provides `MetricsSkeleton` and `TasksSkeleton`
- Used for dashboard metrics and task lists
- Properly structured skeletons matching content layout

## Current Usage Patterns

### Pages Using Spinners (Should Consider Skeletons)

1. **List Pages with Tables/Grids** (❌ Using spinners, should use skeletons):
   - `/dashboard/brands/page.tsx` - Shows spinner while loading brand list
   - `/dashboard/content/content-page-client.tsx` - Shows spinner for content list
   - `/dashboard/claims/workflows/page.tsx` - Shows spinner for workflows table
   - `/dashboard/claims/products/page.tsx` - Shows spinner for products table
   - `/dashboard/claims/ingredients/page.tsx` - Shows spinner for ingredients table
   - `/dashboard/claims/brands/page.tsx` - Shows spinner for claims brands table
   - `/dashboard/templates/page.tsx` - Shows spinner for templates list
   - `/dashboard/users/page.tsx` - Shows spinner for users table
   - `/dashboard/feedback/page.tsx` - Shows spinner for feedback items
   - `/dashboard/my-tasks/page.tsx` - Shows spinner for tasks list

2. **Detail Pages** (✅ Spinners are appropriate):
   - Tool pages (metadata-generator, content-transcreator, alt-text-generator)
   - Individual item pages ([id] routes)

3. **Form Submissions** (✅ Using spinners correctly):
   - Submit buttons with loading states
   - AI generation operations
   - File uploads

### Pages Using Skeletons (✅ Correct Usage)

1. **Dashboard Home** (`/dashboard/page.tsx`):
   - Uses `TasksSkeleton` and `MetricsSkeleton` via Suspense
   - Properly structured loading states

2. **Some Tool Pages**:
   - Limited skeleton usage in tools section

## Issues Found

### 1. Inconsistent Loading UI for Similar Content Types
- List pages use different loading patterns:
  - Some use inline spinners: `<div className="animate-spin rounded-full border-4 border-primary border-t-transparent">`
  - Others use the Spinner component
  - None use skeletons despite having predictable table/grid structures

### 2. Missing Loading Text Consistency
- Various loading messages: "Loading brands...", "Loading content...", "Loading..."
- No standardized approach

### 3. No Table/List Skeletons
- Despite many table-based pages, no reusable table skeleton component exists
- Each page implements its own spinner-based loading

### 4. Mixed Implementation Styles
- Some use `isLoading` state
- Others use Suspense boundaries
- No clear pattern for when to use which approach

## Recommendations

### 1. Create Reusable Skeleton Components

```tsx
// Table skeleton for list pages
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton
export function CardGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 2. Standardize Loading Patterns

- **List/Table Pages**: Use table skeletons
- **Card Grids**: Use card grid skeletons
- **Forms**: Keep spinners on submit buttons
- **Async Operations**: Use spinners with descriptive text
- **Page Transitions**: Consider top-level progress bars

### 3. Update Existing Pages

Priority pages to update:
1. `/dashboard/brands/page.tsx`
2. `/dashboard/content/content-page-client.tsx`
3. `/dashboard/templates/page.tsx`
4. `/dashboard/users/page.tsx`
5. `/dashboard/claims/*` list pages

### 4. Create Loading State Guidelines

Document when to use:
- Skeletons: Known content structure, initial page loads
- Spinners: Indeterminate operations, form submissions
- Progress bars: Multi-step operations with known progress
- Loading text: Always include descriptive text for accessibility