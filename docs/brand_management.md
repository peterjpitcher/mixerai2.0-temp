# Brand Management in MixerAI 2.0

This document details the features and functionalities related to managing brands within the MixerAI 2.0 application.

## Overview

Brands are central entities in MixerAI 2.0, representing the clients or products for whom content is created. Effective brand management ensures that all AI-generated content aligns with specific brand identities, tone of voice, and market requirements.

Key features of brand management include creating and editing brand profiles, AI-powered brand identity generation, managing content vetting agencies, and visual customization like brand colors and icons.

## Brand Pages and UI

Significant effort has been made to provide a comprehensive and user-friendly interface for brand management.

### Brand Page Fixes & Enhancements

-   **Corrected Routing**: Issues with broken redirects for brand detail (`/brands/[id]`) and edit (`/brands/[id]/edit`) pages were resolved. The correct and functional pages are now located at:
    -   `/dashboard/brands/[id]` (Brand Detail View)
    -   `/dashboard/brands/[id]/edit` (Brand Edit Page)
-   **Enhanced Brand Detail UI** (`/dashboard/brands/[id]`):
    -   Features a tabbed interface, typically including sections like: Overview, Brand Identity, Content (associated with the brand), and Workflows (associated with the brand).
    -   Displays brand statistics, such as content count and workflow count.
    -   Includes robust loading states, error handling, and "not found" states for non-existent brands.
    -   Responsive design for usability across various device sizes.
-   **Comprehensive Brand Edit Interface** (`/dashboard/brands/[id]/edit` & `/dashboard/brands/new`):
    -   Provides a complete experience for creating new brands and editing existing ones.
    -   Typically organized into tabs like "Basic Details" (name, website, country, language) and "Brand Identity" (AI generation tools, tone of voice, guardrails).
    -   Incorporates AI-assisted brand identity generation (see below).
    -   May include a side panel for brand preview and AI-driven recommendations.
    -   Features proper form validation and error handling.

### Brand UI Enhancements (General)

-   **Two-Column Layout**: Brand edit and new pages often use a responsive two-column layout, with form fields in one column and a preview/information panel in the other.
-   **Card-Based Content Type Selection**: If brands have associated content types, the selection UI might use a card-based interface for clarity.
-   **British English**: UI text and labels generally adhere to British English.

## Brand Identity Generation

The system features an advanced brand identity generation capability, primarily powered by Azure OpenAI. This allows users to create a comprehensive brand profile by analyzing website URLs and other inputs.

### Process:

1.  **URL Collection**: Users provide one or more website URLs related to the brand.
2.  **AI Analysis**: The system scrapes content from these URLs and uses Azure OpenAI to analyze brand-related information.
3.  **Profile Generation**: A brand profile is generated, including:
    -   Brand identity description
    -   Tone of voice guidelines
    -   Content guardrails (do's and don'ts)
    -   (Potentially) Recommended content vetting agencies
    -   (Potentially) Suggested brand color

### Key Features & Technical Aspects:

-   **Regional Content Adaptation**: The generation process is country and language-aware. The API accepts `country` and `language` parameters to produce region-specific content, including localized descriptions, culturally adapted tone of voice, and relevant compliance considerations.
-   **Multi-Language Support**: Brand identity content can be generated in multiple languages based on brand settings, with explicit language instructions passed to the AI.
-   **Enhanced URL Input**: Improved UI for inputting URLs for analysis.
-   **Storage**: Input URLs and generated identity components are stored in the `brands` table.
-   **API Endpoint**: Primarily `POST /api/brands/identity`. The `POST /api/scrape-url` endpoint is used as a utility.

For more detailed information on the AI aspects, including prompt strategies and error handling, refer to the [Azure OpenAI Integration documentation](./azure_openai_integration.md).

## Content Vetting Agencies

To help ensure content compliance, the system can suggest relevant content vetting agencies.

-   **AI-Suggested Agencies**: When generating a brand identity, the AI may suggest vetting agencies specific to the brand's country, industry, and content needs.
-   **Display**: These are typically displayed as a selectable list (e.g., checkboxes) on the brand setup or identity page.
-   **Prioritization**: For some regions (e.g., Advertising Standards Authority - ASA for UK brands), certain agencies might be automatically set to high priority.
-   **Custom Agencies**: Users may have the ability to add, edit, and remove custom regulatory agencies, including setting their priority.
-   **Storage**: Selected and custom agencies are stored in the `brands` table (e.g., in `content_vetting_agencies` as a list/JSON, and `user_added_agencies` for custom ones).

## Brand Color Generation

-   The system may use AI to analyze a brand's website and automatically generate an appropriate brand color (HEX code).
-   This color is stored in the `brand_color` field in the `brands` table.
-   It is used visually in the UI (e.g., via the `BrandIcon` component) to help identify the brand.
-   Users can typically edit this color via a color picker if the AI-generated suggestion is not suitable.

## BrandIcon Component

A reusable UI component (`src/components/brand-icon.tsx` or similar) provides a consistent way to display brand avatars/icons:

-   **Features**:
    -   Often displays the first letter of the brand name within a circular avatar.
    -   Uses the brand's `brand_color` for text and/or background (potentially with opacity variations).
    -   Supports different sizes (e.g., sm, md, lg).
    -   Customizable via `className` props.
    -   Falls back to a default color if no brand color is specified.
-   **Usage**: Employed in brand listings, selection dropdowns, content cards, and anywhere a quick visual identification of the brand is needed.

This comprehensive approach to brand management allows users to maintain detailed and AI-enhanced brand profiles, ensuring that all content generated by MixerAI 2.0 is on-brand and contextually relevant. 