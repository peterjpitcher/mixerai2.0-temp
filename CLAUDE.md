# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Building & Production
npm run build            # Build for production (includes memory optimization)
npm run start            # Start production server
vercel build --prod      # Test production build locally

# Code Quality (ALWAYS run before committing)
npm run lint             # Run ESLint
npm run check            # Run ESLint and TypeScript type checking
npm run review           # Run comprehensive code review
npm run review:fix       # Auto-fix lint issues + code review

# Testing
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:openai      # Test Azure OpenAI integration
jest path/to/test.test.ts # Run specific test file

# Key Utility Scripts
node scripts/test-azure-openai.js          # Test Azure OpenAI connectivity
node scripts/test-db-connection.js         # Test database connectivity
node scripts/diagnose-brand-generation.js  # Debug brand identity generation
node scripts/test-title-generation.js      # Test AI title generation

# Database Operations
./scripts/run-migrations.sh              # Apply database migrations
./scripts/reset-database.sh              # Reset database (CAUTION: destroys data)
./scripts/test-rls-policies.sh           # Test Row-Level Security policies
./scripts/use-local-db.sh                # Run app with local database
./scripts/clean-database.sh              # Remove dummy data, keep schema
npm run db:types                         # Regenerate TypeScript types from database
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql  # Create new migration

# Local Development Setup
./scripts/setup-env.sh                   # Interactive environment setup
./scripts/setup-local-db.sh              # Set up local PostgreSQL
node scripts/create-local-user.js        # Create test user
node scripts/seed-superadmin.ts          # Create superadmin user
./scripts/add-test-user.sh               # Add test user for authentication
./scripts/create-sample-brands.sh        # Add sample brands
```

## High-Level Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL with RLS) + optional direct PostgreSQL
- **Authentication**: Supabase Auth with custom session management
- **AI**: Azure OpenAI API
- **UI**: TailwindCSS + shadcn/ui components (Radix UI)
- **State**: React Query (server state) + Context API (client state)
- **Forms**: React Hook Form + Zod validation

### Application Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (all use withAuth HOC)
│   ├── auth/              # Public auth pages
│   └── dashboard/         # Protected application pages
├── components/            # React components
│   ├── ui/               # Reusable UI components (shadcn/ui)
│   ├── content/          # Content-specific components
│   └── dashboard/        # Dashboard-specific components
├── lib/                   # Core utilities and services
│   ├── api-utils.ts      # API helpers and error handling
│   ├── auth/             # Authentication and permissions
│   ├── azure/            # AI integration
│   └── supabase/         # Database clients
└── types/                 # TypeScript type definitions
```

### Key Patterns

#### API Route Pattern
```typescript
// All API routes follow this pattern:
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (req: NextRequest, user) => {
  // user is authenticated and available
  return NextResponse.json({ success: true, data: result });
});
```

#### Database Access
```typescript
// Client-side
import { createSupabaseClient } from '@/lib/supabase/client';

// Server-side (API routes)
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Admin operations
import { createSupabaseAdminClient } from '@/lib/supabase/client';
```

#### Error Handling
```typescript
import { handleApiError } from '@/lib/api-utils';

// In API routes
try {
  // operation
} catch (error) {
  return handleApiError(error);
}
```

### Authentication & Authorization
- Multi-layer security: Middleware → API auth → RLS policies
- Global roles: `admin`, `user`
- Brand permissions: `admin`, `editor`, `viewer`
- Session timeout with activity tracking
- CSRF protection on state-changing operations

### Key Features
1. **Content Generation**: AI-powered content from templates
2. **Brand Management**: Multi-tenant with brand identities
3. **Workflow System**: Multi-step approval processes
4. **Claims Management**: Product claims and legal compliance
5. **Template Builder**: Flexible content templates
6. **Tool Suite**: Metadata generator, transcreator, alt-text generator

### Important Notes
- Always use `withAuth` for protected API routes
- Use `withAdminAuth` for admin-only endpoints
- Database types are auto-generated - run `npm run db:types` after schema changes
- All timestamps use UTC (stored as timestamptz)
- Use transactions for multi-table operations
- React Query handles all server state caching
- Environment detection: check `process.env.NODE_ENV` and `process.env.VERCEL_ENV`

### Common Tasks

#### Creating a New API Endpoint
1. Create route file in `src/app/api/`
2. Use `withAuth` wrapper for authentication
3. Follow the standard response format
4. Handle errors with `handleApiError`

#### Adding a New Dashboard Page
1. Create page in `src/app/dashboard/`
2. Use `ProtectedLayout` for consistent navigation
3. Implement loading and error states
4. Use React Query for data fetching

#### Modifying Database Schema
1. Create migration: `touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql`
2. Write migration SQL
3. Run migration: `./scripts/run-migrations.sh`
4. Regenerate types: `npm run db:types`

#### Testing AI Integration
1. Use `node scripts/test-azure-openai.js` for connectivity
2. Check environment variables for Azure OpenAI
3. Use the diagnose scripts for debugging specific features

### Performance Considerations
- React Query caches are configured per feature
- Use optimistic updates for better UX
- Debounce search inputs
- Lazy load routes and components
- Build uses 4GB memory allocation for large codebases