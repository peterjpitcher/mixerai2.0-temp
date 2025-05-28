*   `uuid` (v4 for generating IDs for additional URL fields)

---

### 5.3. View Brand Details Page (`src/app/dashboard/brands/[id]/page.tsx`)

Displays detailed information about a specific brand, identified by the `id` parameter in the URL.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Data Fetching**:
    *   Fetches current user data from `/api/me` for permission checks.
    *   Fetches specific brand data from `/api/brands/[id]`.
    *   Manages loading states (`isLoading`, `isLoadingUser`) and error state (`error`).
*   **Permission Checks**: Determines if the current user is a Global Admin or a Brand Admin for the specific brand to control access to the "Edit Brand" button and potentially other features (e.g., `RejectedContentList`).
*   **Breadcrumbs**: Dynamically generated: "Dashboard" / "Brands" / "[Brand Name]".
*   **Page Header**: Uses `<PageHeader />` to display brand name and description. Includes an "Edit Brand" button (`/dashboard/brands/[id]/edit`) visible only to authorized admins.
*   **Brand Overview Card**:
    *   Displays Name, Company, Website (linkable), Country (from `COUNTRIES`), Language (from `LANGUAGES`), Brand Colour (with visual swatch), Master Claim Brand name, Content Items count, and Workflows count.
*   **Brand Administrators Card**:
    *   Lists users assigned as administrators for this brand (from `brand.admins`).
    *   Links to each user's profile/edit page (`/dashboard/users/[admin.id]/edit`).
    *   Provides a link to the main Users page for managing assignments.
*   **Brand Identity Card**: Displays `brand_identity`, `tone_of_voice`, and `guardrails`.
*   **Content Card**: Placeholder for displaying content associated with the brand. Links to `/dashboard/content?brandId=[id]`.
*   **Workflows Card**: Placeholder for displaying workflows. Links to `/dashboard/workflows?brandId=[id]`.
*   **Rejected Content List**: Integrates `<RejectedContentList brandId={id} />` component, visible to admins.
*   **Error/Loading States**: Shows appropriate messages/spinners for loading, errors, or if the brand is not found.

**Data Fetched:**

*   Current user session: `/api/me` (GET).
*   Specific brand details: `/api/brands/[id]` (GET). (Response includes `brand`, `contentCount`, `workflowCount`).

**Interfaces Defined/Used:**

*   `BrandDetailsProps`: `{ params: { id: string } }`.
*   `UserSessionData`: (for current user).
*   `AdminUser`: `id`, `full_name`, `email` (for brand admins list).
*   `brand` (state): Type is `any`, but structure includes fields like `name`, `company`, `website_url`, `country`, `language`, `brand_color`, `master_claim_brand_name`, `admins`, `brand_identity`, `tone_of_voice`, `guardrails`.

**Constants Used:**

*   `COUNTRIES`, `LANGUAGES`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardHeader, CardTitle)
*   `@/components/ui/separator` (Separator)
*   `@/components/ui/label` (Label)
*   `@/components/brand-icon` (BrandIcon)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/dashboard/breadcrumbs` (Breadcrumbs)
*   `@/components/dashboard/brand/rejected-content-list` (RejectedContentList)
*   `lucide-react` (Spinner, AlertCircle, HelpCircleIcon, ContentIcon, WorkflowIcon, ArchiveX, Users, ExternalLink icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter)
*   `sonner` (toast)

---

### 5.4. Edit Brand Page (`src/app/dashboard/brands/[id]/edit/page.tsx`)

Allows authorized users (Global Admins or Brand Admins for the specific brand) to edit an existing brand identified by `id`.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Permission-Protected**: Fetches current user from `/api/me` and checks `user_metadata.role` and `brand_permissions` to ensure user is a global admin or a brand admin for this specific brand. Shows "Access Denied" (`ForbiddenDisplay`) if not authorized.
*   **Data Fetching**:
    *   Fetches brand details from `/api/brands/[id]` to populate the form.
    *   Fetches all vetting agencies from `/api/content-vetting-agencies`.
    *   Fetches master claim brands from `/api/master-claim-brands` for association.
*   **Form Structure**: The page is structured with multiple `Card` components for different sections (Basic Information, Brand Identity, Advanced Settings). (Tabs were previously used but seem to be commented out).
*   **Breadcrumbs**: "Dashboard" / "Brands" / "Edit: [Brand Name]".
*   **Page Header**: Displays page title and provides "Back to Brands" and "Save Changes" buttons.

**Form Fields & Functionality:**

*   **Basic Information Card**:
    *   Brand Name (required), Main Website URL, Primary Country, Primary Language.
*   **Brand Identity Card**:
    *   **Additional Website URLs**: Dynamically add/remove/edit URLs for AI context.
    *   **AI Generate/Refine Brand Identity**: Button triggers POST to `/api/ai/generate-brand-identity` with `brandName`, `websiteUrl`, `country`, `currentIdentity`, `brandId`. Updates `formData.brand_identity`.
    *   **Brand Identity**: Textarea.
    *   **Tone of Voice**: Textarea.
    *   **Guardrails & Restrictions**: Textarea.
    *   **Brand Colour**: Color picker and hex input.
    *   **Content Vetting Agencies**: 
        *   Filters `allVettingAgencies` based on `formData.country`.
        *   Groups and displays agencies by priority (High, Medium, Low, Other/Uncategorized).
        *   Checkboxes update `formData.selected_agency_ids`.
        *   Allows adding **Custom Vetting Agencies** (names stored in `newCustomAgencyNames`).
*   **Advanced Settings & Associations Card**:
    *   **Master Claim Brand Association**: Select from fetched `masterClaimBrands` (updates `formData.master_claim_brand_id`).
    *   **Brand Administrators**: Displays list of admins assigned to the brand (fetched with brand data, stored in `displayedAdmins`). Management is implied to be elsewhere.

**Saving Changes:**

*   `handleSave` function triggered by "Save Changes" button.
*   Validates brand name.
*   Sends PUT request to `/api/brands/[id]` with `formData` (including processed `additional_website_urls` and `new_custom_agency_names`).
*   Updates local `brand` state and `formData` with the response from the API.
*   Clears `newCustomAgencyNames`.
*   Shows success/error toasts.
*   Manages `isSaving`, `isGenerating`, `isLoadingUser`, `isLoadingBrand`, `isLoadingAgencies`, `isLoadingMasterClaimBrands` states for loading indicators and disabling buttons.
*   Error/Forbidden/Not Found states handled with dedicated display components (`ErrorDisplay`, `ForbiddenDisplay`, `NotFoundDisplay`).

**Data Fetched:**

*   Current user: `/api/me` (GET).
*   Brand details: `/api/brands/[id]` (GET).
*   All vetting agencies: `/api/content-vetting-agencies` (GET).
*   Master claim brands: `/api/master-claim-brands` (GET).

**Data Submitted:**

*   AI Brand Identity Generation: `/api/ai/generate-brand-identity` (POST).
*   Brand Update: `/api/brands/[id]` (PUT).

**Interfaces Defined/Used:**

*   `BrandEditPageProps`: `{ params: { id: string } }`.
*   `UserSearchResult`, `VettingAgency`, `GroupedVettingAgencies`, `UserSessionData`, `MasterClaimBrand`.
*   `formData` state includes: `name`, `website_url`, `additional_website_urls` (array of `{id, value}`), `country`, `language`, `brand_color`, `brand_identity`, `tone_of_voice`, `guardrails`, `selected_agency_ids` (array of strings), `master_claim_brand_id`.

**Constants Used:**

*   `COUNTRIES`, `LANGUAGES`.
*   `REQUIRED_ROLE = 'admin'`.

**UI Components Used (Selected):**

*   `@/components/ui/button`, `input`, `textarea`, `card`, `label`, `select`, `checkbox`, `badge`.
*   `@/components/brand-icon` (BrandIcon)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/dashboard/breadcrumbs` (CustomBreadcrumbs)
*   `lucide-react` (many icons for actions, loading, feedback).
*   `next/link`, `next/navigation`.
*   `sonner` (toast).
*   `uuid` (v4).

