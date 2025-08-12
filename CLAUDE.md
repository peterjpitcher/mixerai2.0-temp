# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔴 CRITICAL: Pre-Development Discovery Protocol

### MANDATORY: Run This Before ANY Code Changes
```bash
# 1. Full System Health Check
npm run check           # TypeScript + ESLint
npm run test           # All tests must pass
npm run build          # Build must succeed

# 2. Database State Verification
node scripts/test-db-connection.js
npm run db:types       # Ensure types are current

# 3. AI Integration Check
node scripts/test-azure-openai.js

# 4. Authentication Test
node scripts/test-auth-flow.js

# 5. Document Current State
echo "=== Pre-Development State ===" > discovery-report.md
echo "Date: $(date)" >> discovery-report.md
echo "Branch: $(git branch --show-current)" >> discovery-report.md
echo "Last Commit: $(git log -1 --oneline)" >> discovery-report.md
npm run review >> discovery-report.md 2>&1
```

### Discovery Report Template
```markdown
## Discovery Report: [Feature/Fix Name]
Date: [ISO Date]
Developer: Claude

### System State
- [ ] All tests passing
- [ ] Build successful  
- [ ] No ESLint errors
- [ ] Database connection verified
- [ ] AI integration operational

### Feature Analysis
**Affected Areas:**
- Components: [List with file paths]
- API Routes: [List with endpoints]
- Database Tables: [List tables/columns]
- UI Routes: [List pages]

**Dependencies:**
- External APIs: [Azure OpenAI, Supabase, etc.]
- Internal Services: [List services]
- UI Components: [List shadcn/ui components used]

**Risk Assessment:**
- Breaking Changes: [List potential breaks]
- Performance Impact: [Database queries, API calls]
- Security Implications: [Auth, RLS, CSRF]
```

## 🔧 Essential Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Production build with 4GB memory
npm start                # Start production server
```

### Code Quality
```bash
npm run check            # Run ESLint + TypeScript checks
npm run lint             # Run Next.js linting
npm run lint:fix         # Auto-fix linting issues
npm run review           # Comprehensive review (deps, lint, types, build)
npm run review:fix       # Auto-fix ESLint then run review
```

### Testing
```bash
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:openai      # Test Azure OpenAI integration
```

### Database
```bash
npm run db:types                      # Regenerate TypeScript types from DB
node scripts/test-db-connection.js    # Test database connectivity
./scripts/init-database.sh            # Initialize database
./scripts/reset-database.sh           # Reset database
```

### Single Test Execution
```bash
npm test -- [test-file-path]          # Run specific test file
npm test -- --testNamePattern="test name"  # Run tests matching pattern
npm test -- src/lib/__tests__/        # Run tests in specific directory
```

### Bundle Analysis & Performance
```bash
npm run analyze          # Analyze bundle size
npm run build:profile    # Build with profiling enabled
```

## 🏛️ High-Level Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router (React 18)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Supabase with Row-Level Security
- **Authentication**: Supabase Auth with custom session management
- **AI**: Azure OpenAI for content generation
- **UI**: shadcn/ui components (Radix UI + Tailwind CSS)
- **Data Fetching**: TanStack Query v5 + SWR
- **Forms**: React Hook Form + Zod validation
- **Email**: Resend for transactional emails

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (RESTful)
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Protected application pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── content/          # Content management
│   └── dashboard/        # Dashboard features
├── lib/                   # Core utilities
│   ├── auth/             # Auth middleware & permissions
│   ├── azure/            # Azure OpenAI integration
│   ├── supabase/         # Database clients
│   └── utils/            # General utilities
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks
```

### Multi-Tenant Architecture
- Brand-based isolation with RLS policies
- User permissions scoped to brands
- Hierarchical role system (admin > manager > user)
- All API routes require brand context

### AI Integration Points
- Content generation (multiple types)
- Title/headline generation
- Alt text generation
- Content transcreation
- Metadata generation
- Claims analysis and simplification

### Rate Limiting Structure
- Auth endpoints: 10 requests/15 minutes
- AI endpoints: 50 requests/15 minutes  
- General API: 100 requests/15 minutes
- Implemented via middleware with Redis-backed storage

