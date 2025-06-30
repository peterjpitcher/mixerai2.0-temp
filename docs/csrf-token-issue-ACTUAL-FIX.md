# CSRF Token Issue - ACTUAL Root Cause & Fix

## The Real Problem

The CSRF token cookie IS present and IS readable by JavaScript. The issue was with the cookie parsing logic in `getCSRFToken()`.

### Debug Evidence
```
[getCSRFToken] All cookies: sb-sxcvxbusptgopessiwti-auth-token=...; sb-tfcasgxopxegwrabvwat-auth-token=...; csrf-token=80de093f...; sb-shsfrtemevclwpqlypoq-auth-token=...
```

The cookie is clearly there, but the parsing failed.

### Original Parsing Logic (BROKEN)
```typescript
const value = `; ${document.cookie}`;
const parts = value.split(`; csrf-token=`);
if (parts.length === 2) {
  return parts.pop()?.split(';').shift() || null;
}
```

This logic assumes:
1. All cookies are separated by `; ` (semicolon + space)
2. The csrf-token will be found by splitting on `; csrf-token=`

But the actual cookie string may have inconsistent spacing around semicolons.

### Fixed Parsing Logic
```typescript
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  // More robust cookie parsing
  const cookies = document.cookie.split(';').map(c => c.trim());
  
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'csrf-token') {
      return value;
    }
  }
  
  return null;
}
```

This approach:
1. Splits by `;` only (no space assumption)
2. Trims whitespace from each cookie
3. Properly splits name/value pairs
4. Returns the value when found

## The HttpOnly Red Herring

The `httpOnly: true` setting in the middleware was NOT the issue. The cookie was accessible to JavaScript all along - we just couldn't parse it correctly.

## Lesson Learned

Always verify assumptions with debug logging before jumping to conclusions. The initial hypothesis about HttpOnly was wrong - the actual issue was much simpler: inconsistent cookie string formatting.