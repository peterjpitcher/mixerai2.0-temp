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
npm run lint            # Run ESLint for code quality checks (uses .eslintrc.json)
npm run check           # Run both ESLint and TypeScript type checking
npm run review          # Run comprehensive code review
npm run review:fix      # Fix linting issues and run code review

# Testing
npm run test:openai     # Verify Azure OpenAI integration
jest                    # Run test suite (requires test files)
npm test                # Alias for jest
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Core Utility Scripts
node scripts/test-azure-openai.js      # Test Azure OpenAI connectivity
node scripts/verify-openai-integration.js # Verify OpenAI integration
node scripts/test-db-connection.js     # Test database connectivity
node scripts/diagnose-brand-generation.js # Diagnose brand identity generation
node scripts/test-title-generation.js  # Test AI title generation feature
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
node scripts/test-user-flows.js       # Test user flows and interactions
node scripts/test-workflow-assignee-validation.js  # Test workflow assignee validation
node scripts/check-workflows-without-assignees.js  # Check for workflows without assignees

# Issue Creation Scripts (for GitHub integration)
./scripts/create-security-issues.sh      # Create security-related GitHub issues
./scripts/create-performance-issues.sh   # Create performance-related issues
./scripts/create-ui-standards-issues.sh  # Create UI standards issues
./scripts/create-accessibility-issues.sh # Create accessibility issues
./scripts/create-code-quality-issues.sh  # Create code quality issues

# Deployment
node scripts/vercel-postbuild.js      # Post-build processing for Vercel

# Additional Testing & Validation Scripts
node scripts/test-brand-identity-api.js  # Test brand identity API endpoint
node scripts/test-brand-update.js        # Test brand update functionality
node scripts/test-content-creation.js    # Test content creation flow
node scripts/test-admin-api.js           # Test admin API endpoints
node scripts/test-service-role-permissions.js  # Test service role permissions
node scripts/test-local-env.js           # Verify local environment setup
node scripts/test-redirects.js           # Test route redirects
./scripts/test-rls-policies.sh           # Test Row-Level Security policies
node scripts/diagnose-template-generation.js  # Diagnose template generation issues

# Database Migration Scripts
./scripts/apply-claims-workflow-brand-migration.sh  # Apply claims workflow migrations
./scripts/apply-claims-workflow-migrations.sh       # Apply claims workflow updates
./scripts/apply-email-migration.sh                  # Apply email system migration
./scripts/apply-profile-job-title-migration.sh      # Add job title to profiles
./scripts/apply-template-migration.sh               # Apply template system updates
node scripts/apply-workflow-history-migration.js    # Apply workflow history updates
node scripts/run-company-field-migration.js         # Add company field to profiles
./scripts/run-job-title-migration.sh                # Run job title migration

# User Management Scripts
node scripts/seed-superadmin.ts       # Create initial superadmin user
node scripts/create-user.js           # Create new user programmatically
node scripts/create-local-user.js     # Create user for local development
./scripts/add_created_by_to_brands.sh # Add created_by field to brands

# Infrastructure & Storage Scripts
node scripts/setup-storage-buckets.js  # Set up Supabase storage buckets
./scripts/deploy-rls-policies.sh       # Deploy RLS policies to database
./scripts/init-database.sh             # Initialize database schema
./scripts/update-api-routes.sh         # Update API route configurations
./scripts/update-domain-config.sh      # Update domain configurations
./scripts/update-supabase-config.sh    # Update Supabase project settings

# Development & Build Scripts
node scripts/capture-build-errors.js   # Capture and analyze build errors
./scripts/clean-cache.js               # Clean build and module caches
node scripts/comprehensive-eslint-fix.js  # Comprehensive ESLint fixes
node scripts/fix-remaining-eslint.js   # Fix remaining ESLint issues
./scripts/cleanup-placeholder-files.sh # Remove placeholder files