---

## 6. Claims Section (`src/app/dashboard/claims`)

This section is dedicated to managing claims related to brands, products, and ingredients.

### 6.1. Claims Management Listing Page (`src/app/dashboard/claims/page.tsx`)

Displays a list of all claims, allowing users to filter, search, view, edit, and delete them. Provides an option to add new claims.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On component mount, fetches data in parallel from:
    *   `/api/claims` (for all claims).
    *   `/api/master-claim-brands` (for brand names).
    *   `/api/products` (for product names).
    *   `/api/ingredients` (for ingredient names).
    *   Enriches claims data with `entity_name` (Brand, Product, or Ingredient name) and `entity_icon` based on claim level and associated ID.
    *   Manages loading (`isLoading`) and error (`error`) states.
*   **Claim Display**: Claims are displayed in `Card` components within a grid.
    *   Each card shows: claim text, claim type (with icon: Allowed, Disallowed, Mandatory), claim level (with icon: Brand, Product, Ingredient) along with entity name, and country code.
    *   Includes a description if available.
    *   Provides "Edit" (`/dashboard/claims/[id]/edit`) and "Delete" buttons.
*   **Search & Filtering**:
    *   **Search**: Input field to search claim text, description, or entity name.
    *   **Filters**: Dropdown selects for Level (All, Brand, Product, Ingredient), Type (All, Allowed, Disallowed, Mandatory), and Country (dynamically populated unique country codes from claims, plus 'all' and '__GLOBAL__').
    *   `filteredClaims` memoized state applies search and filter criteria.
*   **Delete Functionality**:
    *   Uses an `AlertDialog` for delete confirmation.
    *   `handleDelete` sends a DELETE request to `/api/claims/[id]`.
    *   Updates UI by removing the deleted claim.
*   **Empty/Error/NoResults States**: Custom components for loading, error, no claims found, and no claims matching filters.
*   **Navigation**: "Add New Claim" button links to `/dashboard/claims/new`.
*   **Page Header**: Displays title "Claims Management" and description.

**Data Fetched:**

*   All claims: `/api/claims` (GET).
*   Master claim brands: `/api/master-claim-brands` (GET).
*   Products: `/api/products` (GET).
*   Ingredients: `/api/ingredients` (GET).

**Data Submitted (Actions):**

*   Delete claim: `/api/claims/[id]` (DELETE).

**Types/Interfaces Defined:**

*   `ClaimTypeEnum`: `'allowed' | 'disallowed' | 'mandatory'`.
*   `ClaimLevelEnum`: `'brand' | 'product' | 'ingredient'`.
*   `Claim`: `id`, `claim_text`, `claim_type`, `level`, `master_brand_id`, `product_id`, `ingredient_id`, `country_code`, `description`, `created_at`, `updated_at`, `entity_name` (derived), `entity_icon` (derived).
*   `MasterClaimBrand`, `Product`, `Ingredient` (for related entity names).

**Constants/Objects Used:**

*   `claimTypeIcons`: Maps `ClaimTypeEnum` to Lucide icons.
*   `claimLevelIcons`: Maps `ClaimLevelEnum` to Lucide icons.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/alert-dialog` (AlertDialog and related components)
*   `@/components/ui/badge` (Badge)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (various icons for actions, states, claim types/levels).
*   `next/link` (Link)
*   `sonner` (toast).

---

### 6.2. Add New Claim Page (`src/app/dashboard/claims/new/page.tsx`)

Provides a form to create a new claim.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching for Selects**: On mount, fetches data for dropdowns:
    *   Master Claim Brands from `/api/master-claim-brands`.
    *   Products from `/api/products`.
    *   Ingredients from `/api/ingredients`.
    *   Countries from `/api/countries`.
    *   Manages individual loading states for these (e.g., `isLoadingBrands`).
*   **Form Structure**: Single `Card` containing form fields.
    *   **Claim Text**: Textarea (required).
    *   **Claim Type**: Select (Allowed, Disallowed, Mandatory) - Required.
    *   **Claim Level**: Select (Brand, Product, Ingredient) - Required.
    *   **Country**: Select (from fetched countries, `ALL_COUNTRIES_CODE` for Global) - Required.
    *   **Dynamic Entity Selector**: Based on selected `Claim Level`:
        *   If Level is "Brand", shows "Master Claim Brand" select (required).
        *   If Level is "Product", shows "Product" select (required).
        *   If Level is "Ingredient", shows "Ingredient" select (required).
    *   **Description**: Textarea (optional).
*   **Form Validation**: `validateForm` function checks required fields and level-specific entity selections. Displays inline error messages stored in `errors` state.
*   **Submission**: `handleSubmit` function:
    *   Calls `validateForm`.
    *   Constructs payload for POST request to `/api/claims`.
        *   `country_codes` is sent as an array (containing the single selected `country_code`).
        *   `product_ids` is sent as an array if level is product.
    *   On success, shows toast and redirects to `/dashboard/claims`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to Claims" button.
*   **Page Header**: Displays title and description.

**Data Fetched:**

*   Master Claim Brands: `/api/master-claim-brands` (GET).
*   Products: `/api/products` (GET).
*   Ingredients: `/api/ingredients` (GET).
*   Countries: `/api/countries` (GET).

**Data Submitted:**

*   New claim: `/api/claims` (POST).

**Types/Interfaces Defined:**

*   `ClaimTypeEnum`, `ClaimLevelEnum`.
*   `ClaimFormData`: `claim_text`, `claim_type`, `level`, `master_brand_id`, `product_id`, `ingredient_id`, `country_code`, `description`.
*   `MasterClaimBrand`, `Product`, `Ingredient`, `CountryOption`.

**Constants Used:**

*   `ALL_COUNTRIES_CODE`, `ALL_COUNTRIES_NAME` (from `@/lib/constants/country-codes`).

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input - though not directly, Textarea is used)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/ui/select` (Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue)
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Loader2, ArrowLeft, Save, FileText, Building2, Package, Sprout, Globe, Info icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter)
*   `sonner` (toast).

---

### 6.3. Edit Claim Page (`src/app/dashboard/claims/[id]/edit/page.tsx`)

