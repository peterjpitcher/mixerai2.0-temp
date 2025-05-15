# Restricting Brand Visibility for Non-Admin Users

This document outlines the findings and proposed solution for enhancing brand visibility within MixerAI 2.0, ensuring that non-admin users only see and interact with brands and brand-linked entities (like content and workflows) to which they are explicitly assigned.

## 1. Objective

Modify the application so that users who do not have a global 'admin' role can only view and select brands to which they have assigned permissions. Furthermore, lists of items linked to brands (e.g., content, workflows, tasks) should also be filtered to only show items associated with these permitted brands. Global administrators will continue to have visibility over all brands and brand-linked items.

## 2. Discovery Findings

### 2.1. Primary Brand Data Source
- The core API endpoint for fetching brand lists is `src/app/api/brands/route.ts`.
- This endpoint now correctly filters brands based on user permissions (admins see all, non-admins see assigned).

### 2.2. User Authentication and Permissions
- The `withAuth` higher-order component (HOC) used in relevant API routes provides a `user` object containing:
    - `user.id`: The authenticated user's ID.
    - `user.user_metadata.role`: The user's global role.
    - `user.user_metadata.brand_permissions`: An array of brand-specific permissions.
- This information is key for filtering both brands and brand-linked data.

### 2.3. Brand-Linked Data Types and API Endpoints
Several other data types are linked to brands and their respective API endpoints need similar filtering:

- **Workflows (`src/app/api/workflows/route.ts`)**:
    - Workflows have a `brand_id`.
    - The `GET` handler needs modification to filter workflows by the user's permitted brands if the user is not an admin.

- **Content (`src/app/api/content/route.ts`)**:
    - Content items have a `brand_id`.
    - The `GET` handler needs modification to filter content by the user's permitted brands if the user is not an admin.

- **User Tasks (`src/app/api/me/tasks/route.ts`)**:
    - Tasks are derived from `content` items (which have a `brand_id`).
    - The `GET` handler needs modification to ensure listed tasks belong to content from the user's permitted brands if the user is not an admin.

- **Content Templates (`src/app/api/content-templates/route.ts`)**:
    - Content templates appear to be global and do not have a direct `brand_id` in their main table.
    - **No brand-based filtering seems necessary for listing templates themselves.** Their association with a brand occurs when used within a brand-specific workflow or content item.

### 2.4. Frontend Consumers

- **`src/app/dashboard/brands/page.tsx`**: Displays brands; already benefits from the updated `/api/brands`.
- **`src/components/content/content-generator-form.tsx`**: Selects brands for new content; already benefits.
- **`src/app/dashboard/workflows/page.tsx`**: Displays workflows. Will benefit once `/api/workflows` is updated.
- **`src/app/dashboard/content/content-page-client.tsx`**: Displays content. Will benefit once `/api/content` is updated.
- **`src/app/dashboard/my-tasks/page.tsx`**: Displays user tasks. Currently fetches all content from `/api/content` and filters client-side. It should ideally use the `/api/me/tasks` endpoint. It will benefit once `/api/me/tasks` is correctly filtered.
- **`src/app/dashboard/templates/page.tsx`**: Displays templates. Does not require brand filtering for the template list itself.

## 3. Proposed Solution

The strategy is to extend the API-level filtering to all relevant endpoints serving brand-linked data.

### 3.1. Modify `src/app/api/brands/route.ts` (GET Handler)
- **Status: Implemented.** This endpoint now filters brands based on `user.user_metadata.role` and `user.user_metadata.brand_permissions`.

### 3.2. Modify API Handlers for Brand-Linked Data (GET Handlers)
For each of the following API routes, the `GET` handler will be updated:
  - `src/app/api/workflows/route.ts`
  - `src/app/api/content/route.ts`
  - `src/app/api/me/tasks/route.ts`

The modification steps for each will be:
1.  **Access User Data**: Ensure the `user` object (from `withAuth` HOC) is available.
2.  **Check Global Role**: Retrieve `const globalRole = user.user_metadata?.role;`
3.  **Admin Access**: If `globalRole === 'admin'`, proceed to fetch and return all relevant items (workflows, content, tasks) without additional brand filtering (though existing query params like `brand_id` for specific filtering should still be respected if present).
4.  **Filter for Non-Admins**:
    - If `globalRole` is not 'admin':
        - Retrieve `brandPermissions = user.user_metadata?.brand_permissions;`
        - If `brandPermissions` is undefined/empty, return an empty list: `return NextResponse.json({ success: true, data: [] });`
        - Extract `permittedBrandIds` as done in `/api/brands`.
        - If `permittedBrandIds` is empty, return an empty list.
        - **Query Modification**: Augment the Supabase query for the specific entity (workflows, content) to include `.in('brand_id', permittedBrandIds)`.
        - **Specific Query Param Handling**: If the endpoint already supports a `brand_id` (or similar) query parameter (e.g., `/api/content?brandId=XYZ`):
            - If this specific `brand_id` from the query param is *not* in the user's `permittedBrandIds`, the API should return an empty list or a 403 Forbidden error, effectively denying access to that specific brand's data.
            - If the specific `brand_id` *is* permitted, the query proceeds for that single brand.
            - If no specific `brand_id` is in the query param, then the `.in('brand_id', permittedBrandIds)` filter is applied to show all items from all permitted brands.

### 3.3. Frontend Adjustments
- **`src/app/dashboard/brands/page.tsx`**: `EmptyState` message updated. **Status: Implemented.**
- **`src/app/dashboard/my-tasks/page.tsx`**: Consider refactoring to use the `/api/me/tasks` endpoint directly in the future for efficiency and consistency. For now, the filtering on `/api/me/tasks` will cover it.

## 4. Security and Data Integrity
- Filtering at the API level is crucial for ensuring users only access data they are authorized for.
- This prevents unauthorized data exposure even if frontend requests are manipulated.

## 5. Next Steps
- Implement the filtering logic in the GET handlers for:
    - `src/app/api/workflows/route.ts`
    - `src/app/api/content/route.ts`
    - `src/app/api/me/tasks/route.ts`
- Thoroughly test with admin and non-admin users with varied brand assignments. 