# MixerAI 2.0 Manual Testing Checklist

**Date:** _______________  
**Tester:** _______________  
**Environment:** ☐ Local ☐ Staging ☐ Production  
**Browser:** _______________  

## Pre-Testing Setup
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Test user account created
- [ ] Azure OpenAI connection verified

---

## 1. Authentication & User Management

### 1.1 Sign Up
- [ ] Navigate to `/auth/signup`
- [ ] Create new account with valid email
- [ ] Verify email confirmation process
- [ ] Check welcome email received

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 1.2 Sign In
- [ ] Navigate to `/auth/signin`
- [ ] Sign in with valid credentials
- [ ] Test "Remember me" functionality
- [ ] Test invalid credentials error handling
- [ ] Test rate limiting (multiple failed attempts)

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 1.3 Password Reset
- [ ] Click "Forgot Password" link
- [ ] Enter email and submit
- [ ] Check reset email received
- [ ] Follow reset link and set new password
- [ ] Sign in with new password

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 1.4 Account Management
- [ ] Navigate to `/dashboard/account`
- [ ] Update profile information (name, company, job title)
- [ ] Upload/change profile avatar
- [ ] Save changes and verify persistence
- [ ] Test validation for required fields - Full name is now required

**Issues Found:**
Fixed: Profile photo upload now works
Fixed: Full name validation added
Fixed: Password form spacing corrected
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 2. Brand Management

### 2.1 Brand Creation
- [ ] Navigate to `/dashboard/brands` - No problems.
- [ ] Click "Create Brand" button - It's add brand. Error when trying to save a brand.
Error: connect ECONNREFUSED 127.0.0.1:5432
        at createConnectionError (node:net:1675:14)
        at afterConnectMultiple (node:net:1705:16)
        at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17) {
      errno: -61,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 5432
    }
  ]
}
 {name: "Test", website_url: null, additional_website_urls: null, country: "GB", language: "en",…}
additional_website_urls
: 
null
brand_color
: 
"#1982C4"
brand_identity
: 
null
content_vetting_agencies
: 
null
country
: 
"GB"
guardrails
: 
null
language
: 
"en"
master_claim_brand_id
: 
null
name
: 
"Test"
selected_agency_ids
: 
null
tone_of_voice
: 
null
website_url
: 
null
- [ ] Fill in brand details:
  - [ ] Brand name
  - [ ] Description
  - [ ] Brand URL
  - [ ] Industry selection
  - [ ] Target audience
- [ ] Upload brand logo - Fixed: Logo upload now available
- [ ] Select brand colors - Can pick a colour
- [ ] Generate brand identity with AI - Works well.
- [ ] Save brand and verify creation - Failed.

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 2.2 Brand Editing
- [ ] Select existing brand from list - Opens properly
- [ ] Click edit/settings button
- [ ] Modify brand details - Can edit fields
- [ ] Change brand logo - Fixed: Logo upload now available
- [ ] Update brand colors - Can change colours
- [ ] Regenerate brand identity - Works well. 
- [ ] Save changes and verify updates - Failed to update brand via RPC.
Failed to update brand via RPC.: {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "Food Standards Australia New Zealand"'
}
 PUT /api/brands/369a958f-a946-4cd0-9fff-70bd2c89d4bb 500 in 242ms


**Issues Found:**
Fixed: Button designs standardized across brands, templates, and workflows pages using ActionButtons component
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 2.3 Brand Context
- [ ] Brand-specific data is filtered correctly in content/templates/workflows
- [ ] Brand permissions are enforced (users only see brands they have access to)

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 2.4 Brand Permissions
- [ ] Add user to brand (if admin)
- [ ] Set user role (admin/editor/viewer)
- [ ] Remove user from brand
- [ ] Test role-based access control

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 3. Product Management - NOT IMPLEMENTED

Note: Product management functionality is not yet implemented in the application. Products are managed through the claims system instead.

---

## 4. Claims Management

### 4.1 Claim Creation
- [ ] Navigate to `/dashboard/claims`
- [ ] Click "Create Claim" button
- [ ] Select claim level (brand/product/ingredient)
- [ ] Enter claim text
- [ ] Select claim type
- [ ] Add supporting information
- [ ] Preview claim
- [ ] Save claim

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 4.2 Claim Editing
- [ ] Select existing claim
- [ ] Edit claim text
- [ ] Update claim type
- [ ] Modify supporting information
- [ ] Save changes

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 4.3 Claim Matrix View
- [ ] View claims matrix
- [ ] Test filtering by level
- [ ] Test search functionality
- [ ] Verify claim relationships
- [ ] Test export functionality

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 4.4 Claim Workflow
- [ ] Assign workflow to claim
- [ ] Submit claim for review
- [ ] Approve/reject claim
- [ ] Add reviewer feedback
- [ ] Verify workflow history

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 5. Template Management

### 5.1 Template Creation
- [ ] Navigate to `/dashboard/templates`
- [ ] Click "Create Template" button
- [ ] Enter template details:
  - [ ] Template name
  - [ ] Category
  - [ ] Description
- [ ] Add template fields:
  - [ ] Text fields
  - [ ] Textarea fields
  - [ ] Select dropdowns
  - [ ] Product selectors
  - [ ] Claim selectors