Allows users to edit an existing claim, identified by `id` from the URL params.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On mount (if `id` is present):
    *   Fetches claim details from `/api/claims/[id]`.
    *   Fetches associated entity (Brand, Product, or Ingredient) details from its respective API endpoint (e.g., `/api/global-claim-brands/[entity_id]`) to display its name.
    *   Fetches countries from `/api/countries` for the country dropdown.
    *   If the claim is market-specific (not Global), fetches linked market overrides from `/api/market-overrides?replacementClaimId=[id]` to inform the user about dependencies.
    *   Manages loading states (`isLoading`, `isSaving`, `isLoadingOverrides`, `isLoadingCountries`) and error state (`error`).
*   **Form Structure**: Single `Card` for editing claim details.
    *   **Associated Entity Info (Read-Only)**: Displays the claim's Level (Brand, Product, Ingredient) and the name of the associated entity. These are not editable.
    *   **Linked Overrides Info**: If the claim is used as a replacement in market overrides, a message is displayed indicating this and that the country code cannot be changed.
    *   **Claim Text**: Textarea (required).
    *   **Claim Type**: Select (Allowed, Disallowed, Mandatory) - Required.
    *   **Country**: Select (from fetched countries, `ALL_COUNTRIES_CODE` for Global) - Required. Disabled if the claim is a replacement in market overrides.
    *   **Description**: Textarea (optional).
*   **Form Validation**: `validateForm` function checks required fields. Displays inline error messages stored in `formErrors` state.
*   **Submission**: `handleSubmit` function:
    *   Calls `validateForm`.
    *   Constructs payload with only editable fields (`claim_text`, `claim_type`, `country_code`, `description`).
    *   Sends PUT request to `/api/claims/[id]`.
    *   On success, shows toast and redirects to `/dashboard/claims`.
    *   Shows error toast on failure.
*   **Navigation**: "Back to Claims" button in PageHeader, "Cancel" button in CardFooter.
*   **Breadcrumbs**: "Dashboard" / "Claims" / "Edit: [Claim Text Shortened or ID]".
*   **Page Header**: Displays title and dynamic description.

**Data Fetched:**

*   Specific claim details: `/api/claims/[id]` (GET).
*   Associated entity name: e.g., `/api/global-claim-brands/[entity_id]`, `/api/products/[entity_id]`, or `/api/ingredients/[entity_id]` (GET).
*   Countries: `/api/countries` (GET).
*   Linked market overrides (if applicable): `/api/market-overrides?replacementClaimId=[id]` (GET).

**Data Submitted:**

*   Updated claim data: `/api/claims/[id]` (PUT).

**Types/Interfaces Defined:**

*   `ClaimTypeEnum`, `ClaimLevelEnum`.
*   `Claim`: (Interface for fetched claim data).
*   `ClaimEditFormData`: `claim_text`, `claim_type`, `country_code`, `description`.
*   `AssociatedEntityInfo`: `id`, `name`, `type`.
*   `MarketOverride`: `id`, `master_claim_id`, `market_country_code`, `target_product_id`, `is_blocked`, `replacement_claim_id`.
*   `CountryOption`: `code`, `name`.

**Constants Used:**

*   `ALL_COUNTRIES_CODE`, `ALL_COUNTRIES_NAME`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/dashboard/breadcrumbs` (Breadcrumbs)
*   `lucide-react` (Loader2, ArrowLeft, Save, AlertTriangle, Info, Link2 icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter, useParams)
*   `sonner` (toast).

---

### 6.4. Product Claims Output (Styled Claims Generation) (`src/app/dashboard/claims/brand-review/page.tsx`)

This page allows users to select a product and a country (market) to generate a styled list of applicable claims, categorized into "Allowed Claims" and "Disallowed Claims". The filename `brand-review/page.tsx` might be a misnomer as the functionality is product and market-specific claim styling.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Data Fetching for Selects**: On mount, fetches:
    *   Countries using `fetchCountries()` (from `@/lib/api-utils`, likely calling `/api/countries`).
    *   Products using `fetchProducts()` (from `@/lib/api-utils`, likely calling `/api/products`).
    *   Manages loading states (`isLoadingCountries`, `isLoadingProducts`).
*   **Selection UI**: 
    *   Dropdown select for Market/Country (`selectedCountry`).
    *   Dropdown select for Product (`selectedProduct`).
*   **Claims Generation Process (`handleGenerateClaims`)**:
    1.  Validates that both country and product are selected.
    2.  Sets `isGeneratingClaims` to true and `hasGenerated` to true.
    3.  Fetches raw claims for the selected product and country using `fetchClaims(selectedProduct, selectedCountry)` (from `@/lib/api-utils`, likely calling `/api/claims?productId=...&countryCode=...`).
    4.  If raw claims are found, sends a POST request to `/api/ai/style-product-claims` with the raw claims, product ID, and country code.
    5.  The AI styling service is expected to return `productName`, `countryName`, `styledAllowedClaims`, and `styledDisallowedClaims`.
    6.  Updates state variables with the results (`productNameForDisplay`, `countryNameForDisplay`, `styledAllowedClaims`, `styledDisallowedClaims`).
    7.  Handles errors and provides toasts for various scenarios (no raw claims, AI styling failure, success).
*   **Results Display**: 
    *   Shown in a `Card` after generation (`hasGenerated && !isGeneratingClaims`).
    *   Displays product name and country for context.
    *   Uses `renderClaimsList` helper to display styled allowed and disallowed claims as bulleted lists.
    *   Shows messages if no styled claims are returned or if generation hasn't been attempted.
*   **Styling**: Uses `Heading` component and standard UI components.

**Data Fetched:**

*   Countries: `/api/countries` (via `fetchCountries`).
*   Products: `/api/products` (via `fetchProducts`).
*   Raw claims for selected product/country: `/api/claims?productId=[...]&countryCode=[...]` (via `fetchClaims`).

**Data Submitted:**

*   Raw claims for AI styling: `/api/ai/style-product-claims` (POST), with `{ claims: rawClaims, productId, countryCode }`.

**Interfaces Defined:**

*   `CountryAPI`: `code`, `name`.
*   `ProductAPI`: `id`, `name`.
*   `StyledClaim`: `id`, `text` (for the AI-styled output).

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardHeader, CardTitle)
*   `@/components/ui/heading` (Heading)
*   `lucide-react` (Loader2)
*   `sonner` (toast)
*   Helper functions from `@/lib/api-utils`: `fetchCountries`, `fetchProducts`, `fetchClaims`.

---

### 6.9. Add New Master Claim Brand Page (`src/app/dashboard/claims/brands/new/page.tsx`)

Provides a form to create a new "Master Claim Brand".

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Form Structure**: Single `Card` for brand details.
    *   **Brand Name**: Input (required), max length 255.
    *   **MixerAI Brand ID**: Input (optional), max length 36. For linking to an existing brand in MixerAI.
*   **Form Validation**: `validateForm` checks if brand name is provided. Displays inline error messages.
*   **Submission**: `handleSubmit` function:
    *   Calls `validateForm`.
    *   Sends POST request to `/api/master-claim-brands` with `name` and `mixerai_brand_id`.
    *   On success, shows toast and redirects to `/dashboard/claims/brands`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to Master Claim Brands" button and "Cancel" button.
*   **Page Header**: Displays title and description.

**Data Submitted:**

*   New Master Claim Brand: `/api/master-claim-brands` (POST) with `{ name, mixerai_brand_id }`.

**Interfaces Defined:**

*   `MasterClaimBrandFormData`: `name`, `mixerai_brand_id`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Loader2, ArrowLeft, Save icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter)
*   `sonner` (toast).

---

### 6.10. Edit Master Claim Brand Page (`src/app/dashboard/claims/brands/[id]/edit/page.tsx`)

Allows users to edit an existing "Master Claim Brand", identified by `id` from URL params.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On mount (if `id` is present), fetches details of the specific Master Claim Brand from `/api/master-claim-brands/[id]`.
    *   Populates `formData` with `name` and `mixerai_brand_id`.
    *   Manages `isLoading` and `error` states.
*   **Form Structure**: Similar to the new Master Claim Brand page, a single `Card` for details.
    *   **Brand Name**: Input (required), max length 255.
    *   **MixerAI Brand ID**: Input (optional), max length 36.
*   **Form Validation**: `validateForm` checks for brand name. Displays inline error messages.
*   **Submission**: `handleSubmit` function:
    *   Validates form and presence of `id`.
    *   Sends PUT request to `/api/master-claim-brands/[id]` with updated `name` and `mixerai_brand_id`.
    *   On success, shows toast and redirects to `/dashboard/claims/brands`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to List" / "Cancel" buttons.
*   **Breadcrumbs**: "Dashboard" / "Claims" / "Claim Brands" / "Edit: [Brand Name or ID]".
*   **Page Header**: Displays dynamic title and description.
*   **Error/Loading States**: Handles missing ID, loading, and fetch errors with appropriate UI feedback.

**Data Fetched:**

*   Specific Master Claim Brand details: `/api/master-claim-brands/[id]` (GET).

**Data Submitted:**

*   Updated Master Claim Brand: `/api/master-claim-brands/[id]` (PUT).

**Interfaces Defined:**

*   `MasterClaimBrand`: `id`, `name`, `mixerai_brand_id`, `created_at`, `updated_at`.
*   `MasterClaimBrandFormData`: `name`, `mixerai_brand_id`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/dashboard/breadcrumbs` (Breadcrumbs)
*   `lucide-react` (Loader2, ArrowLeft, Save, AlertTriangle icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter, useParams)
*   `sonner` (toast).

