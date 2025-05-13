# User Flows

This document outlines the primary user flows within the MixerAI 2.0 application.

## 1. User Authentication & Invitation

### 1.1. Invitation & Registration Process (All User Types)
*Registration to MixerAI is strictly by invitation only. The `/auth/register` page should be removed.*

1.  **Invitation Sent:** An existing user with appropriate permissions (Superadmin, Brand Admin, or via workflow assignment) initiates an invitation for a new user by providing their email address.
2.  **Account Check & Invite Trigger:**
    *   The system checks if an account already exists for the provided email.
    *   If no account exists, a new user record is typically created in a pending/invited state, and an invitation email is sent.
    *   If an account exists but the user is being added to a new role/brand, their permissions are updated, and they might receive a notification rather than a full re-registration invite.
3.  **User Accepts Invite:** The recipient clicks the unique invitation link in the email.
4.  **Profile Completion:** The user is directed to a page (e.g., `/auth/complete-invite`) to:
    *   Set their password.
    *   Confirm or complete other profile details (e.g., name, company, job title).
5.  **Account Activation & Association:**
    *   The system activates their user account fully.
    *   The user is automatically associated with the relevant entity and role based on the invitation type (no specific brand for a new Superadmin, a specific brand for Brand Admins, or context from the workflow for standard Users).
6.  **Redirection:** Upon successful completion, the user is redirected to the dashboard (`/dashboard`).

### 1.2. Login
1.  User navigates to the login page (`/auth/login`).
2.  User enters their credentials (email and password).
3.  System verifies credentials.
4.  Upon successful authentication, the user is redirected to the dashboard (`/dashboard`).

## 2. Brand Management

### 2.1. Creating a New Brand (Typically by Superadmin or authorized users)
1.  User navigates to the "New Brand" page from the dashboard (e.g., `/dashboard/brands/new`).
2.  User fills in brand details (name, website, identity, tone of voice, etc.).
3.  User submits the form.
4.  System creates a new brand record via an API call (likely to `/api/brands`).
5.  User is redirected to the brands list page (`/dashboard/brands`).

### 2.2. Viewing Brands
1.  User navigates to the brands overview page (e.g., `/dashboard/brands`).
2.  System fetches and displays a list of brands the user has access to (data from `/api/brands`), respecting user type permissions.

### 2.3. Editing a Brand
1.  From the brand list or brand detail page, user chooses to edit a specific brand they have access to.
2.  User is taken to the brand edit page (e.g., `/dashboard/brands/[id]/edit`).
3.  User modifies brand details. This page also serves as the point for inviting/assigning **Brand Admins** to this brand. If the designated email for a new Brand Admin does not correspond to an existing user, the system automatically creates a user account and sends an invitation email for them to complete their profile (name, password, company, job title).
4.  User submits the changes.
5.  System updates the brand record via an API call (likely to `/api/brands/[id]`).
6.  User is redirected to the brands list page (`/dashboard/brands`).

## 3. Content Management

### 3.1. Creating New Content (Must originate from a Template)
1.  User selects a Content Template (e.g., from `/dashboard/templates`).
2.  Upon selecting a template, the user is directed to the "New Content" page with a template identifier in the URL (e.g., `/dashboard/content/new?template=[template_id]`).
    *   Accessing `/dashboard/content/new` without a valid `template` query parameter should redirect the user to `/dashboard/content`.