## 📋 Development Quality Standards

### Pre-Implementation Checklist
- [ ] Run full discovery protocol
- [ ] Review existing patterns in similar features
- [ ] Check for existing utilities before creating new ones
- [ ] Verify database schema matches requirements
- [ ] Plan error states and edge cases
- [ ] Consider mobile responsiveness
- [ ] Plan loading and success states

### During Implementation
- [ ] Follow established patterns (see Key Patterns section)
- [ ] Use existing utilities from /lib
- [ ] Implement proper TypeScript types
- [ ] Add JSDoc comments for complex functions
- [ ] Use transactions for multi-table operations
- [ ] Implement optimistic updates where appropriate
- [ ] Add proper error boundaries

### Post-Implementation Verification
```bash
# Run this exact sequence - no shortcuts
npm run lint:fix       # Fix any style issues
npm run check         # Verify types and lint
npm run test          # All tests must pass
npm run build         # Production build must succeed
npm run review        # Comprehensive code review

# Manual Testing Checklist
- [ ] Test happy path
- [ ] Test error states (network off, bad data)
- [ ] Test edge cases (empty data, max length)
- [ ] Test permissions (different user roles)
- [ ] Test on mobile viewport
- [ ] Check console for errors
- [ ] Verify loading states appear
- [ ] Verify success feedback shows
- [ ] Test with slow 3G throttling
```

## 🏗️ Implementation Patterns

### API Route Pattern (ALWAYS use this)
```typescript
// src/app/api/[resource]/route.ts
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Define schema
const RequestSchema = z.object({
  // Define your schema
});

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // 1. Validate permissions
    if (!user.hasPermission('read:resource')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse and validate input
    const params = RequestSchema.parse(await req.json());

    // 3. Database operation with RLS
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    // 4. Return standardized response
    return NextResponse.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
});
```

### Component Pattern (With Error Handling)
```typescript
// src/app/dashboard/[feature]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FeaturePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-data'],
    queryFn: async () => {
      const res = await fetch('/api/feature');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message || 'Something went wrong'}
        </AlertDescription>
      </Alert>
    );
  }

  return <YourComponent data={data} />;
}
```

### Database Operation Pattern
```typescript
// Always use transactions for related operations
const { data, error } = await supabase.rpc('transaction_wrapper', {
  operations: async (tx) => {
    // Operation 1
    const { data: item } = await tx
      .from('items')
      .insert({ name: 'Test' })
      .select()
      .single();

    // Operation 2 (depends on operation 1)
    await tx
      .from('item_metadata')
      .insert({ item_id: item.id, key: 'status', value: 'active' });

    return item;
  }
});
```

## 🔍 Feature-Specific Discovery

### Before Adding New Features

#### Check Existing Infrastructure
```bash
# Search for similar patterns
grep -r "similar-feature" src/

# Check for existing utilities
ls -la src/lib/

# Review existing API routes
find src/app/api -name "*.ts" | head -20
```

#### Database Schema Review
```sql
-- Check existing tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

#### Permission Structure
- Review `src/lib/auth/permissions.ts`
- Check role definitions in database
- Verify RLS policies align with app permissions

#### AI Integration Checklist
- [ ] Azure OpenAI credentials valid
- [ ] Proper error handling for AI failures
- [ ] Fallback behavior defined
- [ ] Token limits considered
- [ ] Retry logic implemented
- [ ] Cost tracking in place

## 🚀 Performance & Optimization

### Required Performance Checks
```bash
# Bundle analysis
npm run analyze

# Memory usage during build
NEXT_TELEMETRY_DISABLED=1 node --max-old-space-size=4096 node_modules/.bin/next build

