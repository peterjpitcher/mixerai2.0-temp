# MixerAI 2.0 - Route Redirect Testing Plan

## Overview

This document outlines a testing approach for verifying the route redirects implemented in Phase 1 of the MixerAI 2.0 route cleanup project. The testing focuses on ensuring that all non-dashboard routes correctly redirect to their dashboard equivalents, preserving query parameters and maintaining proper navigation flow.

## Testing Objectives

1. Verify that all non-dashboard routes successfully redirect to their dashboard equivalents
2. Confirm that query parameters are preserved during redirects
3. Test browser history and navigation (forward/back) with redirects
4. Ensure authentication state is maintained during redirects
5. Monitor for any 404 errors that might indicate missed redirect paths
6. Measure performance impacts of the redirect implementation

## Test Environment Requirements

- Local development environment for initial testing
- Staging environment for pre-production validation
- Production-like environment for final verification
- Range of browsers (Chrome, Firefox, Safari, Edge)
- Mobile device simulation for responsive testing

## Test Cases

### 1. Basic Route Redirects

| Test ID | Description | Source Path | Expected Destination | Query Parameters |
|---------|-------------|-------------|----------------------|------------------|
| R001 | Brands index redirect | `/brands` | `/dashboard/brands` | None |
| R002 | Brands with ID redirect | `/brands/123` | `/dashboard/brands/123` | None |
| R003 | Brand edit redirect | `/brands/123/edit` | `/dashboard/brands/123/edit` | None |
| R004 | New brand redirect | `/brands/new` | `/dashboard/brands/new` | None |
| R005 | Workflows index redirect | `/workflows` | `/dashboard/workflows` | None |
| R006 | Workflow with ID redirect | `/workflows/abc` | `/dashboard/workflows/abc` | None |
| R007 | Workflow edit redirect | `/workflows/abc/edit` | `/dashboard/workflows/abc/edit` | None |
| R008 | New workflow redirect | `/workflows/new` | `/dashboard/workflows/new` | None |
| R009 | Content index redirect | `/content` | `/dashboard/content/article` | None |
| R010 | Content article redirect | `/content/article` | `/dashboard/content/article` | None |
| R011 | Content ownedpdp redirect | `/content/ownedpdp` | `/dashboard/content/ownedpdp` | None |
| R012 | Content retailerpdp redirect | `/content/retailerpdp` | `/dashboard/content/retailerpdp` | None |
| R013 | New content redirect | `/content/new` | `/dashboard/content/new` | None |
| R014 | Users index redirect | `/users` | `/dashboard/users` | None |
| R015 | User invite redirect | `/users/invite` | `/dashboard/users/invite` | None |

### 2. Query Parameter Preservation

| Test ID | Description | Source Path | Expected Destination | Query Parameters |
|---------|-------------|-------------|----------------------|------------------|
| Q001 | Single parameter | `/brands?sort=name` | `/dashboard/brands?sort=name` | `sort=name` |
| Q002 | Multiple parameters | `/workflows?status=draft&sort=date` | `/dashboard/workflows?status=draft&sort=date` | `status=draft&sort=date` |
| Q003 | Array parameters | `/content/article?tags[]=food&tags[]=health` | `/dashboard/content/article?tags[]=food&tags[]=health` | `tags[]=food&tags[]=health` |
| Q004 | Special characters | `/users?search=O'Connor+Smith` | `/dashboard/users?search=O'Connor+Smith` | `search=O'Connor+Smith` |
| Q005 | Filter parameters | `/brands?filter[country]=UK&filter[language]=en` | `/dashboard/brands?filter[country]=UK&filter[language]=en` | `filter[country]=UK&filter[language]=en` |

### 3. Browser Navigation Testing

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| N001 | Back button after redirect | 1. Visit `/brands`<br>2. Redirected to `/dashboard/brands`<br>3. Press browser back button | Should navigate to previous page in history (before `/brands`), not back to `/brands` which would cause a redirect loop |
| N002 | Forward button after redirect | 1. Visit `/brands`<br>2. Redirected to `/dashboard/brands`<br>3. Navigate to a different page<br>4. Press back button to `/dashboard/brands`<br>5. Press forward button | Should navigate forward in history, not reprocess the redirect |
| N003 | Direct navigation | Enter `/brands/123` directly in address bar | Should redirect to `/dashboard/brands/123` without any intermediate pages |
| N004 | Bookmark usage | Bookmark an old route (e.g., `/workflows/123`) and use the bookmark | Should open the bookmark and redirect to the dashboard route (`/dashboard/workflows/123`) |
| N005 | Refresh after redirect | 1. Visit `/brands`<br>2. Redirected to `/dashboard/brands`<br>3. Refresh the page | Should stay on `/dashboard/brands` without re-redirecting |

