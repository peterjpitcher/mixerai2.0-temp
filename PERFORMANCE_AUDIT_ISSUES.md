# Performance Audit Issues for MixerAI 2.0

## 🚀 Performance Issues

### 1. 🔴 CRITICAL: ArticleGeneratorForm component is 1464 lines without optimization

**Description:** The ArticleGeneratorForm component is extremely large and lacks performance optimizations.

**Location:**
- File: `/src/components/content/article-generator-form.tsx`
- Lines: 1-1464

**Issues:**
- No memoization despite 63+ state variables
- No code splitting
- SEO checks run on every keystroke without debouncing
- Multiple unnecessary re-renders

**Recommended Fix:**
```typescript
// 1. Add debouncing
const debouncedContent = useDebounce(editableContent, 300);

// 2. Memoize expensive operations
const checkKeywordInHeadings = useCallback((tag, keyword) => {
  // ... logic
}, []);

// 3. Split into smaller components
const TitleGenerationSection = React.memo(({ ... }) => { ... });
const ContentGenerationSection = React.memo(({ ... }) => { ... });
const SEOAnalysisSection = React.memo(({ ... }) => { ... });
```

**Priority:** 🔴 CRITICAL

---

### 2. 🔴 CRITICAL: N+1 query problem in Brands API

**Description:** The brands API fetches auth users in a loop, causing N+1 query issues.

**Location:**
- File: `/src/app/api/brands/route.ts`
- Lines: 134-150

**Current Issue:**
```typescript
const { data: { users: allAuthUsers } } = await supabase.auth.admin.listUsers();
// Then loops through to find matching users
```

**Recommended Fix:**
```typescript
// Batch fetch user data
const userIds = [...userIdsForAuthCheck];
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, avatar_url')
  .in('id', userIds);
```

**Priority:** 🔴 CRITICAL

---

### 3. 🟡 HIGH: Missing pagination in Content API

**Description:** Content API fetches all items without pagination, causing performance issues with large datasets.

**Location:**
- File: `/src/app/api/content/route.ts`

**Recommended Fix:**
```typescript
const page = parseInt(url.searchParams.get('page') || '1');
const limit = parseInt(url.searchParams.get('limit') || '50');
const offset = (page - 1) * limit;

queryBuilder = queryBuilder
  .range(offset, offset + limit - 1)
  .order('updated_at', { ascending: false });
```

**Priority:** 🟡 HIGH

---

### 4. 🟡 HIGH: Bundle size issues with duplicate dependencies

**Description:** Multiple performance-impacting dependency issues found.

**Location:**
- File: `package.json`

**Issues:**
1. Both `react-beautiful-dnd` and `@hello-pangea/dnd` included
2. `jsdom` (large) in dependencies instead of devDependencies
3. Using `lodash.debounce` instead of native implementation
4. No tree-shaking for icon libraries

**Recommended Fix:**
```json
// Remove duplicate
- "react-beautiful-dnd": "^13.1.1",

// Move to devDependencies
- "jsdom": "^26.1.0",

// Use native debounce or lighter alternative
- "lodash.debounce": "^4.0.8",
```

**Priority:** 🟡 HIGH

---

### 5. 🟡 HIGH: Missing code splitting and lazy loading

**Description:** Large components are loaded synchronously, impacting initial page load.

**Components needing lazy loading:**
- ArticleGeneratorForm (1464 lines)
- ContentGeneratorForm (900 lines)
- TemplateForm (800+ lines)
- Analytics components

**Recommended Fix:**
```typescript
const ArticleGeneratorForm = dynamic(
  () => import('@/components/content/article-generator-form'),
  { 
    loading: () => <Skeleton className="h-[600px]" />,
    ssr: false 
  }
);
```

**Priority:** 🟡 HIGH

---

### 6. 🟠 MEDIUM: Not using Next.js Image optimization

**Description:** Regular `<img>` tags used instead of Next.js Image component.

**Found in multiple components:**
- Avatar displays
- Brand logos
- Product images

**Recommended Fix:**
```typescript
import Image from 'next/image';

<Image 
  src={avatar_url} 
  alt="User avatar"
  width={40}
  height={40}
  loading="lazy"
  placeholder="blur"
/>
```

**Priority:** 🟠 MEDIUM

---

### 7. 🟠 MEDIUM: Multiple sequential API calls on component mount

**Description:** Components make multiple separate API calls that could be parallelized.

**Location:**
- File: `/src/app/dashboard/content/content-page-client.tsx`

**Current Issue:**
```typescript
useEffect(() => { fetchCurrentUser(); }, []);
useEffect(() => { fetchContentData(); }, []);
useEffect(() => { fetchBrandData(); }, []);
```

**Recommended Fix:**
```typescript
useEffect(() => {
  Promise.all([
    fetchCurrentUser(),
    fetchContentData(),
    fetchBrandData()
  ]).catch(handleError);
}, []);
```

**Priority:** 🟠 MEDIUM

---

### 8. 🟠 MEDIUM: Missing request caching

**Description:** No caching headers on frequently accessed data.

**Affected endpoints:**
- `/api/brands`
- `/api/templates`
- `/api/users/me`

**Recommended Fix:**
```typescript
return NextResponse.json(
  { data },
  { 
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  }
);
```

**Priority:** 🟠 MEDIUM

---

### 9. 🟠 MEDIUM: Missing virtualization for large lists

**Description:** Content lists render all items in DOM, causing performance issues with large datasets.

**Recommended Fix:**
- Implement virtual scrolling using @tanstack/react-virtual
- Only render visible items
- Significantly improves performance with 100+ items

**Priority:** 🟠 MEDIUM

---

### 10. 🟢 LOW: Missing database indexes

**Description:** Common query patterns lack proper indexes.

**Recommended indexes:**
```sql
CREATE INDEX idx_content_brand_status ON content(brand_id, status);
CREATE INDEX idx_content_updated_at ON content(updated_at DESC);
CREATE INDEX idx_user_brand_permissions_user ON user_brand_permissions(user_id);
CREATE INDEX idx_templates_brand_active ON templates(brand_id, is_active);
```

**Priority:** 🟢 LOW

---

### 11. 🟢 LOW: Build configuration optimizations

**Description:** Next.js build configuration missing performance optimizations.

**Location:**
- File: `next.config.js`

**Recommended additions:**
```javascript
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/*']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  }
};
```

**Priority:** 🟢 LOW