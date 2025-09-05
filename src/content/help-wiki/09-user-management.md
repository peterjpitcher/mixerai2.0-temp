---
title: User Management Guide
---

# User Management Guide

User management in MixerAI ensures the right people have the right access to the right resources. This guide explores how to manage users, roles, and permissions effectively whilst maintaining security and operational efficiency.

## Quick Navigation
- [Understanding User Management](#understanding-user-management)
- [Viewing Users](#viewing-users)
- [Inviting New Users](#inviting-new-users)
- [Managing User Roles](#managing-user-roles)
- [User Permissions](#user-permissions)
- [Deactivating Users](#deactivating-users)
- [Best Practices](#best-practices)

## Understanding User Management

### The Importance of User Control

In a multi-brand content platform like MixerAI, user management isn't just about granting access—it's about orchestrating collaboration whilst maintaining boundaries. Every user in your system represents both opportunity and risk: opportunity for enhanced productivity and creativity, risk of confusion, error, or security breach if not properly managed.

MixerAI's user management system reflects the complexity of modern organisations. Users might work across multiple brands with different responsibilities in each. A designer might have full creative control for one brand whilst only having viewing rights for another. A compliance officer might have approval rights everywhere but creation rights nowhere. This nuanced approach ensures everyone can contribute effectively without overstepping boundaries.

The system is built on the principle of least privilege—users receive only the permissions necessary for their roles. This isn't about distrust; it's about clarity and security. When users understand exactly what they can and should do, they work more confidently and make fewer mistakes.

### User Management Access

Access to user management features depends on your role. Administrators have full control over user accounts, including creation, modification, and deactivation. They can see all users across the organisation and manage their access comprehensively.

Managers might have limited user management capabilities, perhaps able to invite users to their teams or brands but not modify system-wide permissions. This delegation allows distributed management whilst maintaining overall control.

Regular users typically can't manage other users but can view team members and understand the organisational structure. This transparency helps with collaboration whilst preventing unauthorised changes.

## Viewing Users

### The Users Page

Navigate to the Users section via the sidebar (if you have appropriate permissions) to access the user management interface. The users page presents a comprehensive view of all users in your organisation, displayed in a clean, searchable table format.

Each row in the users table represents one user, showing essential information at a glance. You'll see the user's name, email address (which serves as their unique identifier), role, and status. Additional columns might show last login time, assigned brands, or other relevant metadata depending on your organisation's configuration.

The interface is designed for efficiency when managing large teams. Sorting options let you organise users alphabetically, by role, by status, or by activity. This flexibility helps you find specific users quickly or identify patterns—perhaps noticing that several users haven't logged in recently or that certain roles are over-represented.

### Understanding User Information

Each user's entry provides a snapshot of their involvement in the platform. The email address isn't just contact information—it's their login credential and the primary way the system identifies them. This is why email addresses must be unique and why changing them requires careful consideration.

The role indicator shows the user's primary system role: Administrator, Editor, or Viewer. However, remember this is their system-wide role. Individual brand permissions might differ, creating a more complex permission matrix that matches real-world responsibilities.

Status information tells you whether a user is active or inactive. Active users can log in and work normally. Inactive users cannot access the system but their historical contributions remain intact. This distinction is important for maintaining audit trails whilst controlling access.

### Searching and Filtering

The users page includes powerful search and filtering capabilities. The search function examines names and email addresses, finding matches even with partial information. Type "john" and you'll find "John Smith", "Johnson Lee", and anyone with "john" in their email address.

Filters help narrow down large user lists. Filter by role to see all administrators or all editors. Filter by status to identify inactive users who might need reactivation or removal. Filter by brand access to understand who can work with specific brands. These filters can be combined for precise queries—show me all active editors with access to Brand X, for instance.

For organisations with many users, pagination keeps the interface responsive. Rather than loading hundreds of users at once, the system displays manageable pages you can navigate through. This approach maintains performance whilst providing access to all user data.

## Inviting New Users

### The Invitation Process

Adding new users to MixerAI typically happens through an invitation system. Click "Invite User" or "Invite Users" to begin the process. The invitation system is preferred over direct account creation because it ensures users consent to joining and set their own passwords, maintaining security and compliance.

The invitation form requires minimal information initially: the new user's email address and their intended role. You might also specify which brands they should access and any special permissions. The system sends an invitation email containing a secure link that expires after a set period (typically 7 days) for security.

You can invite multiple users simultaneously, which is particularly useful when onboarding new teams or clients. Bulk invitations maintain consistency—all invited users receive the same initial permissions and access, which you can refine later as needed.

### Crafting Effective Invitations

While the system generates a standard invitation email, you might be able to customise the message. Adding a personal note explaining why someone is being invited and what they'll be doing helps set expectations and increases acceptance rates. "Hi Sarah, I'm inviting you to MixerAI where you'll be reviewing our Q4 marketing content" is more welcoming than a generic system message.

Consider timing when sending invitations. Inviting users just before a weekend might mean invitations expire before they're seen. Inviting during busy periods might result in overlooked emails. Time your invitations when recipients can act on them promptly.

Set appropriate initial permissions that allow new users to be productive immediately without overwhelming them. You can always expand permissions later as users become familiar with the platform. This graduated approach reduces confusion and security risks during the critical onboarding period.

### Managing Pending Invitations

The system tracks all pending invitations, showing you who's been invited but hasn't yet joined. This visibility helps you follow up with invitees who might have missed the email or encountered problems.

You can resend invitations if needed, perhaps because the original email was lost or the link expired. Resending generates a new secure link whilst invalidating the previous one, maintaining security whilst providing flexibility.

If circumstances change, you can cancel pending invitations before they're accepted. Perhaps a role has been filled differently or requirements have changed. Cancelling invitations prevents confusion and maintains control over system access.

## Managing User Roles

### Understanding Role Hierarchy

MixerAI employs a hierarchical role system where each role encompasses specific capabilities. Understanding these roles is crucial for effective user management.

**Administrators** sit at the top of the hierarchy with complete system control. They can manage users, configure brands, modify workflows, and access all content. This powerful role should be reserved for those responsible for platform operations, not just senior staff. Technical capability and operational responsibility should guide administrator assignment.

**Editors** form the productive core of most MixerAI installations. They create, edit, and often publish content. They can't modify system settings or manage users, focusing their permissions on content operations. This role suits writers, marketers, designers, and anyone actively creating content.

**Viewers** have read-only access, perfect for stakeholders who need visibility without modification rights. This might include executives reviewing content, clients approving work, or team members from other departments staying informed. Viewers can often comment and participate in workflows but can't change content directly.

### Changing User Roles

Modifying a user's role is straightforward but should be done thoughtfully. From the user management interface, locate the user whose role needs changing. Click their entry to access user details, then look for role management options.

The system typically requires confirmation when changing roles, especially when reducing permissions. Downgrading an administrator to an editor or viewer is a significant change that might affect their ability to complete assigned work. The confirmation step prevents accidental changes that could disrupt operations.

Consider the implications of role changes beyond immediate permissions. An editor promoted to administrator gains not just new capabilities but new responsibilities. They might need training on user management, brand configuration, and other administrative functions. Similarly, an administrator becoming an editor might feel frustrated by lost capabilities even if they no longer need them.

### Custom Roles and Permissions

While MixerAI provides standard roles, some organisations need more granular control. The platform might support custom roles or permission overrides that better match your organisational structure.

A "Reviewer" role might be able to comment and approve but not create content. A "Publisher" role might be able to release approved content but not modify it. A "Analyst" role might access all analytics but no content creation tools. These custom roles match real-world responsibilities more precisely than generic permissions.

When creating custom roles, document their purpose and permissions clearly. Future administrators need to understand why each role exists and what it's meant to accomplish. Without documentation, custom roles can become confusing, leading to permission creep or security gaps.

## User Permissions

### Brand-Level Permissions

Beyond system roles, users have specific permissions within each brand they can access. This creates a permission matrix where a user might have different capabilities in different contexts.

A user might be an editor for their primary brand, allowing full content creation and modification. For partner brands, they might have reviewer permissions, able to comment and approve but not create. For competitor brands they're monitoring, they might have viewer access only. This granular approach ensures appropriate access without overcomplication.

Brand permissions override system roles within that brand's context. Even an administrator needs explicit brand access to work with that brand's content. This separation ensures brand isolation remains intact regardless of system permissions.

Managing brand permissions happens at the brand level rather than the user level. This approach makes it easier to understand who has access to each brand and to audit permissions regularly. When reviewing brand security, you can see all users with access rather than checking each user individually.

### Permission Inheritance

Permissions in MixerAI often follow inheritance patterns that simplify management. If a user has editor access to a brand, they automatically have appropriate permissions for that brand's content, workflows, and assets. You don't need to set permissions for each element individually.

This inheritance works hierarchically. Administrator permissions at the system level don't automatically grant brand access, but administrator permissions within a brand grant full access to everything within that brand. Understanding these inheritance patterns helps predict permission effects and reduces configuration complexity.

When permissions conflict, the most restrictive generally applies. If workflow rules require administrator approval but the user only has editor permissions, they can't approve despite being able to edit the content. This fail-safe approach prevents accidental permission elevation.

### Auditing Permissions

Regular permission audits are essential for maintaining security and operational efficiency. MixerAI provides tools to review who has access to what, helping identify anomalies or outdated permissions.

The audit process might reveal users with unnecessary access—perhaps someone who changed roles but retained old permissions, or temporary access that was never revoked. These permission remnants create security risks and confusion. Regular audits help maintain clean, appropriate access controls.

Document permission decisions, especially exceptions. If someone needs unusual permissions for a specific project, record why, when it was granted, and when it should be reviewed. This documentation prevents permission mysteries that complicate future management.

## Deactivating Users

### When to Deactivate

User deactivation is necessary when someone leaves the organisation, changes roles significantly, or no longer needs platform access. Deactivation is preferred over deletion because it preserves historical records whilst preventing access.

Deactivate users promptly when they leave the organisation. Lingering active accounts create security risks and licensing inefficiencies. However, don't rush deactivation without proper handover—ensure work is transferred and knowledge is documented first.

Temporary deactivation might be appropriate for extended absences like sabbaticals or parental leave. The user's account remains intact but inaccessible, ready for reactivation upon return. This approach maintains continuity whilst ensuring security during absence.

### The Deactivation Process

To deactivate a user, navigate to their user details from the Users page. Look for the deactivation option, typically clearly marked given its significance. The system will likely require confirmation, possibly asking you to type the user's email or confirm your understanding of the implications.

When you deactivate a user, several things happen immediately. They're logged out if currently active. They can no longer log in, even with correct credentials. Their name might appear differently in the interface (perhaps greyed out) to indicate their inactive status. However, their historical contributions remain visible and attributed to them.

The system might prompt you about the user's pending work. Do they have content in draft? Are they assigned to workflow stages? Do they own any resources that need reassignment? Addressing these issues during deactivation prevents orphaned work and stalled processes.

### Reactivating Users

User reactivation might be necessary if someone returns to the organisation or if deactivation was mistaken. The reactivation process is typically straightforward—find the deactivated user and click "Reactivate" or similar.

Upon reactivation, users regain their previous permissions and access. They can log in immediately using their existing credentials (though you might force a password reset for security). Their historical work reconnects, and they appear as active throughout the system.

Consider whether reactivated users need the same permissions they had before. Returning after extended absence, their role might have changed or brand structures might have evolved. Review and update permissions as part of reactivation rather than blindly restoring previous access.

## Best Practices

### Onboarding Excellence

Effective onboarding sets users up for success. Create a structured process that introduces new users to MixerAI gradually. Start with basic navigation and core functions before introducing advanced features.

Provide role-specific training. Editors need different knowledge than viewers. Brand managers need different skills than content creators. Tailored training ensures users learn relevant features without overwhelming them with unnecessary information.

Document your organisation's specific MixerAI usage. While this help documentation covers platform features, your team needs to understand your workflows, naming conventions, and organisational rules. Create internal documentation that bridges platform capabilities and organisational requirements.

### Maintaining Security

Follow the principle of least privilege religiously. Users should have exactly the permissions they need—no more, no less. This isn't about restriction but about clarity and security. When users have appropriate permissions, they work confidently without risk of accidental damage.

Regular audits are essential. Schedule quarterly or bi-annual permission reviews where you systematically check every user's access. Look for anomalies: users who haven't logged in recently, permissions that don't match current roles, or access to brands no longer relevant.

Respond quickly to personnel changes. When someone leaves or changes roles, update their MixerAI access immediately. Delayed responses create security vulnerabilities and confusion. Build MixerAI user management into your organisation's standard personnel procedures.

### Effective Communication

Keep users informed about their access and any changes. If you're modifying someone's permissions, tell them why and what's changing. Surprise permission changes frustrate users and damage trust.

Establish clear channels for access requests. Users should know how to request additional permissions or report access problems. A simple process like "Email admin@yourcompany with access requests" prevents frustration and shadow IT workarounds.

Celebrate good user management. When your clean permission structure prevents problems or your quick response to personnel changes maintains security, acknowledge it. This recognition reinforces the importance of proper user management.

## Common Issues and Solutions

### Login Problems

When users can't log in, check several things systematically. Verify they're using the correct email address—typos are surprisingly common. Ensure their account is active, not deactivated. Check if their invitation has expired if they're new users.

Password issues are often solved through the "Forgot Password" function, which sends reset instructions to the user's email. However, ensure the email address is correct and the reset email isn't being caught by spam filters.

If login problems persist, check for system-wide issues. Are other users affected? Is the authentication service running? Sometimes what appears as an individual problem indicates a broader issue.

### Permission Confusion

Users often report "missing features" that are actually permission restrictions. When someone says they can't find something, first check their permissions. They might lack access to brands they expect to see or features they assume they should have.

Clear communication prevents most permission confusion. When onboarding users, explicitly state what they can and cannot do. When permissions change, explain what's different. This transparency prevents frustration and support requests.

Create permission reference documents showing what each role can do. Visual guides or matrices help users understand their capabilities without experimentation. This self-service resource reduces support burden whilst empowering users.

### Scale Challenges

As organisations grow, user management becomes more complex. What works for 10 users might fail for 100 or 1000. Recognise when you need to evolve your approach.

Consider delegating user management for large organisations. Brand managers might handle their brand's users. Team leads might manage their team's permissions. This distributed approach scales better than centralised control but requires clear governance.

Automate where possible. Integration with your organisation's identity provider can automate user creation and deactivation. Regular automated reports can flag anomalies for investigation. Automation reduces manual work whilst improving consistency.

## Conclusion

Effective user management in MixerAI enables collaboration whilst maintaining security. It's about finding the right balance—enough access for productivity, enough restriction for security, enough flexibility for real-world needs, enough structure for clarity.

Remember that user management isn't a one-time setup but an ongoing responsibility. As your organisation evolves, your user management must evolve too. Regular reviews, prompt updates, and clear communication keep your user management effective.

Master these user management principles, and you'll create an environment where everyone can contribute effectively whilst maintaining the security and organisation necessary for professional content operations.