3.  The system pre-fills the content creation form based on the selected template.
4.  User selects the Brand for the content (if not implicitly determined by the user's role or the template).
5.  User enters/modifies content details (title, body, etc.).
6.  AI tools might be used here for generation (e.g., title generation via `/api/ai/generate-title`, article titles via `/api/content/generate/article-titles`).
7.  User saves the content (initial status: 'draft').
8.  System creates a new content record via an API call (likely to `/api/content`). This record must include necessary workflow information. When content is first created from a template, it is automatically placed into the first step of its associated workflow, and assigned to the user(s) defined for that initial step.
    *   *(Discovery Note: Investigate bug regarding missing workflow information during content creation.)*
9.  User is redirected to the content list page (`/dashboard/content`).

### 3.2. Viewing Content
1.  User navigates to the content overview page (e.g., `/dashboard/content`).
2.  System fetches and displays a list of content items. Permissions dictate visibility:
    *   Superadmins see all content.
    *   Brand Admins see all content for their assigned brand(s).
    *   Standard Users see all content for their brand(s) but can only interact with items assigned to them via workflows.
    (Data from `/api/content`)

### 3.3. Editing Content
1.  User selects a content item to edit from the list. Standard Users can only open and edit items where they are the *current assignee in the active workflow step* for that content.
2.  User is taken to the content editing page (e.g., `/dashboard/content/[id]/edit`).
3.  User modifies content details.
4.  User saves changes.
5.  System updates the content record (via `/api/content/[id]`).

### 3.4. Content Workflow (Approval & Publishing)
1.  A user with appropriate permissions (e.g., creator, current assignee) performs an action on a content item in a workflow (e.g., 'Submit for Review', 'Approve', 'Reject').
    *   This might involve an API call like `/api/content/[id]/workflow-action`.
    *   The content status changes (e.g., to 'pending_review', 'approved', 'rejected').
    *   The `current_step` in the `content` table (or a related workflow state table) is updated, and the next assignee is determined based on the workflow definition for the subsequent step.
2.  The next assignee in the workflow is notified (potentially via "My Tasks" on `/dashboard/my-tasks` or email).
3.  The assignee accesses the content, reviews it, provides feedback (possibly via `/api/content/[content_id]/comments`), and performs their workflow action (approve/reject/etc.).
4.  If a step involves publishing: A user with 'publisher' permissions performs the final approval action. This marks the content as 'published'. Content is not automatically published by the system; it requires a manual publishing approval step within the workflow.
5.  Published content becomes available (how it's exposed externally is TBD).
6.  Rejected content might be sent back to a previous step/assignee for revisions.
7.  Workflows themselves are managed (`/dashboard/workflows`, `/dashboard/workflows/[id]/edit`, `/api/workflows`, `/api/workflows/[id]`).

## 4. Template Management (Content Templates & Workflow Templates)

### 4.1. Creating a New Template
1.  User (typically Superadmin or Brand Admin with permissions) navigates to the "New Template" page (e.g., `/dashboard/templates/new` for content templates, or a similar path for workflow templates).
2.  User defines the template structure, pre-filled fields, associated workflow (for content templates), possibly using AI to generate descriptions (`/api/ai/generate-template-description`).
3.  User saves the template.
4.  System creates a new template record (API endpoint could be `/api/content-templates` or `/api/workflows/templates`).

### 4.2. Viewing Templates
1.  User navigates to the templates page (e.g., `/dashboard/templates`).
2.  System lists available templates based on user permissions.

### 4.3. Editing a Template
1.  User selects a template to edit.
2.  User is taken to the template edit page (e.g., `/dashboard/templates/[id]`).
3.  User modifies the template.
4.  System updates the template record.

## 5. User Management & Roles
*Side navigation should dynamically hide links to sections the user does not have permission to access (e.g., a standard User would not see links to `/dashboard/users`, `/dashboard/brands`, `/dashboard/templates`, or `/dashboard/workflows` management pages).*

### 5.1. Superadmin
*   **Invitation:** Invited by an existing Superadmin via a dedicated admin page (e.g., `/dashboard/admin/users/invite` or a similar protected UI for Superadmins only). The system sends an invitation email for profile completion.
*   **Permissions:**
    *   No specific brand association by default.
    *   Can view and manage all data across the entire system (all brands, all users, all content, all templates, all workflows).
    *   Can manage global settings, invite other Superadmins.
    *   Accesses all sections, including a global user management page for managing all user types.

### 5.2. Brand Admin
*   **Invitation:** Invited/assigned to a specific brand by a Superadmin or another Brand Admin of that brand. This happens through the brand management interface (e.g., `/dashboard/brands/[id]/edit` or `/dashboard/brands/new`). If the email is new to the system, an invitation for profile completion is sent.
*   **Permissions:**
    *   Associated with one or more specific brands.
    *   Can view and manage all data *for their assigned brand(s) only* (brand details, content, users associated with that brand's workflows, brand-specific workflows, brand-specific templates).
    *   Can invite/manage Users and other Brand Admins *for their brand(s) only*.
    *   Sees a filtered view of `/dashboard/users`, `/dashboard/content`, `/dashboard/workflows`, `/dashboard/templates` relevant to their brand(s).

### 5.3. User (Standard User/Workflow Participant)
*   **Invitation:** Invited when their email is assigned to a step in a content workflow for a specific piece of content. When an email is assigned, the system checks if a user account exists. If not, it automatically creates a basic user record and triggers an invitation email for profile completion (name, password, company, job title). The user's brand association is derived from the brand of the content/workflow they are assigned to.
*   **Permissions:**
    *   Associated with the brand(s) of the content they are assigned to.
    *   Can view all content items for the brand(s) they are associated with (e.g., on the `/dashboard/content` list).
    *   Can only *edit* or perform workflow actions on content items that are currently assigned to them in a workflow.
    *   Cannot see or access `/dashboard/brands` (list/edit), global `/dashboard/users` (list/invite/edit other users), `/dashboard/templates` (list/edit), or `/dashboard/workflows` (list/edit workflow definitions).
    *   Primarily interacts via "My Tasks" (`/dashboard/my-tasks`) and direct links to content they need to work on.

## 6. AI Tools Usage

### 6.1. Alt Text Generator
1.  User accesses the tool (e.g., via `/dashboard/tools/alt-text-generator`).
2.  User provides an image and a website URL (e.g., a blog post URL where the image will be used).
3.  System attempts to find a matching brand from the `brands` table by comparing the *domain* of the provided website URL with the `brands.website_url` field (exact domain match required, subpaths ignored).
4.  **Outcome:**
    *   **No Brand Match:** An alert is displayed to the user stating that brand definition has not been used and to use the generated content at their own risk.
    *   **Brand Match:** The identified brand's identity, tone of voice, and guardrails are used by the AI for generation.
    *   All user types can use this tool without restriction, regardless of brand matching outcome.
5.  System calls the relevant API (`/api/tools/alt-text-generator`).
6.  AI generates alt text, which is displayed to the user.

### 6.2. Content Transcreator
1.  User accesses the tool (e.g., via `/dashboard/tools/content-transcreator`).
2.  User inputs source content, specifies target language/tone, and potentially selects a Brand to use its identity context (if not inferred by other means or if the user wants to override).
3.  System calls the API (`/api/tools/content-transcreator`).
4.  AI generates the transcreated content.
5.  All user types can use this tool without restriction.

### 6.3. Metadata Generator
1.  User accesses the tool (e.g., via `/dashboard/tools/metadata-generator`).
2.  User provides content text or a website URL (e.g., a blog post URL).
3.  System attempts to find a matching brand from the `brands` table by comparing the *domain* of the provided website URL with the `brands.website_url` field (exact domain match required, subpaths ignored).
4.  **Outcome:**
    *   **No Brand Match:** An alert is displayed to the user stating that brand definition has not been used and to use the generated content at their own risk.
    *   **Brand Match:** The identified brand's identity, tone of voice, and guardrails are used by the AI for generation.
    *   All user types can use this tool without restriction, regardless of brand matching outcome.
5.  System calls the API (`/api/tools/metadata-generator`).
6.  AI generates meta title and meta description.

## 7. Account Management

### 7.1. Viewing/Editing Own Profile
1.  User navigates to their account page (e.g., `/dashboard/account`).
2.  User can view their details and edit them: Name, Company, Job Title, password, notification settings.
3.  Changes are saved via an API (likely related to `/api/me` or a user-specific endpoint of `/api/users/[id]`).

### 7.2. Viewing My Tasks
1.  User navigates to "My Tasks" (e.g., `/dashboard/my-tasks`).
2.  System displays a list of tasks assigned to the user (primarily content items requiring their action in a workflow) by querying an API (e.g. `/api/me/tasks`).

## 8. Notes for Discovery & Implementation Phase

*   **Initial Superadmin Seeding:** A process needs to be created (e.g., DB seed script or manual setup procedure) to establish the first Superadmin account for `peter.pitcher@genmills.com`.
*   **Workflow Step Storage:** Investigate how workflow steps are currently stored. Plan for migrating/designing them into a separate, dedicated table for better referencing, management, and assignment logic, as requested.
*   **Database Schema for User Profile:** Verify/update user profile schema (e.g., in `profiles` table if using Supabase defaults) to include `company` and `job_title` text fields if not already present. Also, confirm how `role` information is stored and linked to users.
*   **Remove `/auth/register` route:** Ensure the Next.js route and corresponding UI for general registration are completely removed.

This is an updated draft based on your feedback. Please review it and provide clarification on the user's ability to edit their own "Role" via their profile. I'll await your answers before proceeding to the full discovery phase. 