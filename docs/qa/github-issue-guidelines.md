# GitHub Issue Logging Guidelines for MixerAI 2.0

## Overview
This document provides standardized guidelines for logging issues in the MixerAI 2.0 GitHub repository. Following these guidelines ensures efficient issue tracking, faster resolution, and better communication between QA and development teams.

## Issue Types & Labels

### Bug Report
**Label:** `bug`  
**When to use:** When the application behaves differently than expected or documented

### Enhancement Request  
**Label:** `enhancement`  
**When to use:** For feature improvements or new functionality suggestions

### Documentation Issue
**Label:** `documentation`  
**When to use:** For missing, incorrect, or unclear documentation

### Performance Issue
**Label:** `performance`  
**When to use:** For slow loading, timeouts, or resource usage problems

### Security Issue
**Label:** `security`  
**When to use:** For potential security vulnerabilities
**Note:** For critical security issues, also notify the team directly via Slack

## Priority Labels

### P0 - Critical
**Label:** `priority:critical`
- System is completely unusable
- Data loss or corruption
- Security vulnerability
- Affects all users

### P1 - High  
**Label:** `priority:high`
- Core functionality broken
- Blocks user workflow
- Affects many users
- No workaround available

### P2 - Medium
**Label:** `priority:medium`  
- Feature partially broken
- Workaround available
- Affects some users
- Degraded user experience

### P3 - Low
**Label:** `priority:low`
- Cosmetic issues
- Minor inconvenience
- Edge cases
- Nice-to-have improvements

## Issue Title Format

Use clear, descriptive titles following this pattern:

```
[Component] Brief description of issue
```

### Examples:
- `[Content Generator] Generate button disabled after validation error`
- `[Auth] Password reset link expires too quickly`
- `[UI] Dashboard cards misaligned on tablet view`
- `[API] Rate limit error message unclear`

### Component Tags:
- `[Auth]` - Authentication/Authorization
- `[Content Generator]` - Content generation features
- `[Content Library]` - Content management
- `[Brands]` - Brand management
- `[Claims]` - Claims management
- `[Users]` - User management
- `[Workflow]` - Approval workflow
- `[Tools]` - Tools suite (alt-text, metadata, etc.)
- `[API]` - API endpoints
- `[UI]` - User interface
- `[Performance]` - Performance issues
- `[Security]` - Security concerns

## Issue Template

### Bug Report Template

```markdown
## Bug Description
[Clear, concise description of the bug]

## Environment
- **Environment:** [Production/Staging/Development]
- **Browser:** [e.g., Chrome 119.0.6045.123]
- **OS:** [e.g., macOS 14.1, Windows 11]
- **Device:** [Desktop/Tablet/Mobile]
- **Screen Resolution:** [e.g., 1920x1080]
- **User Role:** [Admin/Manager/User]
- **Account:** [test account email]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Continue with clear, numbered steps]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Visual Evidence
[Screenshots, GIFs, or videos showing the issue]
![Screenshot description](url)

## Console Errors
```
[Paste any console errors here]
```

## Network Information
- **Failed Requests:** [Include failed network requests]
- **Response Codes:** [e.g., 404, 500]
- **Response Time:** [If performance-related]

## Additional Context
[Any other relevant information, such as:]
- Does this happen consistently or intermittently?
- When did this start happening?
- Is there a workaround?

## Impact
- **Users Affected:** [All/Some/Specific role]
- **Frequency:** [Always/Sometimes/Rarely]
- **Business Impact:** [High/Medium/Low]
```

### Enhancement Request Template

```markdown
## Feature Description
[Clear description of the requested enhancement]

## User Story
As a [type of user], I want [goal] so that [benefit].

## Current Behavior
[How it works now]

## Desired Behavior
[How you want it to work]

## Mockups/Examples
[Include any mockups, wireframes, or examples]

## Business Value
[Why this enhancement is important]

## Acceptance Criteria
- [ ] [Specific criterion 1]
- [ ] [Specific criterion 2]
- [ ] [Additional criteria...]
```

## Screenshot Guidelines

### What to Include in Screenshots:
1. **Full browser window** when UI layout is important
2. **Highlight the issue** with arrows or boxes
3. **Include browser DevTools** if showing console errors
4. **Show relevant UI state** (modals, dropdowns, etc.)

### How to Annotate:
- Use red arrows/boxes for problems
- Use green for expected behavior
- Add text labels when needed
- Blur sensitive data

### Tools Recommended:
- **Mac:** CleanShot X, Skitch, or built-in screenshot
- **Windows:** Snipping Tool, ShareX
- **Chrome Extension:** Awesome Screenshot

## Video Recording Guidelines

### When to Include Video:
- Multi-step reproduction scenarios
- Intermittent issues
- Performance problems
- Complex interactions

### What to Show:
1. Start from a clean state
2. Show all steps clearly
3. Pause on error states
4. Include audio narration if helpful

### Recommended Tools:
- **Loom** (includes instant sharing)
- **OBS Studio** (for detailed recordings)
- **Chrome DevTools Recorder**

## Console & Network Information

