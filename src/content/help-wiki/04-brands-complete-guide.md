---
title: Brands Management Guide
---

# Brands Management Guide

Brands are the cornerstone of MixerAI's multi-tenant architecture, allowing organisations to manage multiple distinct identities, voices, and content strategies within a single platform. This guide explores how brands work and how to leverage them effectively.

## Quick Navigation
- [Understanding Brands](#understanding-brands)
- [Viewing and Accessing Brands](#viewing-and-accessing-brands)
- [Creating a New Brand](#creating-a-new-brand)
- [Brand Configuration](#brand-configuration)
- [Brand Permissions](#brand-permissions)
- [Working Across Multiple Brands](#working-across-multiple-brands)
- [Brand Best Practices](#brand-best-practices)

## Understanding Brands

### The Multi-Brand Concept

In MixerAI, a brand represents far more than just a logo or colour scheme. Each brand is a complete workspace with its own content library, user permissions, workflows, and guidelines. This separation ensures that content for one brand never accidentally mingles with another, whilst still allowing authorised users to work across multiple brands efficiently.

Think of brands as separate tenants in a building. They share the infrastructure—the MixerAI platform—but maintain complete privacy and independence. A user might have access to multiple brands, potentially with different roles in each. You might be an administrator for your primary brand whilst having read-only access to partner brands, for instance.

This architecture is particularly powerful for organisations managing multiple product lines, agencies handling various clients, or enterprises operating across different markets. Each brand maintains its distinct identity whilst benefiting from shared platform capabilities and cross-brand insights where appropriate.

### Why Brands Matter

The brand system solves several critical challenges in content management. First, it ensures compliance and consistency—content created for one brand automatically inherits that brand's voice, guidelines, and approval processes. There's no risk of accidentally using the wrong tone or making inappropriate claims.

Second, brands provide security through isolation. Users only see content and assets for brands they're authorised to access. This is crucial for agencies managing competing clients or enterprises with sensitive internal divisions. The platform enforces these boundaries at every level, from content creation to reporting.

Finally, brands enable scalability. You can add new brands as your organisation grows, each with its own complete setup, without affecting existing brands. This modularity means you can onboard new products, clients, or markets quickly whilst maintaining operational independence for each.

## Viewing and Accessing Brands

### The Brands Page

Navigate to the Brands section via the sidebar to see all brands you have access to. The page presents brands in a card layout, with each card displaying the brand's logo, name, and your role within that brand. The visual presentation helps you quickly identify brands, especially useful if you work with many.

Each brand card shows essential information at a glance. The brand's primary colour often appears as an accent, providing visual differentiation. Your role—whether admin, editor, or viewer—appears clearly, reminding you of your permissions before you dive in. Some cards might show additional metrics like recent activity or content count, depending on your permissions and the organisation's configuration.

The brands page isn't just a directory—it's a launching point. Clicking on a brand card typically takes you to that brand's dashboard or content library, effectively switching your working context to that brand. This context switch is comprehensive; navigation, available features, and even visual elements might change to reflect the selected brand.

### Understanding Brand Access

Your access to brands is determined by administrators and reflects your role in the organisation. You might have different permissions for different brands, creating a nuanced permission matrix that matches real-world responsibilities.

For instance, as a content creator, you might have editor permissions for brands you regularly work with, allowing you to create and modify content. For brands where you occasionally provide input, you might have reviewer permissions, letting you comment and approve but not create. And for brands you need to monitor but not modify, viewer access provides read-only visibility.

This granular permission system extends beyond simple read/write access. Within each brand, you might have access to certain features but not others. Perhaps you can create content but not modify brand settings, or you can view analytics but not export data. These permissions ensure everyone has exactly the access they need—no more, no less.

## Creating a New Brand

### Prerequisites and Planning

Creating a new brand is a significant action typically restricted to administrators. Before beginning, gather all necessary information: brand assets (logos, colours, fonts), brand guidelines (voice, tone, messaging), and organisational details (team members, workflows, approval processes).

Planning is crucial because while you can modify brand settings later, some decisions have cascading effects. The brand name, for instance, might appear throughout the system and in URLs. The brand's primary colour might become the default for various UI elements. Taking time to plan ensures a smooth setup process.

Consider who needs access to the brand and what roles they'll have. Will this brand follow standard workflows, or does it need custom approval processes? Does it require special integrations or API access? Answering these questions upfront prevents constant adjustments later.

### The Creation Process

When you click "New Brand" (if you have permission), you're guided through a structured setup process. The system typically starts with basic information: brand name, description, and primary contact. The brand name should be distinctive and meaningful—it's how users will identify this brand throughout the platform.

Next comes visual identity. Upload your brand's logo, preferably in multiple formats (colour, monochrome, different sizes). Define your brand colours using hex codes or colour pickers—these colours will appear throughout the interface when working with this brand's content. If your brand has specific fonts, you can specify these too, though implementation might depend on licensing and technical feasibility.

Brand voice and guidelines come next. This isn't just documentation—MixerAI can use these guidelines to guide content creation and review. Specify your brand's tone (formal vs casual, serious vs playful), preferred terminology, and any absolute requirements or restrictions. The more detailed these guidelines, the more effectively the platform can assist users in maintaining brand consistency.

### Initial Configuration

After creating the basic brand structure, you'll need to configure operational elements. This includes setting up workflows—will this brand use standard approval processes, or does it need custom workflows? Define the stages content must pass through and who's responsible for each stage.

User access is another crucial configuration. Decide who should have access to this brand and what permissions they need. You can add users individually or in groups, assigning appropriate roles. Remember that users can have different roles in different brands, so someone who's an administrator elsewhere might be a regular editor for this new brand.

Finally, configure any brand-specific settings. This might include API keys for integrations, webhook URLs for notifications, or custom fields for content metadata. These technical configurations ensure the brand operates smoothly within your broader technology ecosystem.

## Brand Configuration

### Visual Identity Management

Your brand's visual identity in MixerAI goes beyond mere decoration—it's functional branding that appears throughout the user interface. When users work with your brand's content, they see your colours, logos, and styling, creating an immersive brand experience that reinforces identity and prevents confusion.

Logo management is sophisticated. You can upload multiple logo variations for different contexts: a full colour logo for headers, a monochrome version for documents, a square icon for small spaces, and perhaps seasonal variations for special campaigns. The system intelligently selects the appropriate version based on context.

Colour configuration affects various interface elements. Your primary brand colour might tint buttons and links. Secondary colours might appear in charts and graphics. Even subtle elements like hover states and selections can reflect brand colours, creating a cohesive experience that feels distinctly yours.

### Brand Guidelines and Voice

Brand guidelines in MixerAI aren't just reference documents—they're active participants in content creation. When properly configured, they guide users toward brand-appropriate content whilst flagging potential issues before they become problems.

Voice configuration might include preferred vocabulary lists, helping writers use consistent terminology. If your brand says "team members" instead of "employees" or "solutions" instead of "products", these preferences can be encoded and enforced. This consistency is crucial for maintaining professional, recognisable brand communications.

Tone settings go deeper than simple formal/informal switches. You can specify different tones for different content types—perhaps conversational for blog posts but professional for press releases. These nuanced guidelines help writers strike the right note for each audience and context.

### Workflow Customisation

Each brand can have its own workflows, reflecting different approval requirements, compliance needs, or operational processes. A heavily regulated pharmaceutical brand might require multiple review stages including legal and medical approval. A fast-moving fashion brand might have streamlined workflows for rapid content publication.

Workflow customisation isn't just about adding or removing stages—it's about designing processes that match your brand's specific needs. You can specify different workflows for different content types, create conditional branches based on content characteristics, and set service level agreements for each stage.

The beauty of brand-specific workflows is that they're invisible to users until needed. Content creators simply submit their work; the system automatically routes it through the appropriate workflow based on the brand and content type. This automation reduces errors whilst ensuring compliance.

## Brand Permissions

### Role-Based Access Control

Within each brand, MixerAI implements a sophisticated role-based access control system. Standard roles include Administrator, Editor, and Viewer, but these can be customised to match your organisational structure. Each role comes with a predefined set of permissions that determine what users can see and do.

Administrators have full control within the brand. They can modify brand settings, manage users, create workflows, and access all content and analytics. This powerful role should be reserved for those responsible for the brand's overall operation in MixerAI.

Editors can create, edit, and often publish content, but typically can't modify brand settings or manage other users. They're your content creators, copywriters, and marketing team members who work with content daily. Their permissions focus on content operations rather than system configuration.

Viewers have read-only access, perfect for stakeholders who need visibility without the ability to modify anything. This might include executives reviewing content, partners monitoring campaigns, or team members from other departments who need to stay informed.

### Custom Permissions

Beyond standard roles, MixerAI allows granular permission customisation. You might create a "Reviewer" role that can comment and approve but not create content. Or a "Publisher" role that can release approved content but not modify it. These custom roles match real-world responsibilities more closely than generic permissions.

Permissions can be surprisingly specific. You might grant access to view analytics but not export data. Or allow someone to create content but not delete it. This granularity ensures users have exactly the permissions they need for their responsibilities, reducing both security risks and user frustration.

Remember that permissions are brand-specific. A user might be an administrator for one brand but have no access to another. This separation is fundamental to MixerAI's security model, ensuring that brand boundaries are respected regardless of a user's overall platform permissions.

### Managing Brand Users

Adding users to a brand is straightforward but should be done thoughtfully. From the brand settings, you can search for existing platform users or invite new ones. When adding users, you assign their role for this specific brand, which might differ from their roles elsewhere.

Regular permission audits are important. People change roles, leave organisations, or take on new responsibilities. Periodically reviewing who has access to each brand and whether their permissions remain appropriate helps maintain security and operational efficiency.

When removing users from a brand, consider the implications. What happens to content they created? Who takes over their pending tasks? Planning these transitions ensures continuity and prevents orphaned content or stalled workflows.

## Working Across Multiple Brands

### Brand Switching

If you have access to multiple brands, switching between them is seamless. The current brand context usually appears in the header or navigation, with a dropdown or switcher allowing quick changes. When you switch brands, the entire interface updates to reflect the new context—different content appears, colours might change, and available features adjust based on your permissions.

This context switching is comprehensive but lightweight. The platform maintains your position where possible—if you're viewing the content library for Brand A and switch to Brand B, you'll typically land in Brand B's content library. This consistency makes multi-brand work more efficient.

Some users prefer to work with multiple brands simultaneously using different browser tabs or windows. Each tab maintains its own brand context, allowing you to compare content across brands or copy elements from one to another (where permitted). This parallel working style suits those who regularly coordinate cross-brand campaigns or maintain consistency across a portfolio.

### Cross-Brand Considerations

While brands are isolated for security and consistency, there are times when cross-brand visibility is valuable. Administrators might need to see aggregate analytics across all brands. Content creators might need to ensure messaging alignment across related brands. MixerAI provides controlled mechanisms for these cross-brand operations.

Content sharing between brands requires explicit permission and is typically limited to specific use cases. You might be able to duplicate a successful template from one brand to another, adapting it for the new context. Or you might share assets like images or videos across brands within the same organisation. These sharing mechanisms maintain audit trails, ensuring accountability.

Be mindful of brand boundaries when working across multiple brands. It's easy to accidentally apply learnings or terminology from one brand to another inappropriately. Use MixerAI's brand indicators—colours, logos, and labels—to maintain awareness of your current context and prevent cross-contamination.

### Portfolio Management

For those managing multiple brands, MixerAI provides portfolio-level insights and tools. You might see aggregate dashboards showing performance across all your brands, helping identify trends and opportunities. These overviews respect individual brand privacy whilst providing valuable comparative data.

Portfolio management features might include bulk operations—updating user permissions across multiple brands simultaneously, or rolling out new workflows to several brands at once. These efficiency tools are powerful but should be used carefully, ensuring that bulk changes remain appropriate for each affected brand.

Consider establishing portfolio-wide standards whilst respecting brand individuality. Perhaps all brands follow similar workflow stages but with different reviewers. Or they use consistent naming conventions for content types whilst maintaining unique voice guidelines. This balance between standardisation and customisation optimises efficiency whilst preserving brand identity.

## Brand Best Practices

### Setting Up for Success

Successful brand setup begins with comprehensive planning. Document everything—not just visual guidelines but operational processes, team structures, and success metrics. This documentation becomes invaluable as teams grow and evolve.

Start with essential configuration and expand gradually. You don't need to configure every possible setting immediately. Get the basics right—name, logo, primary users—then refine as you learn how your team uses the platform. This iterative approach prevents over-engineering whilst ensuring the brand remains functional from day one.

Involve key stakeholders early. The marketing team might focus on visual identity, but operations teams understand workflow requirements, and compliance teams know regulatory needs. Gathering input from all stakeholders ensures the brand configuration serves everyone's needs.

### Maintaining Brand Integrity

Brand consistency requires ongoing attention. Regular audits help identify drift—perhaps writers are using outdated terminology, or approval processes are being bypassed. MixerAI provides tools to monitor brand compliance, but human oversight remains essential.

Keep brand guidelines updated. As your brand evolves, update its configuration in MixerAI. New product launches might require new terminology. Regulatory changes might necessitate workflow updates. Treating your MixerAI brand configuration as a living document ensures it remains relevant and useful.

Train new team members thoroughly. Don't assume that brand guidelines are self-explanatory. Provide context about why certain rules exist and how they contribute to brand success. This understanding promotes compliance better than rigid rule enforcement.

### Optimising Multi-Brand Operations

If you manage multiple brands, look for opportunities to share learnings and resources whilst maintaining separation. A successful content template from one brand might inspire (but not be directly copied to) another. A workflow that works well for one brand might suggest improvements for others.

Establish clear governance structures. Who can create new brands? Who approves major brand configuration changes? Who conducts brand audits? Clear governance prevents chaos as your brand portfolio grows.

Use MixerAI's analytics to understand brand performance comparatively. Which brands produce content most efficiently? Which have the highest approval rates? These insights can drive improvements across your portfolio whilst respecting each brand's unique requirements.

## Common Challenges and Solutions

### Brand Proliferation

Organisations sometimes create too many brands, fragmenting effort and confusing users. Before creating a new brand, consider whether it truly needs independence or could be a sub-section of an existing brand. Remember that brands can have internal organisation through tags, categories, and workflows.

If you have too many brands, consider consolidation. Perhaps regional variants don't need separate brands if they share most guidelines. Or temporary campaign brands could be archived once campaigns end. Regular portfolio review prevents brand sprawl.

### Permission Complexity

As organisations grow, permission management can become complex. Document your permission philosophy—who should access what and why. Use roles consistently across brands where possible. Regular audits help identify and rectify permission anomalies.

Consider creating permission templates for common scenarios. New marketing team members might always get editor access to marketing brands but viewer access to product brands. These templates speed onboarding whilst ensuring consistency.

### Brand Context Confusion

Users working across multiple brands sometimes lose track of their current context, potentially creating content for the wrong brand. MixerAI's visual indicators help, but reinforce awareness through training and process.

Encourage users to complete work for one brand before switching to another when possible. If parallel work is necessary, suggest using separate browser tabs with clear labelling. These practices reduce context confusion and associated errors.

## Conclusion

Brands in MixerAI provide powerful organisational capabilities that go far beyond simple categorisation. They enable true multi-tenant operations, allowing diverse teams to work independently whilst sharing infrastructure. Understanding how to configure and manage brands effectively is crucial for platform success.

Whether you're managing a single brand or a complex portfolio, the principles remain consistent: maintain clear identity, enforce appropriate boundaries, enable efficient operations, and regularly review and refine. With these practices, brands become not just organisational units but strategic tools that drive content excellence.