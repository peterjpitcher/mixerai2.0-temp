# Plan: Implementing the Product Selector Field in the Content Generator (v2)

This document outlines the detailed plan to create and integrate a new "Select from Brand Products" field type. This version (v2) incorporates senior developer feedback to address scalability, UX edge cases, backward compatibility, and advanced testing strategies.

## 1. Objective

The goal is to implement a new "Select from Brand Products" field type in the content template editor. When a user creates content using a template that includes this field, they must be able to see and select from a list of products associated with the currently selected brand.

### 1.1. User Experience Clarifications
- **Brand with No Products**: If a brand has no associated products, the selector component will be enabled but will display a message within the dropdown stating "No products available for this brand." It will not be hidden.
- **Switching Brands**: If a user selects a new brand in the form, any products previously selected in the Product Selector field will be automatically cleared. This prevents data inconsistency.

## 2. Pre-implementation Analysis

### 2.1. Backend (API & Database)
- **Data Model & Querying**: To fetch products for a given brand ID, we will use a single, efficient `JOIN` query to minimize database round-trips.
  ```sql
  SELECT p.id, p.name
    FROM products p
    JOIN brands b ON b.master_claim_brand_id = p.master_brand_id
   WHERE b.id = $brandId;
  ```
- **Database Indexing**: For this query to be performant, we must ensure the following indexes exist. The `schema.sql` review confirms `brands.id` (as PK) and `brands.master_claim_brand_id` are indexed. We will verify or add an index on `products(master_brand_id)`.
- **API Naming Conventions**: The database column `master_claim_brand_id` is verbose. In the API response, this will be aliased to `masterBrandId` for clarity and ease of use on the frontend.

### 2.2. Frontend
- **Component Architecture**: The logic will be split between `src/components/content/content-generator-form.tsx` (for state management and rendering the field) and a new, dedicated `src/components/content/product-select.tsx` component (for the UI and interaction logic).

## 3. Implementation Plan

### 3.1. API Endpoint (`/api/brands/[id]/products/route.ts`)
- **Functionality**: The endpoint will support pagination and server-side searching to handle large product catalogs.
  - **Pagination**: `limit` and `offset` query parameters will be supported.
  - **Filtering**: A `q` query parameter will allow for searching product names (`...WHERE b.id = $brandId AND p.name ILIKE $searchTerm`).
- **Security**: The route will verify the authenticated user's permissions, ensuring they have rights to view the specified brand by checking against the `user_brand_permissions` table.
- **Performance**: To reduce load, responses will include caching headers. For products, which may not change frequently, a header like `Cache-Control: public, max-age=60, stale-while-revalidate=300` is appropriate.

### 3.2. Content Template Editor (`field-designer.tsx`)
- **Field Type Update**: The "Field Type" dropdown will be updated. The old "Select from Brand Claims" option (`brand-claims`) will be fully replaced with "Select from Brand Products" (`product-selector`).
- **Backward Compatibility & Migration**: This feature is considered net-new. The `brand-claims` type was not fully implemented and is not in use. We will proceed with removing it. A pre-deployment check will be run to confirm no existing templates use the `brand-claims` type.

### 3.3. `<ProductSelect>` Component (`src/components/content/product-select.tsx`)
- **Props & State Management**:
  - `brandId: string | null`, `value: string | string[]`, `onChange: (value: string | string[]) => void`, `isMultiSelect: boolean`.
  - **State Reset**: The component will include a `useEffect` hook that watches for changes to `brandId`. If `brandId` changes, it will automatically call `onChange(isMultiSelect ? [] : null)` to clear its state.
- **UI & UX**:
  - **Error/Retry**: On API failure, an inline error message will be shown. The "Retry" button will have a tooltip explaining that a network or server issue may be the cause.
- **Performance at Scale**:
  - **Debounced Search**: User input in the combobox will be debounced (e.g., 300ms) before triggering an API call to the `/api/brands/[id]/products?q=...` endpoint.
  - **Virtualized List**: The dropdown will use a virtualization library (like `react-window` or `tanstack-virtual`) to efficiently render potentially thousands of products without crashing the browser.
- **Accessibility**:
  - ARIA roles (`combobox`, `listbox`, `option`) and keyboard navigation will be fully implemented.
  - An `aria-live="polite"` region will be used to announce loading and error states to screen reader users.

