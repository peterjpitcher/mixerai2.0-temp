#!/bin/bash

# Security Issues
echo "Creating individual security issues..."

# Issue 1: API Key Exposed
gh issue create --title "[Security] API Key Exposed in Console Logs" --body "## Priority: 🔴 CRITICAL

**Description:** The OpenAI API key is being logged to the console in production code.

**Location:** \`/src/lib/azure/openai.ts\` line 23

**Risk:** API keys in logs can be harvested from browser console, server logs, or error tracking services.

**Fix Required:**
\`\`\`typescript
// Remove this line:
console.log('[Azure OpenAI] Using API key:', apiKey);
\`\`\`

**Impact:** High - Immediate risk of API key theft and abuse"

# Issue 2: XSS Vulnerability
gh issue create --title "[Security] XSS Vulnerability in Markdown Rendering" --body "## Priority: 🔴 CRITICAL

**Description:** User-generated content is rendered as HTML without sanitization, allowing script injection.

**Location:** \`/src/components/content/markdown-display.tsx\`

**Vulnerable Code:**
\`\`\`tsx
<div dangerouslySetInnerHTML={{ __html: htmlContent }} />
\`\`\`

**Fix Required:** Implement DOMPurify or similar HTML sanitization library before rendering.

**Example Fix:**
\`\`\`tsx
import DOMPurify from 'isomorphic-dompurify';
const sanitizedHtml = DOMPurify.sanitize(htmlContent);
\`\`\`"

# Issue 3: Missing CSRF Protection
gh issue create --title "[Security] Missing CSRF Protection on API Routes" --body "## Priority: 🔴 CRITICAL

**Description:** API routes lack CSRF token validation, vulnerable to cross-site request forgery.

**Affected Routes:**
- \`/api/content/generate\`
- \`/api/brands/[brandId]\`
- \`/api/users/[userId]\`
- All POST/PUT/DELETE endpoints

**Fix Required:** Implement CSRF token generation and validation for state-changing operations."

# Issue 4: Weak Password Policy
gh issue create --title "[Security] Weak Password Requirements" --body "## Priority: 🟡 HIGH

**Description:** Password minimum length of 6 characters is insufficient.

**Location:** \`/src/app/(auth)/signup/page.tsx\`

**Current:** 6 character minimum
**Recommended:** 12+ characters with complexity requirements

**Fix:** Update password validation schema and add password strength indicator."

# Issue 5: Session Management Issues
gh issue create --title "[Security] Improper Session Invalidation" --body "## Priority: 🟡 HIGH

**Description:** Sessions aren't properly invalidated on logout, and no session timeout exists.

**Issues:**
- No automatic session expiration
- Logout doesn't invalidate server-side session
- No re-authentication for sensitive operations

**Fix Required:** Implement proper session lifecycle management with timeouts."

# Issue 6: Database Connection Exposure
gh issue create --title "[Security] Database Connection String in Logs" --body "## Priority: 🟡 HIGH

**Description:** Database connection strings may be exposed in error logs.

**Risk:** Connection strings contain credentials that could allow unauthorized database access.

**Fix:** 
- Remove all database URL logging
- Implement structured logging that filters sensitive data
- Use connection pooling with secure credential management"

# Issue 7: API Rate Limiting Missing
gh issue create --title "[Security] No API Rate Limiting" --body "## Priority: 🟠 MEDIUM

**Description:** API endpoints lack rate limiting, vulnerable to abuse and DDoS.

**Affected:** All public API endpoints

**Fix Required:**
- Implement rate limiting middleware
- Add per-user/IP rate limits
- Consider implementing API quotas"

# Issue 8: File Upload Validation
gh issue create --title "[Security] Insufficient File Upload Validation" --body "## Priority: 🟠 MEDIUM

**Description:** Image upload endpoints don't properly validate file types and sizes.

**Location:** \`/src/app/api/upload/route.ts\`

**Issues:**
- No file type validation beyond extension
- No file size limits
- No virus scanning
- Stored with predictable names

**Fix:** Implement comprehensive file validation and scanning"

# Issue 9: Error Information Disclosure
gh issue create --title "[Security] Sensitive Information in Error Messages" --body "## Priority: 🟠 MEDIUM

**Description:** Stack traces and internal errors exposed to users.

**Example:** Database errors show table structures and queries

**Fix Required:**
- Implement error boundaries
- Create user-friendly error messages
- Log detailed errors server-side only"

# Issue 10: Insecure Dependencies
gh issue create --title "[Security] Multiple Dependencies with Known Vulnerabilities" --body "## Priority: 🟢 LOW

**Description:** Several npm packages have known security vulnerabilities.

**Action Required:**
1. Run \`npm audit\`
2. Update vulnerable dependencies
3. Implement automated dependency scanning
4. Regular security updates schedule

**Note:** Some updates may require code changes due to breaking changes"

echo "Security issues created successfully!"