### 4. Authentication Testing

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| A001 | Redirect for unauthenticated user | 1. Log out<br>2. Visit `/brands` | Should redirect to `/auth/login?from=/dashboard/brands` |
| A002 | Redirect for authenticated user | 1. Log in<br>2. Visit `/brands` | Should redirect to `/dashboard/brands` |
| A003 | Authentication preservation | 1. Log in<br>2. Visit `/brands`<br>3. Redirected to `/dashboard/brands` | Should maintain authentication state, no login prompt |
| A004 | Login with return URL | 1. Log out<br>2. Visit `/brands/123`<br>3. Redirected to login page<br>4. Complete login | Should redirect to `/dashboard/brands/123` after login |
| A005 | API route authentication | 1. Log out<br>2. Attempt API call to `/api/brands` | Should receive 401 Unauthorized response |

### 5. Error Monitoring

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| E001 | Invalid dynamic route | Visit `/brands/not-a-valid-id` | Should redirect to `/dashboard/brands/not-a-valid-id` and then show appropriate error page |
| E002 | Non-existent route | Visit `/brands/xyz/non-existent` | Should redirect to `/dashboard/brands/xyz/non-existent` and then show 404 page |
| E003 | Nested route redirect | Visit `/workflows/123/comments/456` | Should redirect to `/dashboard/workflows/123/comments/456` |
| E004 | Monitor server logs | Review server logs after running various test cases | No unexpected errors related to redirects should be present |
| E005 | 404 monitoring | Set up monitoring for 404 errors in application logs | No 404s should occur for redirectable routes |

### 6. Performance Testing

| Test ID | Description | Measurement Approach | Expected Result |
|---------|-------------|----------------------|-----------------|
| P001 | Redirect latency | Measure time between initial request and final page load | Redirect should add minimal overhead (<50ms) |
| P002 | Bundle size impact | Compare JS bundle sizes before and after implementation | Size reduction in non-dashboard pages due to placeholder replacement |
| P003 | First contentful paint | Compare FCP metrics for redirected vs direct navigation | Minimal difference (<100ms) |
| P004 | Server-side vs client-side redirects | Test both framework-level and middleware redirects | Server-side redirects should be faster and more reliable |
| P005 | Network requests | Monitor network tab for redirect chains | Should be a single redirect (status 307 or 308), not multiple hops |

## Testing Procedure

1. **Setup Testing Environment**
   - Configure local Next.js development environment
   - Ensure logging is enabled for redirects in middleware
   - Set up browser tools for performance measurement

2. **Execute Test Cases**
   - Systematically work through each test case
   - Document results including screenshots where relevant
   - Note any deviations from expected behavior

3. **Monitor and Log**
   - Enable application logging
   - Check browser console for errors
   - Review server logs for any unexpected behavior
   - Monitor 404 errors specifically

4. **Performance Analysis**
   - Measure redirect timing
   - Compare bundle sizes
   - Analyze load times for redirected pages

## Rollback Strategy

If critical issues are identified during testing:

1. Restore original page components from Git history
2. Remove redirect rules from `next.config.js`
3. Remove redirect logic from middleware
4. Create a detailed report of issues for future resolution

## Reporting

The test results should be documented in a structured report that includes:

1. Summary of test case results (Pass/Fail)
2. Screenshots of any encountered issues
3. Performance measurements
4. Recommendations for adjustments if needed
5. Final assessment of whether to proceed with Phase 3 (Complete Removal)

## Timeline

- Basic redirect testing: 1 day
- Query parameter and navigation testing: 1 day
- Authentication and error testing: 1 day
- Performance assessment: 1 day
- Report generation: 0.5 day

Total estimated testing time: 4.5 days

## Approval Criteria for Phase 3

Before proceeding to Phase 3 (Complete Removal of placeholder files), the following criteria must be met:

1. All redirects work correctly with 100% pass rate on basic redirects
2. Query parameters are preserved in all test cases
3. No 404 errors occur for valid routes
4. Browser navigation (back/forward) works as expected
5. Authentication flows remain intact
6. No degradation in performance metrics
7. Test report is completed and approved by the technical lead

## Conclusion

This testing plan provides a comprehensive approach to validating the route redirect implementation in MixerAI 2.0. By thoroughly testing each aspect of the redirects, we can ensure a smooth transition to the simplified route structure without disrupting user experience or application functionality. 