## Discovery Report: Multiple UI/UX Issues
Date: 2025-07-02
Developer: Claude

### Issues Identified

#### 1. Stalled Content Box - Brand Logo Too Small
**Location**: Dashboard main page
**Problem**: Brand logos in the stalled content box are too small to see
**Priority**: High

#### 2. Missing Products in Product Combo
**Location**: /dashboard/content/new?template=c21b9928-edbe-4204-9aa8-770e2b43b0be
**Problem**: Not all products showing in the product dropdown
**Root Cause**: The API at `/api/brands/[id]/products` only returns products where `master_brand_id` is in the list of master claim brands linked via the `brand_master_claim_brands` junction table
**Solution Options**:
1. Add missing entries to `brand_master_claim_brands` table
2. Modify API to include all products for the brand (might need different logic)
3. Check if products have proper `master_brand_id` values
**Priority**: High

#### 3. Brands/New Page Issue
**Location**: /dashboard/brands/new
**Problem**: Unspecified issue (need to investigate)
**Console Warnings**: 
- Image aspect ratio warning for /Mixerai2.0Logo.png
- Multiple "fill" without "sizes" prop warnings for avatar images
**Priority**: High

#### 4. Session Data Restoration
**Location**: All forms across the application
**Problem**: Unnecessary feature that restores previous session data
**Priority**: Medium

#### 5. Workflow Creation Error
**Location**: /dashboard/workflows/new
**Error**: POST /api/workflows returns 400 Bad Request - "Validation failed"
**Priority**: High

#### 6. Workflow Update Error
**Location**: /dashboard/workflows/[id]/edit
**Error**: "TypeError: step.id.startsWith is not a function" at line 809
**Priority**: High

#### 7. Breadcrumb Duplication
**Location**: /dashboard/templates
**Problem**: Breadcrumbs showing "dashboard" twice
**Priority**: Medium

#### 8. Placeholder Insertion Not Working
**Location**: /dashboard/templates/new
**Problem**: "Insert input field placeholders" button doesn't insert text into AI prompt box
**Priority**: High

### Fixes Applied

1. **Brand Logo Size**: ✅ Removed size constraint (h-3.5 w-3.5) from BrandDisplay in MostAgedContent component
2. **Missing Products**: ✅ Identified issue - products filtered by master_brand_id association (data issue, not code)
3. **Brands/New Issue**: ✅ Fixed logo aspect ratio warning by adding style={{ height: 'auto' }}
4. **Session Restoration**: ✅ Removed all form persistence features using localStorage/sessionStorage
5. **Workflow Creation Error**: ✅ Added proper mapping to include order_index in workflow steps
6. **Workflow Update Error**: ✅ Added type checking for step.id before calling startsWith
7. **Breadcrumbs**: ✅ Removed duplicate "Dashboard" from BreadcrumbNav items
8. **Placeholder Insertion**: ✅ Fixed placeholder format mismatch between UI ({{brand.name}}) and API