### Console Errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Reproduce the issue
5. Screenshot or copy all errors
6. Include stack traces

### Network Issues:
1. Open DevTools Network tab
2. Clear network log
3. Reproduce the issue
4. Screenshot failed requests
5. Include:
   - Request URL
   - Status code
   - Response headers
   - Response body
   - Timing information

## Best Practices

### DO:
- ✅ Search existing issues before creating new ones
- ✅ One issue per problem (don't combine multiple bugs)
- ✅ Include all reproduction steps
- ✅ Test in incognito/private mode
- ✅ Mention if it's a regression
- ✅ Link related issues
- ✅ Use proper markdown formatting
- ✅ Respond to developer questions promptly
- ✅ Verify fixes and close issues

### DON'T:
- ❌ Use vague titles like "Button doesn't work"
- ❌ Skip reproduction steps
- ❌ Combine multiple issues in one ticket
- ❌ Include production passwords or tokens
- ❌ Use acronyms without explanation
- ❌ Assume developers know the context
- ❌ Close issues without verification

## Issue Lifecycle

### 1. Creation
- QA creates issue with all required information
- Assigns appropriate labels
- Sets priority

### 2. Triage
- Development team reviews
- May ask for clarification
- Assigns to developer

### 3. In Progress
- Developer works on fix
- May request additional information
- Links to PR when ready

### 4. Testing
- QA tests the fix
- Verifies in appropriate environment
- Either approves or reopens

### 5. Closed
- Issue resolved and verified
- Documented in release notes if needed

## Examples of Well-Written Issues

### Good Bug Report Example:

**Title:** `[Content Generator] Character count shows negative values when pasting content`

**Body:**
```markdown
## Bug Description
When pasting content that exceeds the character limit into the content generator, the character counter displays negative values instead of preventing the paste or truncating the content.

## Environment
- **Environment:** Staging
- **Browser:** Chrome 119.0.6045.123
- **OS:** macOS 14.1
- **Device:** Desktop
- **User Role:** User
- **Account:** [test account used]

## Steps to Reproduce
1. Navigate to Content Generator (/dashboard/content-generator)
2. Select "Social Media Post" type
3. Copy text longer than 280 characters
4. Paste into content field
5. Observe character counter

## Expected Behavior
Either:
- Paste should be truncated to 280 characters, OR
- Paste should be prevented with a warning message

## Actual Behavior
- Full text is pasted
- Character counter shows "-142 characters remaining" (in red)
- Can still submit the form

## Visual Evidence
![Negative character count](link-to-screenshot)

## Console Errors
No console errors observed

## Additional Context
- This happens with all paste methods (Ctrl+V, right-click paste)
- Manual typing correctly prevents exceeding the limit
- Issue started after the v2.3.0 release

## Impact
- **Users Affected:** All users using content generator
- **Frequency:** Always when pasting long content
- **Business Impact:** Medium - could lead to failed social media posts
```

### Good Enhancement Example:

**Title:** `[Content Library] Add bulk content status change feature`

**Body:**
```markdown
## Feature Description
Add the ability to change the status of multiple content items at once in the Content Library.

## User Story
As a Content Manager, I want to bulk update content status so that I can efficiently manage large content campaigns.

## Current Behavior
- Must click into each content item individually
- Change status one at a time
- Time-consuming for campaigns with 50+ pieces

## Desired Behavior
- Select multiple items via checkboxes
- Bulk actions menu appears
- Option to change status to: Draft, Published, Archived
- Confirmation dialog shows number of items affected

## Mockups/Examples
![Bulk selection mockup](link-to-mockup)

## Business Value
- Saves 10-15 minutes per campaign
- Reduces errors from repetitive actions
- Improves content manager efficiency

## Acceptance Criteria
- [ ] Can select up to 100 items at once
- [ ] Shows count of selected items
- [ ] Confirmation required for status change
- [ ] Success/error message shows results
- [ ] Audit log tracks bulk changes
```

## Quick Reference Checklist

Before submitting an issue, ensure you have:

- [ ] Searched for existing similar issues
- [ ] Used clear, descriptive title with [Component] tag
- [ ] Selected appropriate issue type label
- [ ] Added priority label
- [ ] Included all environment details
- [ ] Provided clear reproduction steps
- [ ] Added screenshots or video if applicable
- [ ] Included console/network errors if relevant
- [ ] Described business impact
- [ ] Removed any sensitive data
- [ ] Used the appropriate template

## Communication Guidelines

### Response Times
- **P0 (Critical):** Expect response within 1 hour
- **P1 (High):** Expect response within 4 hours
- **P2 (Medium):** Expect response within 1 business day
- **P3 (Low):** Expect response within 3 business days

### When to Escalate
Escalate via [TEAM_COMMUNICATION_CHANNEL] if:
- P0 issue not acknowledged within 1 hour
- Security vulnerability discovered
- Issue blocking release
- Need immediate clarification

### Follow-up Comments
When adding comments:
- @ mention relevant team members
- Provide new information only
- Update if reproduction steps change
- Confirm when fix is verified

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Questions? Contact: [DEVELOPMENT_TEAM_CONTACT - to be provided]*