- [ ] Set field validation rules
- [ ] Configure AI instructions
- [ ] Preview template
- [ ] Save template

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 5.2 Template Editing
- [ ] Select existing template
- [ ] Edit template details
- [ ] Add/remove fields
- [ ] Modify field properties
- [ ] Update AI instructions
- [ ] Save changes

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 5.3 Template Testing
- [ ] Use template to generate content
- [ ] Test all field types
- [ ] Verify validation rules
- [ ] Test AI content generation
- [ ] Check generated content quality

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 6. Content Generation

### 6.1 Content Creation
- [ ] Navigate to `/dashboard/content`
- [ ] Click "Generate Content" button
- [ ] Select template
- [ ] Fill in template fields
- [ ] Select products (if applicable)
- [ ] Select claims (if applicable)
- [ ] Generate content with AI
- [ ] Review generated content
- [ ] Edit/refine content
- [ ] Save content

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 6.2 Content Editing
- [ ] Select existing content
- [ ] Edit content manually
- [ ] Regenerate with AI
- [ ] Update metadata
- [ ] Save changes
- [ ] View version history

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 6.3 Content Management
- [ ] View all content
- [ ] Filter by status
- [ ] Filter by template
- [ ] Search content
- [ ] Sort by date/name
- [ ] Test pagination

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 7. Workflow Management

### 7.1 Workflow Creation
- [ ] Navigate to `/dashboard/workflows`
- [ ] Click "Create Workflow" button
- [ ] Enter workflow details:
  - [ ] Workflow name
  - [ ] Description
  - [ ] Type (content/claims)
- [ ] Add workflow steps:
  - [ ] Step name
  - [ ] Step order
  - [ ] Assignee role
  - [ ] Specific assignees
- [ ] Save workflow

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 7.2 Workflow Editing
- [ ] Select existing workflow
- [ ] Edit workflow details
- [ ] Add/remove steps
- [ ] Reorder steps (drag & drop)
- [ ] Update assignees
- [ ] Save changes

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 7.3 Workflow Assignment
- [ ] Assign workflow to content
- [ ] Assign workflow to claim
- [ ] Test workflow progression
- [ ] Approve/reject at each step
- [ ] Add feedback comments
- [ ] Verify email notifications

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 8. Task Management

### 8.1 Task View
- [ ] Navigate to `/dashboard/tasks`
- [ ] View assigned tasks
- [ ] Filter by status
- [ ] Sort by priority/date
- [ ] Search tasks

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 8.2 Task Actions
- [ ] Open task details
- [ ] Review associated content/claim
- [ ] Approve task
- [ ] Reject task with feedback
- [ ] Reassign task
- [ ] Mark task complete

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 9. Analytics & Reporting

### 9.1 Dashboard Analytics
- [ ] View dashboard overview
- [ ] Check content metrics
- [ ] Review task statistics
- [ ] Verify chart rendering
- [ ] Test date range filters

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 9.2 Content Analytics
- [ ] View content performance
- [ ] Check engagement metrics
- [ ] Export analytics data
- [ ] Test filtering options

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 10. System Administration

### 10.1 User Management
- [ ] Navigate to `/dashboard/users`
- [ ] View all users
- [ ] Search/filter users
- [ ] Edit user roles
- [ ] Activate/deactivate users
- [ ] Send invitation emails

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 10.2 GitHub Issues
- [ ] Navigate to `/dashboard/issues`
- [ ] View GitHub issues
- [ ] Filter by priority
- [ ] Search issues
- [ ] Expand issue details
- [ ] View on GitHub (external link)

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 10.3 System Settings
- [ ] Navigate to `/dashboard/settings`
- [ ] Update organization settings
- [ ] Configure email settings
- [ ] Test email notifications
- [ ] Update security settings

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 11. AI Integration

### 11.1 Brand Identity Generation
- [ ] Generate brand voice
- [ ] Generate brand personality
- [ ] Test regeneration
- [ ] Verify AI response quality

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 11.2 Content Generation
- [ ] Generate content from template
- [ ] Test different content types
- [ ] Verify claim integration
- [ ] Check tone/voice consistency

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 11.3 Claim Simplification
- [ ] Simplify complex claims
- [ ] Test different claim types
- [ ] Verify accuracy maintained

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 12. Responsive Design & Accessibility

### 12.1 Mobile Responsiveness
- [ ] Test on mobile devices
- [ ] Check navigation menu
- [ ] Verify forms are usable
- [ ] Test tables/data views
- [ ] Check modal dialogs

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 12.2 Accessibility
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Check color contrast
- [ ] Test focus indicators
- [ ] Verify ARIA labels

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 13. Error Handling & Edge Cases

### 13.1 Network Errors
- [ ] Test offline functionality
- [ ] Slow connection handling
- [ ] API timeout scenarios
- [ ] Retry mechanisms

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 13.2 Data Validation
- [ ] Test form validation
- [ ] Submit invalid data
- [ ] Test character limits
- [ ] Verify error messages

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 13.3 Permission Errors
- [ ] Access restricted pages
- [ ] Perform unauthorized actions
- [ ] Verify error handling
- [ ] Check redirect behavior

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 14. Performance

### 14.1 Page Load Times
- [ ] Dashboard load time
- [ ] Content list load time
- [ ] Large data set handling
- [ ] Image loading performance

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### 14.2 Search Performance
- [ ] Global search speed
- [ ] Filter responsiveness
- [ ] Autocomplete performance

**Issues Found:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Summary

**Total Tests:** _____ **Passed:** _____ **Failed:** _____

### Critical Issues:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### High Priority Issues:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Medium Priority Issues:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Low Priority Issues:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Recommendations:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Testing Completed:** _______________  
**Signature:** _______________