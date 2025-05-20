# Understanding & Managing Workflows in MixerAI

Workflows in MixerAI are essential for standardising your [content](./?article=03-content) approval process, ensuring quality control, and facilitating collaboration among team members. This guide explains what workflows are, how they function, and how to manage them. You can typically [manage workflow templates here](https://mixerai.orangejelly.co.uk/dashboard/workflows).

## What are Workflows?

A Workflow is a pre-defined sequence of steps that a piece of [content](./?article=03-content) must go through from its initial draft to final approval (and sometimes beyond, to publication). Each step can be assigned to a specific user or a user role (e.g., "Legal Team Reviewer" - see [User Management](./?article=07-users) for roles).

Think of a workflow as an assembly line for your content. It ensures that:
*   The right people review the content at the right time.
*   All necessary checks (e.g., editorial, legal, [brand](./?article=02-brands) compliance) are completed.
*   There's a clear path for content to move forward or be sent back for revisions.

## How Workflows Function in MixerAI:

1.  **Workflow Assignment:**
    *   When a new piece of [content is created](./?article=03-content), it is often automatically assigned a specific workflow. This assignment can be based on the **Brand** the content belongs to or its **Content Type** (which might be linked to a [Template](./?article=04-templates)).
    *   In some cases, users might be able to manually select a workflow for a piece of content if multiple workflows are applicable.

2.  **Workflow Steps & Statuses:**
    *   Each workflow consists of one or more ordered **steps**. Examples of steps:
        *   Step 1: Content Draft
        *   Step 2: Editorial Review
        *   Step 3: SEO Check
        *   Step 4: Legal Approval
        *   Step 5: Final Marketing Sign-off
    *   A piece of content will always be at a **current step** within its assigned workflow.
    *   As a step is completed (e.g., an editor approves the content), the content automatically moves to the **next step** in the sequence.
    *   If a reviewer at a certain step requests changes, the content might be moved **back to a previous step** (e.g., back to "Content Draft").

3.  **Task Assignment & Notifications:**
    *   When content arrives at a workflow step, the user(s) responsible for that step are typically notified (e.g., via email or an in-app notification in their ["My Tasks" section](./?article=06-my-tasks)).
    *   This user then reviews the content and takes an action (e.g., "Approve," "Request Revisions," "Reject").

4.  **Tracking Workflow Progress:**
    *   Users can usually see the current workflow status and step of any piece of content by viewing its details within the [Content section](https://mixerai.orangejelly.co.uk/dashboard/content).
    *   There might also be visual indicators in content lists showing which workflow step the content is currently in.

## Managing Workflow Templates (Usually for Admins or Senior Roles):

If you have the necessary permissions, you can typically create and manage the workflow templates that are used across MixerAI:

1.  **Accessing Workflow Management:** Look for a "Workflows" or "Workflow Templates" section in the main dashboard navigation, or use the [direct link to Workflows](https://mixerai.orangejelly.co.uk/dashboard/workflows).

2.  **Viewing Existing Workflow Templates:** You'll see a list of all defined workflow templates. This might show the workflow name, a description, and the number of steps.

3.  **Creating a New Workflow Template:**
    *   Click on "+ New Workflow" or a similar button (e.g., on the [Workflows page](https://mixerai.orangejelly.co.uk/dashboard/workflows) or via a [direct link to create new workflows](https://mixerai.orangejelly.co.uk/dashboard/workflows/new)).
    *   **Name & Description:** Give your workflow a clear name (e.g., "Standard Blog Post Approval") and a brief description.
    *   **Defining Steps:** This is the core of creating a workflow.
        *   Add steps in the desired order.
        *   For each step, you'll define:
            *   **Step Name:** (e.g., "First Draft Review," "Compliance Check").
            *   **Assignee(s):** Specify which user(s) or user role(s) are responsible for completing this step. (e.g., assign to "Jane Doe" or to anyone with the "Editor" role - roles defined in [User Management](./?article=07-users)).
            *   **Allowed Actions:** Define what actions the assignee can take (e.g., "Approve and send to next step," "Send back to previous step for revision," "Reject content").
            *   **Notifications:** Configure who gets notified when content reaches or leaves this step (see [Managing Your Account](./?article=08-account) for notification preferences).
    *   Save the workflow template.

4.  **Editing an Existing Workflow Template:**
    *   Select a workflow template from the list to modify it (e.g., `https://mixerai.orangejelly.co.uk/dashboard/workflows/[ID]/edit`).
    *   You can usually reorder steps, edit step details (name, assignees, actions), add new steps, or remove steps.
    *   **Caution:** Modifying an active workflow template can impact content currently in that workflow. Some systems might only apply changes to new content, while others might try to adapt existing content (this can be complex).

5.  **Duplicating/Deleting Workflows:** Similar to templates, you might be able to duplicate an existing workflow to make a new similar one, or delete workflows that are no longer in use.

## Benefits of Using Workflows:

*   **Standardisation:** Ensures a consistent process for all content.
*   **Accountability:** Clearly defines who is responsible at each stage.
*   **Efficiency:** Automates the hand-off between team members, reducing delays.
*   **Quality Assurance:** Incorporates necessary review and approval stages.
*   **Transparency:** Everyone can see where a piece of content is in the approval process.

## Need More Help?

If you need assistance understanding how workflows function, creating effective workflow templates, or managing content within its workflow, please contact Peter Pitcher:

*   **Email:** [peter.pitcher@genmills.com](mailto:peter.pitcher@genmills.com)
*   **Microsoft Teams:** [peter.pitcher@genmills.com](https://teams.microsoft.com/l/chat/0/0?users=peter.pitcher@genmills.com) 