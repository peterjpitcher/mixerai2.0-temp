# Error Pages Implementation Guide

This document provides detailed specifications for implementing the missing error page components in the MixerAI 2.0 application.

## Error Page Components

### 1. Custom Error Page (`src/app/_error.tsx`)

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container flex max-w-[640px] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="text-xl text-muted-foreground">
          An error occurred. Please try again later or contact support if the problem persists.
        </p>
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Try again
          </button>
          <Link 
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 2. Global Error Page (`src/app/global-error.tsx`)

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
          <div className="container flex max-w-[640px] flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">Something went wrong</h1>
            <p className="text-xl text-muted-foreground">
              A critical error occurred. Please try again later or contact support if the problem persists.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => reset()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Try again
              </button>
              <Link 
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### 3. Not Found Page (`src/app/not-found.tsx`)

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container flex max-w-[640px] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">404 - Page Not Found</h1>
        <p className="text-xl text-muted-foreground">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 mt-6"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
```

## Error Page Usage

These error pages are used automatically by Next.js in the following scenarios:

1. **`_error.tsx`**: Used for handling component-level errors within the React component tree. The error is isolated to the component that threw it, and this component renders to show the user that something went wrong.

2. **`global-error.tsx`**: Used for handling critical errors that occur outside the React component tree or that prevent the normal error boundary from rendering. This is a last-resort error handler.

3. **`not-found.tsx`**: Used when a route cannot be found (404 error). This will be shown when a user attempts to access a non-existent page.

## Error Handling Implementation

### Component-Level Error Boundaries

Next.js App Router uses React's Error Boundary feature to catch errors and display fallback UIs. The `_error.tsx` page is a custom implementation of a fallback UI.

When an error occurs:

1. The error is caught by the nearest error boundary
2. The `_error.tsx` component receives the error object and a reset function
3. The UI displays the error message to the user
4. The reset function allows the user to attempt to recover from the error

### Global Error Handling

For catastrophic errors, the `global-error.tsx` page serves as a fallback when the regular error boundary can't render. This provides a minimal but functional UI to inform the user about the issue.

### 404 Not Found Pages

The `not-found.tsx` page is rendered when:
- A page route doesn't exist
- The `notFound()` function is called from a page or API route
- When directed to a non-existent dynamic route segment

## Styling Guidelines

1. **Consistency**:
   - Error pages should match the overall design system
   - Use the same color scheme, typography, and button styles

2. **Clarity**:
   - Error messages should be clear and non-technical
   - Provide actionable next steps for users

3. **Simplicity**:
   - Error pages should be lightweight and minimal
   - Focus on essential information and actions

## Testing Considerations

1. **Error Triggering**:
   - Test by intentionally throwing errors in different components
   - Verify that the error boundaries catch and display the correct UI

2. **Reset Functionality**:
   - Verify that the reset button properly reloads the component
   - Test recovery from various error states

3. **Navigation**:
   - Ensure "Go Home" links redirect users to a safe starting point
   - Verify that navigation away from error pages works correctly

4. **Accessibility**:
   - Ensure error pages are keyboard navigable
   - Check color contrast for readability
   - Verify screen reader compatibility 