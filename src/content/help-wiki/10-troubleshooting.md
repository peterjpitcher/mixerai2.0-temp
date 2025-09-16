---
title: Troubleshooting Guide
---

# Troubleshooting Guide

When technology doesn't behave as expected, quick resolution is essential for maintaining productivity. This troubleshooting guide addresses common issues in MixerAI, providing practical solutions that get you back to creating content quickly.

## Quick Navigation
- [Login and Authentication](#login-and-authentication)
- [Dashboard and Navigation](#dashboard-and-navigation)
- [Content Management Issues](#content-management-issues)
- [AI Tools Problems](#ai-tools-problems)
- [Performance and Loading](#performance-and-loading)
- [Collaboration Features](#collaboration-features)
- [Getting Support](#getting-support)
- [Preventive Measures](#preventive-measures)

## Login and Authentication

### Cannot Access Your Account

The most frustrating experience is being locked out when you have work to do. Start with the basics: verify you're using the correct email address. It sounds simple, but typos in email addresses are surprisingly common, especially if you have multiple email accounts. Check whether you're using your work email versus personal email, and ensure you're typing the complete address including the domain.

Password problems often involve subtle issues. Caps Lock being on is the classic culprit, but also watch for accidentally holding Shift when typing numbers (producing symbols instead). If you're copying and pasting your password, ensure you're not including extra spaces at the beginning or end. Some password managers add invisible characters that cause authentication failures.

If basic troubleshooting doesn't work, your browser might be the issue. MixerAI uses cookies and local storage for authentication, and if these are blocked or corrupted, you won't be able to log in. Try opening MixerAI in an incognito or private browsing window—if this works, you likely have a browser data issue. Clear your browser's cookies and cache for the MixerAI domain, then try again with your regular browser window.

### Password Reset Not Working

When you request a password reset, MixerAI sends an email with a secure link to your registered address. If this email doesn't arrive within five minutes, check your spam or junk folder—corporate email filters sometimes misidentify password reset emails as suspicious because they contain links and arrive from automated systems.

The reset link expires after a set period for security reasons, typically within 24 hours. If you click an expired link, you'll need to request a new password reset. Don't repeatedly click "Forgot Password" if the first email hasn't arrived—this can trigger rate limiting that delays all emails. Wait at least 10 minutes between reset requests.

Some email systems quarantine emails with links, requiring administrator approval before delivery. If you consistently don't receive password reset emails, contact your IT department to whitelist MixerAI's email domain. They might need to add an exception for password reset emails specifically.

### Session Timeout Issues

MixerAI implements session timeouts for security, but these can be frustrating if they occur too frequently. Sessions typically last several hours of activity, but complete inactivity for an extended period triggers a logout. This protects your account if you forget to log out on a shared computer.

If you're experiencing frequent session timeouts during active use, your network might be the issue. Corporate VPNs sometimes rotate IP addresses, which security systems interpret as potential session hijacking. If you're using a VPN, try connecting directly to see if the problem persists. You might need to work with your IT team to configure the VPN for stable sessions.

Browser settings can also affect sessions. If you've configured your browser to delete cookies when closing, you'll need to log in every time you restart your browser. Consider adding an exception for MixerAI if your security policies permit. Similarly, aggressive privacy extensions might interfere with session management—try disabling them temporarily to identify if they're causing issues.

## Dashboard and Navigation

### Missing Features or Components

When expected features don't appear on your dashboard, permissions are usually the cause. MixerAI's role-based access control means different users see different features. Viewers won't see creation tools, editors won't see admin settings, and brand-specific features only appear when you have access to those brands.

Check your current context by looking at the brand indicator, usually displayed in the navigation or header. If you're in the wrong brand context, you won't see brand-specific features. Switch to the correct brand using the brand selector, and the appropriate features should appear. Remember that permissions can vary by brand—you might be an administrator in one brand but only a viewer in another.

If features that should be available based on your role are missing, your browser might not be loading the interface correctly. Modern web applications like MixerAI use JavaScript heavily, and if scripts fail to load or execute, parts of the interface won't appear. Check your browser's console (F12 in most browsers, then click Console tab) for red error messages. Screenshots of these errors help support diagnose issues quickly.

### Navigation Not Responding

When clicks on navigation items don't work, the application's JavaScript might have encountered an error. This can happen after network interruptions or when browser extensions interfere with the application. The immediate fix is usually refreshing the page (Ctrl+R or Cmd+R), which reloads all resources fresh.

If navigation remains unresponsive after refreshing, check whether you can right-click and open links in new tabs. If this works, the issue is with JavaScript event handlers rather than the links themselves. Clear your browser cache completely, not just for the current session. In Chrome, use Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac), select "Cached images and files", and choose "All time" for the time range.

Persistent navigation issues might indicate browser incompatibility. MixerAI supports modern versions of Chrome, Firefox, Safari, and Edge. If you're using an older browser or a less common one, upgrade or switch to a supported browser. Enterprise environments sometimes lag behind on browser updates—if your IT department controls browser versions, request an update to the latest stable version.

## Content Management Issues

### Content Not Saving

When your carefully crafted content won't save, don't panic—your work might not be lost. First, check for error messages that appear briefly at the top or bottom of the screen. These messages often explain exactly what's wrong: missing required fields, exceeded character limits, or network issues. Address the specific issue mentioned and try saving again.

Before troubleshooting further, protect your work. Select all your content (Ctrl+A or Cmd+A) and copy it (Ctrl+C or Cmd+C) to your clipboard. Better yet, paste it into a simple text editor as backup. This ensures you won't lose your work if you need to refresh the page or if the session times out during troubleshooting.

Network interruptions during saving can cause apparent failures even when the save actually succeeded. Check whether a draft was created by navigating to your content library and sorting by most recent. Your content might be there with a slightly earlier timestamp. If you find it, open it to verify it's complete, then continue editing from that saved version.

### Workflow Progression Blocked

Content stuck in workflow usually has a specific reason that the system can't automatically communicate. Start by checking the workflow history or activity log for your content—this often shows exactly where and why progression stopped. Perhaps a required reviewer is on holiday, a mandatory field wasn't completed, or parallel approval from multiple reviewers is needed.

If the workflow configuration has required fields or conditions for progression, these must all be met. Open your content in edit mode and look for any fields marked as required (usually with red asterisks). Even if you've filled these fields, the data might not have saved properly. Re-enter the information and save again, watching for confirmation that the save succeeded.

Sometimes workflow issues stem from permission changes made after content entered the workflow. If a reviewer's permissions were revoked or their account deactivated, the workflow can't proceed. Contact your workflow administrator or the person who configured the workflow. They can reassign the review task or modify the workflow to bypass the blocked stage.

### Version Conflicts

When multiple people edit content simultaneously, version conflicts can occur despite MixerAI's collaboration features. You might see a message that the content has been modified by another user, or your changes might not appear after saving. This typically happens when two people open the same content, make different changes, and both try to save.

To resolve version conflicts, first determine whose changes are more important. If your colleague's changes should take precedence, refresh your browser to load their version, then make your changes on top of theirs. If your changes are critical, coordinate with the other editor—ask them to pause while you save your version, then they can build upon your changes.

Prevent future conflicts by communicating with your team about who's editing what. Use MixerAI's task assignment or commenting features to claim content you're about to edit. Consider establishing editing windows where only one person works on specific content at certain times. For critical content with multiple contributors, nominate a lead editor who coordinates all changes.

## AI Tools Problems

### Generation Failures

When AI tools fail to generate content, the issue usually involves credits, input validation, or service availability. First, check your credit balance—it appears on the Tools page. If you're out of credits, you'll need to wait for the monthly refresh or request additional credits from your administrator. Credit exhaustion is common near month-end for active users.

Input validation is stricter than you might expect. The Alt Text Generator needs valid image files in supported formats (JPEG, PNG, GIF, WebP) under size limits. The Metadata Generator requires sufficient text content to analyse—a few words won't provide enough context. The Content Transcreator needs clear source content and valid target language selection. Read error messages carefully as they usually specify what's wrong with your input.

If credits are available and input seems valid, the Azure OpenAI service might be experiencing issues. These are typically temporary—wait a few minutes and try again. If you're generating content for time-sensitive needs, have a backup plan. The system includes fallback mechanisms, but these might produce simpler results than the full AI service.

### Poor Quality AI Output

When AI-generated content doesn't meet expectations, the problem often lies in insufficient or unclear input context. The AI tools work best with specific, detailed inputs. For the Alt Text Generator, provide context about the image's purpose—is it decorative, informational, or functional? For the Metadata Generator, include target keywords and audience information. For the Content Transcreator, specify tone and adaptation level.

Consider the limitations of AI-generated content. These tools excel at routine tasks but might struggle with highly creative or nuanced requirements. They're designed as assistants, not replacements for human creativity. Always review and refine AI output rather than using it verbatim. Think of the AI as providing a solid first draft that you polish to perfection.

If quality issues persist across multiple attempts with different inputs, document specific examples and report them to support. Include your input, the output you received, and what you expected instead. This feedback helps improve the AI models and might reveal configuration issues specific to your organisation's implementation.

## Performance and Loading

### Slow Page Loading

When MixerAI pages load slowly, start by isolating whether it's a general problem or specific to your setup. Ask a colleague if they're experiencing similar slowness—if they are, it's likely a platform or network issue that IT or MixerAI support needs to address. If you're the only one affected, the problem is local to your setup.

Browser performance degrades over time as cache accumulates and extensions consume resources. Close all browser tabs except MixerAI and see if performance improves. If it does, you might be pushing your computer's memory limits. Consider upgrading your RAM or closing unnecessary applications when using MixerAI. Modern web applications are resource-intensive, and 8GB of RAM is really the minimum for smooth operation.

Network quality matters more than raw speed for web applications. A fast connection with high latency or packet loss performs worse than a slower but stable connection. Run a speed test that includes latency (ping) measurements. If latency exceeds 100ms or you see packet loss, work with your IT team to identify network issues. Sometimes simply moving closer to your WiFi router or using an ethernet cable solves performance problems.

### Interface Freezing

When the MixerAI interface becomes unresponsive or freezes, your browser might be struggling with memory management or JavaScript execution. Modern browsers are good at recovering from these issues, but sometimes they need help. Wait about 30 seconds to see if the browser recovers on its own—you might see a "Page Unresponsive" dialog offering to wait or kill the page.

If the freeze persists, check your browser's task manager (Shift+Esc in Chrome) to see if the MixerAI tab is consuming excessive memory or CPU. Screenshots of high resource usage help support diagnose issues. You might need to force-close the tab and restart, but remember to copy any unsaved work first if possible.

Certain browser extensions, particularly ad blockers and privacy tools, can interfere with web applications and cause freezing. Disable all extensions temporarily and see if the freezing stops. If it does, re-enable extensions one by one to identify the problematic one. You might need to add MixerAI to the extension's whitelist or find an alternative extension that doesn't cause conflicts.

## Collaboration Features

### Comments Not Appearing

When comments you post don't appear, or you can't see comments others claim to have made, synchronisation is usually the issue. Comments in MixerAI update in near real-time, but network issues can delay synchronisation. Wait a moment, then refresh the page. If comments appear after refreshing, you're experiencing synchronisation delays.

Check that you're viewing the correct version of the content. If content has multiple versions or drafts, comments might be attached to a different version than you're viewing. Navigate to the version history and check if comments appear on other versions. This commonly happens when content is duplicated or restored from an earlier version.

Permission restrictions can also affect comment visibility. Some organisations configure MixerAI so comments are only visible to certain roles or within specific workflow stages. If you're a viewer, you might not see internal editorial comments. Check with your administrator about comment visibility policies for your role and the specific content type.

### @Mentions Not Working

The @mention system requires exact username matches to trigger notifications. When you type @, a dropdown should appear with matching users. If this dropdown doesn't appear, the mention feature might not be available in that context, or JavaScript might not be loading correctly. Try refreshing the page and attempting the mention again.

If the dropdown appears but doesn't include the person you're trying to mention, they might not have access to that content or brand. MixerAI only shows users who can actually see the content you're commenting on. Verify the person has appropriate permissions for the content's brand and isn't a deactivated user.

When mentions work but don't trigger notifications, the mentioned user's notification settings might have mentions disabled. Ask them to check their notification preferences in account settings. Also verify their email isn't blocking MixerAI notifications—they should check their spam folder and consider whitelisting MixerAI's sending domain.

## Getting Support

### Documenting Issues Effectively

When you need to contact support, thorough documentation dramatically speeds resolution. Start with a clear, specific description of the problem. "Content won't save" is less helpful than "When I click Save on blog posts over 1000 words in the Technology brand, I get a 'Network Error' message and my changes are lost."

Screenshots are invaluable but take them strategically. Capture error messages completely, including any technical details. Show the URL in your browser's address bar as it contains important context. If the issue involves specific content or settings, capture those too, but be mindful of sensitive information—blur or redact confidential content before sharing screenshots.

Document the steps to reproduce the issue. Support needs to recreate your problem to diagnose it effectively. Write steps clearly: "1. Log in as Editor role, 2. Navigate to Brand X, 3. Open any content in draft status, 4. Add text to exceed 5000 characters, 5. Click Save button, 6. Error appears." If the issue is intermittent, note how often it occurs and any patterns you've noticed.

### Information to Gather

Before contacting support, gather technical information that helps diagnose issues. Your browser and version matter—find this in your browser's About section (usually under Help menu). Note your operating system (Windows 10, macOS Ventura, etc.). If you're in a corporate environment, mention any VPN, proxy, or special network configuration.

Timing information helps identify systemic issues. Note when the problem started, whether it's consistent or intermittent, and if it correlates with any changes (new browser, Windows update, MixerAI feature release). If multiple users are affected, note who and what they have in common—same department, role, or location.

Check the browser console for technical errors. Open developer tools (F12 in most browsers), click the Console tab, and look for red error messages. You don't need to understand these messages—just screenshot them for support. Clear the console, reproduce your issue, then screenshot any new errors that appear. These technical details often lead directly to solutions.

### When to Escalate

Most issues resolve through standard support channels, but some situations require escalation. If you're completely blocked from working and have a critical deadline, make this clear in your support request. Use subject lines like "URGENT: Cannot access platform - launch deadline today" to convey urgency appropriately.

Security concerns always warrant immediate escalation. If you suspect your account is compromised, see suspicious activity, or discover potential data exposure, contact support immediately through the most direct channel available. Don't wait or try to investigate yourself—security issues require professional handling.

When an issue affects multiple users or entire teams, consolidate feedback before contacting support. Have one person compile everyone's experiences, noting commonalities and differences. This coordinated approach prevents duplicate tickets and helps support understand the issue's scope. Include a list of affected users and their roles to help support prioritise and investigate efficiently.

## Preventive Measures

### Regular Maintenance

Prevent many issues through routine maintenance of your browser and workspace. Weekly cache clearing prevents accumulation of outdated data that causes strange behaviour. In your browser settings, clear cached images and files but preserve passwords and form data unless you're experiencing specific issues with those features.

Keep your browser updated to the latest stable version. Modern browsers update automatically, but enterprise environments sometimes delay updates. Check your version monthly and request updates from IT if you're behind. Each browser version includes bug fixes and performance improvements that benefit web applications like MixerAI.

Review your browser extensions quarterly. Extensions update independently and can introduce incompatibilities. Remove extensions you no longer use, update those you keep, and check whether any have been flagged for security issues. A lean extension profile improves both performance and security.

### Workspace Optimisation

Your digital workspace affects MixerAI performance. Close unnecessary browser tabs—each consumes memory even when inactive. If you need many tabs open, consider using a separate browser or browser profile for MixerAI. This isolation prevents other sites from affecting MixerAI's performance.

Monitor your computer's resource usage, especially if you experience performance issues. On Windows, use Task Manager (Ctrl+Shift+Esc). On Mac, use Activity Monitor. If memory usage exceeds 80% consistently, you need more RAM or need to close applications. If CPU usage spikes during MixerAI use, identify whether it's the browser or another process causing the spike.

Maintain a stable internet connection for optimal experience. If using WiFi, position yourself with clear line-of-sight to the router when possible. For critical work sessions, consider using ethernet connections which provide more consistent performance. If you frequently work from different locations, test MixerAI's performance at each to identify any location-specific issues.

### Proactive Communication

Stay informed about platform updates and maintenance windows. MixerAI typically announces maintenance in advance through email or platform notifications. Add these to your calendar and plan accordingly—don't start critical work just before maintenance windows.

Join user communities or forums if available. Other users often discover workarounds for common issues before official fixes are released. Share your own solutions too—the issue you solved today might help someone else tomorrow. Community knowledge supplements official support effectively.

Provide feedback about issues even if you find workarounds. If something's broken but you've adapted, support might not know there's a problem. Report issues through proper channels so they can be fixed permanently. Include your workaround in the report—it helps support understand both the problem and potential solutions.

## Conclusion

Troubleshooting issues in MixerAI doesn't require technical expertise—it requires systematic thinking and clear communication. Most problems have simple solutions: refreshing pages, clearing caches, checking permissions, or waiting for synchronisation. When simple solutions don't work, gathering specific information and documenting issues clearly leads to quick resolution.

Remember that support teams want to help but need your partnership. The more specific information you provide, the faster they can diagnose and resolve issues. Screenshots, error messages, and reproduction steps transform vague problems into solvable tickets.

Maintain perspective when encountering issues. Technology occasionally misbehaves, but MixerAI is continuously improved based on user experiences. Today's frustrating bug becomes tomorrow's release note about a fixed issue. Your patience and constructive feedback contribute to a better platform for everyone.