---

### 6.11. Ingredients Management Page (`src/app/dashboard/claims/ingredients/page.tsx`)

This page manages "Ingredient" entities, which can be associated with claims. The path `claims/ingredients` suggests a relationship to claims, but the core functionality is CRUD for ingredients themselves.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: Fetches a list of ingredients from `/api/ingredients`.
    *   Manages loading (`isLoading`) and error (`error`) states.
*   **Display**: Lists ingredients in a `Table` with columns:
    *   Ingredient Name (linkable to its edit page).
    *   Description.
    *   Created Date.
    *   Updated Date.
    *   Actions.
*   **Search**: Input field to search by ingredient name or description.
*   **Actions per Ingredient**:
    *   **Edit**: Link to `/dashboard/claims/ingredients/[id]/edit` (Pencil icon).
    *   **Delete**: Button (Trash icon) opens an `AlertDialog` for confirmation.
        *   `handleDelete` sends DELETE request to `/api/ingredients/[id]`.
*   **Navigation**: "Add New Ingredient" button links to `/dashboard/claims/ingredients/new`.
*   **Page Header**: Title "Manage Ingredients", description about managing ingredients for product composition.
*   **Empty/Error/NoResults States**: Custom components for various states.

**Data Fetched:**

*   List of Ingredients: `/api/ingredients` (GET).

**Data Submitted (Actions):**

*   Delete Ingredient: `/api/ingredients/[id]` (DELETE).

**Interfaces Defined:**

*   `Ingredient`: `id`, `name`, `description`, `created_at`, `updated_at`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/input` (Input)
*   `@/components/ui/alert-dialog` (AlertDialog and related components)
*   `@/components/ui/table` (Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow)
*   `@/components/ui/dropdown-menu` (imported but not visibly used in this snippet for row actions).
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Trash2, Edit3, PlusCircle, Search, AlertTriangle, Loader2, Sprout, GripHorizontal, Pencil icons).
*   `next/link` (Link)
*   `sonner` (toast).

---

### 6.12. Add New Ingredient Page (`src/app/dashboard/claims/ingredients/new/page.tsx`)

Provides a form to create a new Ingredient entity.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Form Structure**: Single `Card` for ingredient details.
    *   **Ingredient Name**: Input (required), max length 255.
    *   **Description**: Textarea (optional), max length 1000.
*   **Form Validation**: `validateForm` checks if ingredient name is provided. Displays inline error messages.
*   **Submission**: `handleSubmit` function:
    *   Calls `validateForm`.
    *   Sends POST request to `/api/ingredients` with `name` and `description`.
    *   On success, shows toast and redirects to `/dashboard/claims/ingredients`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to Ingredients" button and "Cancel" button.
*   **Page Header**: Displays title and description.

**Data Submitted:**

*   New Ingredient: `/api/ingredients` (POST) with `{ name, description }`.

**Interfaces Defined:**

*   `IngredientFormData`: `name`, `description`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Loader2, ArrowLeft, Save, Sprout icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter)
*   `sonner` (toast).

---

### 6.13. Edit Ingredient Page (`src/app/dashboard/claims/ingredients/[id]/edit/page.tsx`)

Allows users to edit an existing Ingredient, identified by `id` from URL params.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On mount (if `id` is present), fetches details of the specific ingredient from `/api/ingredients/[id]`.
    *   Populates `formData` with `name` and `description`.
    *   Manages `isLoading` and `error` states.
*   **Form Structure**: Single `Card` for ingredient details.
    *   **Ingredient Name**: Input (required), max length 255.
    *   **Description**: Textarea (optional), max length 1000.
*   **Form Validation**: `validateForm` checks for ingredient name. Displays inline error messages.
*   **Submission**: `handleSubmit` function:
    *   Validates form and presence of `id`.
    *   Sends PUT request to `/api/ingredients/[id]` with updated `name` and `description`.
    *   On success, shows toast and redirects to `/dashboard/claims/ingredients`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to List" / "Cancel" buttons.
*   **Breadcrumbs**: "Dashboard" / "Claims" / "Ingredients" / "Edit: [Ingredient Name or ID]".
*   **Page Header**: Displays dynamic title and description.
*   **Error/Loading States**: Handles missing ID, loading, and fetch errors.

**Data Fetched:**

*   Specific Ingredient details: `/api/ingredients/[id]` (GET).

**Data Submitted:**

*   Updated Ingredient: `/api/ingredients/[id]` (PUT).

**Interfaces Defined:**

*   `Ingredient`: `id`, `name`, `description`, `created_at`, `updated_at`.
*   `IngredientFormData`: `name`, `description`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/dashboard/breadcrumbs` (Breadcrumbs)
*   `lucide-react` (Loader2, ArrowLeft, Save, AlertTriangle, Sprout icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter, useParams)
*   `sonner` (toast).

