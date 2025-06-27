# MixerAI 2.0 - QA Team Overview

## Executive Summary

MixerAI 2.0 is an enterprise-grade content management and generation platform that leverages AI to help brands create, manage, and approve marketing content at scale. The system is designed for multi-brand organizations and provides sophisticated workflow management, AI-powered content generation, and comprehensive content governance.

## What MixerAI 2.0 Does

### Core Functionality
1. **AI-Powered Content Generation**: Creates marketing content using Azure OpenAI with brand-specific guidelines
2. **Multi-Brand Management**: Supports multiple brands with isolated data and permissions
3. **Workflow Management**: Approval workflows ensure content quality and compliance
4. **Claims Management**: Manages product claims with market-specific overrides
5. **Content Tools Suite**: Includes specialized tools for alt-text, metadata, and content transcreation

### Key User Benefits
- Reduces content creation time by 70%
- Ensures brand consistency across all content
- Maintains regulatory compliance through approval workflows
- Enables global market adaptation with localization features

## Technical Architecture

### Technology Stack
- **Frontend**: Next.js 14 (React 18) with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Backend**: Next.js API routes with REST architecture
- **Database**: PostgreSQL via Supabase with Row-Level Security
- **Authentication**: Supabase Auth with custom RBAC
- **AI Integration**: Azure OpenAI API
- **Email Service**: Resend for notifications
- **Hosting**: Vercel (recommended) or any Node.js host

### Security Architecture
1. **Multi-layered Authentication**
   - JWT-based session management
   - Automatic session renewal
   - Secure HTTP-only cookies

2. **Authorization**
   - Role-Based Access Control (Admin, Manager, User)
   - Brand-scoped permissions
   - Row-Level Security at database level

3. **API Security**
   - CSRF protection on all mutations
   - Rate limiting (Auth: 10/15min, AI: 50/15min, General: 100/15min)
   - Input validation with Zod schemas
   - SQL injection prevention via parameterized queries

### Data Architecture
- **Multi-tenant**: Each brand's data is isolated
- **Audit Trail**: All content changes are tracked
- **Soft Deletes**: Data is archived, not permanently deleted
- **Optimistic Locking**: Prevents concurrent edit conflicts

## Key Application Areas

### 1. Dashboard
- **URL**: `/dashboard`
- **Purpose**: Main navigation hub
- **Features**: Quick stats, recent activity, navigation to all modules

### 2. Content Generator
- **URL**: `/dashboard/content-generator`
- **Purpose**: AI-powered content creation
- **Key Features**:
  - Multiple content types (social media, blog, email, etc.)
  - Template selection
  - Tone and style customization
  - Real-time preview
  - Auto-save functionality

### 3. Content Library
- **URL**: `/dashboard/content-library`
- **Purpose**: Central repository for all generated content
- **Features**:
  - Advanced search and filtering
  - Version history
  - Bulk operations
  - Export capabilities

### 4. Brand Settings
- **URL**: `/dashboard/brands`
- **Purpose**: Brand configuration and guidelines
- **Features**:
  - Brand voice settings
  - Logo management
  - Style guidelines
  - Default templates

### 5. Claims Management
- **URL**: `/dashboard/claims`
- **Purpose**: Product claims database
- **Features**:
  - Master claims repository
  - Market-specific overrides
  - Regulatory compliance tracking
  - Bulk import/export

### 6. Users & Permissions
- **URL**: `/dashboard/users`
- **Purpose**: User management and access control
- **Features**:
  - User invitation system
  - Role assignment
  - Brand access management
  - Activity monitoring

### 7. Tools Suite
- **Alt-Text Generator**: `/dashboard/tools/alt-text`
- **Metadata Generator**: `/dashboard/tools/metadata`
- **Transcreator**: `/dashboard/tools/transcreator`

### 8. Workflow Management
- **Purpose**: Content approval process
- **Features**:
  - Multi-stage approval
  - Email notifications
  - Comment system
  - Audit trail

## User Roles & Permissions

### Admin
- Full system access
- User management
- Brand creation/management
- System configuration
- All content operations

### Manager
- Content approval/rejection
- User invitation (non-admin)
- Brand settings management
- All content operations
- Claims management

### User
- Content creation
- Content viewing
- Submit for approval
- Use tools suite
- View claims (no edit)

## Critical User Journeys

### 1. Content Creation Flow
1. User logs in → Dashboard
2. Navigate to Content Generator
3. Select content type and template
4. Fill in requirements
5. Generate content
6. Review and edit
7. Save or submit for approval
8. Receive notification when approved

### 2. Content Approval Flow
1. Manager receives email notification
2. Reviews content in workflow queue
3. Can approve, reject, or request changes
4. User notified of decision
5. Content moves to library when approved

### 3. Brand Onboarding Flow
1. Admin creates new brand
2. Configures brand settings
3. Uploads brand assets
4. Sets brand guidelines
5. Invites brand users
6. Assigns roles and permissions

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh session
- `POST /api/auth/reset-password` - Password reset

### Content
- `GET /api/content` - List content
- `POST /api/content` - Create content
- `PUT /api/content/[id]` - Update content
- `DELETE /api/content/[id]` - Delete content
- `POST /api/content/generate` - AI generation

### Brands
- `GET /api/brands` - List brands
- `POST /api/brands` - Create brand
- `PUT /api/brands/[id]` - Update brand
- `DELETE /api/brands/[id]` - Delete brand

### Users
- `GET /api/users` - List users
- `POST /api/users/invite` - Invite user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Remove user

## Testing Considerations

### Performance Requirements
- Page load: < 3 seconds
- API response: < 1 second (except AI generation)
- AI generation: < 30 seconds
- Search results: < 500ms

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 8+)

### Responsive Design
- Desktop: 1920x1080, 1440x900, 1366x768
- Tablet: 768x1024 (iPad)
- Mobile: 375x667 (iPhone), 360x640 (Android)

### Critical Data Validations
- Email format validation
- Required field validation
- Character limits (varies by field)
- File upload restrictions (images: 5MB, formats: jpg, png, webp)
- Unique constraints (email, brand names)

## Known Limitations
1. AI generation requires active internet connection
2. Bulk operations limited to 100 items
3. File uploads limited to 5MB
4. Session timeout after 24 hours of inactivity
5. Maximum 5 failed login attempts before lockout

## Test Environment Access
- **URL**: [TEST_ENVIRONMENT_URL - to be provided during onboarding]
- **Test Accounts**: [TEST_CREDENTIALS - to be provided during onboarding]
- **API Documentation**: [API_DOCS_URL - to be provided during onboarding]
- **Test Data**: Pre-populated with sample brands and content

## Support & Escalation
- **Technical Issues**: Create GitHub issue in project repository
- **Business Logic Questions**: [PRODUCT_OWNER_CONTACT - to be provided]
- **Security Concerns**: [SECURITY_CONTACT - to be provided]
- **Test Blocker**: [ESCALATION_PROCESS - to be provided]

## Glossary
- **Brand**: A company or product line with unique identity
- **Claim**: A marketing statement about a product
- **Content Item**: A piece of generated content
- **Template**: Pre-defined content structure
- **Workflow**: Approval process for content
- **Transcreation**: Creative translation/adaptation
- **RLS**: Row-Level Security (database access control)
- **RBAC**: Role-Based Access Control

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Prepared for: QA Team Onboarding*