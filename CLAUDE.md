# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Building & Production
npm run build           # Build for production (includes memory optimization)
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint for code quality checks
npm run check           # Run both ESLint and TypeScript type checking
npm run review          # Run comprehensive code review
npm run review:fix      # Fix linting issues and run code review

# Testing
npm run test:openai     # Verify Azure OpenAI integration
jest                    # Run test suite (requires test files)
npm test                # Alias for jest

# Core Utility Scripts
node scripts/test-azure-openai.js      # Test Azure OpenAI connectivity
node scripts/verify-openai-integration.js # Verify OpenAI integration
node scripts/test-db-connection.js     # Test database connectivity
node scripts/diagnose-brand-generation.js # Diagnose brand identity generation
node scripts/code-review.js            # Run comprehensive code review
node scripts/code-review-simple.js     # Run simplified code review

# Database Scripts
./scripts/setup-local-db.sh           # Set up local database environment
./scripts/run-migrations.sh           # Run database migrations
./scripts/reset-database.sh           # Reset database to clean state
./scripts/apply-rls-policies.sh       # Apply Row-Level Security policies

# Development Helpers
./scripts/create-test-user.sh         # Create test user in database
./scripts/create-sample-brands.sh     # Create sample brand data
./scripts/analyze-bundle-sizes.sh     # Analyze build bundle sizes
./scripts/setup-env.sh               # Interactive environment setup
./scripts/setup.sh                   # Initial project setup

# Issue Creation Scripts (for GitHub integration)
./scripts/create-security-issues.sh      # Create security-related GitHub issues
./scripts/create-performance-issues.sh   # Create performance-related issues
./scripts/create-ui-standards-issues.sh  # Create UI standards issues
./scripts/create-accessibility-issues.sh # Create accessibility issues
./scripts/create-code-quality-issues.sh  # Create code quality issues

# Deployment
node scripts/vercel-postbuild.js      # Post-build processing for Vercel
```

## Project Structure

```
MixerAI2.0/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Protected dashboard pages
│   │   └── (public pages)        # Public-facing pages
│   ├── components/               # React components
│   │   ├── ui/                   # Base UI components (shadcn/ui)
│   │   ├── content/              # Content-specific components
│   │   ├── dashboard/            # Dashboard-specific components
│   │   ├── layout/               # Layout components
│   │   └── template/             # Template components
│   ├── lib/                      # Utilities and services
│   │   ├── auth/                 # Authentication helpers
│   │   ├── azure/                # Azure OpenAI client
│   │   ├── supabase/             # Supabase clients
│   │   └── utils/                # Utility functions
│   └── types/                    # TypeScript type definitions
├── docs/                         # Project documentation
├── migrations/                   # Database migrations
├── scripts/                      # Utility scripts
├── email-templates/              # HTML email templates
└── public/                       # Static assets
```

## Architecture Overview

MixerAI 2.0 is a Next.js 14 application using the App Router for AI-powered content generation. Key architectural decisions:

### Technology Stack
- **Framework**: Next.js 14 with App Router, React 18
- **Language**: TypeScript with `noImplicitAny: false` (target: ES5)
- **Styling**: Tailwind CSS with custom color system
- **Database**: PostgreSQL via Supabase
- **AI**: Azure OpenAI API (GPT-4o deployment)
- **Deployment**: Vercel with edge functions
- **Node.js**: Version 18+ required

### Key Dependencies
- **UI Components**: shadcn/ui built on Radix UI
- **Forms**: React Hook Form with Zod validation
- **Rich Text**: React Quill (v2.0.0)
- **Drag & Drop**: @hello-pangea/dnd (react-beautiful-dnd fork)
- **Date Handling**: date-fns (v4.1.0)
- **Notifications**: Sonner toast library
- **Testing**: Jest with ts-jest preset

### API Structure
- All API routes follow RESTful patterns under `/src/app/api/`
- Each resource has its own route folder with standard HTTP methods
- Consistent response format: `{ success: boolean, data?: any, error?: string }`
- AI endpoints integrate with Azure OpenAI for content generation
- Protected routes require authentication via middleware

### Database & Authentication
- **Supabase** provides PostgreSQL database and authentication
- **Row-Level Security (RLS)** policies enforce multi-tenant data isolation
- **User roles**: admin, editor, viewer (stored in user_metadata)
- **Brand-based permissions**: Users can have different roles per brand
- **Profile system**: Extended user profiles linked to auth.users

### UI Component System
- **Shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** with consistent spacing scale (4px/8px increments)
- **Form handling** with React Hook Form and Zod validation
- **Rich text editing** via React Quill
- **Responsive design** with mobile-first approach
- **Accessibility**: WCAG 2.1 Level AA compliance required

### Key Patterns
1. **Protected Routes**: Dashboard routes require authentication via middleware
2. **Data Fetching**: Direct fetch calls in server components, SWR for client-side
3. **Type Safety**: Comprehensive TypeScript (Note: `noImplicitAny: false` in tsconfig)
4. **Error Handling**: Try-catch blocks with user-friendly error messages
5. **Loading States**: Skeleton screens and loading indicators throughout
6. **Form Handling**: React Hook Form with Zod schema validation
7. **State Management**: React Context for global state, local state for components

## Critical Implementation Details

### AI Content Generation Flow
1. User selects template and provides inputs via forms
2. Product context and claims are fetched from database
3. Prompt is constructed with template instructions and product data
4. Azure OpenAI generates content based on prompt
5. Generated content is saved with metadata and versioning
6. Workflow assignments trigger notifications and tasks

### Multi-Brand Architecture
- Each brand has unique identity settings (colors, logos, tone)
- Content and templates are scoped to brands via foreign keys
- Brand admins can manage brand-specific settings
- Master claim brands provide shared claim definitions
- Brand-specific claim overrides for market variations

### Content Template System
- Dynamic field types: text, textarea, select, multiselect, etc.
- Product selector integration for claims-based content
- AI-powered field generation and suggestions
- Template versioning and change tracking
- Custom validation rules per field

### Workflow Management
- Multi-step approval workflows with assignees
- Email notifications for workflow steps
- Task creation and assignment system
- Workflow status tracking (draft, active, archived)
- Content state management through workflow steps

### Claims Management System
- Hierarchical claims structure (brand → product → ingredient)
- Market-specific overrides for claims
- AI-powered claim simplification and styling
- Claim preview matrix for visualization
- Integration with content generation prompts

### Environment Configuration
Required environment variables:
```bash
# Azure OpenAI
AZURE_OPENAI_API_KEY=           # Azure OpenAI service key
AZURE_OPENAI_ENDPOINT=          # Azure OpenAI endpoint URL
AZURE_OPENAI_DEPLOYMENT_NAME=   # Deployment name (e.g., gpt-4o)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=      # Service role key for admin operations