---

### 6.14. Products Management Page (`src/app/dashboard/claims/products/page.tsx`)

This page is for managing "Product" entities. These products are associated with Master Claim Brands and are likely used in the context of claims.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On component mount, fetches:
    *   Products from `/api/products`.
    *   Master Claim Brands from `/api/master-claim-brands` (to display brand names associated with products).
    *   Merges brand names into the product data for display.
    *   Manages loading (`isLoading`) and error (`error`) states.
*   **Display**: Lists products in a `Table` with columns:
    *   Product Name (linkable to its edit page).
    *   Brand (Master Claim Brand name, displayed in a `Badge`).
    *   Description.
    *   Created Date.
    *   Updated Date.
    *   Actions.
*   **Search**: Input field to search by product name, description, or associated brand name.
*   **Actions per Product**:
    *   **Edit**: Link to `/dashboard/claims/products/[id]/edit` (Pencil icon).
    *   **Delete**: Button (Trash icon) opens an `AlertDialog` for confirmation.
        *   `handleDelete` sends DELETE request to `/api/products/[id]`.
*   **Navigation**: "Add New Product" button links to `/dashboard/claims/products/new`.
*   **Page Header**: Title "Manage Products", description about managing products within brands.
*   **Empty/Error/NoResults States**: Custom components for various states.

**Data Fetched:**

*   List of Products: `/api/products` (GET).
*   List of Master Claim Brands: `/api/master-claim-brands` (GET).

**Data Submitted (Actions):**

*   Delete Product: `/api/products/[id]` (DELETE).

**Interfaces Defined:**

