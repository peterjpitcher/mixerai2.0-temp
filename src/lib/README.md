# Lib Directory

Core utilities and shared functionality for MixerAI 2.0.

## Structure

- `/auth` - Authentication utilities, middleware, and session management
- `/supabase` - Supabase client configuration and helpers
- `/utils` - General utility functions (formatting, validation, etc.)
- `/azure` - Azure OpenAI integration and utilities
- `/constants` - Application-wide constants
- `/hooks` - Custom React hooks

## Key Files

- `api-client.ts` - Centralized API client with CSRF protection
- `api-utils.ts` - API helper functions and error handling
- `claims-utils.ts` - Claims system utilities and types
- `csrf.ts` - CSRF token generation and validation
- `rate-limit.ts` - Rate limiting middleware
- `permissions.ts` - Permission checking utilities

## Usage

All exports from this directory should be imported using the `@/lib` alias:

```typescript
import { createSupabaseClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
```