# Check for unnecessary re-renders
# Add React DevTools Profiler checks
```

### Optimization Checklist
- [ ] Images use next/image with proper sizing
- [ ] Components lazy loaded where appropriate
- [ ] Database queries use proper indexes
- [ ] React Query stale times configured
- [ ] Debouncing on search/filter inputs
- [ ] Optimistic updates for better UX
- [ ] Proper memoization with useMemo/useCallback

## 🛡️ Security Checklist

### Every Feature Must:
- [ ] Use withAuth on all protected routes
- [ ] Validate all inputs with Zod
- [ ] Check permissions before operations
- [ ] Use CSRF protection on mutations
- [ ] Sanitize user-generated content
- [ ] Never expose sensitive data in responses
- [ ] Use RLS policies as final defense
- [ ] Log security-relevant events

## 📝 Code Review Standards

### Self-Review Checklist
- [ ] No console.log statements
- [ ] All TypeScript types defined (no any)
- [ ] Error messages are user-friendly
- [ ] Loading states implemented
- [ ] Success feedback provided
- [ ] Mobile responsive
- [ ] Accessibility considered (ARIA labels)
- [ ] Comments explain "why" not "what"

### Automated Review
```bash
# This catches most issues
npm run review

# For auto-fixing
npm run review:fix
```

## 📊 Monitoring & Debugging

### Debug Commands
```bash
# Component/Hook debugging
DEBUG=* npm run dev

# Database query logging
DEBUG=supabase:* npm run dev

# API route debugging
DEBUG=api:* npm run dev

# Full application debugging
DEBUG=*,-babel*,-eslint* npm run dev
```

### Performance Monitoring
- Use React DevTools Profiler
- Monitor React Query DevTools
- Check Network tab for waterfalls
- Use Lighthouse for overall scores

## 🚨 Common Pitfalls to Avoid

### API Routes
- ❌ Forgetting withAuth wrapper
- ❌ Not validating inputs
- ❌ Missing error handling
- ❌ Returning sensitive data
- ❌ Not using transactions for related operations

### Components
- ❌ Missing loading states
- ❌ No error boundaries
- ❌ Direct DOM manipulation
- ❌ Forgetting mobile views
- ❌ Not memoizing expensive operations

### Database
- ❌ N+1 queries
- ❌ Missing indexes
- ❌ Ignoring RLS policies
- ❌ Not using transactions
- ❌ Storing sensitive data unencrypted

## 📚 Quick Reference

### Environment Variables
```bash
# Required for development
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
NEXT_PUBLIC_SITE_URL=
RESEND_API_KEY=
```

### Testing Different Scenarios
```bash
# Test as different user roles
npm run test:auth -- --role=admin
npm run test:auth -- --role=user

# Test with different brands
npm run test:brands -- --brand-id=123

# Test error scenarios
npm run test:errors
```

## ✅ Definition of Done

A feature is ONLY complete when:
- All automated tests pass
- Manual testing completed on all viewports
- No console errors in development or production
- Performance metrics maintained
- Security checklist passed
- Code review (automated) passes
- Documentation updated if needed
- Discovery report shows all green checks

## 🔄 Continuous Improvement

After each feature:
- Update this file with new patterns discovered
- Add new utility functions to /lib
- Create reusable components
- Document any gotchas or edge cases
- Update test scenarios

Remember: The goal is not just working code, but maintainable, secure, and performant code that follows established patterns.

## 🔑 Key Utilities & Helpers

### Authentication & Authorization
- `withAuth()` - Middleware wrapper for protected routes
- `checkPermission()` - Verify user permissions
- `createSupabaseServerClient()` - Server-side Supabase client
- `getCurrentUser()` - Get authenticated user from session

### API Utilities
- `handleApiError()` - Standardized error handling
- `rateLimit()` - Rate limiting middleware
- `validateRequest()` - Zod schema validation wrapper

### AI Integration
- `generateContent()` - Main content generation with Azure OpenAI
- `streamContent()` - Streaming AI responses
- `calculateTokens()` - Token estimation
- **Fallback Behavior**: When Azure OpenAI is unavailable, the system automatically falls back to template-based generation. Always handle this gracefully and notify users when using fallback content.

### Database Helpers
- `withTransaction()` - Database transaction wrapper
- `withRetry()` - Retry logic for database operations

### UI Utilities
- `cn()` - Classname utility (clsx + tailwind-merge)
- `formatDate()` - Date formatting helper
- `truncate()` - Text truncation utility

## 🐳 Local Development with PostgreSQL

### Docker Setup
```bash
# Start PostgreSQL container
docker-compose up -d

