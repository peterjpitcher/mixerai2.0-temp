# MixerAI 2.0 User Flows

This document outlines the expected user flows through the MixerAI 2.0 application.

## I. User Management & Authentication

1.  **New User Registration:** A user signs up for an account.
2.  **User Login:** An existing user signs in.
3.  **Password Management:** A user resets or recovers their password.
4.  **Profile Updates:** A user modifies their account details (e.g., name, email).
5.  **User Invitation (Admin/Manager):** An administrator or manager invites a new user to join the platform, potentially assigning a role.
6.  **Invitation Acceptance:** An invited user accepts the invitation and completes their account setup.

## II. Brand Management

1.  **Create New Brand:** A user defines a new brand, providing details such as name, website, brand identity, tone of voice, and guardrails.
2.  **View Brand List:** A user sees all brands they have access to.
3.  **View Brand Details:** A user inspects the specific details of a single brand.
4.  **Edit Brand:** A user modifies the information of an existing brand.
5.  **Delete Brand:** A user removes a brand (consider if this is a soft or hard delete and what happens to associated content).

## III. Content Type Management (Primarily Admin/System Level)

1.  **View Content Types:** Users can see the available types of content the system can generate or manage (e.g., blog post, social media update, product description).
2.  *(Potentially)* **Create/Edit/Delete Content Types:** Administrators manage the available content types.

## IV. Content Creation & Lifecycle Management

1.  **Initiate Content Creation:**
    *   User selects a brand.
    *   User selects a content type (e.g., blog post).
    *   User provides initial input (e.g., topic, keywords, or a specific prompt).
2.  **AI-Powered Content Generation:** The system uses AI (Azure OpenAI) to generate draft content based on the user's input and the selected brand's identity.
3.  **Review and Edit Generated Content:** The user reviews the AI-generated draft, makes edits, and refines the content.
4.  **View Content List:** A user views a filterable and sortable list of all content pieces (e.g., by brand, status, creation date).
5.  **View Content Details:** A user views the full details of a specific piece of content, including its body, metadata, status, and history.
6.  **Manual Content Editing:** A user directly edits any aspect of the content (title, body, meta_title, meta_description).
7.  **Content Versioning:** The system tracks changes to content, allowing users to view or potentially revert to previous versions.
8.  **Content Status Management:** Content moves through various statuses (e.g., draft, pending_review, approved, published, rejected).
9.  **Delete Content:** A user removes a piece of content.

## V. Workflow Management

1.  **Define/Create Workflow Templates (Admin/Manager):** An administrator or manager designs and saves standard workflow templates (e.g., "Draft -> Internal Review -> Client Approval -> Publish").
2.  **View Workflow Templates:** Users can see available workflow templates.
3.  **Edit Workflow Templates:** Administrators or managers modify existing workflow templates.
4.  **Assign Workflow to Content:** A specific workflow is applied to a piece of content, initiating the process.
5.  **Track Content Progress in Workflow:** Users see the current step and status of content within its assigned workflow.
6.  **Execute Workflow Actions:** Users responsible for specific steps in a workflow take action (e.g., submit for review, approve, reject with comments, publish).

## VI. AI-Assisted Tools (Integrated within Content Creation/Editing)

1.  **Title Generation:** AI suggests or generates titles for content.
2.  **Description Generation:** AI suggests or generates meta descriptions, summaries, or excerpts.
3.  **Keyword Suggestion:** AI proposes relevant keywords for SEO or tagging.
4.  **Alt-Text Generation (for images):** AI creates descriptive alt text for images within the content.
5.  **Content Transcreation:** AI helps adapt existing content for different languages, regions, or target audiences, while maintaining brand consistency.
6.  **Metadata Generation:** AI assists in creating other relevant metadata.

## VII. Task Management ("My Tasks")

1.  **View Assigned Tasks:** A user sees a consolidated list of tasks requiring their attention (e.g., "Review Content X," "Approve Workflow Step for Content Y").

## VIII. Administration (Admin Roles)

1.  **User Role and Permission Management:** Administrators manage user accounts, assign roles (e.g., writer, editor, approver, admin), and control permissions.
2.  **System Configuration:** Administrators manage global application settings, integrations (like Azure OpenAI keys), and potentially default templates or guidelines.
3.  **View Audit Logs/System Activity:** (Optional but good for larger systems) Admins can review system activity. 