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

MixerAI 2.0 is a Next.js 14 application using the App Router for AI-powered content generation. Users can manage branded content through a flexible workflow interface powered by Supabase for backend services and PostgreSQL. Key architectural decisions:

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
POSTGRES_PORT=                  # PostgreSQL port
POSTGRES_USER=                  # PostgreSQL user
POSTGRES_PASSWORD=              # PostgreSQL password
POSTGRES_DB=                    # PostgreSQL database name
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
- Implemented claims approval workflow (Issue #126)
- Redesigned dashboard home page (Issue #121)
- Added workflow assignee validation as mandatory field
- Enhanced tool run history with additional metadata

## Key Documentation References

### Core Documentation
- `/docs/README.md` - Documentation hub with quick start guide
- `/docs/ARCHITECTURE.md` - Detailed technical architecture
- `/docs/UI_STANDARDS.md` - Comprehensive UI/UX standards (Version 2.0)
- `/docs/api_reference.md` - Complete API endpoint documentation
- `/docs/user_guide.md` - End-user documentation for all features
- `/docs/database.md` - Database schema and relationships
- `/docs/authentication.md` - Auth flow and permissions model
- `/USER_FLOWS.md` - User flow documentation
- `/USER_FLOW_DIAGRAMS.md` - Visual user flow diagrams
- `/TESTING_REPORT.md` & `/TESTING_SUMMARY.md` - Testing documentation
- `/docs/workflow-assignee-mandatory-changes.md` - Workflow assignee implementation
- `/docs/AI_TITLE_GENERATION.md` - AI-powered title generation feature
- `/docs/NAVIGATION_PERMISSIONS.md` - Detailed role-based navigation permissions

### Security & Operations
- `/SECURITY.md` - Security policies and vulnerability reporting
- Report security issues to: security@mixerai.com (DO NOT use GitHub issues)
- `/docs/deployment.md` - Deployment procedures and configuration

### Development Resources
- `/supabase/migrations/` - Database migration files (format: YYYYMMDD_description.sql)
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

# Clean database (removes test data)
./scripts/clean-database.sh

# Add test user for authentication
./scripts/add-test-user.sh
```

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
  - `/docs/api_reference.md` - When modifying API endpoints
  - `/docs/database.md` - When changing database schema
  - `/docs/user_guide.md` - When adding/modifying user-facing features
  - `/docs/ARCHITECTURE.md` - When making architectural changes
  - Code comments for complex logic or non-obvious implementations
- Use clear, concise language and include examples where helpful

### 4. Standards Compliance
- **ALWAYS check for and follow existing standards documents**
- Key standards to follow:
  - `/docs/UI_STANDARDS.md` - Mandatory for all UI changes
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
  - UI follows `/docs/UI_STANDARDS.md`
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
- **Documentation**: Update `/docs/api_reference.md` for any changes
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