# Run with local database
./scripts/use-local-db.sh
```

### Database Utility Scripts
- `./scripts/reset-database.sh` - Complete database reset with clean schema
- `./scripts/clean-database.sh` - Remove dummy data, preserve schema
- `./scripts/add-test-user.sh` - Add test user for authentication
- `./scripts/create-sample-brands.sh` - Add sample brands matching UI

### Local Database Environment Variables
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mixerai
```

## 🗂️ Directory Organization & Maintenance

### Directory Structure Rules
1. **NO temporary files in root** - All work files, reports, and temporary SQL files should be in appropriate subdirectories or deleted after use
2. **Documentation belongs in /docs** - All .md files (except README.md, SECURITY.md, CLAUDE.md) should be in the docs directory
3. **Keep backups out of git** - Backup directories should be in .gitignore
4. **Clean up after yourself** - Remove test files, temporary reports, and work-in-progress files before committing

### File Naming Conventions
- Use kebab-case for all files: `user-profile.tsx`, not `userProfile.tsx`
- Date-prefixed files should use ISO format: `2025-07-04-report.md`
- Test files: `[name].test.ts` or `[name].spec.ts`
- Type definition files: `[name].types.ts`

### Documentation Standards
- Every major directory should have a README.md explaining its purpose
- Keep documentation up to date - outdated docs are worse than no docs
- Remove fix/issue specific documentation after the fix is merged
- Archive old documentation rather than deleting if historically important

### Date Handling
**CRITICAL**: Never hardcode dates or rely on AI to know the current date. Always get dates programmatically:

```typescript
// ❌ WRONG - AI doesn't know the actual date
const reportDate = '2025-07-04'; // AI will often get this wrong

// ✅ CORRECT - Always get date programmatically
const reportDate = new Date().toISOString().split('T')[0]; // 2025-07-04
const timestamp = new Date().toISOString(); // Full ISO timestamp

// For file names
const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
const fileName = `${datePrefix}-backup.sql`; // 20250704-backup.sql

// For display
import { format } from 'date-fns';
const displayDate = format(new Date(), 'MMM d, yyyy'); // Jul 4, 2025
```

### Cleanup Checklist
Before any major commit or PR:
- [ ] Remove all .DS_Store files: `find . -name ".DS_Store" -type f -delete`
- [ ] Delete temporary SQL files from root
- [ ] Remove work-in-progress .md files from root
- [ ] Clean up backup directories
- [ ] Remove console.log statements
- [ ] Delete commented-out code
- [ ] Update relevant README files

### Git Hygiene
- Use .gitignore properly - add patterns for:
  - `.DS_Store`
  - `*.bak`
  - `/temp`
  - `/backups`
  - `*.log`
  - Work-in-progress files
- Commit organized changes, not cleanup mixed with features
- Use meaningful commit messages that describe what changed

### Regular Maintenance Tasks
Weekly:
- Clean up root directory of temporary files
- Archive old issue-specific documentation
- Update directory README files if structure changed
- Remove unused dependencies: `npm prune`

Monthly:
- Review and clean up /docs directory
- Archive old migration files
- Update this CLAUDE.md file with new patterns
- Clean up unused components and utilities

## 🔧 Common Development Workflows

### Adding a New API Endpoint
1. Create route file: `src/app/api/[resource]/route.ts`
2. Use the API Route Pattern (see Implementation Patterns section)
3. Add TypeScript types in `src/types/[resource].types.ts`
4. Test with: `curl -X GET http://localhost:3000/api/[resource]`
5. Add integration test in `src/app/api/[resource]/route.test.ts`

### Adding a New Dashboard Feature
1. Create page: `src/app/dashboard/[feature]/page.tsx`
2. Use the Component Pattern with TanStack Query
3. Add navigation item in `src/components/layout/sidebar.tsx`
4. Implement loading, error, and empty states
5. Test all user roles and permissions
6. Verify mobile responsiveness

### Implementing AI-Powered Features
1. Check Azure OpenAI connectivity: `node scripts/test-azure-openai.js`
2. Use `generateContent()` from `src/lib/azure/openai.ts`
3. Implement template-based fallback
4. Add proper error handling and user feedback
5. Test with `FORCE_OPENAI_FALLBACK=true`

