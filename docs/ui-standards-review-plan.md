# UI Standards Review Plan

**Created:** 17 December 2024  
**Purpose:** Track progress of reviewing and updating all dashboard pages to comply with UI Standards v2.2

## Review Checklist for Each Page

For each page, verify:
1. **Layout & Structure**
   - [ ] Full-width content area with correct padding (`px-4 sm:px-6 lg:px-8`)
   - [ ] Breadcrumbs (if nested page)
   - [ ] Page title (h1) and description
   - [ ] Back button (if detail/edit page)
   - [ ] Primary action button positioning (top-right for listings)

2. **Forms (if applicable)**
   - [ ] Inline labels (left of fields) with consistent width
   - [ ] Required field indicators (*)
   - [ ] Helper text below complex fields
   - [ ] Action buttons in bottom-right (Save/Cancel)
   - [ ] Loading states for async operations
   - [ ] Validation messages

3. **Tables/Lists (if applicable)**
   - [ ] Three-dot action menu (NOT individual icons)
   - [ ] Consistent row height (48px min)
   - [ ] Sorting indicators
   - [ ] Empty states
   - [ ] Loading skeletons

4. **Branding**
   - [ ] Brand avatar display where relevant
   - [ ] Brand context indicators
   - [ ] Proper avatar fallbacks

5. **Mobile Responsiveness**
   - [ ] Form labels stack on mobile
   - [ ] Table adaptation
   - [ ] Touch-friendly targets (44x44px)

## Progress Tracking

**Status Legend:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ⚠️ Needs Fixes
- ❌ Blocked

### Core Dashboard
| Page | Route | Status |
|------|-------|--------|
| Dashboard Home | `/dashboard` | ✅ |
| Dashboard Layout | `/dashboard/layout.tsx` | ✅ |

### Account Management
| Page | Route | Status |
|------|-------|--------|
| Account Settings | `/dashboard/account` | ✅ |

### Brand Management
| Page | Route | Status |
|------|-------|--------|
| Brands List | `/dashboard/brands` | ✅ |
| New Brand | `/dashboard/brands/new` | ✅ |
| View Brand | `/dashboard/brands/[id]` | ✅ |
| Edit Brand | `/dashboard/brands/[id]/edit` | ✅ |

### Claims System
| Page | Route | Status |
|------|-------|--------|
| Claims List | `/dashboard/claims` | ✅ |
| New Claim | `/dashboard/claims/new` | ✅ |
| Edit Claim | `/dashboard/claims/[id]/edit` | ✅ |
| Claim Definitions | `/dashboard/claims/definitions` | ✅ |
| Pending Approvals | `/dashboard/claims/pending-approval` | ✅ |
| Claims Preview | `/dashboard/claims/preview` | ✅ |
| Brand Review | `/dashboard/claims/brand-review` | ✅ |
| Market Overrides | `/dashboard/claims/overrides` | ✅ |

### Claims - Brands
| Page | Route | Status |
|------|-------|--------|
| Master Claim Brands | `/dashboard/claims/brands` | ✅ |
| New Claim Brand | `/dashboard/claims/brands/new` | ✅ |
| Edit Claim Brand | `/dashboard/claims/brands/[id]/edit` | ✅ |

### Claims - Products
| Page | Route | Status |
|------|-------|--------|
| Products List | `/dashboard/claims/products` | ✅ |
| New Product | `/dashboard/claims/products/new` | ✅ |
| Edit Product | `/dashboard/claims/products/[id]/edit` | ✅ |

### Claims - Ingredients
| Page | Route | Status |
|------|-------|--------|
| Ingredients List | `/dashboard/claims/ingredients` | ✅ |
| New Ingredient | `/dashboard/claims/ingredients/new` | ✅ |
| Edit Ingredient | `/dashboard/claims/ingredients/[id]/edit` | ✅ |

### Claims - Workflows
| Page | Route | Status |
|------|-------|--------|
| Claims Workflows | `/dashboard/claims/workflows` | ✅ |
| New Claims Workflow | `/dashboard/claims/workflows/new` | ✅ |

### Content Management
| Page | Route | Status |
|------|-------|--------|
| Content List | `/dashboard/content` | ✅ |
| New Content | `/dashboard/content/new` | ✅ |
| View Content | `/dashboard/content/[id]` | ✅ |
| Edit Content | `/dashboard/content/[id]/edit` | ✅ |

### Templates
| Page | Route | Status |
|------|-------|--------|
| Templates List | `/dashboard/templates` | ✅ |
| New Template | `/dashboard/templates/new` | ✅ |
| View Template | `/dashboard/templates/[id]` | ✅ |

### Workflows
| Page | Route | Status |
|------|-------|--------|
| Workflows List | `/dashboard/workflows` | ✅ |
| New Workflow | `/dashboard/workflows/new` | ✅ |
| View Workflow | `/dashboard/workflows/[id]` | ✅ |
| Edit Workflow | `/dashboard/workflows/[id]/edit` | ✅ |

