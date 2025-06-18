# API Architecture Review - MixerAI 2.0

**Date**: December 2024  
**Scope**: All API endpoints in /src/app/api/  
**Focus**: Consistency, security, performance, and design patterns

## Executive Summary

This review identifies critical issues in the API architecture that impact performance, security, and maintainability. The most pressing issues are N+1 query problems, missing input validation, and lack of transaction handling.

## 1. API Consistency Issues

### Naming Convention Inconsistencies
```
/api/ai/generate          ✓ Correct (kebab-case)
/api/contentVariables     ✗ Should be /api/content-variables
/api/master-claim-brands  ✓ Correct
/api/me/tool-run-history  ✓ Correct
```

### Response Format Variations
```typescript
// Standard format (60% of endpoints)
{ success: boolean, data?: any, error?: string }

// Non-standard formats found:
// /api/env-check
{ hasRequiredEnvVars: boolean, missingEnvVars: string[] }

// /api/test-connection  
{ connected: boolean, version?: string, error?: string }

// /api/brands/identity
{ data: any } // Missing success/error fields
```

### Status Code Inconsistencies
- Some endpoints return 200 for errors with `success: false`
- Others correctly use 400/500 status codes
- Missing 404 responses for not found resources

## 2. Security Vulnerabilities

### Missing Input Validation
**Critical**: Most endpoints lack proper input validation

```typescript
// Good example (rare):
// /api/claims/route.ts
const claimSchema = z.object({
  claim_text: z.string().min(1),
  category: z.string(),
  // ... proper validation
});

// Bad example (common):
// /api/brands/route.ts
const body = await request.json();
// No validation before using body.name, body.url, etc.
```

### Authorization Inconsistencies
```typescript
// Pattern 1: Direct user check
const user = await getUser(request);
if (!user) return unauthorized();

// Pattern 2: In-query authorization
const brands = await supabase
  .from('brands')
  .select('*')
  .eq('user_id', user.id); // Problem: Doesn't check brand_users

// Pattern 3: Service role bypass
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
); // Bypasses RLS entirely
```

### Information Disclosure
```typescript
// Exposing internal errors to clients:
catch (error) {
  return NextResponse.json(
    { error: error.message }, // Exposes internal details
    { status: 500 }
  );
}
```

## 3. Critical Performance Issues

### N+1 Query Problem in Content API
```typescript
// /api/content/route.ts
const contents = await supabase.from('content').select('*');

// Then for EACH content item:
for (const content of contents) {
  const user = await supabase.from('users').select('*').eq('id', content.created_by);
  const profile = await supabase.from('profiles').select('*').eq('id', content.created_by);
  const workflow = await supabase.from('workflows').select('*').eq('id', content.workflow_id);
}
// Result: 1 + (3 * N) queries instead of 1 query
```

**Solution needed**:
```typescript
const contents = await supabase
  .from('content')
  .select(`
    *,
    users!created_by (id, email),
    profiles!created_by (full_name),
    workflows!workflow_id (name, status)
  `);
```

### Missing Indexes
Common query patterns without indexes:
```sql
-- Frequently queried but no index:
SELECT * FROM content WHERE brand_id = ? AND status = ?;
SELECT * FROM notifications WHERE user_id = ? AND is_read = false;
SELECT * FROM workflow_tasks WHERE assigned_to = ? AND completed = false;
```

### No Pagination
These endpoints return all records:
- `/api/brands` - Could return thousands
- `/api/content` - No limit clause
- `/api/users` - Returns all users
- `/api/claims` - No pagination

### Over-fetching
```typescript
// Common anti-pattern:
.select('*') // Fetches all columns even if only need id, name
```

## 4. Data Integrity Issues

### No Transaction Handling
**Critical**: Multi-table operations without transactions

```typescript
// /api/brands/route.ts
// If second operation fails, brand is created without admin user
const brand = await supabase.from('brands').insert({...});
const brandUser = await supabase.from('brand_users').insert({...}); // Could fail!
```