## 🐛 Bug Fixing Workflow

### QA Issue Resolution Process
When working on issues reported by QA:

#### 1. Issue Discovery
```bash
# List all open issues
gh issue list --repo gmi-common/mixerai2.0

# View specific issue details
gh issue view [issue-number] --repo gmi-common/mixerai2.0
```

#### 2. Run Discovery Protocol for Each Issue
- Run full pre-development discovery (see above)
- Create issue-specific discovery report
- Analyze the bug reproduction steps
- Identify affected components

#### 3. Implementation Process
1. Create a todo list for all issues to track
2. For each issue:
   - Mark as in_progress in todo list
   - Reproduce the issue locally
   - Implement the fix
   - Run verification tests
   - Mark as completed in todo list

#### 4. Issue Labeling
```bash
# Create 'Ready for QA' label if it doesn't exist
gh label create "Ready for QA" --description "Fix implemented and ready for QA testing" --color 0E8A16

# Label issue when fix is complete
gh issue edit [issue-number] --add-label "Ready for QA"
```

#### 5. Final Steps
- Commit all fixes together after all issues are resolved
- Create comprehensive PR with all fixes
- Reference all fixed issues in PR description

### Bug Fix Verification Checklist
- [ ] Issue reproduced locally
- [ ] Root cause identified
- [ ] Fix implemented following existing patterns
- [ ] No regressions introduced
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Manual testing completed
- [ ] Issue labeled as 'Ready for QA'

## 🚑 Troubleshooting Guide

### Build Errors
```bash
# Memory issues during build
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Clear all caches
rm -rf .next node_modules/.cache
npm run build

# TypeScript errors
npm run check
npm run db:types  # Regenerate DB types if needed
```

### Database Connection Issues
```bash
# Test Supabase connection
node scripts/test-db-connection.js

# Check environment variables
env | grep SUPABASE
env | grep POSTGRES

# Reset local database
./scripts/reset-database.sh

# View detailed logs
DEBUG=supabase:* npm run dev
```

### Authentication Problems
```bash
# Test auth flow
node scripts/test-auth-flow.js

# Clear auth cookies (in browser DevTools)
# Application > Cookies > Clear all

# Add test user
./scripts/add-test-user.sh

# Check session
# Browser DevTools > Application > Local Storage > supabase.auth.token
```

### AI Integration Issues
```bash
# Test Azure OpenAI
node scripts/test-azure-openai.js

# Force fallback mode
FORCE_OPENAI_FALLBACK=true npm run dev

# Check rate limits
# Look for 429 errors in Network tab

# Verify credentials
env | grep AZURE_OPENAI
```

### Common Error Messages & Solutions

#### "Invalid hook call"
- Check for duplicate React versions: `npm ls react`
- Ensure hooks are only called from React components

#### "Hydration failed"
- Check for date/time rendering without proper formatting
- Ensure consistent server/client rendering
- Use `suppressHydrationWarning` sparingly

#### "NEXT_REDIRECT"
- This is normal behavior for Next.js redirects
- Not an actual error, just informational

#### "Too many re-renders"
- Check for setState calls in render
- Verify useEffect dependencies
- Use React DevTools Profiler

## 🎯 Important Instruction Reminders

### Core Principles
1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless they're absolutely necessary** for achieving the goal
3. **ALWAYS prefer editing an existing file** to creating a new one
4. **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested

### When Working on Tasks
- Focus on the specific task at hand
- Don't add "nice to have" features unless requested
- Don't refactor unrelated code unless it's blocking the task
- Don't create helper files unless the implementation requires it
- Don't write documentation unless asked

### Communication
- Be concise and direct
- Report what was done, not what could be done
- If something can't be done, explain why briefly
- Don't suggest additional improvements unless asked
- Keep status updates factual and brief

### Before Creating Any File Ask Yourself:
1. Did the user explicitly ask for this file?
2. Is this file absolutely necessary for the feature to work?
3. Can I implement this by modifying an existing file instead?
4. Am I creating this just to be "helpful" or "complete"?

If the answer to #4 is yes, or #1 and #2 are no - DON'T CREATE THE FILE.