*   `Product`: `id`, `name`, `description`, `master_brand_id`, `created_at`, `updated_at`, `master_brand_name` (derived).
*   `MasterClaimBrand`: `id`, `name` (for fetching brand list).

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/input` (Input)
*   `@/components/ui/alert-dialog` (AlertDialog and related components)
*   `@/components/ui/table` (Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow)
*   `@/components/ui/badge` (Badge)
*   `@/components/dropdown-menu` (DropdownMenu and related components - imported, usage not directly visible here).
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Trash2, Edit3, PlusCircle, Search, AlertTriangle, Package, Building2, Loader2, GripHorizontal, Pencil icons).
*   `next/link` (Link)
*   `sonner` (toast).

---

### 6.15. Add New Product Page (`src/app/dashboard/claims/products/new/page.tsx`)

Provides a form to create a new Product, which must be associated with a Master Claim Brand.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: Fetches Master Claim Brands from `/api/master-claim-brands` for the association dropdown.
    *   Manages `isLoadingBrands` state.
*   **Form Structure**: Single `Card` for product details.
    *   **Product Name**: Input (required), max length 255.
    *   **Master Claim Brand**: Select (required) - populated with fetched master brands.
    *   **Description**: Textarea (optional), max length 1000.
*   **Form Validation**: `validateForm` checks if product name and master brand ID are provided. Displays inline error messages.
*   **Submission**: `handleSubmit` function:
    *   Calls `validateForm`.
    *   Sends POST request to `/api/products` with `name`, `description`, and `master_brand_id`.
    *   On success, shows toast and redirects to `/dashboard/claims/products`.
    *   Shows error toast on failure.
    *   Manages `isSaving` state.
*   **Navigation**: "Back to Products" button and "Cancel" button.
*   **Page Header**: Displays title and description.

**Data Fetched:**

*   List of Master Claim Brands: `/api/master-claim-brands` (GET).

**Data Submitted:**

*   New Product: `/api/products` (POST) with `{ name, description, master_brand_id }`.

**Interfaces Defined:**

*   `ProductFormData`: `name`, `description`, `master_brand_id`.
*   `MasterClaimBrand`: `id`, `name`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `@/components/dashboard/page-header` (PageHeader)
*   `lucide-react` (Loader2, ArrowLeft, Save, Package, Building2 icons)
*   `next/link` (Link)
*   `next/navigation` (useRouter)
*   `sonner` (toast).

---

### 6.16. Edit Product Page (`src/app/dashboard/claims/products/[id]/edit/page.tsx`)

Allows users to edit an existing Product and view its stacked claims for different countries.

**Key Features:**

*   **Client-Side Component**: `"use client"`.
*   **Data Fetching**: On mount (if `id` is present):
    *   Fetches product details from `/api/products/[id]`.
    *   Fetches Master Claim Brands from `/api/master-claim-brands` for the association dropdown.
    *   Fetches a list of countries from `/api/countries` for the Stacked Claims Viewer country selection.
    *   Manages loading states (`isLoadingProduct`, `isLoadingBrands`, `isSaving`, `isLoadingStackedClaims`).
*   **Product Information Form**: 
    *   **Product Name**: Input (required).
    *   **Master Claim Brand**: Select (required) - populated with fetched master brands.
    *   **Description**: Textarea (optional).
    *   **Form Validation**: `validateForm` checks required fields.
    *   **Submission**: `handleSubmit` sends PUT request to `/api/products/[id]`.
*   **Stacked Claims Viewer Card**:
    *   Allows selecting a country (including "All Countries") from a dropdown.
    *   Fetches and displays stacked claims for the current product and selected country from `/api/products/[id]/stacked-claims?countryCode=[...]`.
    *   Each claim in the list shows: claim text, description (tooltip/line-clamped), type (with icon), level (with icon), and country code (with icon).
    *   Manages `isLoadingStackedClaims` and `stackedClaimsError` states.
    *   Provides an info footer explaining the claim stacking logic.
*   **Navigation**: "Back to Products" / "Cancel" buttons.
*   **Breadcrumbs**: "Dashboard" / "Claims" / "Products" / "Edit: [Product Name or ID]".
*   **Page Header**: Dynamic title and description.

**Data Fetched:**

*   Specific Product details: `/api/products/[id]` (GET).
*   List of Master Claim Brands: `/api/master-claim-brands` (GET).
*   List of Countries: `/api/countries` (GET).
*   Stacked Claims for product: `/api/products/[id]/stacked-claims?countryCode=[...]` (GET).

**Data Submitted:**

*   Updated Product: `/api/products/[id]` (PUT).

**Interfaces Defined:**

*   `Product`: `id`, `name`, `description`, `master_brand_id`, `created_at`, `updated_at`.
*   `ProductFormData`: `name`, `description`, `master_brand_id`.
*   `MasterClaimBrand`: `id`, `name`.
*   Refers to `Claim`, `ClaimTypeEnum`, `ClaimLevelEnum` from `@/lib/claims-utils` for stacked claims.

**Constants Used:**

*   `ALL_COUNTRIES_CODE`, `ALL_COUNTRIES_NAME`.
*   `claimTypeIcons`, `claimLevelIcons` (for displaying stacked claims).

**UI Components Used:**

*   `@/components/ui/button`, `card`, `input`, `label`, `textarea`, `tabs`, `skeleton`.
*   `@/components/content/rich-text-editor` (RichTextEditor).
*   `@/components/content/content-approval-workflow` (ContentApprovalWorkflow).
*   `@/components/dashboard/page-header` (PageHeader).
*   `@/components/brand-icon` (BrandIcon).
*   `lucide-react` (ArrowLeft, Loader2, ShieldAlert, XCircle, Edit3 icons).
*   `next/link`, `next/navigation`.
*   `sonner` (toast).
*   `date-fns` (formatDateFns).

---

## 7. Content Section (`src/app/dashboard/content`)

This section is for managing content items.

### 7.1. Content Listing Page (`src/app/dashboard/content/page.tsx` and `src/app/dashboard/content/content-page-client.tsx`)

The main page for listing content items. It uses a server component (`page.tsx`) that Suspense-loads a client component (`content-page-client.tsx`) for handling dynamic interactions.

**`page.tsx` (Server Component):**

*   **Purpose**: Acts as the entry point for the `/dashboard/content` route.
*   **Functionality**: Uses `<Suspense>` to show a `LoadingFallback` component while `ContentPageClient` is loading.
*   **`LoadingFallback`**: A simple component displaying a spinner and "Loading content page..." text.

**`content-page-client.tsx` (Client Component):**

*   **Key Features:**
    *   **Data Fetching**: 
        *   Fetches current user data from `/api/me` for permissions and context.
        *   Fetches content items from `/api/content` based on `debouncedSearchQuery`, `brandIdFromParams` (from URL), and `statusFilter`.
        *   If `brandIdFromParams` is present, fetches details of the active brand from `/api/brands/[brandId]` for header display.
    *   **Display**: 
        *   Content items are grouped by `brand_name` and displayed in an `Accordion`.
        *   Each brand section shows the brand name (with `BrandIcon`) and item count.
        *   Inside each accordion item, content is listed in a table with columns: Title (link to content details), Current Step, Assigned To, Last Updated, Actions.
    *   **Search & Filtering**:
        *   **Search**: Input field for `searchQuery` (debounced to `debouncedSearchQuery`).
        *   **Status Filter**: Buttons to filter by status ('active', 'approved', 'rejected', 'all').
        *   Can be pre-filtered by `brandId` via URL query parameter.
    *   **Actions per Content Item**:
        *   **Edit**: Button visible if the current user is assigned to the content item. Links to `/dashboard/content/[id]/edit`.
        *   **Delete**: Button visible if the user has permission (Global Admin or Brand Admin for that content's brand - `canDeleteContent` check). Opens an `AlertDialog` for confirmation. Sends DELETE request to `/api/content/[id]` via `confirmDelete`.
    *   **Navigation**: "Create New Content" button links to `/dashboard/templates` (suggesting content creation starts from templates).
    *   **Page Header**: Dynamically displays title (e.g., "All Content" or "Content for [Brand Name]").
    *   **Breadcrumbs**: Dynamically generated based on whether a brand filter is active.
    *   **Empty/Error States**: Custom components for loading, error, and no content found.

**Data Fetched (by Client Component):**

*   Current user: `/api/me` (GET).
*   Content items: `/api/content` (GET, with optional `query`, `brandId`, `status` params).
*   Active brand details (if `brandId` in URL): `/api/brands/[brandId]` (GET).

**Data Submitted (Actions by Client Component):**

*   Delete content item: `/api/content/[id]` (DELETE).

**Interfaces Defined (in Client Component):**

*   `ContentFilterStatus`: `'active' | 'approved' | 'rejected' | 'all'`.
*   `ContentItem`: Includes fields like `id`, `title`, `brand_id`, `brand_name`, `brand_color`, `status`, `created_at`, `updated_at`, `created_by_name`, `template_name`, `current_step_name`, `assigned_to_name`, `assigned_to` (array for multi-assign).
*   `UserSessionData`: (for current user).

**UI Components Used (in Client Component):**

*   `@/components/button` (Button)
*   `@/components/card` (Card, CardContent, CardHeader, CardTitle, CardDescription)
*   `@/components/input` (Input)
*   `@/components/accordion` (Accordion, AccordionContent, AccordionItem, AccordionTrigger)
*   `@/components/alert-dialog` (AlertDialog and related components)
*   `@/components/dashboard/page-header` (PageHeader)
*   `@/components/brand-icon` (BrandIcon)
*   `lucide-react` (FileText, AlertTriangle, PlusCircle, Edit3, RefreshCw, CheckCircle, XCircle, ListFilter, Archive, Trash2 icons).
*   `next/link` (Link)
*   `next/navigation` (useSearchParams)
*   `sonner` (sonnerToast)
*   `date-fns` (formatDateFns for date formatting).
*   `@/lib/hooks/use-debounce` (useDebounce).

---

### 7.2. New Content Page (`src/app/dashboard/content/new/page.tsx`)

This page is for creating new content, likely using a template. It renders a `<ContentGeneratorForm />` which takes a `templateId` from the URL search parameters (e.g., `/dashboard/content/new?template=[template_id]`).

**Key Features:**

*   **Main Component (`NewContentPage`)**: Uses `<Suspense>` with a loading fallback.
*   **`PageContent` Component**:
    *   Fetches current user data from `/api/me` to check permissions.
    *   **Permission Check**: Allows access only if user role is 'admin' or 'editor'. Shows an "Access Denied" message otherwise.
    *   Displays loading skeletons while user data is being fetched.
    *   If allowed, renders `<ContentFormWithParams />`.
*   **`ContentFormWithParams` Component**:
    *   Uses `useSearchParams()` to get the `templateId` from the URL.
    *   Renders the `<ContentGeneratorForm templateId={templateId} />` component.
*   **Metadata**: `src/app/dashboard/content/new/metadata.ts` defines the page title and description.

**Core Functionality Component:**

*   `@/components/content/content-generator-form` (`ContentGeneratorForm`): This is the primary component responsible for the actual content generation form and logic. Its details would be documented if it were part of the `/dashboard` pages, but it resides in `src/components/`.

**Data Fetched:**

*   Current user session/details: `/api/me` (GET) - for permission checking.

**Permissions:**

*   Requires user to have 'admin' or 'editor' role.

**UI Components Used:**

*   `@/components/content/content-generator-form` (ContentGeneratorForm)
*   `@/components/skeleton` (Skeleton)
*   Uses `Suspense` and `useSearchParams` from Next.js/React.

---

### 7.3. View Content Detail Page (`src/app/dashboard/content/[id]/page.tsx`)

Displays the details of a specific content item, including its generated fields based on a template, and its approval workflow status and history.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Data Fetching**: On mount (if `id` is present):
    *   Fetches content details from `/api/content/[id]`.
    *   Fetches content versions/history from `/api/content/[id]/versions`.
    *   If `brand_id` exists on content, fetches brand details from `/api/brands/[brand_id]` for display.
    *   If `template_id` exists, fetches template details (including output fields) from `/api/content-templates/[template_id]` to render structured content.
    *   Fetches current user ID using Supabase auth client.
*   **Display Sections**:
    *   **Header**: Shows BrandIcon (if applicable), content title, and links to edit if the user is the current step owner (though `isCurrentUserStepOwner` is hardcoded to `false` when passed to workflow component).
    *   **Current Task Card**: If in a workflow, displays the name and description of the current workflow step.
    *   **Content Details Card**:
        *   Displays content status badge.
        *   **Generated Output Fields**: If a template is loaded and `content.content_data.generatedOutputs` exists, it iterates through `template.fields.outputFields` and displays each field's name and its value (rendered using `<MarkdownDisplay />`).
        *   The main `content.body` is commented out in favor of displaying structured output fields.
    *   **Content History & Feedback Card**: Lists versions of the content, showing step name, action status, reviewer, date, and feedback.
    *   **Workflow Management**: Renders `<ContentApprovalWorkflow />` component, passing content ID, title, current step object, versions, and an action handler. `isCurrentUserStepOwner` is passed as `false`.
*   **Navigation**: "Back to Content List" button and breadcrumbs.
*   **Error Handling**: Uses `notFound()` if content fetch returns 404. Shows toasts for other errors.

**Data Fetched:**

*   Specific content item: `/api/content/[id]` (GET).
*   Content versions: `/api/content/[id]/versions` (GET).
*   Associated brand details (if applicable): `/api/brands/[brand_id]` (GET).
*   Associated template details (if applicable): `/api/content-templates/[template_id]` (GET).
*   Current user ID: `supabase.auth.getUser()`.

**Interfaces Defined:**

*   `TemplateOutputField`, `TemplateFields`, `Template`.
*   `ContentData`: Includes `id`, `title`, `body`, `meta_title`, `meta_description`, `status`, brand details, template details, `content_data` (for structured outputs like `generatedOutputs`), `workflow_id`, `workflow`, `current_step`.
*   `ContentVersion`: Includes `id`, `workflow_step_identifier`, `step_name`, `version_number`, `action_status`, `feedback`, `reviewer` details, `created_at`.
*   `ContentDetailPageProps`: For `params.id`.

**UI Components Used:**

*   `@/components/button` (Button)
*   `@/components/card` (Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
*   `@/components/tabs` (Tabs, TabsContent, TabsList, TabsTrigger - though Tabs component usage seems removed from the main layout of this page, it's imported).
*   `@/components/content/markdown-display` (MarkdownDisplay)
*   `@/components/content/content-approval-workflow` (ContentApprovalWorkflow)
*   `@/components/dashboard/page-header` (PageHeader - imported but not directly used in the return statement, might be part of a sub-component or planned).
*   `@/components/brand-icon` (BrandIcon)
*   `lucide-react` (ArrowLeft, Edit3 icons).
*   `next/link` (Link)
*   `next/navigation` (notFound, usePathname, useRouter).
*   `sonner` (toast).
*   `date-fns` (formatDateFns).

---

### 7.4. Edit Content Page (`src/app/dashboard/content/[id]/edit/page.tsx`)

Allows authorized users to edit an existing content item, including its title and dynamically generated output fields based on its template. It also integrates with the content approval workflow.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Data Fetching**: On mount (if `id` and `currentUser.id` are present):
    *   Fetches current user data from `/api/me`.
    *   Fetches content details from `/api/content/[id]`.
    *   Fetches content versions from `/api/content/[id]/versions`.
    *   If `brand_id` exists on content, fetches brand details from `/api/brands/[brand_id]`.
    *   If `template_id` exists, fetches template details from `/api/content-templates/[template_id]` (includes `outputFields`).
    *   If workflow details are partial on content, fetches full workflow from `/api/workflows/[workflow_id]`.
*   **Permission Check**: 
    *   After user and content (with `brand_id`) are loaded, checks if the current user is a global admin or a brand admin/editor for the content's brand.
    *   Sets `isAllowedToEdit`. If not allowed, displays an "Access Denied" message.
*   **Form Structure**: 
    *   **Content Information Card**: 
        *   Input for `title`.
        *   Disabled inputs for Content Template and Brand.
    *   **Generated Output Fields Card**: If a template with output fields is loaded:
        *   Dynamically renders input fields for each `outputField` from the template (e.g., `Textarea` for `plainText`, `RichTextEditor` for `richText`).
        *   Values are stored in `content.content_data.generatedOutputs.[field.id]`.
        *   `handleGeneratedOutputChange` updates these dynamic fields.
*   **Workflow Management**: 
    *   Renders `<ContentApprovalWorkflow />` component.
    *   Passes a `performContentSave` prop which is a ref to the `handleSave` function, allowing the workflow component to trigger a save before performing a workflow action.
    *   `handleWorkflowActionCompletion` is called after a workflow action to redirect (e.g., to My Tasks).
*   **Saving**: `handleSave` function:
    *   Determines `primaryBodyFromOutputs` (uses the content of the first `richText` output field, or the first output field if no rich text, or existing `content.body` as fallback) to be saved as `body`.
    *   Constructs payload with `title`, derived `body`, `status`, and `content_data` (including `generatedOutputs`).
    *   Sends PUT request to `/api/content/[id]`.
    *   Updates local content state on success.
*   **Navigation**: Back button, "View Content (Read-only)" button, "Cancel" button.
*   **Breadcrumbs & Page Header**: Standard navigation elements.
*   **Loading/Error States**: Shows skeletons during loading, and specific messages for user errors or access denial.

**Data Fetched:**

*   Current user: `/api/me` (GET).
*   Specific content item: `/api/content/[id]` (GET).
*   Content versions: `/api/content/[id]/versions` (GET).
*   Associated brand details (if applicable): `/api/brands/[brand_id]` (GET).
*   Associated template details: `/api/content-templates/[template_id]` (GET).
*   Full workflow details (if needed): `/api/workflows/[workflow_id]` (GET).

**Data Submitted:**

*   Updated content: `/api/content/[id]` (PUT) with `{ title, body, status, content_data }`.

**Interfaces Defined:**

*   `ContentEditPageProps`, `ContentState`, `UserSessionData`, `ContentVersion`, `TemplateOutputField`, `TemplateFields`, `Template`.

**UI Components Used (Selected):**

*   `@/components/button`, `card`, `input`, `label`, `textarea`, `tabs`, `skeleton`.
*   `@/components/content/rich-text-editor` (RichTextEditor).
*   `@/components/content/content-approval-workflow` (ContentApprovalWorkflow).
*   `@/components/dashboard/page-header` (PageHeader).
*   `@/components/brand-icon` (BrandIcon).
*   `lucide-react` (ArrowLeft, Loader2, ShieldAlert, XCircle, Edit3 icons).
*   `next/link`, `next/navigation`.
*   `sonner` (toast).
*   `date-fns` (formatDateFns).

---

## 8. Feedback Section (`src/app/dashboard/feedback`)

This section is for viewing and submitting user feedback.

### 8.1. View Feedback Page (`src/app/dashboard/feedback/page.tsx`)

Displays a list of logged feedback items (bugs, enhancements) and provides a way to submit new feedback through a modal.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Authentication**: Checks for Supabase session. If no session, displays an "Authentication Required" message (currently doesn't auto-redirect).
*   **Data Fetching**: Fetches feedback items from `/api/feedback` with pagination, sorting, and filtering parameters (`type`, `priority`, `status`).
    *   Manages loading states (`isLoadingUser`, `isLoadingItems`) and error state (`error`).
*   **Display**: Lists feedback items in a `Table` with columns: Title, Type, Priority, Status, Affected Area, Reported Date.
*   **Filtering & Search**:
    *   **Filters**: Select dropdowns for Type, Priority, Status.
    *   **Search**: Input field for `searchTerm` (applied client-side on the currently fetched page of items).
    *   "Clear Filters" button.
*   **Pagination**: Client-side pagination controls (Previous/Next buttons, Page X of Y display).
*   **Submit New Feedback Modal**:
    *   "Submit New Feedback" button opens a `Dialog`.
    *   Renders the `<FeedbackSubmitForm />` component inside the modal.
    *   Passes `supabase` client and `currentUser` to the form.
    *   On successful submission via the form, it re-fetches feedback items and closes the modal.
*   **Page Header**: Displays title "Feedback & Known Issues".
*   **Error/Empty States**: Provides UI feedback for loading, errors, or no items found.

**Data Fetched:**

*   User session: `supabaseClient.auth.getSession()` and `onAuthStateChange`.
*   Feedback items: `/api/feedback` (GET, with query params for pagination, sorting, and filtering).

**Data Submitted (via Modal Form):**

*   New feedback item: (Handled by `<FeedbackSubmitForm />`, which likely POSTs to `/api/feedback`).

**Interfaces Defined:**

*   `FeedbackType`, `FeedbackPriority`, `FeedbackStatus` (enums/unions).
*   `FeedbackItem`: Structure for displayed feedback items, including `created_by_profile` details.
*   `Filters`: `type`, `priority`, `status`, `searchTerm`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardHeader, CardTitle)
*   `@/components/ui/table` (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/ui/progress` (Progress)
*   `@/components/dialog` (Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger)
*   `@/components/feedback/FeedbackSubmitForm` (FeedbackSubmitForm)
*   `lucide-react` (ArrowLeft, Loader2, AlertTriangle, Search, ListFilter, Info, FilePlus2 icons).
*   `next/navigation` (useRouter).
*   `sonner` (toast).

