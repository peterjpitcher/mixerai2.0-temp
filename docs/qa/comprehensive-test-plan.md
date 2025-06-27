# MixerAI 2.0 - Comprehensive Test Plan

## Table of Contents
1. [Test Environment Setup](#test-environment-setup)
2. [Authentication & Authorization Tests](#authentication--authorization-tests)
3. [Dashboard Tests](#dashboard-tests)
4. [Content Generator Tests](#content-generator-tests)
5. [Content Library Tests](#content-library-tests)
6. [Brand Management Tests](#brand-management-tests)
7. [Claims Management Tests](#claims-management-tests)
8. [User Management Tests](#user-management-tests)
9. [Tools Suite Tests](#tools-suite-tests)
10. [Workflow Tests](#workflow-tests)
11. [API Tests](#api-tests)
12. [Performance Tests](#performance-tests)
13. [Security Tests](#security-tests)
14. [Responsive Design Tests](#responsive-design-tests)
15. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Test Environment Setup

### Prerequisites
1. Access to test environment URL
2. Test accounts for each role:
   - Admin: [ADMIN_TEST_ACCOUNT - to be provided]
   - Manager: [MANAGER_TEST_ACCOUNT - to be provided]
   - User: [USER_TEST_ACCOUNT - to be provided]
3. Test brand: "Test Brand Alpha"
4. Chrome DevTools for network monitoring

### Initial Setup Checklist
- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions
- [ ] Open DevTools Console (no errors should appear)
- [ ] Set network throttling to "Fast 3G" for some tests
- [ ] Have test images ready (various sizes)

---

## Authentication & Authorization Tests

### AUTH-001: Login Flow
**Steps:**
1. Navigate to `/auth/login`
2. Enter valid email and password
3. Click "Sign In"

**Expected:**
- Redirected to dashboard within 3 seconds
- User menu shows correct name
- No console errors

### AUTH-002: Invalid Login
**Steps:**
1. Navigate to `/auth/login`
2. Enter invalid credentials
3. Click "Sign In"

**Expected:**
- Error message: "Invalid email or password"
- Remains on login page
- Password field cleared

### AUTH-003: Password Reset Flow
**Steps:**
1. Click "Forgot password?" on login page
2. Enter registered email
3. Click "Send reset link"
4. Check email for reset link
5. Click link and set new password
6. Login with new password

**Expected:**
- Success message after requesting reset
- Email received within 2 minutes
- Reset link valid for 1 hour
- Can login with new password

### AUTH-004: Session Management
**Steps:**
1. Login successfully
2. Keep browser open for 25 hours
3. Try to perform an action

**Expected:**
- Session expires after 24 hours
- Redirected to login with message
- After re-login, returned to previous page

### AUTH-005: Concurrent Sessions
**Steps:**
1. Login on Browser A
2. Login on Browser B with same account
3. Perform actions on both

**Expected:**
- Both sessions remain active
- Actions sync between sessions

### AUTH-006: Logout
**Steps:**
1. Click user menu
2. Click "Logout"
3. Try to access `/dashboard`

**Expected:**
- Redirected to login page
- Cannot access protected pages
- Browser back button doesn't show protected content

### AUTH-007: Role-Based Access
**For each role (Admin, Manager, User):**
1. Login with role account
2. Check menu items available
3. Try accessing restricted URLs directly

**Expected:**
- Admin: All menu items visible
- Manager: No "System Settings" menu
- User: No "Users", "Brands", or approval functions
- 403 error when accessing unauthorized URLs

---

## Dashboard Tests

### DASH-001: Dashboard Loading
**Steps:**
1. Login and navigate to dashboard
2. Observe loading states
3. Check all widgets load

**Expected:**
- Loading skeletons appear immediately
- All widgets load within 3 seconds
- No layout shift after loading

### DASH-002: Quick Stats
**Steps:**
1. Check quick stats cards
2. Compare with actual data in system

**Expected:**
- Total content count accurate
- Pending approvals count accurate
- Active users count accurate
- Numbers update in real-time

### DASH-003: Recent Activity
**Steps:**
1. Check recent activity feed
2. Perform an action (create content)
3. Return to dashboard

**Expected:**
- Shows last 10 activities
- New activity appears at top
- Timestamps are relative (e.g., "2 min ago")
- Click on activity navigates to item

### DASH-004: Navigation
**Steps:**
1. Click each navigation menu item
2. Use breadcrumbs to navigate back
3. Use browser back button

**Expected:**
- All links work correctly
- Breadcrumbs show correct path
- Browser navigation works properly
- Active menu item highlighted

---

## Content Generator Tests

### CG-001: Content Type Selection
**Steps:**
1. Navigate to Content Generator
2. Click each content type card

**Expected:**
- All content types clickable
- Correct form loads for each type
- Form fields match content type

### CG-002: Basic Content Generation
**Steps:**
1. Select "Social Media Post"
2. Fill in all required fields:
   - Product: "Test Product"
   - Key Features: "Feature 1, Feature 2"
   - Target Audience: "Young Adults"
   - Tone: "Professional"
3. Click "Generate Content"

**Expected:**
- Loading spinner appears
- Content generated within 30 seconds
- Generated content appears in preview
- Copy button works
- Character count displayed

### CG-003: Template Selection
**Steps:**
1. Select content type with templates
2. Choose different templates
3. Observe form changes

**Expected:**
- Template dropdown populated
- Form updates based on template
- Template preview available
- Default values populated

### CG-004: Auto-Save Functionality
**Steps:**
1. Start creating content
2. Fill in some fields
3. Wait 3 seconds
4. Refresh page
5. Return to content generator

**Expected:**
- "Saving..." indicator appears
- After refresh, draft is available
- Can restore previous work
- Auto-save every 3 seconds of inactivity

### CG-005: Multiple Generations
**Steps:**
1. Generate content
2. Click "Generate Again" 
3. Compare results

**Expected:**
- New unique content generated
- Previous generation saved in history
- Can switch between versions
- Each has unique timestamp

### CG-006: Save and Submit
**Steps:**
1. Generate content
2. Edit the generated content
3. Click "Save as Draft"
4. Click "Submit for Approval"

**Expected:**
- Draft saved successfully
- After submit, status shows "Pending"
- Email sent to approvers
- Cannot edit after submission

### CG-007: Input Validation
**Steps:**
1. Try submitting empty form
2. Exceed character limits
3. Enter invalid data types

**Expected:**
- Required field errors shown
- Character counter turns red at limit
- Cannot exceed maximum length
- Clear error messages

### CG-008: Brand Context
**Steps:**
1. Switch brands (if multiple)
2. Generate content
3. Check brand voice applied

**Expected:**
- Content uses brand guidelines
- Brand logo in preview (if applicable)
- Tone matches brand settings

---

## Content Library Tests

### CL-001: Content List View
**Steps:**
1. Navigate to Content Library
2. Check list loads properly

**Expected:**
- Shows 20 items per page
- Pagination controls work
- Sort options available
- Each item shows: title, type, status, date

### CL-002: Search Functionality
**Steps:**
1. Search by keyword
2. Clear search
3. Search with no results

**Expected:**
- Results update as you type
- Clear button works
- "No results" message for empty search
- Search highlights matched terms

### CL-003: Filtering
**Steps:**
1. Filter by content type
2. Filter by status
3. Filter by date range
4. Combine multiple filters

**Expected:**
- Each filter updates results
- Filter counts accurate
- Can clear individual filters
- URL updates with filter state

### CL-004: Bulk Operations
**Steps:**
1. Select multiple items
2. Try bulk delete
3. Try bulk export

**Expected:**
- Checkbox selection works
- "Select all" option available
- Bulk actions menu appears
- Confirmation dialog for destructive actions

### CL-005: Content Details
**Steps:**
1. Click on content item
2. Check all details displayed
3. Check version history

**Expected:**
- Full content displayed
- Metadata shown (creator, dates)
- Version history accessible
- Can restore previous versions

### CL-006: Content Editing
**Steps:**
1. Click "Edit" on draft content
2. Make changes
3. Save changes

**Expected:**
- Edit button only on editable content
- Changes saved successfully
- Version history updated
- Timestamp updated

### CL-007: Content Export
**Steps:**
1. Select content item
2. Click export
3. Choose format (PDF, TXT)

**Expected:**
- Export completes within 5 seconds
- File downloads automatically
- Content formatted correctly
- Includes metadata

### CL-008: Delete Content
**Steps:**
1. Click delete on item
2. Confirm deletion
3. Check item removed

**Expected:**
- Confirmation dialog appears
- Soft delete (can be restored)
- Success message shown
- Removed from list immediately

---

## Brand Management Tests

### BM-001: Brand List
**Steps:**
1. Navigate to Brands (Admin only)
2. Check brand list

**Expected:**
- All brands listed
- Shows brand name, users count
- Create button visible
- Search/filter works

### BM-002: Create Brand
**Steps:**
1. Click "Create Brand"
2. Fill in brand details:
   - Name: "Test Brand Beta"
   - Description: "Test description"
   - Industry: Select from dropdown
3. Upload logo (optional)
4. Save

**Expected:**
- Form validation works
- Logo preview shown
- Brand created successfully
- Appears in list immediately

### BM-003: Brand Settings
**Steps:**
1. Click on brand to edit
2. Update brand voice settings:
   - Tone: Professional
   - Style: Concise
   - Key phrases: "innovation, quality"
3. Save changes

**Expected:**
- All fields editable
- Changes saved successfully
- Used in content generation

### BM-004: Brand Assets
**Steps:**
1. Upload brand logo
2. Upload brand colors
3. Add brand guidelines document

**Expected:**
- File upload progress shown
- Image preview available
- File size limits enforced (5MB)
- Can delete/replace assets

### BM-005: Brand Users
**Steps:**
1. View users assigned to brand
2. Add user to brand
3. Remove user from brand

**Expected:**
- User list shows roles
- Can assign existing users
- Removal requires confirmation
- Changes take effect immediately

---

## Claims Management Tests

### CM-001: Claims List
**Steps:**
1. Navigate to Claims
2. View claims list

**Expected:**
- Paginated list loads
- Shows claim, category, markets
- Search functionality works
- Sort options available

### CM-002: Create Claim
**Steps:**
1. Click "Add Claim"
2. Fill in:
   - Claim text: "Reduces wrinkles by 50%"
   - Category: "Efficacy"
   - Supporting data: "Study reference"
   - Markets: Select multiple
3. Save

**Expected:**
- Form validation for required fields
- Multi-select for markets works
- Claim saved successfully
- Appears in list

### CM-003: Market Overrides
**Steps:**
1. Edit existing claim
2. Add market override:
   - Market: "EU"
   - Override text: "Helps reduce appearance of wrinkles"
3. Save

**Expected:**
- Override section available
- Can add multiple overrides
- Original claim preserved
- Override shown for market

### CM-004: Bulk Import
**Steps:**
1. Click "Import Claims"
2. Download template
3. Fill template with test data
4. Upload file

**Expected:**
- Template downloads correctly
- Upload progress shown
- Validation errors displayed
- Success count shown
- Claims added to system

### CM-005: Claims Search
**Steps:**
1. Search by keyword
2. Filter by category
3. Filter by market

**Expected:**
- Real-time search results
- Filters combine correctly
- Results count updated
- Can clear filters

### CM-006: Claims in Content Generation
**Steps:**
1. Go to Content Generator
2. Select product with claims
3. Generate content

**Expected:**
- Claims available for selection
- Market-specific claims shown
- Claims incorporated in content
- Compliance maintained

---

## User Management Tests

### UM-001: User List
**Steps:**
1. Navigate to Users (Admin/Manager)
2. View user list

**Expected:**
- All users listed
- Shows name, email, role, status
- Pagination works
- Search by name/email works

### UM-002: Invite User
**Steps:**
1. Click "Invite User"
2. Enter email: newuser@test.com
3. Select role: User
4. Select brands
5. Send invitation

**Expected:**
- Email validation works
- Role selection required
- At least one brand required
- Invitation email sent
- User appears as "Invited" status

### UM-003: User Accepts Invitation
**Steps:**
1. Check invitation email
2. Click invitation link
3. Set password
4. Complete profile

**Expected:**
- Link valid for 7 days
- Password requirements shown
- Account activated after completion
- Can login immediately

### UM-004: Edit User
**Steps:**
1. Click edit on user
2. Change role to Manager
3. Add another brand
4. Save changes

**Expected:**
- Can change role (Admin only)
- Can modify brand access
- Cannot remove last admin
- Changes apply immediately

### UM-005: Deactivate User
**Steps:**
1. Click deactivate on user
2. Confirm action
3. Check user status

**Expected:**
- Confirmation required
- User marked as inactive
- User cannot login
- Can reactivate later

### UM-006: User Activity Log
**Steps:**
1. View user details
2. Check activity tab

**Expected:**
- Shows last login
- Recent actions listed
- Content created count
- Last 30 days of activity

---

## Tools Suite Tests

### TS-001: Alt-Text Generator
**Steps:**
1. Navigate to Alt-Text Generator
2. Upload image (test-image.jpg)
3. Add context: "Product photo"
4. Generate alt-text

**Expected:**
- Image preview shown
- Upload progress displayed
- Alt-text generated within 10 seconds
- Can edit generated text
- Copy button works

### TS-002: Metadata Generator
**Steps:**
1. Navigate to Metadata Generator  
2. Enter content/URL
3. Select metadata type:
   - SEO Title
   - Meta Description
   - Keywords
4. Generate

**Expected:**
- Character limits shown
- Multiple options generated
- Can regenerate individual items
- Preview shows how it appears
- Export options available

### TS-003: Transcreator
**Steps:**
1. Navigate to Transcreator
2. Enter source content
3. Select source language
4. Select target language/market
5. Add cultural context
6. Generate transcreation

**Expected:**
- Language detection works
- Cultural notes field available
- Generation preserves meaning
- Shows side-by-side comparison
- Can iterate on results

### TS-004: Tool Access Permissions
**Steps:**
1. Login as each role
2. Check tool availability

**Expected:**
- All roles can access tools
- Usage tracked per user
- Rate limits applied
- History saved

---

## Workflow Tests

### WF-001: Submit for Approval
**Steps:**
1. Create content as User
2. Submit for approval
3. Add notes for approver

**Expected:**
- Status changes to "Pending"
- Notes field available
- Email sent to approvers
- Cannot edit while pending

### WF-002: Approval Process
**Steps:**
1. Login as Manager
2. Go to Approvals queue
3. Review content
4. Add comment
5. Approve

**Expected:**
- Queue shows pending items
- Full content visible
- Comment system works
- Status updates to "Approved"
- Creator notified

### WF-003: Rejection Process
**Steps:**
1. Login as Manager
2. Review pending content
3. Add rejection reason
4. Reject

**Expected:**
- Rejection reason required
- Status changes to "Rejected"
- Creator notified with reason
- Content becomes editable again

### WF-004: Revision Request
**Steps:**
1. Manager requests changes
2. User makes changes
3. Resubmit for approval

**Expected:**
- Specific changes can be requested
- User can see requested changes
- Can track revision history
- New approval cycle starts

### WF-005: Bulk Approval
**Steps:**
1. Select multiple pending items
2. Bulk approve

**Expected:**
- Can select compatible items only
- Confirmation required
- All items processed
- Individual notifications sent

---

## API Tests

### API-001: Authentication Endpoints
**Test each endpoint with REST client:**
- POST /api/auth/login
- POST /api/auth/logout  
- POST /api/auth/refresh
- POST /api/auth/reset-password

**Expected:**
- Correct status codes (200, 401, 422)
- Proper error messages
- JWT tokens in cookies
- Rate limiting enforced

### API-002: Content Endpoints
**Test CRUD operations:**
- GET /api/content
- POST /api/content
- PUT /api/content/[id]
- DELETE /api/content/[id]

**Expected:**
- Pagination works
- Filtering parameters accepted
- Validation errors clear
- Proper status codes

### API-003: Rate Limiting
**Steps:**
1. Make 11 requests to auth endpoint in 1 minute
2. Make 51 requests to AI endpoint in 15 minutes
3. Make 101 requests to general API in 15 minutes

**Expected:**
- 429 status after limit
- Retry-After header present
- Error message indicates limit
- Resets after time window

### API-004: Error Handling
**Test with:**
- Invalid JSON
- Missing required fields
- Invalid data types
- Unauthorized requests

**Expected:**
- 400 for bad requests
- 401 for unauthorized
- 422 for validation errors
- Consistent error format

---

## Performance Tests

### PERF-001: Page Load Times
**Test each major page:**
1. Clear cache
2. Navigate to page
3. Measure time to interactive

**Expected:**
- Home: < 2 seconds
- Dashboard: < 3 seconds
- Content Generator: < 3 seconds
- Content Library: < 3 seconds

### PERF-002: API Response Times
**Measure response times:**
- Login: < 500ms
- Content list: < 1 second
- Content generation: < 30 seconds
- Search: < 500ms

### PERF-003: Concurrent Users
**Steps:**
1. Simulate 50 concurrent users
2. Perform typical actions
3. Monitor response times

**Expected:**
- No significant degradation
- All requests complete
- No timeout errors

### PERF-004: Large Data Sets
**Steps:**
1. Test with 10,000 content items
2. Test pagination
3. Test search
4. Test filtering

**Expected:**
- Pagination responsive
- Search remains fast
- Filters don't timeout
- UI remains responsive

### PERF-005: File Upload
**Test with various file sizes:**
- Small image (100KB)
- Medium image (2MB)
- Large image (5MB)
- Over limit (6MB)

**Expected:**
- Progress indicator accurate
- Upload completes successfully
- Large files rejected with message
- No timeout on valid files

---

## Security Tests

### SEC-001: SQL Injection
**Test input fields with:**
- `' OR '1'='1`
- `"; DROP TABLE users;--`
- `<script>alert('XSS')</script>`

**Expected:**
- No errors exposed
- Queries fail safely
- Input sanitized/escaped
- No script execution

### SEC-002: XSS Prevention
**Test with:**
- `<script>alert('XSS')</script>`
- `<img src=x onerror=alert('XSS')>`
- `javascript:alert('XSS')`

**Expected:**
- Scripts not executed
- HTML entities encoded
- Safe rendering in UI

### SEC-003: CSRF Protection
**Steps:**
1. Get valid session
2. Try API request without CSRF token
3. Try with invalid token

**Expected:**
- Request rejected
- 403 Forbidden status
- Valid token required

### SEC-004: Authorization Bypass
**Steps:**
1. Login as User role
2. Try accessing Admin URLs directly
3. Try API calls for Admin functions

**Expected:**
- 403 Forbidden response
- Redirected to error page
- No sensitive data exposed

### SEC-005: Session Security
**Steps:**
1. Check cookie settings in DevTools
2. Try to access cookie via JavaScript
3. Check for secure flag

**Expected:**
- HttpOnly flag set
- Secure flag set (HTTPS)
- SameSite attribute set
- Cannot access via JS

---

## Responsive Design Tests

### RD-001: Mobile Navigation
**Device: iPhone 12 (375x812)**
1. Open on mobile size
2. Check hamburger menu
3. Navigate between pages

**Expected:**
- Menu collapses to hamburger
- Touch targets adequate (44px)
- Navigation smooth
- No horizontal scroll

### RD-002: Content Generator Mobile
**Device: Various mobile sizes**
1. Test form inputs
2. Test generation
3. Test preview

**Expected:**
- Forms stack vertically
- Keyboard doesn't cover inputs
- Preview adjusts to screen
- All functions accessible

### RD-003: Tablet Layout
**Device: iPad (768x1024)**
1. Test in portrait
2. Test in landscape
3. Check all major pages

**Expected:**
- Sidebar visible in landscape
- Appropriate spacing
- Touch-friendly interface
- No layout breaks

### RD-004: Desktop Variations
**Test resolutions:**
- 1920x1080
- 1440x900
- 1366x768

**Expected:**
- Content centered appropriately
- No excessive whitespace
- All content visible
- No horizontal scroll

---

## Edge Cases & Error Handling

### EC-001: Network Interruption
**Steps:**
1. Start content generation
2. Disconnect network
3. Observe behavior

**Expected:**
- Error message appears
- Option to retry
- Form data preserved
- Graceful degradation

### EC-002: Session Timeout
**Steps:**
1. Login and wait 24 hours
2. Try to perform action

**Expected:**
- Redirected to login
- Message about session expiry
- After login, return to previous page
- Form data saved if possible

### EC-003: Concurrent Editing
**Steps:**
1. Open same content in two tabs
2. Edit in both tabs
3. Save both

**Expected:**
- Conflict detection
- Warning about other changes
- Option to merge or overwrite
- Version history maintained

### EC-004: Maximum Limits
**Test limits:**
- 100 character title limit
- 5000 character content limit
- 100 bulk operations
- 5MB file upload

**Expected:**
- Clear limit indicators
- Cannot exceed limits
- Helpful error messages
- Graceful handling

### EC-005: Empty States
**Test when no data:**
- New user with no content
- Empty search results
- No pending approvals

**Expected:**
- Helpful empty state messages
- Clear call-to-action
- No broken layouts
- Guidance for next steps

### EC-006: Browser Compatibility
**Test on:**
- Chrome latest
- Firefox latest
- Safari latest
- Edge latest

**Expected:**
- All features work
- Consistent appearance
- No console errors
- Performance similar

---

## Test Execution Checklist

### Daily Smoke Tests
- [ ] Login/Logout works
- [ ] Content generation works
- [ ] Content library loads
- [ ] Search functions work
- [ ] No console errors

### Weekly Regression Tests
- [ ] All user journeys
- [ ] All CRUD operations
- [ ] Permission checks
- [ ] Email notifications
- [ ] File uploads

### Release Tests
- [ ] Full test suite execution
- [ ] Performance benchmarks
- [ ] Security scan
- [ ] Cross-browser testing
- [ ] Load testing

### Post-Deployment Tests
- [ ] Smoke tests on production
- [ ] Key user journeys
- [ ] Integration endpoints
- [ ] Email delivery
- [ ] Monitoring alerts

---

## Bug Severity Guidelines

### Critical (P0)
- System down
- Data loss
- Security vulnerability
- Login broken

### High (P1)
- Core feature broken
- Workflow blocked
- Performance severely degraded
- Major UI issue

### Medium (P2)
- Feature partially working
- Workaround available
- Minor data issue
- UI inconsistency

### Low (P3)
- Cosmetic issue
- Enhancement request
- Documentation issue
- Edge case

---

*Test Plan Version: 1.0*  
*Last Updated: December 2024*  
*Total Test Cases: 100+*  
*Note: Actual test credentials and environment URLs will be provided during QA onboarding*