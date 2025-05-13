# MixerAI 2.0 API Reference

This document provides a reference for the main API routes used in the MixerAI 2.0 application.

## General Principles

-   All API routes are typically prefixed with `/api`.
-   Authentication is required for most routes, enforced by Supabase Auth and middleware.
    -   See [Authentication and User Management](./authentication.md) for details.
-   API routes that use authentication are marked with `export const dynamic = "force-dynamic";` to ensure they are not statically rendered, allowing cookie usage.
-   Error responses follow a consistent structure, e.g., `{ success: false, error: 'Error message' }`, with appropriate HTTP status codes.

## Authentication Endpoints

(These are standard Supabase Auth endpoints, often called by Supabase client libraries rather than direct fetch)

-   `/auth/login` (Page for user login)
// -   `/auth/register` (Page for new user registration - Removed, invite-only system)
-   `/auth/callback` (Supabase callback for OAuth, PKCE)
-   `/auth/user` (Endpoint used by Supabase helpers to get user state)

## User Management API (`/api/users`)

-   **`GET /api/users`**: Retrieves a list of all users, merging data from Supabase Auth and the `profiles` table. Includes role information derived from `user_brand_permissions`.
-   **`POST /api/users/invite`**: Invites a new user to the platform. Requires admin privileges.
    -   Handles creating the user in Supabase Auth and potentially setting initial `app_metadata`.
-   **`GET /api/users/[id]`**: Retrieves details for a specific user.
-   **`PUT /api/users/[id]`**: Updates details for a specific user. Requires appropriate permissions.
-   **`DELETE /api/users/[id]`**: Deletes a specific user. Requires admin privileges.
-   **`POST /api/users/fix-role`**: (Mentioned in file structure) Potentially an admin tool to correct user roles.
-   **`GET /api/users/search`**: (Mentioned in file structure) For searching/filtering users.

## Brand Management API (`/api/brands`)

-   **`GET /api/brands`**: Retrieves all brands. May include content and workflow counts per brand.
-   **`POST /api/brands`**: Creates a new brand.
-   **`GET /api/brands/[id]`**: Retrieves details for a specific brand by its ID. Includes content and workflow counts.
-   **`PUT /api/brands/[id]`**: Updates an existing brand.
-   **`DELETE /api/brands/[id]`**: Deletes a specific brand.
-   **`POST /api/brands/identity`**: Generates brand identity (description, tone of voice, guardrails, suggested agencies, brand color) using Azure OpenAI based on website URLs and other brand information (name, country, language).
-   **`GET /api/brands/[id]/rejected-content`**: (Mentioned in file structure) Retrieves content that was rejected for a specific brand.

## Content & Content Template API

### Content (`/api/content`)
-   **`GET /api/content`**: Retrieves a list of all content, potentially with related details (brand, content type/template, creator).
-   **`POST /api/content`**: Creates a new piece of content.
-   **`GET /api/content/[id]`**: Retrieves a specific piece of content by its ID.
-   **`PUT /api/content/[id]`**: Updates an existing piece of content.
-   **`DELETE /api/content/[id]`**: Deletes a specific piece of content.
-   **`POST /api/content/generate`**: Generates content using AI based on a template, brand, and user inputs.
    -   Sub-routes like `/api/content/generate/article-titles`, `/api/content/generate/keywords` (from file structure) suggest more specific generation tasks.
-   **`GET /api/content/[id]/versions`**: (Mentioned in file structure) Retrieves version history for a piece of content.
-   **`POST /api/content/[content_id]/comments`**: (Mentioned in file structure) Adds comments to content.
-   **`POST /api/content/[id]/workflow-action`**: (Mentioned in file structure) Performs an action related to the content's workflow (e.g., submit, approve).
-   **`POST /api/content/[id]/restart-workflow`**: (Mentioned in file structure) Restarts a workflow for a piece of content.

### Content Templates (`/api/content-templates`)
-   **`GET /api/content-templates`**: Retrieves a list of all available content templates.
    -   Response format: `{ success: true, templates: [...] }`
-   **`POST /api/content-templates`**: Creates a new content template.
-   **`GET /api/content-templates/[id]`**: Retrieves a specific content template by ID.
-   **`PUT /api/content-templates/[id]`**: Updates an existing content template.
-   **`DELETE /api/content-templates/[id]`**: Deletes a content template.

### Content Types (`