---

### 8.2. View Feedback Detail Page (`src/app/dashboard/feedback/[id]/page.tsx`)

Displays detailed information for a specific feedback item, identified by `id` from URL params.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Data Fetching**: On mount (if `feedbackId` is present):
    *   Fetches the specific feedback item details from `/api/feedback/[feedbackId]`.
    *   Fetches current user data using Supabase client to determine if the user is an admin (`isAdmin` state).
    *   Manages loading (`isLoading`) and error (`error`) states.
*   **Display**: 
    *   Uses a custom `DetailItem` component to render labeled data points with optional icons.
    *   Sections are organized using a custom `SectionTitle` component.
    *   **Overview**: Title, Description, Type (with icon), Priority (with icon and color), Status (with `Badge`).
    *   **Web & System Context**: URL (linkable), Affected Area, Application Version, User Impact/Context.
    *   **Bug Specifics** (only if type is 'bug'): Browser Info, OS Info, Steps to Reproduce, Expected Behavior, Actual Behavior.
    *   **Resolution**: Resolution Details.
*   **Admin Action**: If `isAdmin` is true, an "Edit" button is shown, linking to `/dashboard/feedback/[id]/edit`.
*   **Navigation**: "Go Back to Log" button (links to `/dashboard/admin/feedback-log` - note: might be inconsistent if this page is also for non-admins) and breadcrumbs.
*   **Error Handling**: Shows error messages if feedback ID is missing, or if fetching fails. Handles 404 for item not found.

