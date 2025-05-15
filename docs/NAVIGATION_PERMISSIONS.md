# Role-Based Navigation Permissions Matrix

This document outlines the typical visibility and accessibility of main navigation items for different user roles within the MixerAI application, incorporating brand-specific access rules and conditional access for Admins.

## User Role Definitions

The permissions are based on the following standard role definitions:

*   **Viewer:** Can only view content for brands they are assigned to. They can use available tools. They cannot make any changes to content or manage any platform settings, brands, workflows, templates, or users.
*   **Editor:** Can create and edit content for brands they are assigned to. They can use available tools. They typically cannot manage users, or system-level brand, workflow, or template configurations.
*   **Admin:** 
    *   **If assigned to NO brands (Platform Admin):** Can manage all aspects of the platform, including ALL brands, content, users, workflows, and templates across the entire system.
    *   **If assigned to one or more brands (Scoped Admin):** Can manage users globally. Their view and management capabilities for brands, content, workflows, and templates are restricted to ONLY their assigned brand(s). Within this scope, they retain administrative rights (create, edit, delete).

## Detailed Navigation Visibility Matrix

The following matrix indicates whether a main navigation item is generally visible/accessible ('✓') or hidden/inaccessible ('✗') for each role. 
Symbols used:
*   `*`: Access is filtered based on the user's assigned brands (for Viewers & Editors).
*   `**`: For Admins, access is comprehensive if NO brands are assigned. If ANY brands are assigned, access is filtered to those assigned brands for brand-specific entities (Brands, Content, Workflows, Templates). User management remains global.

| Navigation Item                      | Viewer | Editor | Admin  | Notes                                                                    |
| :----------------------------------- | :----: | :----: | :----: | :----------------------------------------------------------------------- |
| **Dashboard (Overview)**             |   ✓    |   ✓    |   ✓    | All users see their dashboard.                                           |
| **My Tasks**                         |   ✓    |   ✓    |   ✓    | All users see tasks assigned to them.                                    |
| **Brands**                           |        |        |        |                                                                          |
|   ↳ View All Brands (List Page)      |   ✗    |   ✗    |   ✓`**` | `**`Admins: All brands if unassigned; assigned brands only if assigned.      |
|   ↳ Create New Brand                 |   ✗    |   ✗    |   ✓`**` | `**`Admins can create brands (globally if unassigned, or for their scope). |
| **Content**                          |        |        |        |                                                                          |
|   ↳ View All Content (e.g., a flat list) |   ✓`*`  |   ✓`*`  |   ✓`**` | `*`Viewers/Editors: Filtered. `**`Admins: All if unassigned; assigned only if assigned. |
|   ↳ Content Folder (e.g. /dashboard/content/[content_type]) | ✓`*`  | ✓`*`  |   ✓`**` | `*`Viewers/Editors: Filtered. `**`Admins: All if unassigned; assigned only if assigned. |
|   ↳ Create New Content (contextual)  |   ✗    |   ✓`*`  |   ✓`**` | `*`Editors: Filtered. `**`Admins: Can create within their scope.            |
| **Workflows**                        |        |        |        |                                                                          |
|   ↳ View All Workflows (List Page)   |   ✗    |   ✗    |   ✓`**` | `**`Admins: All if unassigned; assigned only if assigned.                  |
|   ↳ Create New Workflow              |   ✗    |   ✗    |   ✓`**` | `**`Admins can create workflows (globally if unassigned, or for their scope). |
| **Templates (Content Templates)**    |        |        |        |                                                                          |
|   ↳ View All Templates (List Page)   |   ✗    |   ✗    |   ✓`**` | `**`Admins: All if unassigned; assigned only if assigned (or global templates). |
|   ↳ Create New Template              |   ✗    |   ✗    |   ✓`**` | `**`Admins can create templates (globally if unassigned, or for their scope). |
| **Tools Folder & Items**             |        |        |        |                                                                          |
|   ↳ Alt Text Generator             |   ✓    |   ✓    |   ✓    | Viewers and Editors can use tools.                                       |
|   ↳ Content Transcreator             |   ✓    |   ✓    |   ✓    | Viewers and Editors can use tools.                                       |
|   ↳ Metadata Generator               |   ✓    |   ✓    |   ✓    | Viewers and Editors can use tools.                                       |
| **User Management**                  |        |        |        |                                                                          |
|   ↳ View Users List                  |   ✗    |   ✗    |   ✓    | Admin function (global for all Admins).                                  |
|   ↳ Invite New User                  |   ✗    |   ✗    |   ✓    | Admin function (global for all Admins).                                  |
| **Account Settings**                 |   ✓    |   ✓    |   ✓    | All users can manage their own profile/settings.                         |
| **Help & Information**               |   ✓    |   ✓    |   ✓    | E.g., Release Notes, Privacy Policy. Visible to all.                     |

