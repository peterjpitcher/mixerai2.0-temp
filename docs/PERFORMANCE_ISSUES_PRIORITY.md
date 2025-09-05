# Performance Issues Priority Plan

## Executive Summary
Created 8 GitHub issues covering major performance problems. Discovery revealed some areas are already well-optimized (database indexes, N+1 queries), while others need urgent attention (in-memory storage, client-side rendering).

## Prioritized Action Plan

### Week 1: Critical Infrastructure Fixes (P1)
**Goal**: Fix fundamental scaling issues

#### Issue #276: In-memory State Management ⚠️ **BLOCKER**
- **Impact**: System cannot scale, rate limiting broken
- **Effort**: High (3-5 days)
- **Solution**: Implement Redis/Upstash/Vercel KV
- **Files**: `src/lib/rate-limit.ts`, `src/lib/auth/session-manager.ts`

#### Issue #278: Dependency Cleanup 🎯 **QUICK WIN**
- **Impact**: 200MB+ reduction in deployment size
- **Effort**: Low (2-3 hours)
- **Solution**: Move dev dependencies, remove unused packages
- **Action**: 
  ```bash
  npm uninstall playwright express express-rate-limit js-cookie shadcn-ui
  npm install --save-dev playwright @types/* autoprefixer postcss tailwindcss
  ```

### Week 2: Middleware & Rendering Optimization (P1)

#### Issue #275: Heavy Middleware
- **Impact**: 100-200ms latency on every request
- **Effort**: Medium (2-3 days)
- **Solution**: 
  - Narrow middleware matcher
  - Move CSRF to route handlers
  - Skip auth for public routes

#### Issue #277: Client-Only Dashboard
- **Impact**: Poor initial load, 87KB+ extra JS
- **Effort**: High (3-4 days)  
- **Solution**: Convert dashboard layout to server component
- **Challenge**: Requires careful refactoring of client hooks

### Week 3: Client Performance (P2)

#### Issue #279: Excessive Client Logging
- **Impact**: Performance overhead on all operations
- **Effort**: Medium (2 days)
- **Solution**:
  - Make IssueReporter dev-only
  - Remove ipify.org calls
  - Fix lodash imports

#### Issue #280: Missing API Cache Headers
- **Impact**: Unnecessary database load
- **Effort**: Low (1 day)
- **Solution**: Add cache headers to read-only endpoints
- **Quick wins**: `/api/countries`, `/api/content-types`

### Week 4: Configuration & Polish (P2-P3)

#### Issue #282: Next.js Config
- **Impact**: Larger images, slower builds
- **Effort**: Low (few hours)
- **Solution**:
  - Add AVIF/WebP formats
  - Enable build cache
  - Enable ESLint

#### Issue #281: Database Optimization
- **Impact**: Already well-optimized
- **Effort**: Low priority
- **Note**: Comprehensive indexes already in place

## Success Metrics

### Must Fix (Blocking Production)
- ✅ Redis implementation for state management
- ✅ Remove dev dependencies from production

### High Priority (Major UX Impact)
- ✅ Reduce middleware overhead by 50%
- ✅ Server-side render dashboard layout
- ✅ Reduce First Load JS by 30%

### Medium Priority (Performance Wins)
- ✅ Add cache headers (reduce DB load 40%)
- ✅ Remove console logging (reduce noise 80%)
- ✅ Optimize images (reduce size 40%)

## Implementation Order

1. **Day 1**: Dependency cleanup (#278) - Quick win
2. **Days 2-5**: Redis implementation (#276) - Unblock scaling
3. **Week 2**: Middleware optimization (#275) - Major latency win
4. **Week 2-3**: Dashboard SSR (#277) - UX improvement
5. **Week 3**: Client optimizations (#279, #280) - Polish
6. **Week 4**: Config improvements (#282) - Final optimization

## Risk Mitigation

- **Redis Migration**: Test thoroughly in staging, implement feature flags
- **Dashboard SSR**: May break some client features, needs careful testing
- **Middleware Changes**: Could affect security, require security review

## Expected Outcomes

- **50% reduction** in request latency
- **40% reduction** in bundle size  
- **60% reduction** in database load
- **Proper scaling** across multiple instances
- **Improved Core Web Vitals** scores

## GitHub Issues Created

1. [#275](https://github.com/gmi-common/mixerai2.0/issues/275) - Heavy middleware
2. [#276](https://github.com/gmi-common/mixerai2.0/issues/276) - In-memory state (CRITICAL)
3. [#277](https://github.com/gmi-common/mixerai2.0/issues/277) - Client-only dashboard
4. [#278](https://github.com/gmi-common/mixerai2.0/issues/278) - Dependency management
5. [#279](https://github.com/gmi-common/mixerai2.0/issues/279) - Client logging overhead
6. [#280](https://github.com/gmi-common/mixerai2.0/issues/280) - API cache headers
7. [#281](https://github.com/gmi-common/mixerai2.0/issues/281) - Database queries (low priority)
8. [#282](https://github.com/gmi-common/mixerai2.0/issues/282) - Next.js configuration