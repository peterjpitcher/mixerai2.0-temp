# Restricting Brand Visibility for Non-Admin Users

This document outlines the findings and proposed solution for enhancing brand visibility within MixerAI 2.0, ensuring that non-admin users only see and interact with brands they are explicitly assigned to.

## 1. Objective

Modify the application so that users who do not have a global 'admin' role can only view and select brands to which they have assigned permissions. Global administrators will continue to have visibility over all brands.

## 2. Discovery Findings

### 2.1. Primary Brand Data Source
- The core API endpoint for fetching brand lists is `src/app/api/brands/route.ts`.
- This endpoint currently returns all brands, with some additional data like content count and vetting agencies.

### 2.2. User Authentication and Permissions
- The `src/app/api/brands/route.ts` uses a `withAuth` higher-order component (HOC).
- This HOC provides a `user` object to the API handler, which contains:
    - `user.id`: The authenticated user's ID.
    - `user.user_metadata.role`: The user's global role (e.g., 'admin', 'editor', 'viewer').
    - `user.user_metadata.brand_permissions`: An array of objects, where each object details a brand-specific permission (including `brand_id` and `role` for that brand).
- The `src/app/api/me/route.ts` endpoint correctly fetches and provides this `user_metadata` (including global role and `brand_permissions`) to the frontend.

### 2.3. Frontend Consumers of Brand Data
Several frontend components and pages fetch brand data, primarily via `/api/brands`:

- **`src/app/dashboard/brands/page.tsx`**:
    - Displays a list/dashboard of all brands.
    - Fetches directly from `/api/brands`.
    - Will automatically reflect filtered data if the API is updated.
    - Includes an `EmptyState` component that would be displayed if a non-admin user has no assigned brands. The messaging here might need a slight tweak (e.g., "No brands assigned to you" instead of "No brands yet").

- **`src/components/content/content-generator-form.tsx`**:
    - Used in content creation (e.g., `src/app/dashboard/content/new/page.tsx`) and potentially content editing.
    - Fetches from `/api/brands` to populate a brand selection dropdown.
    - Will automatically populate the dropdown with filtered brands if the API is updated.
    - Includes logic to auto-select a brand if only one is available, which will work correctly for users assigned to a single brand.

- **`src/app/dashboard/users/[id]/edit/page.tsx`**:
    - Allows admins to edit user details, including assigning them to brands and setting brand-specific roles.
    - Fetches from `/api/brands` to list all available brands for assignment via checkboxes.
    - **Consideration**: For an admin using this page, they *should* see all brands to be able to assign any of them. If the `/api/brands` endpoint is modified based on the *logged-in admin's* permissions, it will correctly show all brands (as admins have universal brand access implicitly). The critical security aspect here is that the `PUT` request to `/api/users/[id]` must validate that the acting user has the authority to modify the target user's permissions, which is a separate validation.

## 3. Proposed Solution

The most effective and secure way to implement this is by filtering at the API level.

### 3.1. Modify `src/app/api/brands/route.ts` (GET Handler)
1.  **Access User Data**: The `user` object is already available via the `withAuth` HOC.
2.  **Check Global Role**:
    - Retrieve the user's global role: `const globalRole = user.user_metadata?.role;`
    - If `globalRole === 'admin'`, proceed to fetch and return all brands as is currently done.
3.  **Filter for Non-Admins**:
    - If `globalRole` is not 'admin':
        - Retrieve the user's brand-specific permissions: `const brandPermissions = user.user_metadata?.brand_permissions;`
        - If `brandPermissions` is undefined, empty, or not an array, return an empty list of brands: `return NextResponse.json({ success: true, data: [] });`
        - Extract the list of `brand_id`s the user is permitted to see:
          ```typescript
          const permittedBrandIds = brandPermissions
            .map(permission => permission.brand_id)
            .filter(id => id != null); // Ensure no null/undefined IDs
          ```
        - If `permittedBrandIds` is empty, return an empty list: `return NextResponse.json({ success: true, data: [] });`
        - Modify the Supabase query to fetch only brands whose `id` is in the `permittedBrandIds` list:
          ```typescript
          const { data: brandsData, error } = await supabase
            .from('brands')
            .select('*, content_count:content(count), selected_vetting_agencies:brand_selected_agencies(...)')
            .in('id', permittedBrandIds) // <-- ADD THIS FILTER
            .order('name');
          ```
4.  **Return Data**: The rest of the data formatting logic can remain largely the same.

### 3.2. Frontend Adjustments (Minor)
- **`src/app/dashboard/brands/page.tsx`**:
    - Consider adjusting the `EmptyState` message for non-admins with no assigned brands from "No brands yet..." to something like "You have not been assigned to any brands." or "No brands are currently available for your account."

## 4. Security and Data Integrity
- Filtering at the API level ensures that users can only ever receive data for brands they are authorized to access, regardless of any frontend attempts to request other brands.
- The `/api/me` route already provides the necessary `brand_permissions` to the frontend, so UI components can be aware of these limitations if needed for conditional rendering (though the primary filtering is backend).
- For user management (e.g., `src/app/dashboard/users/[id]/edit/page.tsx`), while the list of brands shown for selection will be filtered by the API if a non-admin accesses it, the more critical validation is on the `PUT /api/users/[id]` endpoint to ensure the *acting user* has rights to change brand assignments for the *target user*. This is typically an admin-only function.

## 5. Next Steps
- Implement the changes in `src/app/api/brands/route.ts`.
- Review and optionally adjust the empty state message in `src/app/dashboard/brands/page.tsx`.
- Test thoroughly with admin users and non-admin users with various brand assignment configurations (no brands, one brand, multiple brands). 