### AI Tools
| Page | Route | Status |
|------|-------|--------|
| Alt Text Generator | `/dashboard/tools/alt-text-generator` | ✅ |
| Content Trans-Creator | `/dashboard/tools/content-transcreator` | ✅ |
| Metadata Generator | `/dashboard/tools/metadata-generator` | ✅ |
| Tool History | `/dashboard/tools/history/[historyId]` | ✅ |

### User Management
| Page | Route | Status |
|------|-------|--------|
| Users List | `/dashboard/users` | ✅ |
| Invite User | `/dashboard/users/invite` | ✅ |
| View User | `/dashboard/users/[id]` | ✅ |
| Edit User | `/dashboard/users/[id]/edit` | ✅ |

### Support & Admin
| Page | Route | Status |
|------|-------|--------|
| Feedback List | `/dashboard/feedback` | ✅ |
| View Feedback | `/dashboard/feedback/[id]` | ✅ |
| Edit Feedback | `/dashboard/feedback/[id]/edit` | ✅ |
| GitHub Issues | `/dashboard/issues` | ✅ |
| Help Center | `/dashboard/help` | ✅ |
| Release Notes | `/dashboard/release-notes` | ✅ |

### Other Pages
| Page | Route | Status |
|------|-------|--------|
| My Tasks | `/dashboard/my-tasks` | ✅ |
| Product Claims | `/dashboard/product-claims` | ✅ |

## Review Order

1. **Phase 1 - Core Layout & Navigation**
   - Dashboard Layout
   - Dashboard Home
   - Main navigation structure

2. **Phase 2 - Primary Features**
   - Brands (list, new, edit)
   - Content (list, new, edit)
   - Templates (list, new, edit)

3. **Phase 3 - Claims System**
   - All claims-related pages

4. **Phase 4 - Secondary Features**
   - Workflows
   - AI Tools
   - User Management

5. **Phase 5 - Support & Other**
   - Feedback
   - Help
   - Other pages

## Notes
- Priority: Fix form layouts (inline labels) and table actions (three-dot menus)
- Check components in `/src/components/` that are reused across pages
- Update shared components first to minimize repeated work
- Test on mobile viewport for each page

## Completed Review Summary (December 17, 2024)

All dashboard pages have been systematically reviewed and updated to comply with UI Standards v2.3. The following key changes were implemented across all pages:

### Key UI Changes Applied:
1. **Removed Duplicate Padding Wrappers**: All pages previously had `px-4 sm:px-6 lg:px-8 py-6` padding which duplicated the dashboard layout padding. This has been replaced with just `space-y-6` for consistent spacing.

2. **Three-Dot Menu Pattern**: All table/list action buttons have been converted from individual buttons to dropdown menus using the `MoreVertical` icon. This includes:
   - Content lists
   - Template lists
   - Workflow lists
   - User lists
   - All other data tables

3. **Card Footer Buttons**: Form action buttons (Save/Cancel) have been moved into CardFooter components where appropriate, particularly on edit pages.

4. **Consistent Imports**: Added necessary imports for DropdownMenu components and MoreVertical icon where needed.

5. **Date Format Standardization**: Updated all date displays to use the new standard format `MMMM d, yyyy` (e.g., "December 17, 2024") as per UI Standards v2.3. This includes:
   - Changed 12 files using legacy format `dd MMMM yyyy` → `MMMM d, yyyy`
   - Changed 2 files using short format `dd MMM yyyy` → `MMM d, yyyy`
   - Changed 13 files using toLocaleDateString() → date-fns format()
   - Added date-fns imports where needed
   - Total: 27 files updated with consistent date formatting

### Pages Reviewed (All Completed ✅):
- Core Dashboard (2 pages)
- Account Management (1 page)
- Brand Management (4 pages)
- Claims System (19 pages)
- Content Management (4 pages)
- Templates (3 pages)
- Workflows (4 pages)
- AI Tools (4 pages)
- User Management (4 pages)
- Support & Admin (6 pages)
- Other Pages (2 pages)

**Total: 53 pages reviewed and updated**

## Post-Review Issues Fixed

### Storage Bucket Errors (December 17, 2024)

After completing the UI standards review, the user reported console errors related to file uploads:

**Issues:**
1. Brand logo upload: `400 Bad Request - Bucket not found`
2. Avatar upload: `403 Unauthorized - new row violates row-level security policy`

**Resolution:**
1. Created setup scripts:
   - `scripts/setup-storage-buckets.js` - Node.js script to create buckets
   - `scripts/create-storage-buckets.sql` - SQL script for bucket creation and policies
   - `STORAGE_SETUP.md` - Comprehensive documentation for fixing storage issues

2. Updated upload components:
   - `src/components/ui/avatar-upload.tsx` - Fixed file path to use `{userId}/{filename}` format
   - `src/components/ui/brand-logo-upload.tsx` - Fixed file path to use direct filename

**Status:** ✅ Fix implemented, requires manual bucket creation in Supabase Dashboard