# QA Resources for MixerAI 2.0

**Note: This document contains placeholders for sensitive information. Actual URLs, credentials, and contact details will be provided during your QA onboarding.**

## Table of Contents
1. [Test Environment Access](#test-environment-access)
2. [Test Data Specifications](#test-data-specifications)
3. [Testing Tools & Extensions](#testing-tools--extensions)
4. [API Testing Resources](#api-testing-resources)
5. [Common Test Scenarios](#common-test-scenarios)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [QA Team Contacts](#qa-team-contacts)

---

## Test Environment Access

### Environment URLs
- **Development:** [DEV_ENVIRONMENT_URL]
- **Staging:** [STAGING_ENVIRONMENT_URL]
- **Production:** [PRODUCTION_ENVIRONMENT_URL]

### Test Accounts

#### Admin Account
- **Email:** [ADMIN_TEST_EMAIL]
- **Password:** [PROVIDED_SEPARATELY]
- **Purpose:** Full system access, user management, system configuration

#### Manager Account
- **Email:** [MANAGER_TEST_EMAIL]
- **Password:** [PROVIDED_SEPARATELY]
- **Purpose:** Content approval, user invitation, brand management

#### User Account
- **Email:** [USER_TEST_EMAIL]
- **Password:** [PROVIDED_SEPARATELY]
- **Purpose:** Content creation, basic functionality testing

#### Multi-Brand Test Account
- **Email:** [MULTIBRAND_TEST_EMAIL]
- **Password:** [PROVIDED_SEPARATELY]
- **Brands:** Test Brand Alpha, Test Brand Beta, Test Brand Gamma

### VPN Requirements
- **Required for:** Staging environment access
- **VPN Server:** [VPN_SERVER_ADDRESS]
- **Credentials:** Provided separately via secure channel

### Database Access (Read-Only)
- **Tool:** pgAdmin or DBeaver
- **Host:** [DATABASE_HOST]
- **Port:** [DATABASE_PORT]
- **Database:** [DATABASE_NAME]
- **Username:** [DATABASE_USERNAME]
- **Password:** [PROVIDED_SEPARATELY]

---

## Test Data Specifications

### Brand Test Data

#### Test Brand Alpha
```json
{
  "name": "Test Brand Alpha",
  "industry": "Technology",
  "description": "Leading innovation in tech",
  "brand_voice": {
    "tone": "Professional",
    "style": "Informative",
    "keywords": ["innovation", "technology", "future"]
  },
  "colors": {
    "primary": "#0066CC",
    "secondary": "#FF6600"
  }
}
```

#### Test Brand Beta
```json
{
  "name": "Test Brand Beta", 
  "industry": "Beauty",
  "description": "Natural beauty products",
  "brand_voice": {
    "tone": "Friendly",
    "style": "Conversational",
    "keywords": ["natural", "beauty", "wellness"]
  },
  "colors": {
    "primary": "#FF69B4",
    "secondary": "#98D8C8"
  }
}
```

### Product Test Data

#### Technology Products
1. **SmartWatch Pro 2024**
   - Features: Heart rate monitor, GPS, 7-day battery
   - Price: $299
   - Target: Fitness enthusiasts

2. **CloudSync Enterprise**
   - Features: 10TB storage, encryption, team collaboration
   - Price: $99/month
   - Target: Business professionals

#### Beauty Products  
1. **Radiant Glow Serum**
   - Features: Vitamin C, Hyaluronic acid, Anti-aging
   - Price: $65
   - Target: Women 25-45

2. **Natural Defense SPF 50**
   - Features: Mineral sunscreen, Water-resistant, Reef-safe
   - Price: $28
   - Target: All skin types

### Content Templates Test Data

#### Social Media Templates
- **Product Launch**: "Introducing {product_name}! {key_feature} {call_to_action}"
- **Limited Offer**: "🎉 {discount}% off {product_name} - Today only! {link}"
- **Customer Story**: "See how {customer_name} {benefit} with {product_name}"

#### Email Templates
- **Welcome Series**: 3-email sequence
- **Abandoned Cart**: Reminder + 10% discount
- **Product Update**: Feature announcement format

### Claims Test Data

#### Technology Claims
- "Increases productivity by up to 40%"
- "99.9% uptime guaranteed"
- "Enterprise-grade security"
- "Award-winning customer support"

#### Beauty Claims  
- "Clinically proven to reduce wrinkles in 4 weeks"
- "90% of users saw improved skin texture"
- "Dermatologist tested and approved"
- "100% natural ingredients"

#### Market-Specific Overrides
- **EU Market**: Softer claims, regulatory compliant
- **US Market**: Standard claims
- **APAC Market**: Localized benefits focus

### Test Files

#### Images for Upload Testing
1. **valid-image-small.jpg** (100KB) - Product photo
2. **valid-image-medium.png** (2MB) - Brand banner
3. **valid-image-large.jpg** (4.9MB) - Hero image
4. **invalid-image-toolarge.jpg** (6MB) - Should fail
5. **invalid-format.bmp** - Unsupported format
6. **corrupt-image.jpg** - Corrupted file

#### Documents for Import Testing
1. **claims-import-valid.csv** - 50 valid claims
2. **claims-import-invalid.csv** - Contains errors
3. **users-bulk-import.csv** - 10 users to invite
4. **content-export-sample.json** - Expected export format

---

## Testing Tools & Extensions

### Browser Extensions

#### Chrome/Edge
1. **React Developer Tools** - Component inspection
2. **Redux DevTools** - State debugging (if applicable)
3. **Lighthouse** - Performance auditing
4. **WAVE** - Accessibility testing
5. **JSONView** - API response formatting
6. **ModHeader** - Header manipulation
7. **EditThisCookie** - Cookie management

#### Firefox
1. **React Developer Tools**
2. **Accessibility Inspector** 
3. **Network Monitor**
4. **Responsive Design Mode**

### Desktop Tools

#### API Testing
- **Postman** - Comprehensive API testing
- **Insomnia** - Alternative REST client
- **curl** - Command line testing

#### Performance Testing
- **GTmetrix** - Page speed analysis
- **WebPageTest** - Detailed performance metrics
- **Apache JMeter** - Load testing

#### Accessibility Testing
- **NVDA** (Windows) - Screen reader
- **JAWS** - Professional screen reader
- **VoiceOver** (macOS) - Built-in screen reader
- **axe DevTools** - Accessibility scanner

### Mobile Testing

#### iOS Testing
- **Xcode Simulator** - Various iPhone/iPad models
- **Safari Developer Tools** - Remote debugging
- **TestFlight** - Beta testing

#### Android Testing
- **Android Studio Emulator** - Various devices
- **Chrome DevTools** - Remote debugging
- **BrowserStack** - Real device testing

---

## API Testing Resources

### Postman Collection
Import URL: [POSTMAN_COLLECTION_URL - to be provided]

Includes:
- All API endpoints
- Pre-configured environments
- Test scripts for validation
- Example requests/responses

### Environment Variables
```json
{
  "base_url": "{{environment_url}}/api",
  "auth_token": "{{bearer_token}}",
  "test_brand_id": "123e4567-e89b-12d3-a456-426614174000",
  "test_content_id": "987fcdeb-51a2-43f1-b123-456789abcdef"
}
```

### Common API Test Scenarios

#### Authentication Flow
```bash
# Login
POST /api/auth/login
{
  "email": "qa.user@mixerai.test",
  "password": "QATest2024!User"
}

# Refresh Token
POST /api/auth/refresh

# Logout
POST /api/auth/logout
```

#### Content Generation
```bash
# Generate Content
POST /api/content/generate
{
  "type": "social_media",
  "product": "SmartWatch Pro 2024",
  "tone": "professional",
  "platform": "linkedin"
}
```

### Rate Limit Testing
```python
# Python script for rate limit testing
import requests
import time

base_url = "[STAGING_API_URL]"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

# Test auth endpoint (10 requests/15 min)
for i in range(12):
    response = requests.post(f"{base_url}/auth/validate", headers=headers)
    print(f"Request {i+1}: {response.status_code}")
    if response.status_code == 429:
        print(f"Rate limit hit at request {i+1}")
        break
    time.sleep(1)
```

---

## Common Test Scenarios

### Data-Driven Scenarios

#### Boundary Testing Values
- **Text Fields:**
  - Minimum: 1 character
  - Maximum: Check field limits
  - Special chars: `!@#$%^&*()_+-=[]{}|;':",./<>?`
  - Unicode: `café, 北京, 🎉`
  - SQL injection: `' OR '1'='1`
  - XSS: `<script>alert('test')</script>`

#### Date/Time Testing
- Past dates (where applicable)
- Future dates (where applicable)
- Timezone changes
- Daylight saving transitions
- Leap years: Feb 29
- Invalid dates: Feb 30, Apr 31

#### Numeric Fields
- Negative numbers
- Zero
- Decimals
- Very large numbers
- Scientific notation
- Non-numeric input

### State Testing

#### Content States
1. Draft → Published
2. Published → Archived
3. Pending → Approved
4. Pending → Rejected → Draft
5. Any → Deleted (soft delete)

#### User States
1. Invited → Active
2. Active → Deactivated
3. Deactivated → Active
4. Password Reset Requested
5. Locked (failed logins)

### Permission Matrix

| Action | Admin | Manager | User |
|--------|-------|---------|------|
| Create Content | ✅ | ✅ | ✅ |
| Approve Content | ✅ | ✅ | ❌ |
| Delete Content | ✅ | ✅ | Own only |
| Manage Users | ✅ | ✅* | ❌ |
| Manage Brands | ✅ | View | View |
| System Settings | ✅ | ❌ | ❌ |

*Managers cannot create admin users

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Login Issues
**Problem:** Cannot login with test credentials
- Clear browser cache/cookies
- Check caps lock
- Verify environment URL
- Check account status in database

**Problem:** Session expires too quickly
- Check browser settings
- Disable aggressive privacy extensions
- Verify system time is correct

#### Content Generation Issues
**Problem:** Generation times out
- Check AI service status
- Verify API keys are valid
- Test with shorter content
- Check rate limits

**Problem:** Generated content is inappropriate
- Check brand voice settings
- Verify content filters
- Report to dev team with examples

#### Performance Issues
**Problem:** Slow page loads
- Check network tab for slow requests
- Disable browser extensions
- Test on different network
- Clear browser cache

### Debug Information to Collect

When reporting issues, collect:

1. **Browser Console**
   - Open DevTools (F12)
   - Preserve log
   - Reproduce issue
   - Export as HAR file

2. **Network Activity**
   - Network tab in DevTools
   - Look for failed requests (red)
   - Check response times
   - Save as HAR file

3. **System Information**
   ```javascript
   // Run in console
   console.log({
     userAgent: navigator.userAgent,
     screen: `${screen.width}x${screen.height}`,
     viewport: `${window.innerWidth}x${window.innerHeight}`,
     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
     language: navigator.language
   });
   ```

### Useful SQL Queries (Read-Only)

```sql
-- Check user status
SELECT email, status, role, last_login 
FROM users 
WHERE email = 'qa.user@mixerai.test';

-- View recent content
SELECT id, title, status, created_at 
FROM content 
ORDER BY created_at DESC 
LIMIT 10;

-- Check brand settings
SELECT name, settings, created_at 
FROM brands 
WHERE name LIKE 'Test Brand%';

-- View error logs
SELECT timestamp, error_type, message 
FROM error_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

---

## QA Team Contacts

### Escalation Matrix

| Issue Type | Primary Contact | Escalation | Response Time |
|------------|----------------|------------|---------------|
| Blocker Bug | Dev Team Lead | CTO | 1 hour |
| Security Issue | Security Team | CTO | Immediate |
| Data Loss | DBA Team | CTO | Immediate |
| Performance | DevOps Team | Dev Lead | 4 hours |
| UI/UX | Frontend Team | Product | 1 day |
| Business Logic | Product Owner | PM | 1 day |

### Communication Channels

#### Communication Channels
- [QA_GENERAL_CHANNEL] - General QA discussion
- [QA_BUGS_CHANNEL] - Bug reports and tracking
- [QA_AUTOMATION_CHANNEL] - Test automation
- [DEV_QA_SYNC_CHANNEL] - Dev/QA coordination

#### Email Lists
- [QA_TEAM_EMAIL] - QA team
- [DEV_TEAM_EMAIL] - Development team
- [PRODUCT_TEAM_EMAIL] - Product team

#### Standing Meetings
- **Daily Standup:** 9:30 AM
- **Bug Triage:** Tue/Thu 2:00 PM
- **Sprint Planning:** Every 2 weeks
- **QA Retrospective:** End of sprint

### Documentation Links

- **Internal Wiki:** [INTERNAL_WIKI_URL]
- **API Documentation:** [API_DOCUMENTATION_URL]
- **Architecture Docs:** [ARCHITECTURE_DOCS_URL]
- **Release Notes:** [RELEASE_NOTES_URL]
- **Known Issues:** [KNOWN_ISSUES_URL]

---

## Quick Reference Card

### Key URLs
```
Dev:     [DEV_URL]
Staging: [STAGING_URL]
Prod:    [PROD_URL]
API:     [API_URL]
```

### Test Credentials
```
Admin:   [ADMIN_EMAIL] / [PROVIDED_SEPARATELY]
Manager: [MANAGER_EMAIL] / [PROVIDED_SEPARATELY]
User:    [USER_EMAIL] / [PROVIDED_SEPARATELY]
```

### Critical Paths to Test Daily
1. Login → Dashboard
2. Create Content → Submit → Approve
3. Search Content → View → Export
4. Invite User → Accept → Login

### Emergency Contacts
- **Dev On-Call:** [DEV_ONCALL_CONTACT]
- **Product Emergency:** [PRODUCT_EMERGENCY_CONTACT]
- **Security Hotline:** [SECURITY_CONTACT]

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Next Review: January 2025*