**Data Fetched:**

*   Specific feedback item: `/api/feedback/[feedbackId]` (GET).
*   Current user (for admin check): `supabaseClient.auth.getUser()`.

**Interfaces Defined:**

*   `FeedbackType`, `FeedbackPriority`, `FeedbackStatus` (enums/unions).
*   `FeedbackItem`: Detailed structure for a single feedback item, including fields like `url`, `browser_info`, `os_info`, `steps_to_reproduce`, etc.
*   `BreadcrumbItemDef`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent)
*   `@/components/ui/badge` (Badge)
*   `lucide-react` (ArrowLeft, Loader2, AlertTriangle, UserCircle, Tag, List, MessageSquare, CheckSquare, AlertCircle, ClipboardEdit, CheckCircle2, LinkIcon, Globe, Monitor, FileText, LayoutGrid, Bug, Puzzle, Edit3, ChevronRight icons).
*   `next/link` (Link)
*   `next/navigation` (useParams, useRouter).
*   `sonner` (toast).
*   Custom `DetailItem` and `SectionTitle` components for structured display.

---

### 8.3. Edit Feedback Item Page (`src/app/dashboard/feedback/[id]/edit/page.tsx`)

Allows administrators to edit the details of an existing feedback item.

**Key Features:**

*   **Client-Side Component**: `'use client'`.
*   **Admin-Only Access**: Fetches current user via Supabase client and checks if their role is 'admin'. If not, redirects to the view page for the feedback item with an error toast.
*   **Data Fetching**: If admin and `feedbackId` is present, fetches the specific feedback item from the `feedback_items` table using Supabase client.
    *   Populates `formState` with all editable fields.
    *   Manages loading states (`isLoadingUser`, `isFetchingItem`, `isSubmitting`).
*   **Form Structure**: Single `Card` with a two-column layout for most fields.
    *   **Fields**: Title (req), Description (req), Type (req), Priority (req), Status (req), App Version, URL, Affected Area, Steps to Reproduce, Expected Behavior, Actual Behavior, User Impact Details, Resolution Details/Admin Notes.
    *   Browser Info and OS Info fields seem to be missing from this edit form, though they are part of `FeedbackFormState` and present in the submission form.
*   **Submission**: `handleSubmit` function:
    *   Validates required fields.
    *   Sends an `update` operation to the `feedback_items` table via Supabase client, setting all fields from `formState` plus `updated_at` and `updated_by` (current user ID).
    *   On success, shows toast and redirects to the view page for the feedback item (`/dashboard/feedback/[id]`).
*   **Navigation**: "Cancel and View Item" button (XCircle icon) and "Cancel" button in footer. Breadcrumbs are present.
*   **Error Handling**: Handles missing feedback ID, non-admin access, and fetch/update errors.

**Data Fetched:**

*   Current user details (for admin check): `supabaseClient.auth.getUser()`.
*   Specific feedback item: `supabase.from('feedback_items').select('*').eq('id', feedbackId).single()`.

**Data Submitted:**

*   Updated feedback item: `supabase.from('feedback_items').update({ ... }).eq('id', feedbackId)`.

**Interfaces Defined:**

*   `FeedbackType`, `FeedbackPriority`, `FeedbackStatus` (enums/unions).
*   `FeedbackFormState`: Includes all editable fields for a feedback item.
*   `BreadcrumbItemDef`.

**UI Components Used:**

*   `@/components/ui/button` (Button)
*   `@/components/ui/card` (Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter)
*   `@/components/ui/input` (Input)
*   `@/components/ui/label` (Label)
*   `@/components/ui/textarea` (Textarea)
*   `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue)
*   `lucide-react` (ArrowLeft, Loader2, AlertTriangle, Save, XCircle, ChevronRight icons).
*   `next/link` (Link).
*   `next/navigation` (useParams, useRouter).
*   `sonner` (toast).

---