**Should be**:
```typescript
const { data, error } = await supabase.rpc('create_brand_with_admin', {
  brand_data: {...},
  admin_user_id: user.id
});
```

### Missing Cascade Handling
Deleting entities doesn't properly handle related data:
```typescript
// Deletes brand but orphans:
// - brand_users
// - content
// - workflows
await supabase.from('brands').delete().eq('id', brandId);
```

### No Optimistic Locking
Concurrent updates can overwrite each other:
```typescript
// User A and B fetch same content
const content = await getContent(id);
// Both modify
content.title = "New Title";
// Last write wins, other changes lost
await updateContent(content);
```

## 5. API Design Issues

### Non-RESTful Patterns
```
/api/content/prepare-product-context  ✗ Should be /api/products/:id/context
/api/tools/alt-text-generator        ✗ Should be POST /api/tools/alt-text
/api/me/tool-run-history             ✗ Should be GET /api/users/me/tool-runs
```

### Missing HTTP Methods
All endpoints only support GET/POST, missing:
- PUT/PATCH for updates
- DELETE for deletions
- HEAD for existence checks
- OPTIONS for CORS

### No API Versioning
No version in URL or headers:
```
Current: /api/brands
Should be: /api/v1/brands or header "API-Version: 1"
```

### Missing Batch Operations
No bulk endpoints for common operations:
- Bulk create content
- Bulk assign workflows  
- Bulk update claims
- Bulk invite users

## 6. Specific Endpoint Issues

### /api/ai/generate
- Nested try-catch blocks make error handling complex
- No request size validation
- Token limits not enforced

### /api/brands
- Missing pagination
- No filtering options
- Inefficient permission checking

### /api/content
- Severe N+1 problem
- No caching headers
- Missing field selection

### /api/workflows
- Can create invalid workflows
- No validation of step order
- Missing assignee checks

## 7. Missing Features

### No API Documentation
- No OpenAPI/Swagger spec
- No request/response examples
- No error code documentation

### No Rate Limiting Info
- Rate limits enforced but not communicated
- No headers indicating limits/remaining

### No Caching
- No ETags
- No Last-Modified headers
- No Cache-Control headers

### No Webhooks
- No event notifications
- No async job status endpoints
- No callback mechanisms

## 8. Recommendations

### Immediate Actions (Week 1)

1. **Fix N+1 Queries**
```typescript
// Use proper joins
.select(`
  *,
  creator:profiles!created_by(full_name, avatar_url),
  brand:brands!brand_id(name, color)
`)
```

2. **Add Database Indexes**
```sql
CREATE INDEX idx_content_brand_status ON content(brand_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
```

3. **Implement Transactions**
```typescript
await supabase.rpc('transaction_wrapper', {
  operations: [...]
});
```

4. **Add Input Validation**
```typescript
const schema = z.object({
  name: z.string().min(1).max(255),
  // ... all fields
});
const validated = schema.parse(body);
```

### Short Term (Month 1)

5. **Standardize Responses**
- Create response wrapper utilities
- Enforce consistent error formats
- Add request ID tracking

6. **Implement Pagination**
```typescript
const { page = 1, limit = 20 } = query;
const offset = (page - 1) * limit;
```

7. **Add Caching Layer**
- Redis for frequently accessed data
- Response caching headers
- Invalidation strategies

### Long Term (Quarter)

8. **API Redesign**
- RESTful resource URLs
- Proper HTTP methods
- API versioning
- Batch operations

9. **Documentation**
- OpenAPI specification
- Interactive documentation
- Client SDK generation

10. **Monitoring**
- APM integration
- Performance tracking
- Error monitoring

## Success Metrics

Post-implementation targets:
- API response time: p95 < 200ms
- Error rate: < 0.1%
- N+1 queries: 0
- Validation coverage: 100%
- Documentation coverage: 100%

## Conclusion

The API architecture has fundamental issues that need immediate attention. The highest priority is fixing performance problems (N+1 queries, missing indexes) and security vulnerabilities (input validation, authorization). With the recommended changes, the API would be more secure, performant, and maintainable.