# Utility Scripts
node scripts/force-local-generation.js # Force local AI generation mode
node scripts/extract-schema.js         # Extract database schema
./scripts/organize-docs.sh             # Organize documentation files
node scripts/run-full-code-review.js   # Run comprehensive code review
node scripts/check-invitation-flags.js # Check invitation system flags
node scripts/check-rpc-function.js     # Check database RPC functions
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
├── supabase/migrations/          # Database migrations
├── scripts/                      # Utility scripts
├── email-templates/              # HTML email templates
└── public/                       # Static assets
```

## Architecture Overview

MixerAI 2.0 is an AI-powered content generation platform that creates high-quality marketing content using Azure OpenAI. It allows users to create and manage content for different brands using customizable workflows and templates. The application is built with Next.js 14 using the App Router, powered by Supabase for backend services and PostgreSQL.

### Technology Stack
- **Framework**: Next.js 14 with App Router, React 18
- **Language**: TypeScript with `noImplicitAny: false` (target: ES2015)
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
  - **Viewer**: Read-only access to assigned brands
  - **Editor**: Can create/edit content for assigned brands
  - **Admin**: Platform-wide access if no brand assignments, otherwise scoped to assigned brands
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
8. **Database Connections**: Can use either Supabase (default) or direct PostgreSQL connection for local development
9. **Debug Mode**: Optional debug panel and enhanced logging available via environment flags

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

### AI Title Generation
- Automatic title generation for content when not provided by user
- Uses Azure OpenAI to create contextual, brand-appropriate titles
- Integrated into content creation workflow
- Test with `node scripts/test-title-generation.js`

### Navigation System Architecture
- **Unified Navigation**: Single source of truth in `src/lib/navigation.ts`
- **Dynamic Expansion**: Uses `useSelectedLayoutSegments()` for auto-expanding sections
- **Framework Redirects**: All redirects handled at framework level (middleware/next.config.js)
- **Permission-based**: Navigation items filtered based on user roles and brand access
- **Responsive Design**: Mobile-friendly with collapsible sidebar

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

# Local Development (Optional)
POSTGRES_HOST=                  # PostgreSQL host for direct connection
POSTGRES_PORT=                  # PostgreSQL port (default: 5432)
POSTGRES_USER=                  # PostgreSQL user
POSTGRES_PASSWORD=              # PostgreSQL password
POSTGRES_DB=                    # PostgreSQL database name
POSTGRES_SSL=                   # PostgreSQL SSL mode (disable/require)
USE_DIRECT_POSTGRES=            # Use direct PostgreSQL instead of Supabase (true/false)

# Additional Configuration (Optional)
USE_LOCAL_GENERATION=           # Force local AI generation (development/testing)
AZURE_OPENAI_API_VERSION=       # Azure OpenAI API version (default: 2024-02-15-preview)
INITIAL_SUPERADMIN_EMAIL=       # Email for initial superadmin user
INITIAL_SUPERADMIN_PASSWORD=    # Password for initial superadmin user
INITIAL_SUPERADMIN_FULL_NAME=   # Full name for initial superadmin user
DEBUG_MODE=                     # Enable debug mode features (true/false)
DEBUG_PANEL_ENABLED=            # Enable debug panel in UI (true/false)
INTERNAL_API_KEY=               # Internal API key for service-to-service calls

# Alternative AI Provider (Optional)
OPENAI_API_KEY=                 # OpenAI API key (alternative to Azure OpenAI)
OPENAI_MODEL=                   # OpenAI model name (e.g., gpt-4)

# Build Information (Auto-populated)
NEXT_PUBLIC_BUILD_DATE=         # Build date for versioning
NEXT_PUBLIC_VERCEL_ENV=         # Vercel environment (development/preview/production)
```

## UI Standards Compliance

Follow the established design system documented in `/docs/ui-standards.md`:

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
- Follow ESLint configuration (`.eslintrc.json` and `eslint.config.mjs`)
- Prefer named exports over default exports
- Use absolute imports with @ alias
- TypeScript configured with `noImplicitAny: false` (allows implicit any)

