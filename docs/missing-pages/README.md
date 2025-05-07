# MixerAI 2.0 Missing Pages Documentation

## Overview

This document outlines pages that have been removed or relocated during the restructuring of the MixerAI 2.0 application. It provides a detailed plan for recreating these pages to ensure full functionality across the application.

## Project Structure Changes

The application has undergone a significant restructuring where many pages have been moved from root-level directories to the `/dashboard/` directory. However, some pages were removed entirely during this process and need to be recreated.

## Missing Pages Inventory

The following pages need to be recreated:

### Content Pages

| Original Path | New Path | Status | Priority |
|---------------|----------|--------|----------|
| `/content/article/page.tsx` | `/dashboard/content/article/page.tsx` | Missing | High |
| `/content/ownedpdp/page.tsx` | `/dashboard/content/ownedpdp/page.tsx` | Missing | Medium |
| `/content/retailerpdp/page.tsx` | `/dashboard/content/retailerpdp/page.tsx` | Missing | Medium |
| `/content/new/page.tsx` | `/dashboard/content/new/page.tsx` | Missing | High |
| `/content/page.tsx` | `/dashboard/content/page.tsx` | Missing | High |

### Brand Pages

| Original Path | New Path | Status | Priority |
|---------------|----------|--------|----------|
| `/brands/page.tsx` | `/dashboard/brands/page.tsx` | Missing | High |
| `/brands/[id]/page.tsx` | `/dashboard/brands/[id]/page.tsx` | Missing | High |
| `/brands/[id]/edit/page.tsx` | `/dashboard/brands/[id]/edit/page.tsx` | Missing | Medium |
| `/brands/new/page.tsx` | `/dashboard/brands/new/page.tsx` | Missing | High |

### Workflow Pages

| Original Path | New Path | Status | Priority |
|---------------|----------|--------|----------|
| `/workflows/page.tsx` | `/dashboard/workflows/page.tsx` | Missing | High |
| `/workflows/[id]/page.tsx` | `/dashboard/workflows/[id]/page.tsx` | Completed | High |
| `/workflows/[id]/edit/page.tsx` | `/dashboard/workflows/[id]/edit/page.tsx` | Completed | Medium |
| `/workflows/new/page.tsx` | `/dashboard/workflows/new/page.tsx` | Completed | High |

## Implementation Plan

### Phase 1: High Priority Pages (Estimated time: 2-3 days)

1. **Content Listing Page** - `/dashboard/content/page.tsx`
   - Create a table-based view of all content items
   - Implement sorting, filtering, and search functionality
   - Add actions for creating, editing, and deleting content

2. **Brands Listing Page** - `/dashboard/brands/page.tsx`
   - Implement a card-based grid or table view of all brands
   - Add brand creation, editing, and deletion functionality
   - Include brand color and identity visualization

3. **Workflows Listing Page** - `/dashboard/workflows/page.tsx`
   - Create a table view of all workflows with status indicators
   - Implement filtering by status, brand, and assignee
   - Add workflow creation and management actions

4. **Creation Pages** - `/dashboard/brands/new/page.tsx`, `/dashboard/content/new/page.tsx`, `/dashboard/workflows/new/page.tsx`
   - Implement forms for creating new entities
   - Add proper validation and error handling
   - Ensure proper redirection after successful creation
   - ✅ Workflow creation page has been implemented

### Phase 2: Detail Pages (Estimated time: 2-3 days)

1. **Entity Detail Pages** - `/dashboard/brands/[id]/page.tsx`, `/dashboard/workflows/[id]/page.tsx`
   - Create detailed views of individual entities
   - Implement appropriate actions (edit, delete, etc.)
   - Add related content sections where applicable
   - ✅ Workflow detail page has been implemented

2. **Article-Specific Content Page** - `/dashboard/content/article/page.tsx`
   - Implement filtered view of article-type content
   - Add article-specific actions and filters

### Phase 3: Edit Pages (Estimated time: 1-2 days)

1. **Edit Pages** - `/dashboard/brands/[id]/edit/page.tsx`, `/dashboard/workflows/[id]/edit/page.tsx`
   - Create edit forms pre-populated with entity data
   - Implement validation and error handling
   - Add confirmation steps for significant changes
   - ✅ Workflow edit page has been implemented

2. **Specialized Content Types** - `/dashboard/content/ownedpdp/page.tsx`, `/dashboard/content/retailerpdp/page.tsx`
   - Implement specialized interfaces for these content types
   - Add type-specific functionality and validation

## Technical Considerations

1. **Data Fetching Strategy**
   - Use server components where possible to optimize data loading
   - Implement client-side pagination for large datasets
   - Add proper loading states and error handling

2. **Component Reusability**
   - Create shared components for listing pages
   - Develop reusable form components for creation/editing
   - Standardize action buttons and dialogs

3. **URL Structure**
   - Ensure consistent URL patterns across the application
   - Implement proper linking between related pages
   - Add redirect handling for old URLs

4. **Authorization**
   - Apply proper role-based access control to all pages
   - Restrict edit/delete functionality based on user permissions
   - Add appropriate error messages for unauthorized actions

## Migration Strategy

For each missing page, follow these steps:

1. Check if a similar page exists elsewhere in the application to use as a template
2. Retrieve any available code from version control history if possible
3. Create the new page in the appropriate location under the `/dashboard/` directory
4. Update any navigation components to link to the new page
5. Test thoroughly to ensure proper functionality and data flow
6. Document any changes to the API or data requirements

## Progress Tracking

A separate tracking document will be maintained to monitor the status of each page's recreation. This will be updated as pages are completed and will include testing status and any outstanding issues.

## Conclusion

This plan provides a structured approach to recreating the missing pages in the MixerAI 2.0 application. By following the prioritized implementation schedule, we can ensure that the most critical functionality is restored first, with a complete restoration of all features by the end of the implementation period. 

## Recent Updates (2023-06-14)

- Implemented all workflow-related pages (detail, edit, and new)
- Pages use mock data for now, with planned API integration
- Added comprehensive UI components for workflow management
- Updated tracking document to reflect current progress 