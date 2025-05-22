# Claims Management Feature Documentation

## 1. Introduction

The Claims Management system allows brand teams to define, manage, and preview claims associated with their brands, products, and ingredients. This system supports **Master (Global)** claims and **Market-specific** claims, enabling fine-grained control over marketing assertions. Markets can adopt, block, or override Master claims.

The core objectives are:
- To provide a centralized repository for all marketing claims.
- To ensure products are associated with accurate and approved claims based on their ingredients and market context.
- To allow users to preview the complete set of *effective* claims applicable to a specific product in a given market.
- To provide AI-driven assistance for analyzing and simplifying claim sets.

## 2. Database Schema

The following tables support the Claims Management feature.

### `products` Table
Stores information about individual products.

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    global_brand_id UUID NOT NULL REFERENCES global_claim_brands(id) ON DELETE CASCADE, -- Changed from brand_id to global_brand_id
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (global_brand_id, name) -- A product name should be unique within a brand
);

COMMENT ON TABLE products IS 'Stores information about individual products, linked to a global_claim_brand.';
COMMENT ON COLUMN products.global_brand_id IS 'Foreign key referencing the global_claim_brand this product belongs to.';
```

### `ingredients` Table
Stores information about ingredients that can be part of products.

```sql
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ingredients IS 'Stores information about ingredients that can be used in products.';
```

### `product_ingredients` Table
A join table to establish a many-to-many relationship between products and ingredients.

```sql
CREATE TABLE product_ingredients (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, ingredient_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE product_ingredients IS 'Join table linking products to their ingredients.';
```
### `global_claim_brands` Table
(This table was pre-existing but is central to brand-level claims, replacing a generic `brands` table reference in earlier drafts of this document for claims).
```sql
CREATE TABLE global_claim_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    -- other brand-related fields as they exist...
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE global_claim_brands IS 'Stores global brand entities for claims management.';
```

### Integrating Claims Brands with Main MixerAI Brands
To enable more granular permission management and align claims with the overall brand structure in MixerAI, the `global_claim_brands` table will be linked to the main `brands` table.

```sql
ALTER TABLE global_claim_brands
ADD COLUMN mixerai_brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

COMMENT ON COLUMN global_claim_brands.mixerai_brand_id IS 'Foreign key linking to the main MixerAI brands table. Enables permissions based on main brand ownership and cascades deletes.';
```
This integration means:
- **Permissions**: User permissions to manage claims for a `global_claim_brands` entry can be derived from their permissions on the linked `brands` entry. For instance, a user who is an admin for "Haagen-Dazs" in the main `brands` table would implicitly have rights to manage "Haagen-Dazs" claims.
- **Cascade Deletes**: If a brand is deleted from the main `brands` table, any associated `global_claim_brands` entry will also be deleted, which in turn will cascade to all related `claims`, `products`, and `market_claim_overrides` linked to that `global_claim_brands` entry. This ensures data integrity.
- **UI Adjustments**:
    - When creating or editing a `global_claim_brands` entry (e.g., in an admin interface for claims setup), there should be a mechanism to select and link to an existing brand from the main `brands` table.
    - The display of claims brands should ideally also show the linked MixerAI main brand name for clarity.
    - The UI for managing user permissions for claims might need to be reviewed to leverage this link (e.g., showing users who have access via the main brand).

### `claims` Table
Stores the actual claims, their type, level (brand, product, ingredient), and country specificity (Master/Global or Market).

```sql
-- Define ENUM types for claim_type and claim_level if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_type_enum') THEN
        CREATE TYPE claim_type_enum AS ENUM ('allowed', 'disallowed', 'mandatory');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_level_enum') THEN
        CREATE TYPE claim_level_enum AS ENUM ('brand', 'product', 'ingredient');
    END IF;
END$$;

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_text TEXT NOT NULL,
    claim_type claim_type_enum NOT NULL,
    level claim_level_enum NOT NULL,
    -- References to specific entities based on level
    global_brand_id UUID REFERENCES global_claim_brands(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 country code (e.g., 'GB', 'US'). Use '__GLOBAL__' for Master claims.
    description TEXT, -- Optional notes or context for the claim
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_claim_level_reference CHECK (
        (level = 'brand' AND global_brand_id IS NOT NULL AND product_id IS NULL AND ingredient_id IS NULL) OR
        (level = 'product' AND product_id IS NOT NULL AND global_brand_id IS NULL AND ingredient_id IS NULL) OR
        (level = 'ingredient' AND ingredient_id IS NOT NULL AND global_brand_id IS NULL AND product_id IS NULL)
    ),
    -- A claim text should be unique for its specific association and context to avoid contradictory direct definitions.
    -- More complex uniqueness (e.g. only one 'allowed' and one 'disallowed' for the same text) is handled by application logic/user process.
    UNIQUE (claim_text, level, global_brand_id, product_id, ingredient_id, country_code, claim_type) 
);

COMMENT ON TABLE claims IS 'Stores marketing claims related to brands, products, or ingredients.';
COMMENT ON COLUMN claims.claim_type IS 'Type of claim (allowed, disallowed, mandatory).';
COMMENT ON COLUMN claims.level IS 'The level at which the claim applies (brand, product, or ingredient).';
COMMENT ON COLUMN claims.global_brand_id IS 'FK to global_claim_brands if claim is at brand level.';
COMMENT ON COLUMN claims.product_id IS 'FK to products table if claim is at product level.';
COMMENT ON COLUMN claims.ingredient_id IS 'FK to ingredients table if claim is at ingredient level.';
COMMENT ON COLUMN claims.country_code IS 'ISO 3166-1 alpha-2 country code for Market-specific claims. Use ''__GLOBAL__'' for Master claims.';
COMMENT ON COLUMN claims.description IS 'Optional internal notes or context about the claim.';
COMMENT ON COLUMN claims.created_by IS 'User who created the claim.';
```

### `market_claim_overrides` Table
Records explicit market decisions to block a Master claim or replace it with a market-specific one for a given product context.

```sql
CREATE TABLE market_claim_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE, -- FK to the original Master claim being overridden
    market_country_code TEXT NOT NULL, -- e.g., 'GB', 'US'; The market making the override
    target_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, -- The product context for which this override applies in the market
    
    is_blocked BOOLEAN NOT NULL DEFAULT true, -- True if master claim is simply blocked for this product in this market
    replacement_claim_id UUID REFERENCES claims(id) ON DELETE SET NULL, -- FK to a new market-specific claim in the 'claims' table if provided
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_master_claim_is_global CHECK (
        (SELECT country_code FROM claims WHERE id = master_claim_id) = '__GLOBAL__'
    ),
    CONSTRAINT chk_replacement_claim_is_market CHECK (
        replacement_claim_id IS NULL OR 
        ((SELECT country_code FROM claims WHERE id = replacement_claim_id) = market_country_code)
    ),
    UNIQUE (master_claim_id, market_country_code, target_product_id) -- Ensures one override rule per master claim per market per product context
);

