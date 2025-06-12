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

# Testing
npm run test:openai     # Verify Azure OpenAI integration
jest                    # Run test suite (requires test files)

# Utility Scripts
node scripts/test-azure-openai.js      # Test Azure OpenAI connectivity
node scripts/verify-openai-integration.js # Verify OpenAI integration
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
└── public/                       # Static assets
```

## Architecture Overview

MixerAI 2.0 is a Next.js 14 application using the App Router for AI-powered content generation. Key architectural decisions:

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
3. **Type Safety**: Comprehensive TypeScript with strict mode enabled
4. **Error Handling**: Try-catch blocks with user-friendly error messages
5. **Loading States**: Skeleton screens and loading indicators throughout

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
- Test files use `.test.ts` or `.test.tsx` suffix

## Deployment

- Vercel deployment with automatic previews
- Environment variables set in Vercel dashboard
- Build optimization with standalone output
- Automatic redirects configured in next.config.js