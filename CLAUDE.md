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
- `generateContent()` - Main content generation
- `streamContent()` - Streaming AI responses
- `calculateTokens()` - Token estimation

### Database Helpers
- `withTransaction()` - Database transaction wrapper
- `withRetry()` - Retry logic for database operations

### UI Utilities
- `cn()` - Classname utility (clsx + tailwind-merge)
- `formatDate()` - Date formatting helper
- `truncate()` - Text truncation utility