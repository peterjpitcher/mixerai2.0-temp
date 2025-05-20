# User Management (Admin) in MixerAI

This guide is specifically for administrators on how to manage user accounts in MixerAI. Effective user management ensures that team members have the appropriate level of access to perform their roles, maintaining security and operational efficiency. Access the [User management section here](https://mixerai.orangejelly.co.uk/dashboard/users) (requires admin privileges).

## What is User Management?

User management in MixerAI involves the complete lifecycle of user accounts:

*   **Inviting and Adding New Users:** Onboarding new team members to the platform.
*   **Assigning and Modifying Roles/Permissions:** Granting users the correct level of access based on their responsibilities.
*   **Editing User Details:** Keeping user information up to date.
*   **Deactivating or Deleting User Accounts:** Managing accounts for departing team members or those whose access needs to be revoked.

## How to Manage Users (Admin Privileges Required):

1.  **Navigate to User Management:**
    *   From the main dashboard menu, look for an "Admin" section, and within that, a "Users" or "User Management" option. Alternatively, use the [direct link to Users](https://mixerai.orangejelly.co.uk/dashboard/users).

2.  **Viewing the User List:**
    *   You will see a list of all users currently in the system. This list typically shows key information like name, email, assigned role, and last activity date.
    *   You may be able to sort or filter this list (e.g., by role).

3.  **Inviting New Users:**
    *   Look for an "Invite User," "+ New User," or "Add User" button, often on the [main Users page](https://mixerai.orangejelly.co.uk/dashboard/users) or via a [direct invite link](https://mixerai.orangejelly.co.uk/dashboard/users/invite).
    *   You will typically need to provide:
        *   **Email Address:** The new user's email, which they will use to log in.
        *   **Name (First/Last):** The user's name.
        *   **Role:** Assign an appropriate role from a predefined list (see "Understanding Roles and Permissions" below).
    *   Upon submitting the invitation, the new user will usually receive an email with instructions on how to set up their account and log in.

4.  **Editing an Existing User's Details or Role:**
    *   From the user list, click on the user you wish to manage or look for an "Edit" icon next to their name.
    *   This will take you to their user profile page (e.g., `https://mixerai.orangejelly.co.uk/dashboard/users/[ID]/edit`).
    *   Here you can typically:
        *   Update their name or other profile information.
        *   Change their assigned **Role**.
        *   Modify specific **Permissions** if the system allows granular control beyond roles.
    *   Save any changes you make.

5.  **Deactivating or Deleting User Accounts:**
    *   **Deactivating:** This is often the preferred method for users who no longer need access (e.g., they've left the company). Deactivation usually revokes their login rights but preserves their historical data within the system (like content they created or actions they took in [workflows](./?article=05-workflows)).
    *   **Deleting:** This permanently removes the user and potentially their associated data. Use with caution.
    *   These options are usually found on the user's edit page.

## Understanding Roles and Permissions

MixerAI likely uses a role-based access control (RBAC) system:

*   **Roles:** These are predefined sets of permissions that correspond to common job functions. Examples might include:
    *   **Administrator:** Full access to all features, including user management, [brand](./?article=02-brands) setup, [workflow](./?article=05-workflows) configuration, and system settings.
    *   **Editor/Manager:** Can create and manage [content](./?article=03-content) and [templates](./?article=04-templates), manage specific brands, and approve content within workflows. May or may not have user management rights for certain teams.
    *   **Creator/Contributor:** Can create and edit content, but may not be able to approve or publish it directly. Primarily focused on content generation.
    *   **Reviewer:** Can view content and participate in specific workflow steps (e.g., legal review, brand review) but may not be able to create or edit extensively.
    *   **View Only:** Can view content and reports but cannot make changes.
*   **Permissions:** These are the individual actions a user is allowed to perform (e.g., "create_brand," "edit_content_in_workflow_step_X," "invite_user"). Roles are essentially collections of these permissions.

## Important Considerations for Administrators:

*   **Principle of Least Privilege:** Only grant users the minimum level of access (role and permissions) necessary to perform their job duties. This enhances security.
*   **Regular Audits:** Periodically review the user list and their assigned roles. Remove or deactivate accounts for users who no longer need access. Ensure roles are still appropriate as job functions change.
*   **Clear Role Definitions:** Ensure your team understands what each role can and cannot do within MixerAI.
*   **Onboarding & Offboarding Process:** Have a standard process for adding new users (including assigning the correct role) and for deactivating accounts when someone leaves.

## Need More Help?

For questions about user roles, permissions, or any aspect of user account management in MixerAI, please contact Peter Pitcher:

*   **Email:** [peter.pitcher@genmills.com](mailto:peter.pitcher@genmills.com)
*   **Microsoft Teams:** [peter.pitcher@genmills.com](https://teams.microsoft.com/l/chat/0/0?users=peter.pitcher@genmills.com) 