### 3.4. Integration (`content-generator-form.tsx`)
- **Rendering Logic**: A `case 'product-selector':` will be added to the `switch` statement to render the `<ProductSelect>` component.
- **Type Safety**: The project's TypeScript types will be updated to be strongly-typed for the new field.
  ```typescript
  interface ProductSelectorOptions {
    isMultiSelect: boolean;
  }

  // A generic InputField type might be defined elsewhere
  // We'll ensure our specific type is included in the union
  type InputField =
    | {
        // ... other field types
      }
    | {
        type: 'product-selector';
        label: string;
        name: string;
        options: ProductSelectorOptions;
      };
  ```
- **Edge Case Handling**: If the API returns an empty array for a given search, the dropdown will display a message: "No products found for this brand."

## 4. Testing Strategy

- **API Testing**:
  - Unit/Integration tests for the API route.
  - **Performance**: A benchmark test using `k6` will be created to assert the endpoint responds within an acceptable SLA (e.g., < 500ms) when a brand has >1,000 products.
- **Component Testing (`<ProductSelect>`)**:
  - **Mocking**: Use `msw` (Mock Service Worker) to simulate API responses, including slow or failing network conditions, to test the component's loading and retry logic.
  - **Snapshot Tests**: Jest snapshot tests will capture the rendered output for empty, loading, error, and populated states to prevent regressions.
- **Automated Accessibility Testing**:
  - In addition to `axe-core` in unit tests, `Pa11y` or `Lighthouse` CI checks will be configured to catch higher-level accessibility issues like faulty keyboard navigation.
- **E2E Testing**: A Playwright/Cypress test will cover the full user journey as described in v1 of this plan.

## 5. Final Considerations

- **Product Volume & Scalability**: The plan explicitly includes server-side pagination and debounced searching in the API and frontend component to handle the possibility of very large product catalogs from the outset.
- **Design System Alignment**: The new `<ProductSelect>` component will be built using `shadcn/ui` and styled to match the existing application theme and any documented design tokens.

## 6. Review and Approval

This revised plan is now ready for a final review. It is significantly more robust and accounts for real-world complexity.

## 7. Implementation Progress & Status (As of last session)

This section documents the progress made based on the plan above.

### ✅ Completed Steps

The following components and endpoints have been successfully implemented:

1.  **API Endpoint Created (`/api/brands/[id]/products/route.ts`)**:
    *   The new API route has been created and is functional.
    *   It correctly authenticates the user and checks for brand permissions.
    *   It fetches the `master_claim_brand_id` for the given brand and retrieves the associated products.
    *   It supports pagination (`limit`/`offset`) and searching (`q` parameter).
    *   It sets appropriate `Cache-Control` headers for performance.

2.  **TypeScript Definitions Updated (`src/types/template.ts`)**:
    *   The core type definitions have been updated.
    *   `'brand-claims'` has been removed from the `FieldType` union and replaced with `'product-selector'`.
    *   The `ProductSelectorOptions` interface has been added.

3.  **Product Selector Component Created (`src/components/content/product-select.tsx`)**:
    *   The new, reusable `<ProductSelect>` component has been built.
    *   It successfully fetches data from the new API endpoint using SWR.
    *   It features debounced searching to limit API calls.
    *   It correctly handles loading, error, and empty states.
    *   A missing `ChevronsUpDown` icon was added to `src/components/icons.tsx` to support this component.

4.  **Component Integrated into Content Form (`src/components/content/content-generator-form.tsx`)**:
    *   The `<ProductSelect>` component has been successfully integrated into the main content creation form.
    *   The form's rendering logic now includes a `case` for `'product-selector'` and correctly renders the component, passing the `brandId` and `onChange` handler.

### ❗ Blocked Steps

*   **Content Template Editor (`src/components/template/field-designer.tsx`)**: This step is currently **blocked**.
    *   Multiple attempts were made to update this component to add "Select from Brand Products" to the "Field Type" dropdown.
    *   Each attempt resulted in the model applying an incorrect diff, leading to significant JSX syntax errors, as confirmed by the `next dev` server output.
    *   Due to the complexity of the file and the persistent failures, work on this specific file has been paused to avoid further errors.

### Current Status

The feature is **partially implemented**. The backend and the content-creation side of the feature are complete. However, because the `field-designer.tsx` component could not be updated, there is currently **no way for a user to add the "Product Selector" field to a content template.** The core functionality exists but is not yet accessible to users. 