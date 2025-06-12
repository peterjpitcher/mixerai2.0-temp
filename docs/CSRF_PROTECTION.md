# CSRF Protection Implementation

This document describes the CSRF (Cross-Site Request Forgery) protection implemented in MixerAI 2.0.

## Overview

CSRF protection prevents malicious websites from making unauthorized requests to our API on behalf of authenticated users. This is implemented through a token-based validation system.

## How It Works

1. **Token Generation**: A CSRF token is generated and stored in an HTTP-only cookie when a user first visits the site
2. **Token Validation**: For state-changing requests (POST, PUT, DELETE, PATCH), the token must be included in the request header
3. **Automatic Protection**: The middleware automatically validates tokens for protected API routes

## Implementation Details

### Middleware (`/src/middleware.ts`)
- Generates CSRF tokens and sets them as HTTP-only cookies
- Validates tokens on protected API routes
- Returns 403 Forbidden for invalid/missing tokens
- Excludes public API routes and auth endpoints

### CSRF Library (`/src/lib/csrf.ts`)
- Provides token generation and validation functions
- Uses cryptographically secure random tokens
- Implements constant-time comparison to prevent timing attacks

### API Client (`/src/lib/api-client.ts`)
- Provides a fetch wrapper that automatically includes CSRF tokens
- Simplifies API calls from the frontend

## Usage

### Using the API Client (Recommended)

```typescript
import { apiClient } from '@/lib/api-client';

// GET request (no CSRF token needed)
const response = await apiClient.get('/api/brands');

// POST request (CSRF token automatically included)
const response = await apiClient.post('/api/brands', {
  name: 'New Brand',
  description: 'Brand description'
});

// PUT request
const response = await apiClient.put('/api/brands/123', {
  name: 'Updated Brand'
});

// DELETE request
const response = await apiClient.delete('/api/brands/123');
```

### Using Standard Fetch

If you need to use fetch directly, include the CSRF token manually:

```typescript
import { withCSRFToken } from '@/lib/hooks/use-csrf-token';

// Option 1: Using the helper function
const response = await fetch('/api/brands', withCSRFToken({
  method: 'POST',
  body: JSON.stringify(data)
}));

// Option 2: Manual token inclusion
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];

const response = await fetch('/api/brands', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || ''
  },
  body: JSON.stringify(data)
});
```

### Using the Hook (for React components)

```typescript
import { useCSRFToken } from '@/lib/hooks/use-csrf-token';

function MyComponent() {
  const csrfToken = useCSRFToken();
  
  const handleSubmit = async () => {
    const response = await fetch('/api/brands', {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken || ''
      },
      body: JSON.stringify(data)
    });
  };
}
```

## Excluded Routes

The following routes do not require CSRF protection:
- `/api/auth/*` - Authentication endpoints have their own security
- `/api/env-check` - Public health check endpoint
- `/api/test-connection` - Public test endpoint
- `/api/test-metadata-generator` - Public test endpoint
- `/api/brands/identity` - Public endpoint for brand analysis
- `/api/webhooks/*` - Webhooks use different validation methods

## Error Handling

When a CSRF validation fails, the API returns:
```json
{
  "success": false,
  "error": "CSRF validation failed",
  "code": "CSRF_VALIDATION_FAILED",
  "message": "Request rejected due to invalid or missing CSRF token"
}
```

Status code: 403 Forbidden

## Security Considerations

1. **Token Storage**: Tokens are stored in HTTP-only cookies to prevent XSS attacks
2. **SameSite Policy**: Cookies use `SameSite=Strict` to prevent CSRF via third-party sites
3. **Secure Flag**: In production, cookies use the `Secure` flag for HTTPS-only transmission
4. **Token Rotation**: Consider implementing token rotation for enhanced security
5. **Timing Attacks**: Token comparison uses constant-time algorithm

## Migration Guide

To update existing code to use CSRF protection:

1. **Replace fetch calls with apiClient**:
   ```typescript
   // Before
   fetch('/api/brands', { method: 'POST', body: JSON.stringify(data) })
   
   // After
   apiClient.post('/api/brands', data)
   ```

2. **Or use the fetch wrapper**:
   ```typescript
   // Before
   fetch('/api/brands', options)
   
   // After
   import { apiFetch } from '@/lib/api-client';
   apiFetch('/api/brands', options)
   ```

## Testing

When testing API endpoints that require CSRF protection:

1. First make a GET request to obtain a CSRF token cookie
2. Include the token in subsequent POST/PUT/DELETE requests
3. For automated tests, consider disabling CSRF in test environments

## Future Improvements

- Implement token rotation on each request
- Add per-form token generation for enhanced security
- Consider double-submit cookie pattern as an alternative
- Add rate limiting in conjunction with CSRF protection