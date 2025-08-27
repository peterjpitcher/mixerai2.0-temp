# MixerAI 2.0 Implementation Guide

## Overview
This guide consolidates all implementation details, coding standards, and development workflows for MixerAI 2.0.

## Table of Contents
1. [Development Standards](#development-standards)
2. [File Organization](#file-organization)
3. [Error Handling](#error-handling)
4. [Date & Time Handling](#date--time-handling)
5. [Auto-Save Implementation](#auto-save-implementation)
6. [Navigation System](#navigation-system)
7. [API Development](#api-development)
8. [Testing Strategy](#testing-strategy)

---

## Development Standards

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with Next.js config

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `user-profile.tsx` |
| Components | PascalCase | `UserProfile` |
| Functions | camelCase | `getUserData` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| CSS Classes | kebab-case | `user-profile-card` |

### Import Order
```typescript
// 1. React/Next
import React from 'react';
import { NextRequest } from 'next/server';

// 2. External packages
import { z } from 'zod';

// 3. Internal absolute imports
import { Button } from '@/components/ui/button';

// 4. Relative imports
import { formatDate } from './utils';

// 5. Types
import type { User } from '@/types';
```

---

## File Organization

### Directory Structure
```
/src
├── app/          # Next.js app router
├── components/   # React components
├── lib/          # Utilities and helpers
├── hooks/        # Custom React hooks
├── types/        # TypeScript types
└── styles/       # Global styles
```

### Component Organization
- One component per file
- Co-locate styles and tests
- Group related components in folders
- Export from index files

---

## Error Handling

### API Error Handling
```typescript
import { handleApiError } from '@/lib/api-utils';

export async function handler(req: NextRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Client-Side Error Handling
```typescript
// Use error boundaries for component errors
import { ErrorBoundary } from '@/components/error-boundary';

// Use try-catch for async operations
try {
  const data = await fetchData();
} catch (error) {
  toast.error('Failed to load data');
  console.error(error);
}
```

### Error Messages
- User-friendly messages for UI
- Detailed messages in logs
- Include error codes for tracking
- Provide actionable next steps

---

## Date & Time Handling

### Standards
- Store in UTC (ISO 8601 format)
- Display in user's timezone
- Use `date-fns` for formatting
- Never hardcode dates

### Implementation
```typescript
import { format, parseISO } from 'date-fns';

// Storing dates
const timestamp = new Date().toISOString();

// Displaying dates
const displayDate = format(parseISO(timestamp), 'MMM dd, yyyy');

// Relative time
import { formatDistanceToNow } from 'date-fns';
const relative = formatDistanceToNow(date, { addSuffix: true });
```

### Date Input Format
- Use consistent format: MM/DD/YYYY for US
- Provide date pickers for user input
- Validate date ranges
- Handle timezone conversions

---

## Auto-Save Implementation

### Strategy
- Debounced saves (1-2 seconds after last change)
- Visual feedback (saving/saved indicators)
- Conflict resolution for concurrent edits
- Local storage fallback

### Implementation
```typescript
import { useAutoSave } from '@/hooks/use-auto-save';

function Editor() {
  const { save, status } = useAutoSave({
    endpoint: '/api/content/save',
    debounceMs: 1500,
  });

  return (
    <>
      <SaveStatus status={status} />
      <textarea onChange={(e) => save(e.target.value)} />
    </>
  );
}
```

### Status Indicators
- **Idle**: No changes
- **Typing**: User making changes
- **Saving**: Request in progress
- **Saved**: Successfully saved
- **Error**: Save failed

---

## Navigation System

### Breadcrumb Navigation
```typescript
// Automatic breadcrumb generation
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

<Breadcrumbs
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Content', href: '/dashboard/content' },
    { label: 'Edit', current: true }
  ]}
/>
```

### Permission-Based Navigation
- Check user permissions before showing links
- Hide unauthorized routes
- Redirect to appropriate pages
- Show permission-specific menus

### Mobile Navigation
- Bottom tab bar for primary actions
- Hamburger menu for secondary items
- Gesture support for navigation
- Persistent navigation state

---

## API Development

### Standard Response Format
```typescript
// Success response
{
  success: true,
  data: { /* your data */ },
  timestamp: "2024-01-01T00:00:00Z"
}

// Error response
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "User-friendly message",
    details: { /* additional info */ }
  }
}
```

### Authentication Middleware
```typescript
import { withAuth } from '@/lib/auth/middleware';

export const GET = withAuth(async (req, user) => {
  // User is authenticated
  // Access user.id, user.role, etc.
});
```

### Rate Limiting
- Auth endpoints: 10 req/15 min
- AI endpoints: 50 req/15 min
- General API: 100 req/15 min

### Input Validation
```typescript
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().optional(),
});

const validated = schema.parse(req.body);
```

---

## Testing Strategy

### Test Types
- **Unit Tests**: Individual functions/components
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load and speed

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { /* test props */ };
    
    // Act
    render(<Component {...props} />);
    
    // Assert
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

### Testing Best Practices
- Test user behavior, not implementation
- Use testing-library utilities
- Mock external dependencies
- Maintain test data separately
- Run tests in CI/CD pipeline

---

## Performance Guidelines

### Optimization Techniques
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Lazy load routes and components
- Optimize images with next/image
- Use production builds for testing

### Performance Budgets
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Bundle size: < 200KB per route
- API response time: < 300ms p95

---

## Security Considerations

### Best Practices
- Never trust client input
- Use CSRF protection for mutations
- Implement rate limiting
- Sanitize user-generated content
- Use environment variables for secrets
- Enable CORS appropriately
- Implement proper authentication
- Use HTTPS in production

---

*This document consolidates: error-handling.md, date-format-standardization.md, file-naming-standardization.md, auto-save-implementation.md, breadcrumb-navigation.md, due-dates-implementation.md, and related implementation guides.*