COMMENT ON TABLE market_claim_overrides IS 'Records when a Master claim is specifically blocked or replaced by a market for a product.';
COMMENT ON COLUMN market_claim_overrides.master_claim_id IS 'The Master claim (country_code = ''__GLOBAL__'') being overridden.';
COMMENT ON COLUMN market_claim_overrides.market_country_code IS 'The market (country) making this override decision.';
COMMENT ON COLUMN market_claim_overrides.target_product_id IS 'The product context for which this override is effective in the market.';
COMMENT ON COLUMN market_claim_overrides.is_blocked IS 'If true, the master_claim_id is blocked for this product in this market.';
COMMENT ON COLUMN market_claim_overrides.replacement_claim_id IS 'If provided, this market-specific claim (from `claims` table) replaces the master_claim_id.';
COMMENT ON COLUMN market_claim_overrides.created_by IS 'User who actioned the override.';
```

## 3. Claim Hierarchy and Logic

Claims are aggregated to determine the final "effective" set for a specific product when viewed in the context of a specific market.

### Claim Categories:
1.  **Master Claims**: Default claims applicable globally.
    - Stored in `claims` table with `country_code = '__GLOBAL__'`.
    - Can be at `brand`, `product`, or `ingredient` level.
2.  **Market Claims**: Claims specific to a particular market (country).
    - Stored in `claims` table with `country_code` set to an ISO 3166-1 alpha-2 code (e.g., 'GB', 'US').
    - Can be at `brand`, `product`, or `ingredient` level.
    - These can be new claims unique to the market, or explicit replacements for Master claims.

### Precedence Order for a Given Claim Text:
When determining the effective `claim_type` (allowed, disallowed, mandatory) for a specific `claim_text` related to a product in a market, the following strict order of precedence applies. The first claim found in this list for the given text determines its status:

1.  **Market Product Claim**: A claim specific to the `product_id` and the `market_country_code`.
2.  **Market Ingredient Claim**: Claims specific to any of the product's `ingredient_id`s and the `market_country_code`. (If multiple ingredients have conflicting market claims for the same text, specific business rules for ingredient claim conflict resolution might be needed; typically, the most restrictive like 'disallowed' might win, or this scenario needs to be avoided by careful data entry).
3.  **Market Brand Claim**: A claim specific to the product's `global_brand_id` and the `market_country_code`.
4.  **Master Product Claim**: A claim specific to the `product_id` with `country_code = '__GLOBAL__'`, *UNLESS* this Master Product Claim is explicitly blocked or replaced for the `target_product_id` in the `market_country_code` by an entry in `market_claim_overrides`.
5.  **Master Ingredient Claim**: Claims specific to any of the product's `ingredient_id`s with `country_code = '__GLOBAL__'`, *UNLESS* this Master Ingredient Claim is explicitly blocked/replaced for the `target_product_id` (implying context via its ingredient) in the `market_country_code`. (Logic needed in `market_claim_overrides` or its usage to map ingredient-level master claim blocks to a product context).
6.  **Master Brand Claim**: A claim specific to the product's `global_brand_id` with `country_code = '__GLOBAL__'`, *UNLESS* this Master Brand Claim is explicitly blocked/replaced for the `target_product_id` (implying context via its brand) in the `market_country_code`.

### Market Overrides of Master Claims:
Markets can interact with Master claims for a specific product context in the following ways using the `market_claim_overrides` table:
1.  **Block**: A Master claim can be marked as `is_blocked = true` for a `target_product_id` in a `market_country_code`. This Master claim will not apply to that product in that market.
2.  **Replace**: A Master claim can be blocked, and a `replacement_claim_id` (pointing to a Market Claim in the `claims` table) can be provided. This Market Claim then takes effect instead of the Master Claim for that product in that market (subject to still being overridden by a higher-precedence market claim as per the list above).
Markets can later **remove a block** (deleting the `market_claim_overrides` entry) or **update/change the replacement claim**.

### Stacking Logic Summary (`getStackedClaimsForProduct` utility):
The core utility function responsible for determining the applicable claims for a `productId` and `targetCountryCode` must:
1.  Fetch all direct Market claims (Product, Ingredient, Brand) for the `targetCountryCode`.
2.  Fetch all Master claims (Product, Ingredient, Brand) i.e. `country_code = '__GLOBAL__'`.
3.  Consult the `market_claim_overrides` table for the `targetCountryCode` and `productId` context to identify:
    *   Master claims that are explicitly blocked (remove them from consideration).
    *   Master claims that are replaced (swap the Master claim with its specified Market replacement claim).
4.  Consolidate the remaining Master claims and all direct Market claims.
5.  For each unique `claim_text` found, apply the precedence order (Market Product > Market Ingredient > Market Brand > Effective Master Product > Effective Master Ingredient > Effective Master Brand) to determine the single, final `claim_type`.
6.  The output should be a list of these final effective claims (each with its text, determined type, and source/reason for its final status).

## 4. UI Flow & Functionality (Updated)

A "Claims Management" section in the dashboard.

### A. Managing Core Entities (Products, Ingredients, Global Claim Brands):
- CRUD operations for Products, Ingredients, Global Claim Brands (as currently implemented or planned).
- Associating ingredients with products.

### B. Defining and Managing Claims (`claims` table):
- A UI to list, create, and edit claims (both Master and Market-specific).
- Fields will include:
    - `claim_text`: The textual content of the claim.
    - `claim_type`: (e.g., 'allowed', 'disallowed', 'mandatory').
    - `level`: (Brand, Product, Ingredient).
    - Associated entity ID: 
        - `global_brand_id` (if level is Brand).
        - `product_id`(s): If level is Product, users should be able to select **multiple applicable products using checkboxes** from a list filtered by the relevant brand context.
        - `ingredient_id` (if level is Ingredient).
    - `country_code`(s): Users should be able to select **multiple applicable countries/markets (including "__GLOBAL__" for Master claims) using checkboxes**.
    - `description`: Optional notes or context.
- The backend will handle creating multiple claim records if multiple products or multiple country codes are selected for a single claim definition event. For example, if a user defines one claim text and applies it to 3 products and 2 markets, this would result in 3 * 2 = 6 individual claim entries in the `claims` table, each linking to one product and one market.

### C. Claims Preview & Matrix Page (Potentially a new, dedicated page):
- **Inputs**:
    - Dropdown to select a Market (Country). Default could be "Master View" (`__GLOBAL__`).
- **Display Options (Toggles/Filters)**:
    - Checkboxes to filter the view to show claims originating from: Brand Level, Ingredient Level, Product Level.
- **Matrix View**:
    - **Rows**: Products.
    - **Columns**: Unique effective Claim Texts applicable in the selected Market context based on active filters.
    - **Cells**: Show the final effective status (Allowed, Disallowed, Mandatory, N/A) of a claim text for a product.
        - Clicking a cell representing a Master Claim should allow a Market user to:
            1.  **Block** the Master Claim for that product in that market.
            2.  **Block and Replace** with a new/existing Market-specific claim for that product.
        - Clicking a cell representing an active Block/Override should allow:
            1.  **Unblock** (remove the override, Master claim becomes active again subject to hierarchy).
            2.  **Edit Replacement Claim** (if one exists).
            3.  **Change/Remove Replacement**.
- **Detailed Stacked View (current preview functionality, possibly alongside/drill-down from matrix)**:
    - For a selected Product and Market, show the detailed list of all claims contributing to the final effective status, indicating their origin (Master/Market, Brand/Product/Ingredient) and how overrides/blocks were applied.
- **AI-Simplified List of Effective Claims**:
    - A button ("Get AI-Simplified Summary") to take the *final effective claims list* for the current view (e.g., for a product in a market, or for the entire matrix context) and send it to an AI service to get a condensed, human-readable summary.

## 5. AI-Powered Review and Assistance (As previously defined, now acting on refined claim logic)

### A. Preview-Time AI Analysis (for Detailed Stacked View)
- Analyzes the *final effective claims stack* for a single product/market.
- Identifies potential conflicts, redundancies, or ambiguities *within that effective set*.
- Generates textual summary and suggestions.

### B. Brand-Wide AI Claims Review
- Analyzes *all effective claims* (after applying Master/Market logic and overrides) across all products of a brand for a *specific market context* or for the *Master set*.
- Generates a comprehensive report.

## 6. Current Development Learnings & Status (as of this update)

- **API & Frontend for Matrix**:
    - An API endpoint (`/api/claims/matrix`) has been created. It fetches all products and, for each, calls `getStackedClaimsForProduct` to determine claim statuses for a given `countryCode`.
    - It structures data with products as rows and claim texts as columns (pivoted view).
    - The frontend page (`/dashboard/claims/preview`) renders this matrix.
- **Key Challenge Identified**: The current `getStackedClaimsForProduct` and the matrix API do NOT yet account for the new `market_claim_overrides` table or the refined Master/Market precedence and blocking logic. This is the next major refactoring area.
- **UI for Blocking/Overrides**: The UI for users to interact with the matrix cells to block/override claims is not yet implemented.
- **Original schema for `products` linked to `brands(id)`. This documentation now reflects `products` linking to `global_claim_brands` for consistency with how brand-level claims are likely managed via a central "global brands" concept.** Ensure database and code align with `global_claim_brands` for product parentage if this is the intended final structure. If `brands` is a different concept, adjust accordingly. For this document, `global_claim_brands` is assumed for brand-level claims and product parentage.
- **User Authentication & Types**: The `withAuth` HOC is used. The specific `User` type from the auth library should be used in API route handlers instead of `any` for better type safety.

## 7. Future Considerations
- (As previously defined: Advanced Conflict Rules, Versioning, Permissions, Bulk Import/Export)

## 8. Phased Implementation Plan (Revised based on new requirements)

This revised plan aims to build the Claims Management feature incrementally, ensuring foundational elements are in place before adding complexity.

**Phase 1: Foundation - Database & Core Entities**
1.  **Database Schema Finalisation & Migration**:
    *   Create/update all necessary tables as defined in Section 2 ("Database Schema"):
        *   `products`
        *   `ingredients`
        *   `product_ingredients`
        *   `global_claim_brands` (including `mixerai_brand_id` FK to `brands` table with `ON DELETE CASCADE`)
        *   `claims` (with ENUM types `claim_type_enum`, `claim_level_enum`)
        *   `market_claim_overrides`
    *   Run migrations to implement the schema.
2.  **Basic CRUD APIs & UI for Core Entities**:
    *   Develop API endpoints (POST, GET, PUT, DELETE) for:
        *   Products (`/api/products`, `/api/products/[id]`)
        *   Ingredients (`/api/ingredients`, `/api/ingredients/[id]`)
        *   Global Claim Brands (`/api/global-claim-brands`, `/api/global-claim-brands/[id]`)
            *   UI for linking to main MixerAI `brands`.
        *   Product-Ingredient Associations.
    *   Implement basic UI forms/tables in the dashboard for managing these entities.
3.  **Claims Definition API & UI (Initial Version)**:
    *   Develop API endpoints for creating, reading, updating, and deleting claims (`/api/claims`, `/api/claims/[id]`).
    *   Implement the UI for defining claims with fields for:
        *   `claim_text`, `claim_type`, `level`.
        *   Associated entity: `global_brand_id`, `ingredient_id`.
        *   **Multi-select checkboxes for `product_id`(s)** when `level` is 'Product'.
        *   **Multi-select checkboxes for `country_code`(s)** (including '__GLOBAL__').
        *   `description`.
    *   Backend logic to create multiple claim entries if multiple products/countries are selected.

**Phase 2: Core Claim Logic & Basic Preview**
1.  **Develop `getStackedClaimsForProduct` Utility**:
    *   Implement the core logic in `src/lib/claims-utils.ts` as detailed in Section 3 ("Claim Hierarchy and Logic"). This includes:
        *   Fetching Master and Market claims.
        *   Querying and integrating `market_claim_overrides` to identify blocked/replaced Master claims.
        *   Applying the full precedence order to determine the single effective `claim_type` for each `claim_text`.
2.  **Single Product Stacked Claims Preview API & UI**:
    *   Create an API endpoint (e.g., `/api/claims/preview/product-stack`) that takes `productId` and `targetCountryCode` and uses `getStackedClaimsForProduct` to return the detailed list of effective claims and their resolution path.
    *   Update the existing "Claims Preview" page UI (or a dedicated section) to display this detailed stacked view for a selected product and market, clearly showing origins and overrides.

**Phase 3: Claims Matrix View (Read-Only)**
1.  **Develop Claims Matrix API (`/api/claims/matrix`)**:
    *   This API should take `targetCountryCode` (and potentially filters for brands/products).
    *   It will iterate through relevant products, calling the (now robust) `getStackedClaimsForProduct` for each.
    *   Aggregate data to fit the pivoted matrix structure: products as rows, unique claim texts as columns, and cells showing the final effective status.
2.  **Implement Read-Only Matrix View UI**:
    *   Display the matrix on the "Claims Preview" page or a new dedicated matrix page.
    *   Users can select a market to view the corresponding matrix.
    *   Include filters (e.g., by brand, product level, ingredient level).
    *   Cells should clearly display the claim status (Allowed, Disallowed, Mandatory, N/A) using text and icons.

**Phase 4: Interactive Matrix - Market Overrides Management**
1.  **Market Override Management APIs**:
    *   Develop API endpoints for managing `market_claim_overrides` records:
        *   `POST /api/market-overrides` (to create a block or block-and-replace)
        *   `PUT /api/market-overrides/[override_id]` (to edit a replacement or change block status)
        *   `DELETE /api/market-overrides/[override_id]` (to remove an override/unblock)
2.  **Implement UI for Blocking/Overrides in Matrix View**:
    *   Make matrix cells interactive. Clicking a cell representing a Master Claim (for a specific product/market) should allow users (with appropriate permissions) to:
        *   Block the Master Claim.
        *   Block and provide/select a Market-specific replacement claim.
    *   Clicking a cell with an active override should allow:
        *   Unblocking the Master Claim.
        *   Editing/Changing/Removing the replacement claim.
    *   This will involve modals/dialogs for these actions.
    *   The matrix view must dynamically update upon these changes (or re-fetch data).
3.  **"Edit Claim" UI for Replacement Claims**:
    *   Ensure the general claim editing UI can be used effectively for managing the market-specific claims designated as replacements.

**Phase 5: AI-Powered Features**
1.  **AI-Powered Replacement Claim Suggestions & Simplified List of Effective Claims**:
    *   **AI-Powered Replacement Claim Suggestions (Completed)**:
        *   An API endpoint (`/api/ai/suggest-replacement-claims`) has been created.
        *   This endpoint is integrated into the Claims Matrix UI's "Block and Replace" modal to suggest market-specific replacements for global claims.
    *   **AI-Simplified List of Effective Claims (Pending)**:
        *   Create an API endpoint that takes a list of final effective claims (e.g., from `getStackedClaimsForProduct` for a specific context) and sends it to the AI service for simplification.
        *   Add a button in the UI (e.g., on the single product stacked preview, or related to the matrix) to trigger this and display the AI-generated summary.
2.  **Preview-Time AI Analysis (Detailed Stacked View) (Pending)**:
    *   Integrate AI analysis into the single product stacked view to analyze the *final effective claims stack* and provide insights on conflicts, redundancies, etc.
3.  **Brand-Wide AI Claims Review (using effective claims) (Pending)**:
    *   Refine/implement the `/api/ai/brands/[brandId]/review-all-claims` endpoint.
    *   This endpoint should first determine the *effective claims* for all products of a brand (in a chosen market or master context) using the `getStackedClaimsForProduct` logic, then send this comprehensive effective set to the AI for review.

**Phase 6: Testing, Refinement, User Permissions & Documentation**
1.  **Thorough End-to-End Testing**: Test all functionalities across different user roles and scenarios.
2.  **User Permissions**: Implement and test granular user permissions for managing claims, overrides, and accessing different views, leveraging the `mixerai_brand_id` link where appropriate.
3.  **Performance Optimization**: Identify and address any performance bottlenecks, especially in the matrix generation and `getStackedClaimsForProduct` utility.
4.  **UI/UX Refinement**: Gather user feedback and make necessary adjustments.
5.  **Finalise all Documentation**: Update `CLAIMS_MANAGEMENT.md` and any other relevant documents to reflect the final implementation.

This phased approach should help manage complexity and deliver a robust Claims Management feature. 