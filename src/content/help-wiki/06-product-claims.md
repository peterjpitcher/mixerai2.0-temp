# Product Claims Management

MixerAI 2.0 provides a comprehensive system for managing product claims across different markets and regulatory environments. This allows you to define master claims, create market-specific variations, and ensure compliance.

## Key Concepts

Understanding these terms is crucial for effectively using the Product Claims features:

*   **Master Claims**: These are foundational claims defined at a central level. They represent the core messaging for a product or ingredient. You manage these under "Claim Brands" (previously Master Claim Brands).
*   **Market Claims**: These are claims specific to a particular country or market. They can be variations of Master Claims or entirely new claims tailored to local regulations and consumer understanding.
*   **Claim Levels**: Claims can be associated with different levels in your product hierarchy:
    *   **Brand Level**: General claims applicable to an entire MixerAI Brand (linked via a "Claim Brand").
    *   **Product Level**: Claims specific to individual products.
    *   **Ingredient Level**: Claims related to specific ingredients within products.
*   **Claim Stacking & Precedence**: When determining the final, effective claims for a product in a specific market, a "stacking" logic applies:
    *   **Specificity Wins**: Product-level claims take precedence over Ingredient-level claims, which in turn take precedence over Brand-level claims.
    *   **Market Wins**: Claims specific to a country override global (All Countries) claims.
    *   **Disallowed Overrides Allowed**: A "Disallowed" claim will always override an "Allowed" claim if they are at the same or higher level of precedence for the given market.
*   **"All Countries" Scope**: A special market scope used to define claims that are generally applicable unless a more specific country override exists.

## Core Features & UI Navigation

### 1. Claims Matrix (Preview)
*   **Navigation**: `Dashboard > Product Claims > Claims Matrix` (typically linked from `/dashboard/claims/preview`)
*   **Purpose**: This is the central hub for viewing the "stacked" or effective claims for all your products across various markets. It shows you exactly what claim will apply to a product in a selected country.
*   **Functionality**:
    *   Select products and markets to view their claim status.
    *   Identify master claims and any market-specific overrides.
    *   Initiate market overrides (block a master claim or replace it).

### 2. Defining Claims
*   **Navigation**: `Dashboard > Product Claims > Define Claims` (typically linked from `/dashboard/claims/definitions`)
*   **Purpose**: Create and manage both Master Claims and Market-Specific claims.
*   **Functionality**:
    *   Specify claim text, type (Allowed, Disallowed, Mandatory), level (Brand, Product, Ingredient), and associated entities (products, ingredients, claim brands).
    *   Assign claims to specific markets (countries) or "All Countries".

### 3. Managing Core Entities
To support the claims system, you'll also manage:
*   **Claim Brands**: `Dashboard > Product Claims > Claim Brands` (previously Master Claim Brands). These group master claims, often linked to a primary MixerAI Brand.
*   **Products**: `Dashboard > Product Claims > Products`. Define your product catalog.
*   **Ingredients**: `Dashboard > Product Claims > Ingredients`. Manage the list of ingredients used in your products.

### 4. Market Overrides
*   **Navigation**: `Dashboard > Product Claims > Market Overrides`. You can view and manage existing overrides here, though overrides are typically created via the Claims Matrix.
*   **Purpose**: To explicitly change how a Master Claim applies to a specific product in a particular market.
*   **Actions**:
    *   **Block**: Prevent a Master Claim from applying.
    *   **Block and Replace**: Prevent a Master Claim and select an existing Market Claim as its replacement.

### 5. AI-Powered Replacement Claim Suggestions
*   **Context**: When creating a "Block and Replace" market override via the Claims Matrix.
*   **Functionality**: An "Get AI Suggestions" button appears in the override modal.
    *   The system sends the master claim text, product details, brand context, and target market to an AI.
    *   The AI suggests suitable replacement claims, along with reasoning.
    *   This helps you quickly find or formulate compliant and contextually appropriate claims. The AI suggestions are for guidance; you still select or create the final replacement claim.

## General Workflow
1.  Define your **Products**, **Ingredients**, and **Claim Brands**.
2.  Create **Master Claims** under `Define Claims`, associating them with the relevant Claim Brands, Products, or Ingredients and setting their scope (e.g., "All Countries").
3.  Use the **Claims Matrix** to review how these Master Claims apply across different products and markets.
4.  If a Master Claim is unsuitable for a specific product in a specific market, create a **Market Override** directly from the Matrix.
    *   You might block it entirely.
    *   Or, block it and replace it with an existing Market Claim (which you might have created in `Define Claims`) or use AI suggestions to help you choose/create a suitable replacement.

By leveraging these tools, you can maintain a clear, compliant, and effective claims strategy for your products globally. 