### Error Handling
- **NO FALLBACKS for AI generation failures** - This is a strict policy
- In `src/lib/azure/openai.ts`, AI generation functions must NEVER fall back to template-based content when API calls fail
- No default or pre-written content should be returned if the Azure OpenAI API is unavailable
- Always propagate actual errors to users with transparent reporting
- Error states should suggest trying again later rather than using fallbacks
- Log errors with appropriate context
- Use try-catch in all async operations
- Always validate data before using string methods or object properties
- Use optional chaining (`?.`) for nested object access
- Check if strings exist before calling methods like `.trim()`, `.includes()`, etc.

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
- **Jest Configuration**:
  - Uses `ts-jest` preset for TypeScript support
  - Test environment: `node` (not jsdom)
  - Module path mapping: `@/` → `<rootDir>/src/`
  - Ignores: node_modules, .next, out directories
  - Test match patterns: `**/__tests__/**/*.+(ts|tsx|js)`, `**/?(*.)+(spec|test).+(ts|tsx|js)`

## Deployment

- Vercel deployment with automatic previews
- Environment variables set in Vercel dashboard
- Build optimization with standalone output
- Automatic redirects configured in next.config.js
- Post-build processing via vercel-postbuild.js script

## Important Notes

### Build Configuration
- Build uses increased memory allocation: `NODE_OPTIONS="--max_old_space_size=4096"`
- Vercel deployment disables build cache for consistency: `VERCEL_FORCE_NO_BUILD_CACHE=1`
- Vercel install command: `npm install --no-save` (prevents package-lock.json modifications)
- Telemetry disabled: `NEXT_TELEMETRY_DISABLED=1`
- Standalone output mode for optimized Docker deployments
- Build errors are NOT ignored (strict build process)
- TypeScript incremental compilation enabled for faster builds
- GitHub integration enabled for deployments

### Middleware Security Features
- **CSRF Protection**: Automatic token generation and validation for all API routes
- **Security Headers** (via middleware and vercel.json):
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- **Route Protection**: Authentication required for `/dashboard/*`, `/api/*` (except public endpoints), `/account/*`
- **Public API Routes**: `/api/env-check`, `/api/test-connection`, `/api/auth/*`, `/api/test-*`

### Next.js Configuration
- Image domains allowed: `api.dicebear.com`, `images.unsplash.com`, `placehold.co`, `placeholder.com`, `shsfrtemevclwpqlypoq.supabase.co`
- Security: `poweredByHeader` disabled
- Permanent redirects configured for route consolidation (e.g., `/brands/*` → `/dashboard/brands/*`)
- Path traversal protection implemented
- ESLint: `ignoreDuringBuilds: true` (but pre-commit checks are mandatory)

