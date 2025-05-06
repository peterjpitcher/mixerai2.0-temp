# Environment Variable Security Guidelines

This document provides security guidelines for handling environment variables in the MixerAI 2.0 application, with special focus on authentication and API credentials.

## Environment Variable Classification

Environment variables are classified by sensitivity and context:

1. **Public Variables**
   - Can be exposed to the browser
   - Must be prefixed with `NEXT_PUBLIC_`
   - Example: `NEXT_PUBLIC_SUPABASE_URL`

2. **Server-Only Variables**
   - Must never be exposed to the browser
   - No `NEXT_PUBLIC_` prefix
   - Example: `SUPABASE_SERVICE_ROLE_KEY`

3. **Build-Time Variables**
   - Used only during build process
   - Example: `NODE_ENV`

## Security Rules

### 1. Service Role Keys - CRITICAL

The Supabase service role key provides admin access to your database. It:

- Must NEVER be exposed to the client
- Must NEVER use the `NEXT_PUBLIC_` prefix
- Must only be used in server contexts
- Must not be committed to version control

```typescript
// ❌ INCORRECT - SECURITY RISK!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! 
)

// ✅ CORRECT
// Server Component or API Route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### 2. Anon Keys - PUBLIC

The Supabase anon key is designed for public use but has limited permissions:

- Safe to use with `NEXT_PUBLIC_` prefix
- Used for initial authentication flow
- Limited by Row-Level Security (RLS) policies

```typescript
// ✅ CORRECT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### 3. API Secrets - SERVER ONLY

API keys for services like Azure OpenAI should be protected:

- Must NOT use `NEXT_PUBLIC_` prefix
- Must only be used in server contexts
- Must have proper error handling for failures

```typescript
// ✅ CORRECT
// Server-side API route
const apiKey = process.env.AZURE_OPENAI_API_KEY;
if (!apiKey) {
  return Response.json({ 
    error: 'Service not configured' 
  }, { status: 500 });
}
```

## Current Environment Variables Audit

| Variable Name | Classification | Access Context | Status |
|---------------|----------------|----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client + Server | ✅ Correctly configured |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client + Server | ✅ Correctly configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only | Server only | ✅ Correctly configured |
| `AZURE_OPENAI_API_KEY` | Server-Only | Server only | ✅ Correctly configured |
| `AZURE_OPENAI_ENDPOINT` | Server-Only | Server only | ✅ Correctly configured |

## Secure Environment Variable Access Patterns

### Pattern 1: Client-Side Context Checking

```typescript
// In client components, check if we're in a browser before accessing env vars
if (typeof window !== 'undefined') {
  // Only access NEXT_PUBLIC_ variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
```

### Pattern 2: Safe Server Component Access

```typescript
// In Server Components
export default async function ServerComponent() {
  // Safe to access any environment variable
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // ...
}
```

### Pattern 3: API Route Access

```typescript
// In API routes
export async function GET() {
  // Safe to access any environment variable
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  // ...
}
```

## Environment Variables Deployment

1. **Local Development**
   - Use `.env.local` file (git-ignored)
   - Never commit real secrets to version control

2. **Vercel Deployment**
   - Set variables in Vercel dashboard
   - Use "Environment Variables" section
   - Mark server-only variables as non-exposed

3. **CI/CD Pipelines**
   - Use secrets management in CI/CD platform
   - Reference secrets in build commands

## Security Checklist

- [ ] All environment variables are properly classified
- [ ] No server-only variables use the `NEXT_PUBLIC_` prefix
- [ ] Admin client initialization only happens in server contexts
- [ ] All .env files with real credentials are git-ignored
- [ ] Environment variable safety checks are in place
- [ ] Fallback behaviors exist for missing variables

## Remediation Steps

If you discover a server-only secret has been exposed:

1. Immediately rotate/regenerate the compromised key
2. Update environment variables in all environments
3. Remove any cached builds that might contain the exposed key
4. Review logs for suspicious activities
5. Document the incident and resolution

## Regular Audit Schedule

To maintain environment variable security:

1. Perform monthly audits of all environment variables
2. Verify proper usage in new code during code reviews
3. Run automated security scans to detect misconfigurations
4. Update this document when new variables are added 