### Notes on the Matrix:

*   **Admin Role Conditional Access (`**`):** 
    *   If an Admin has NO brand assignments, they have full platform-wide access to view and manage all Brands, Content, Workflows, and Templates.
    *   If an Admin IS assigned to one or more brands, their access to view and manage Brands, Content, Workflows, and Templates is restricted to ONLY those brands they are assigned to. 
    *   User Management capabilities (viewing users, inviting users) remain global for all Admins, regardless of brand assignments.
*   **Viewer/Editor Brand-Restricted Access (`*`):** For 'Viewer' and 'Editor' roles, any access to content listings, content type categories, or content creation capabilities is strictly limited to the brands they are assigned to. The UI should filter navigation links and content views accordingly.
*   **Contextual Actions:** Actions like "Edit Brand," "Edit Content," "Edit Workflow," etc., are generally contextual (e.g., an "edit" button on an item's detail page) and not main navigation links.
    *   Viewers: No edit capabilities.
    *   Editors: Can edit content for their assigned brands.
    *   Admins: Full edit capabilities within their scope (platform-wide or brand-specific).
*   **"Content Folder":** This represents navigation to views of specific content types. The available content types and the content within them must be filtered based on brand assignments for Viewers, Editors, and Scoped Admins.

## Simplified Navigation View (Reflecting User Roles)

This version focuses on the primary navigation sections visible to each role.

**Viewer Role Navigation:**

*   Dashboard (Overview)
*   My Tasks
*   Content (Filtered by assigned brands)
    *   ↳ _Access to view specific content types & items for assigned brands_
*   Tools (Access to all tools)
    *   ↳ _Alt Text Generator_
    *   ↳ _Content Transcreator_
    *   ↳ _Metadata Generator_
*   Account Settings
*   Help & Information

**Editor Role Navigation:**

*   Dashboard (Overview)
*   My Tasks
*   Content (Filtered by assigned brands)
    *   ↳ _Access to view/create/edit specific content types & items for assigned brands_
*   Tools (Access to all tools)
    *   ↳ _Alt Text Generator_
    *   ↳ _Content Transcreator_
    *   ↳ _Metadata Generator_
*   Account Settings
*   Help & Information

**Admin Role Navigation:**

*   **Scenario 1: Admin with NO Brand Assignments (Platform Admin)**
    *   Dashboard (Overview)
    *   My Tasks
    *   Brands (View All, Create New - full platform access)
    *   Content (View All, Create New - full platform access)
    *   Workflows (View All, Create New - full platform access)
    *   Templates (View All, Create New - full platform access)
    *   Tools (Access to all tools)
    *   User Management (View Users List, Invite New User - global access)
    *   Account Settings
    *   Help & Information

*   **Scenario 2: Admin WITH Brand Assignments (Scoped Admin)**
    *   Dashboard (Overview)
    *   My Tasks
    *   Brands (View assigned brands, Create New within scope/potentially global - TBD by exact rules)
    *   Content (View/Create/Edit for assigned brands only)
    *   Workflows (View/Manage for assigned brands only, or global if applicable)
    *   Templates (View/Manage for assigned brands only, or global if applicable)
    *   Tools (Access to all tools)
    *   User Management (View Users List, Invite New User - global access)
    *   Account Settings
    *   Help & Information

This matrix and role-based navigation view should serve as a guideline. The conditional access for Admins based on brand assignments is a key refinement. 