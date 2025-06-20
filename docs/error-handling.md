# Error Handling in MixerAI 2.0

This document describes the error handling architecture and best practices for MixerAI 2.0.

## Overview

MixerAI uses a multi-layered error handling approach:
1. **Page-level error boundaries** - Next.js error.tsx files
2. **Component error boundaries** - React Error Boundary components
3. **Centralized error tracking** - Error logging and reporting
4. **User-friendly error messages** - Context-aware error displays

## Error Pages

### Root Error Page (`/src/app/error.tsx`)
- Catches unhandled errors at the application level
- Displays user-friendly error messages
- Provides "Try Again" and "Go to Dashboard" options
- Includes error ID for support reference

### 404 Not Found Page (`/src/app/not-found.tsx`)
- Custom 404 page with branding
- Provides navigation options based on authentication status
- Includes quick links to common pages
- "Go Back" button for easy navigation

### Dashboard Error Page (`/src/app/dashboard/error.tsx`)
- Specialized error handling for dashboard routes
- Detects permission errors and shows appropriate messaging
- Provides context-aware recovery options

## Error Tracking

### Error Tracking Utility (`/src/lib/error-tracking.ts`)
```typescript
import { trackError, getUserFriendlyErrorMessage } from '@/lib/error-tracking';

// Track an error
trackError(error, {
  userId: user?.id,
  brandId: brand?.id,
  path: window.location.pathname,
});

// Get user-friendly message
const message = getUserFriendlyErrorMessage(error);
```

### Error Tracking API (`/src/app/api/errors/track/route.ts`)
- Endpoint for logging client-side errors
- Enriches errors with server-side context
- In production, would integrate with services like Sentry or LogRocket

## Component Error Boundaries

### ErrorBoundary Component (`/src/components/error-boundary.tsx`)
```tsx
import { ErrorBoundary } from '@/components/error-boundary';

// Wrap components that might throw errors
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>

// With error handler
<ErrorBoundary onError={(error, errorInfo) => console.error(error)}>
  <YourComponent />
</ErrorBoundary>
```

## Best Practices

### 1. Always Use Error Boundaries
Wrap components that:
- Fetch data from APIs
- Process user input
- Render dynamic content
- Use third-party libraries

### 2. Provide Context in Errors
Include relevant information:
- User ID and role
- Active brand
- Current route/page
- Action being performed

### 3. User-Friendly Messages
Map technical errors to user-friendly messages:
- Network errors → "Connection issue"
- Permission errors → "Access denied"
- Validation errors → "Invalid input"

### 4. Recovery Options
Always provide ways to recover:
- "Try Again" button for transient errors
- Navigation to safe pages
- Contact support for persistent issues

### 5. Error Logging
In production, ensure errors are:
- Logged to external service
- Include sufficient context
- Don't expose sensitive data
- Tracked for monitoring

## Implementation Examples

### API Route Error Handling
```typescript
export async function POST(request: NextRequest) {
  try {
    // Your logic here
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // Track unexpected errors
    await trackError(error as Error, {
      path: request.url,
      method: 'POST',
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Component Error Handling
```tsx
function MyComponent() {
  const [error, setError] = useState<Error | null>(null);
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {getUserFriendlyErrorMessage(error)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setError(null)}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Component logic
}
```

## Testing Error Handling

### Manual Testing
1. Trigger 404: Navigate to `/some-nonexistent-page`
2. Trigger error: Add `throw new Error('Test')` in a component
3. Test permission errors: Access restricted routes
4. Test network errors: Disconnect network during API calls

### Automated Testing
```typescript
// Test error boundary
test('handles component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('Component Error')).toBeInTheDocument();
});
```

## Future Enhancements

1. **Sentry Integration**
   - Real-time error tracking
   - Performance monitoring
   - Release tracking

2. **Error Analytics**
   - Error frequency tracking
   - User impact analysis
   - Error pattern detection

3. **Smart Error Recovery**
   - Auto-retry for network errors
   - State persistence across errors
   - Graceful degradation

4. **Enhanced User Communication**
   - In-app error notifications
   - Error status page
   - Proactive error alerts