### Recent Architecture Changes
- Migrated from feedback_log table to GitHub issues integration
- Refactored claims system to use junction tables instead of arrays
- Updated template fields to proper JSON structure
- Added brand URLs and cleaned up profile metadata
- Performance optimizations: Split ContentGeneratorForm into smaller components
- Enhanced error handling with proper TypeScript types (replaced 'any' types)
- Implemented claims approval workflow (Issue #126)
- Redesigned dashboard home page (Issue #121)
- Added workflow assignee validation as mandatory field
- Enhanced tool run history with additional metadata

## Key Documentation References

### Core Documentation
- `/docs/index.md` - Documentation index and overview
- `/docs/readme.md` - Documentation hub with quick start guide
- `/docs/architecture.md` - Detailed technical architecture
- `/docs/ui-standards.md` - Comprehensive UI/UX standards (Version 2.0)
- `/docs/user-guide.md` - End-user documentation for all features
- `/docs/user-flows.md` - User flow documentation
- `/docs/user-flow-diagrams.md` - Visual user flow diagrams
- `/docs/workflow-assignee-mandatory-changes.md` - Workflow assignee implementation
- `/docs/ai-title-generation.md` - AI-powered title generation feature
- `/docs/navigation-permissions.md` - Detailed role-based navigation permissions
- `/docs/email-template-standards.md` - Email design and implementation standards

### API Documentation
- `/docs/api/api-architecture-review.md` - Comprehensive API architecture analysis
- `/docs/api/content-generation.md` - Content generation endpoint documentation
- `/docs/api-reference.md` - Complete API endpoint documentation (TO BE CREATED)

### Testing Documentation
- `/docs/testing/manual-testing-checklist.md` - Comprehensive manual testing guide
- `/docs/testing/testing-report.md` - Full testing report and findings
- `/docs/testing/testing-summary.md` - Condensed testing overview

### Setup & Configuration
- `/docs/setup/storage-setup.md` - Supabase storage configuration guide
- `/docs/setup/migration-path-update-summary.md` - Database migration updates

### Missing Documentation (TO BE CREATED)
- `/docs/database.md` - Database schema and relationships
- `/docs/authentication.md` - Auth flow and permissions model

### Security & Operations
- `/SECURITY.md` - Security policies and vulnerability reporting
- Report security issues to: security@mixerai.com (DO NOT use GitHub issues)
- `/docs/deployment.md` - Deployment procedures and configuration (TO BE CREATED)

### Development Resources
- `/supabase/migrations/` - Database migration files (format: YYYYMMDD_description.sql)
- `/email-templates/` - Email HTML templates for auth and notifications
- `/.env.example` - Complete list of required environment variables
- `/scripts/README-code-review.md` - Code review process documentation

## Common Development Tasks

### Running Tests
```bash
# Single test execution
jest path/to/test.test.ts        # Run specific test file
jest -t "test name"              # Run test by name pattern

# Test modes
jest --watch                     # Run tests in watch mode
npm run test:watch               # Alias for watch mode
npm run test:coverage            # Generate coverage report

# Component-specific tests
node scripts/test-user-flows.js  # Test user interaction flows
node scripts/test-workflow-assignee-validation.js  # Test workflow validation
./scripts/test-rls-policies.sh   # Test database security policies
```

### Debugging Azure OpenAI Issues
```bash
node scripts/test-azure-openai.js     # Test basic connectivity
node scripts/diagnose-brand-generation.js  # Debug brand identity generation
npm run test:openai                   # Run full OpenAI integration tests
```

### Working with Database Migrations
```bash
# Create new migration (Supabase)
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Apply migrations
./scripts/run-migrations.sh

# Reset database (caution: destroys data)
./scripts/reset-database.sh

# Migrations are stored in /supabase/migrations/ directory
```

### Local Development with PostgreSQL
```bash
# Run with local database instead of Supabase
./scripts/use-local-db.sh
# Or set USE_DIRECT_POSTGRES=true in .env

# Initialize local database
./scripts/init-database.sh

# Clean database (removes test data)
./scripts/clean-database.sh

# Add test user for authentication
./scripts/add-test-user.sh
# Or use the Node.js version with more options
node scripts/create-local-user.js

# Create superadmin user
node scripts/seed-superadmin.ts
```

## Debug Mode Features

When developing locally, you can enable debug features:

```bash
# Enable debug mode in .env
DEBUG_MODE=true
DEBUG_PANEL_ENABLED=true
```

This provides:
- Enhanced error logging with stack traces
- Debug panel in the UI showing current state
- Additional development-only API endpoints
- Verbose console output for troubleshooting

## Direct PostgreSQL Connection

For local development without Supabase:

```bash
# Configure in .env
USE_DIRECT_POSTGRES=true
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
POSTGRES_SSL=disable  # For local development
```

This is useful for:
- Offline development
- Testing database migrations locally
- Debugging RLS policies
- Performance testing with local data

## Personalized Working Guidelines

When working with this codebase, follow these specific guidelines:

### 1. Database Migrations
- **NEVER run database migrations directly**
- Create migration files in `/supabase/migrations/` following the naming convention: `YYYYMMDD_description.sql`
- Provide clear instructions for running migrations
- Wait for confirmation before proceeding with code that depends on migrations
- Example: "I've created migration `20241217_add_user_preferences.sql`. Please run `./scripts/run-migrations.sh` and let me know when complete."

### 2. Pre-Commit Build Verification
- **ALWAYS run `vercel build --prod` before committing or creating pull requests**
- Fix all build errors and warnings until you achieve a clean build
- Also run these checks before committing:
  - `npm run lint` - Fix all linting issues
  - `npm run check` - Ensure TypeScript types are correct
  - `npm run test:openai` - Verify AI integration if AI code was modified
- Only commit or create PRs after all checks pass cleanly

### 3. Documentation Maintenance
- Update relevant documentation immediately when making changes
- Key documentation to maintain:
  - `/docs/api-reference.md` - When modifying API endpoints
  - `/docs/database.md` - When changing database schema
  - `/docs/user-guide.md` - When adding/modifying user-facing features
  - `/docs/architecture.md` - When making architectural changes
  - Code comments for complex logic or non-obvious implementations
- Use clear, concise language and include examples where helpful

### 4. Standards Compliance
- **ALWAYS check for and follow existing standards documents**
- Key standards to follow:
  - `/docs/ui-standards.md` - Mandatory for all UI changes
  - ESLint configuration - For code style
  - TypeScript conventions - Despite `noImplicitAny: false`, use proper types where possible
- When in doubt, search for similar implementations in the codebase and follow established patterns

### 5. Additional Best Practices
- **Test all changes locally** before committing:
  - Run affected features in development mode (`npm run dev`)
  - Test with different user roles and brands
  - Verify error handling and edge cases
- **Use GitHub Issues integration** for tracking bugs and feature requests (not the feedback_log table)
- **Follow the NO FALLBACKS policy** for AI generation - never provide default content if AI fails
- **Check for related tests** and update them when modifying code
- **Use meaningful commit messages** that explain the "why" not just the "what"
- **Verify environment variables** are properly documented in `.env.example` when adding new ones

### 6. Communication Protocol
- Provide progress updates for long-running tasks
- Ask for clarification rather than making assumptions
- Alert about potential breaking changes or security implications
- Suggest alternatives when requested changes might cause issues

### 7. Branch Naming Conventions
- **Feature branches**: `feature/description-with-hyphens`
- **Bug fixes**: `fix/issue-number-description` or `bugfix/description`
- **Hotfixes**: `hotfix/critical-issue-description`
- **Documentation**: `docs/what-is-being-documented`
- **Refactoring**: `refactor/component-or-area`
- **Performance**: `perf/optimization-description`
- **Testing**: `test/what-is-being-tested`
- Always use lowercase with hyphens, no underscores or camelCase

### 8. Comprehensive Code Review Requirements
When reviewing code, check ALL of the following:
- **UI/Database Alignment**:
  - Every form field must map to a database column
  - Database schema must support all UI operations
  - Check data types match between UI validation and database constraints
  - Verify required/optional fields match between UI and database
  - Ensure field lengths in UI match database column limits
- **Type Safety**:
  - Verify TypeScript types match database schema
  - Check Zod schemas align with both UI and database
  - Ensure API response types match frontend expectations
- **Security**:
  - Verify RLS policies are appropriate
  - Check for SQL injection vulnerabilities
  - Ensure proper input sanitization
  - Verify authentication on all protected routes
- **Performance**:
  - Look for N+1 query problems
  - Check for missing database indexes
  - Verify efficient data fetching strategies
- **Error Handling**:
  - All edge cases covered
  - User-friendly error messages
  - Proper error logging
- **Standards Compliance**:
  - UI follows `/docs/ui-standards.md`
  - Code follows ESLint rules
  - Consistent naming patterns

### 9. Data Integrity Guidelines
- **Before modifying database schema**:
  - Check all affected UI components
  - Verify API endpoints that use the data
  - Plan data migration for existing records
  - Update TypeScript types and Zod schemas
  - Update relevant documentation
- **Validation layers**:
  - Client-side (React Hook Form + Zod)
  - API-level validation
  - Database constraints
  - All three must align perfectly
- **Testing data changes**:
  - Test with existing data
  - Test with edge cases (nulls, empty strings, max lengths)
  - Test with different user roles

### 10. API Development Standards
- **Naming**: Use RESTful conventions (`/api/[resource]/[id]/[action]`)
- **Responses**: Always return `{ success: boolean, data?: any, error?: string }`
- **Status codes**: Use appropriate HTTP status codes
- **Validation**: Validate all inputs before processing
- **Documentation**: Update `/docs/api-reference.md` for any changes
- **Testing**: Create or update API tests for endpoints

### 11. Performance Monitoring
- **Before deploying features that**:
  - Add new database queries: Check query execution plans
  - Process large datasets: Implement pagination
  - Generate AI content: Add appropriate timeouts and loading states
  - Upload files: Implement size limits and type validation
- **Monitor**:
  - API response times
  - Database query performance
  - Build sizes with `./scripts/analyze-bundle-sizes.sh`
  - Memory usage during development

### 12. Multi-tenant Safety
- **Always consider**:
  - Brand isolation in queries
  - User permissions per brand
  - RLS policies for new tables
  - Cross-tenant data leakage risks
- **Test with**:
  - Multiple brands
  - Different user roles
  - Brand switching scenarios

### 13. AI Integration Guidelines
- **When modifying AI features**:
  - Test with Azure OpenAI offline scenarios
  - Verify error messages are helpful (no fallbacks!)
  - Check token usage and costs
  - Test with various input sizes
  - Ensure prompts are in version control, not hardcoded

### 14. Deployment Checklist
Before requesting deployment:
1. Run `vercel build --prod` - must pass
2. Run `npm run lint` - must pass
3. Run `npm run check` - must pass
4. Run `npm run test:openai` - must pass if AI code changed
5. Test all modified features locally
6. Update all affected documentation
7. Verify no console.log statements in production code
8. Check for any hardcoded development URLs
9. Ensure all environment variables are documented
10. Test with production-like data volumes

### 15. Dependency Management
- **Before updating packages**:
  - Check breaking changes in changelogs
  - Test thoroughly after updates
  - Update types if needed
  - Pay special attention to: React Quill, Supabase, Next.js
- **Security updates**: Apply promptly but test carefully
- **Lock file**: Always commit package-lock.json changes

### 16. Cost Optimization
- **AI Usage**:
  - Monitor token consumption
  - Implement caching for repeated AI calls
  - Set appropriate max_tokens limits
  - Use streaming where appropriate
- **Database**:
  - Optimize queries before adding indexes
  - Use connection pooling efficiently
  - Implement query result caching where appropriate
- **Storage**:
  - Compress images before upload
  - Set retention policies for old content

### 17. Session & State Management
- **Authentication state**: Use Supabase auth helpers consistently
- **Brand context**: Always verify current brand access
- **Form state**: Clear on successful submission
- **Cache invalidation**: Update after mutations
- **Error recovery**: Preserve user input on errors

### 18. File Upload Standards
- **Validation**:
  - File type restrictions (use MIME type checking)
  - Maximum file sizes (5MB for images, configurable)
  - Virus scanning for user uploads (when implemented)
- **Storage**:
  - Use Supabase Storage buckets
  - Implement proper access controls
  - Generate unique filenames to prevent conflicts
- **UI/UX**:
  - Show upload progress
  - Preview before upload
  - Clear error messages for validation failures

### 19. Critical Data Operations
- **Before deleting data**:
  - Confirm cascading deletes are intended
  - Check for dependent records
  - Consider soft deletes for important data
  - Log deletions for audit trail
- **Bulk operations**:
  - Implement in batches
  - Show progress indicators
  - Allow cancellation
  - Test with large datasets

### 20. Monitoring & Debugging
- **Logging guidelines**:
  - Log errors with full context
  - Never log sensitive data (passwords, API keys, PII)
  - Use structured logging format
  - Include user ID and brand ID in logs
- **Performance tracking**:
  - Monitor slow queries
  - Track API response times
  - Alert on error rate spikes
- **Debug mode**: Remove all debug code before committing

### 21. Rollback Procedures
- **Database changes**: Always create a rollback migration
- **Feature releases**: Plan how to disable if issues arise
- **API changes**: Maintain backward compatibility or version
- **UI changes**: Test on multiple screen sizes before release

### 22. Email & Notifications
- **Email templates**: Test with multiple email clients
- **Rate limiting**: Prevent notification spam
- **Unsubscribe**: Ensure compliance with regulations
- **Testing**: Use preview/sandbox mode in development

### 23. Accessibility Beyond Compliance
- **Test with**: Screen readers (NVDA, JAWS, VoiceOver)
- **Keyboard navigation**: Full functionality without mouse
- **Color contrast**: Test with color blindness simulators
- **Motion**: Respect prefers-reduced-motion
- **Focus management**: Logical tab order

### 24. Emergency Procedures
- **If you encounter**:
  - Data breach indicators: Stop immediately and alert
  - Performance degradation: Check for infinite loops or memory leaks
  - Suspicious code: Don't execute, ask for clarification
  - Production errors: Prioritize fix or rollback
- **Always have**: Rollback plan for database migrations

## License

This project is licensed under the MIT License.