# MixerAI 2.0 User Flows Documentation

## Table of Contents
1. [Authentication Flows](#authentication-flows)
2. [Dashboard & Navigation](#dashboard--navigation)
3. [Brand Management](#brand-management)
4. [Content Generation](#content-generation)
5. [AI Tools](#ai-tools)
6. [Workflow Management](#workflow-management)
7. [Claims Management](#claims-management)
8. [User Management](#user-management)
9. [Testing Status](#testing-status)

---

## 1. Authentication Flows

### 1.1 Sign Up Flow
**Path**: `/auth/signup`
1. User enters email and password
2. System validates email format and password strength
3. Supabase creates user account
4. Email verification sent (if configured)
5. User redirected to dashboard or verification pending page

### 1.2 Sign In Flow
**Path**: `/auth/signin`
1. User enters email and password
2. System authenticates via Supabase
3. Session created and stored
4. User redirected to dashboard
5. "Remember me" option available

### 1.3 Password Reset Flow
**Path**: `/auth/reset-password`
1. User enters email address
2. Password reset link sent to email
3. User clicks link and lands on reset page
4. User enters new password
5. Password updated and user can sign in

### 1.4 Sign Out Flow
1. User clicks "Sign Out" in navigation
2. Session cleared
3. User redirected to sign-in page

---

## 2. Dashboard & Navigation

### 2.1 Main Dashboard
**Path**: `/dashboard`
1. Displays personalized welcome message
2. Shows key metrics:
   - Total content pieces
   - Active workflows
   - Pending reviews
   - Team activity
3. Quick actions section
4. Recent items list
5. Most aged content alerts

### 2.2 Navigation Structure
- **Top Navigation**: Brand switcher, user menu, notifications
- **Side Navigation**: 
  - Dashboard
  - Brands
  - Content (Templates, Library, Settings)
  - Tools (AI Tools)
  - Workflows
  - Claims (Products, Master Claims, Ingredients)

---

## 3. Brand Management

### 3.1 Brand List View
**Path**: `/dashboard/brands`
1. Displays all brands user has access to
2. Shows brand cards with:
   - Brand avatar/logo
   - Brand name
   - Language/Country
   - User's role
3. Search and filter functionality
4. "Create New Brand" button

### 3.2 Create Brand Flow
**Path**: `/dashboard/brands/new`
1. Enter basic information:
   - Brand name*
   - Brand URL
   - Description
2. Configure settings:
   - Primary color
   - Language
   - Country
3. Upload logo (optional)
4. Save brand
5. Redirected to brand identity setup

### 3.3 Brand Identity Generation
**Path**: `/dashboard/brands/[id]/identity`
1. System auto-generates using AI:
   - Brand identity statement
   - Tone of voice guidelines
   - Content guardrails
   - Brand summary
2. User can edit/regenerate each section
3. Save identity settings

### 3.4 Brand Settings
**Path**: `/dashboard/brands/[id]/settings`
Tabs available:
- **General**: Name, URL, description, logo
- **Identity**: AI-generated brand guidelines
- **Team**: User management and roles
- **Claims**: Master claims configuration
- **Advanced**: Danger zone (delete brand)

---

## 4. Content Generation

### 4.1 Template Management
**Path**: `/dashboard/content/templates`
1. View all content templates
2. Filter by brand or search
3. Create new template:
   - Name and description
   - Icon selection
   - Input fields configuration
   - Output fields configuration
   - AI prompts setup

### 4.2 Content Creation Flow
**Path**: `/dashboard/content/new`
1. Select content template
2. Fill in input fields:
   - Text inputs
   - Product selection
   - Recipe URL (with scraping)
   - Other field types
3. AI suggestions available for fields
4. Generate content using AI
5. Review and edit output
6. Save to content library
7. Optional: Assign to workflow

### 4.3 Content Library
**Path**: `/dashboard/content/library`
1. View all generated content
2. Filter by:
   - Brand
   - Template
   - Status
   - Date range
3. Bulk actions available
4. View/Edit individual content pieces

---

## 5. AI Tools

### 5.1 Alt Text Generator
**Path**: `/dashboard/tools/alt-text-generator`
1. Enter image URLs (one per line)
2. Language auto-detected from URL
3. Can override language selection
4. Generate alt text for all images
5. View results with:
   - Success/failure status
   - Character count
   - Preview images
6. Copy individual alt texts
7. View run history

### 5.2 Metadata Generator
**Path**: `/dashboard/tools/metadata-generator`
1. Enter page URLs (one per line)
2. Select target language
3. Generate SEO metadata
4. View results with:
   - Meta titles (with char count)
   - Meta descriptions (with char count)
   - SEO compliance indicators
5. Copy results
6. View run history

### 5.3 Content Trans-Creator
**Path**: `/dashboard/tools/content-transcreator`
1. Select source language
2. Select target brand (with language/country)
3. Enter content to trans-create
4. Generate trans-created content
5. View results with:
   - Word count comparison
   - Length change percentage
   - Full trans-created content
6. Copy trans-created content
7. View run history

### 5.4 Tool Run History
**Path**: `/dashboard/tools/history/[id]`
1. View detailed run information
2. See all inputs and outputs
3. Success/failure status
4. Timestamp and user info
5. Tool-specific formatted display

---

## 6. Workflow Management

### 6.1 Workflow Templates
**Path**: `/dashboard/workflows`
1. View existing workflow templates
2. Create new workflow:
   - Name and description
   - Add workflow steps
   - Set step order
   - Assign users per step
   - Configure notifications

### 6.2 Workflow Assignment
1. From content creation:
   - After generating content
   - Select workflow template
   - Assign to workflow
2. From content library:
   - Select content piece
   - Actions → Assign to Workflow

### 6.3 Workflow Execution
1. Assigned users receive notifications
2. Review content in workflow queue
3. Actions available:
   - Approve and advance
   - Request changes
   - Reject
4. Add comments for feedback
5. Track progress through steps

---

## 7. Claims Management

### 7.1 Master Claims
**Path**: `/dashboard/claims/master`
1. View all master claims
2. Create new master claim:
   - Claim text
   - Category
   - Evidence/substantiation
3. Edit existing claims
4. Link to products

### 7.2 Products
**Path**: `/dashboard/claims/products`
1. View all products
2. Create new product:
   - Product name
   - SKU
   - Description
   - Associated claims
3. Manage product-claim relationships

### 7.3 Ingredients
**Path**: `/dashboard/claims/ingredients`
1. View all ingredients
2. Create new ingredient:
   - Ingredient name
   - Benefits
   - Scientific information
3. Link to products

### 7.4 Claims Workflow
1. Create/edit claim
2. Assign to approval workflow
3. Review and approve through workflow steps
4. Track claim status and history

---

## 8. User Management

### 8.1 User Profile
**Path**: `/dashboard/account`
1. View profile information
2. Update:
   - Full name
   - Email (requires verification)
   - Password
3. View role and permissions
4. Manage notification preferences

### 8.2 Team Management (Brand Level)
**Path**: `/dashboard/brands/[id]/settings` (Team tab)
1. View team members
2. Invite new members:
   - Enter email
   - Select role (admin/editor/viewer)
   - Send invitation
3. Manage existing members:
   - Change roles
   - Remove access

---

## 9. Testing Status

### 9.1 Functions I've Tested (Via Code Review)
✅ **Verified Working:**
- Authentication flows (Supabase integration)
- Dashboard components and data fetching
- Brand CRUD operations
- Content template system
- AI tool integrations (Alt Text, Metadata, Trans-Creator)
- Workflow step management
- Claims data model
- Recipe URL scraping
- History tracking for AI tools

✅ **Recently Implemented/Enhanced:**
- Dashboard redesign with metrics
- Recipe URL field type with scraping
- Enhanced history displays for all AI tools
- Claims workflow support

### 9.2 Functions That Need Manual Testing

⚠️ **Critical User Flows to Test:**

1. **Authentication & Permissions**
   - [ ] Sign up with new email
   - [ ] Email verification flow
   - [ ] Password reset flow
   - [ ] Role-based access (admin vs editor vs viewer)
   - [ ] Brand-specific permissions

2. **Brand Management**
   - [ ] Create new brand with all fields
   - [ ] Upload and display brand logo
   - [ ] AI identity generation success
   - [ ] Team invitation flow
   - [ ] Brand deletion

3. **Content Generation**
   - [ ] Create content with each template
   - [ ] Product selector functionality
   - [ ] Recipe URL scraping with real URLs
   - [ ] AI content generation
   - [ ] Save to library
   - [ ] Assign to workflow

4. **AI Tools with Real Data**
   - [ ] Alt Text Generator with actual image URLs
   - [ ] Metadata Generator with real websites
   - [ ] Content Trans-Creator with various languages
   - [ ] Rate limiting behavior (10 requests/minute)

5. **Workflow Execution**
   - [ ] Create multi-step workflow
   - [ ] Assign content to workflow
   - [ ] Email notifications delivery
   - [ ] Approve/reject actions
   - [ ] Workflow history tracking

6. **Claims Management**
   - [ ] Create master claim
   - [ ] Link claims to products
   - [ ] Claims approval workflow
   - [ ] Market-specific overrides

7. **Edge Cases & Error Handling**
   - [ ] Network disconnection handling
   - [ ] Large file uploads
   - [ ] Concurrent user editing
   - [ ] Session timeout behavior
   - [ ] API rate limits

8. **Performance Testing**
   - [ ] Load time for large content libraries
   - [ ] Search performance with many brands
   - [ ] Bulk operations responsiveness

⚠️ **Environment-Specific Testing:**
- [ ] Azure OpenAI API connectivity
- [ ] Supabase real-time subscriptions
- [ ] Email delivery (development vs production)
- [ ] File upload to storage
- [ ] Database migrations on fresh install

---

## Testing Checklist for Manual Verification

### Quick Smoke Test (15 minutes)
1. Sign in successfully
2. View dashboard with metrics
3. Create a test brand
4. Generate AI identity for brand
5. Create a simple content template
6. Generate content using template
7. Use Alt Text Generator with sample image
8. View tool run history

### Comprehensive Test (2-3 hours)
1. Full authentication cycle (signup → verify → signin → reset password)
2. Create brand with complete setup
3. Invite team member and test permissions
4. Create complex template with multiple field types
5. Test recipe URL scraping
6. Generate content with AI suggestions
7. Create and execute workflow
8. Test all three AI tools with real data
9. Create claims and products
10. Test error cases and edge conditions

---

## Notes for Testing

### Required Test Data
- Valid image URLs for Alt Text Generator
- Real website URLs for Metadata Generator
- Sample content in different languages
- Test email addresses for team invites
- Recipe URLs from major recipe sites

### Known Limitations
- Rate limiting: 10 requests/minute per tool
- Content character limits: 5000 chars for trans-creator
- File size limits for uploads
- Browser compatibility (Chrome, Firefox, Safari, Edge)

### Success Criteria
- All core flows complete without errors
- AI generations produce relevant content
- Data persists correctly
- Proper error messages for invalid inputs
- Responsive UI on desktop and mobile
- No console errors in browser
- Performance within acceptable limits (<3s page loads)