# Application
NEXT_PUBLIC_APP_URL=            # Production app URL
NEXT_PUBLIC_VERCEL_URL=         # Vercel deployment URL

# GitHub Integration (for issues/feedback)
GITHUB_TOKEN=                   # GitHub personal access token (requires 'repo' or 'public_repo' scope)
GITHUB_OWNER=                   # GitHub organization/user
GITHUB_REPO=                    # GitHub repository name
NEXT_PUBLIC_GITHUB_OWNER=       # GitHub organization/user (for client-side links)
NEXT_PUBLIC_GITHUB_REPO=        # GitHub repository name (for client-side links)
```

## UI Standards Compliance

Follow the established design system documented in `/docs/UI_STANDARDS.md`:

### Layout & Structure
- Full-width dashboard pages with consistent padding (`px-4 sm:px-6 lg:px-8`)
- Breadcrumb navigation for nested pages
- Page titles (h1) and descriptions on every page
- Back buttons on detail/edit pages
- Primary action buttons in top-right of listings

### Branding & Context
- Active brand display with avatar when in brand context
- Brand colors used subtly as accents (must meet WCAG contrast)
- Brand avatars shown in listings and selectors
- Fallback to initials when avatar unavailable

### Forms & Input
- All fields must have visible labels
- Required fields marked with asterisk (*)
- Helper text below complex fields
- Inline validation messages
- Primary action button (bottom-right), Cancel button (to its left)
- Loading states for async operations

### Data Display
- Consistent table layouts with sortable columns
- Empty states with clear messaging and CTAs
- Loading indicators (skeleton screens preferred)
- Date format: "dd Mmmm yyyy" (e.g., "21 May 2024")
- Action buttons grouped in rightmost column

### Accessibility Requirements
- WCAG 2.1 Level AA compliance mandatory
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus indicators on all interactive elements
- Sufficient color contrast (4.5:1 for normal text)

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Prefer named exports over default exports
- Use absolute imports with @ alias
- TypeScript configured with `noImplicitAny: false` (allows implicit any)

### Error Handling
- NO FALLBACKS for AI generation failures
- Always propagate actual errors to users
- Log errors with appropriate context
- Use try-catch in all async operations

### Performance
- Implement code splitting for large components
- Use dynamic imports for heavy dependencies
- Optimize images with Next.js Image component
- Implement proper caching strategies

### Security
- Never log sensitive information (API keys, user data)
- Validate all user inputs on both client and server
- Use parameterized queries for database operations
- Implement proper CORS and CSP headers

## Testing Approach

- Unit tests for utility functions and helpers
- Integration tests for API routes
- Component testing with React Testing Library
- E2E tests for critical user flows (when implemented)
- Test files use `.test.ts` or `.test.tsx` suffix or are placed in `__tests__` directories
- Component-specific test scripts available in scripts/test-* files
- Jest configuration includes TypeScript support via ts-jest
- Module path aliases are configured to match TypeScript paths

## Deployment

- Vercel deployment with automatic previews
- Environment variables set in Vercel dashboard
- Build optimization with standalone output
- Automatic redirects configured in next.config.js
- Post-build processing via vercel-postbuild.js script

## Important Notes

### Build Configuration
- Build uses increased memory allocation: `NODE_OPTIONS="--max_old_space_size=4096"`
- Vercel deployment disables build cache for consistency
- Standalone output mode for optimized Docker deployments
- Build errors are NOT ignored (strict build process)
- TypeScript incremental compilation enabled for faster builds

### Middleware Security Features
- **CSRF Protection**: Automatic token generation and validation for all API routes
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security
- **Route Protection**: Authentication required for `/dashboard/*`, `/api/*` (except public endpoints), `/account/*`
- **Public API Routes**: `/api/env-check`, `/api/test-connection`, `/api/auth/*`, `/api/test-*`

### Next.js Configuration
- Image domains allowed: `api.dicebear.com`, `images.unsplash.com`, `placehold.co`, `placeholder.com`
- Security: `poweredByHeader` disabled
- Permanent redirects configured for route consolidation (e.g., `/brands/*` → `/dashboard/brands/*`)
- Path traversal protection implemented

### Recent Architecture Changes
- Migrated from feedback_log table to GitHub issues integration
- Refactored claims system to use junction tables instead of arrays
- Updated template fields to proper JSON structure
- Added brand URLs and cleaned up profile metadata
- Performance optimizations: Split ContentGeneratorForm into smaller components
- Enhanced error handling with proper TypeScript types (replaced 'any' types)

## Key Documentation References

### Core Documentation
- `/docs/README.md` - Documentation hub with quick start guide
- `/docs/ARCHITECTURE.md` - Detailed technical architecture
- `/docs/UI_STANDARDS.md` - Comprehensive UI/UX standards (Version 1.0)
- `/docs/api_reference.md` - Complete API endpoint documentation
- `/docs/user_guide.md` - End-user documentation for all features
- `/docs/database.md` - Database schema and relationships
- `/docs/authentication.md` - Auth flow and permissions model

### Security & Operations
- `/SECURITY.md` - Security policies and vulnerability reporting
- Report security issues to: security@mixerai.com (DO NOT use GitHub issues)
- `/docs/deployment.md` - Deployment procedures and configuration

### Development Resources
- `/migrations/` - Database migration files (format: YYYYMMDD_description.sql)
- `/email-templates/` - Email HTML templates for auth and notifications
- `/.env.example` - Complete list of required environment variables
- `/scripts/README-code-review.md` - Code review process documentation

## Common Development Tasks

### Running a Single Test
```bash
jest path/to/test.test.ts        # Run specific test file
jest -t "test name"              # Run test by name pattern
jest --watch                     # Run tests in watch mode
```

### Debugging Azure OpenAI Issues
```bash
node scripts/test-azure-openai.js     # Test basic connectivity
node scripts/diagnose-brand-generation.js  # Debug brand identity generation
npm run test:openai                   # Run full OpenAI integration tests
```

### Working with Database Migrations
```bash
# Create new migration
touch migrations/$(date +%Y%m%d)_description.sql

# Apply migrations
./scripts/run-migrations.sh

# Reset database (caution: destroys data)
./scripts/reset-database.sh
```

## License

This project is licensed under the MIT License.