# Plan: Adding a "Select from Brand Claims" Field Type (v3 - Final)

This document outlines the final, comprehensive plan to add a new "Select from Brand Claims" custom field type to the content template builder UI. This version incorporates extensive feedback on accessibility, internationalisation, security, performance, and testing to ensure a production-ready feature.

## 1. Objective

The primary objective is to add a new "Select from Brand Claims" field type, allowing content creators to insert approved, brand-specific marketing claims into their content seamlessly.

## 2. Technical Plan & Design

### Step 2.1: Database Schema

We will add a `fields` column to the `content` table to store data for all custom fields.

**Migration (`supabase/migrations/<timestamp>_add_content_fields.sql`):**

```sql
-- Migration
ALTER TABLE public.content
ADD COLUMN fields JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.content.fields IS 'Stores data for custom fields defined in a content template.';

-- Optional: Add a GIN index for performance if we anticipate querying the JSONB fields directly.
-- CREATE INDEX idx_content_fields_gin ON public.content USING GIN (fields);

-- Rollback
ALTER TABLE public.content
DROP COLUMN fields;
```

*   **Default and Non-Null**: The column will be `NOT NULL DEFAULT '{}'` to simplify application logic.
*   **Indexing**: A GIN index is documented for future performance needs.
*   **Validation**: Schema validation will be managed at the application layer.

### Step 2.2: API Endpoint for Brand Claims

A new, secure, and performant API endpoint will be created.

**API Route**: `src/app/api/brands/[id]/claims/route.ts`

**Enhancements based on feedback:**
*   **Security**: The endpoint will validate the `brandId` (ensuring it's a valid UUID and the user has permission to access it) to prevent data leakage. A rate limiter will be added to prevent abuse.
*   **Error Handling**: Returns `404` for invalid `brandId`, `403` for permission denied, and `200` with an empty array for a brand with no claims.
*   **Performance**: The response will include a `Cache-Control` header (e.g., `public, max-age=300`) for browser caching.

### Step 2.3: Frontend Implementation

#### 2.3.1: Build & Deployment Strategy
*   **Feature Flag**: The entire feature will be controlled by `NEXT_PUBLIC_FEATURE_BRAND_CLAIMS_FIELD=true`.
*   **Dynamic Import**: The main component, `<BrandClaimsSelect>`, will be loaded using `React.lazy()` and `<Suspense>` to ensure it doesn't impact the initial bundle size for users who don't have the feature enabled.

#### 2.3.2: Component Architecture
*   A new reusable component, `<BrandClaimsSelect>`, will be created.
*   The `TemplateFieldEditor.tsx` component will conditionally render this new field type based on the feature flag.
*   **Internationalisation (i18n)**: All user-facing strings (labels, helper text, error messages) will be wrapped in a translation function (e.g., `t('key')`) to prepare for future localisation.

#### 2.3.3: Data-Fetching & Performance
*   **Client-Side Caching**: We will use a library like SWR or React Query to handle data fetching, which provides out-of-the-box caching to prevent redundant API calls. A `staleTime` of 5 minutes will be configured.
*   **Debounced Search**: The search input within the dropdown will be debounced (300ms) to avoid overwhelming the API during user input.
*   **Loading State**: The dropdown will display a lightweight skeleton loader while claims are being fetched.

#### 2.3.4: Accessibility (A11y)
*   **Keyboard Navigation**: The dropdown will be fully keyboard-navigable (up/down arrows, Enter to select, Escape to close).
*   **ARIA Roles**: Proper ARIA attributes (`combobox`, `listbox`, `option`) will be used to ensure screen reader compatibility.
*   **Focus Management**: Focus will be managed programmatically, moving into the dropdown when opened and returning to the trigger element when closed.

#### 2.3.5: Error Handling & Resilience
*   **Error Boundary**: The `<BrandClaimsSelect>` component will be wrapped in its own React Error Boundary. If the component fails, it will not crash the entire page.
*   **Retry Logic**: On a fetch failure, the dropdown will display an error message and a "Retry" button.

#### 2.3.6: Handling Data Changes
*   If a previously selected claim is deleted, the UI will display the stored ID with a message like `(Claim no longer available)`.

## 3. Observability & Analytics

*   **Usage Metrics**: We will implement analytics events to track:
    1.  When the "Select from Brand Claims" field is added to a template.
    2.  When a content creator selects a claim using the field.
*   **Error Logging**: All API errors and frontend exceptions caught by the error boundary will be logged to a service like Sentry or Datadog for monitoring.

## 4. Testing Plan

*   **Unit & Integration Tests**: Jest/RTL tests will cover individual components and their integration.
*   **Accessibility Tests**: We will use `axe-core` within our component tests to automatically catch A11y violations.
*   **End-to-End (E2E) Tests**: A Playwright or Cypress test suite will be created to simulate the full user journey:
    1.  Log in and enable the feature flag.
    2.  Create a template and add the brand claims field.
    3.  Mock the API to test various scenarios (0 claims, 1 claim, many claims, error state).
    4.  Create content using the template and verify the field's behavior (search, selection, validation, deleted-claim fallback).

This final plan provides a comprehensive roadmap for delivering a robust, secure, and user-friendly feature. 