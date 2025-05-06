# MixerAI 2.0 Invitation System Fix Plan

This document outlines the specific implementation plan for resolving the Supabase invitation system issues in MixerAI 2.0. The plan is divided into phases that can be executed sequentially to improve the system while minimizing disruption.

## Phase 1: Immediate Fixes (1-2 Days)

### 1.1. Enable Direct SQL Fallback

**Action Items:**
- Update environment variables in Vercel deployment to set `FEATURE_INVITE_DIRECT_SQL=true`
- Verify that the feature flag is correctly read in the application

**Files to Update:**
- `.env.production` or Vercel environment configuration
- Confirm parsing in `src/lib/feature-flags.ts`

### 1.2. Fix TypeScript Issues in Fallback Implementation

**Action Items:**
- Resolve TypeScript errors in `src/lib/auth/direct-invitation.ts` related to null types and instanceof checks
- Ensure proper error handling of PostgrestError types

**Files to Update:**
- `src/lib/auth/direct-invitation.ts`

### 1.3. Update Error Handling in API Route

**Action Items:**
- Modify the invitation API to explicitly catch and handle Supabase Auth API errors
- Ensure the error is properly passed to the fallback mechanism

**Files to Update:**
- `src/app/api/users/invite/route.ts`

## Phase 2: Enhanced Fallback (2-3 Days)

### 2.1. Modify Invitation Flow to Prioritize Reliability

**Action Items:**
- Update the invitation flow to use direct SQL insertion for critical users
- Add a "safe mode" option that bypasses Supabase Auth API completely

**Files to Create/Update:**
- `src/app/api/users/invite/route.ts` - Add safe mode parameter
- `src/lib/auth/direct-invitation.ts` - Enhance user creation logic

### 2.2. Implement CSV Fallback UI Component

**Action Items:**
- Create a UI component that shows when invitation API fails
- Add CSV download functionality for batch user imports
- Include instructions for manual import through Supabase dashboard

**Files to Create:**
- `src/components/invitation/csv-fallback.tsx`
- `src/components/invitation/import-instructions.tsx`

### 2.3. Enhance Logging and Monitoring

**Action Items:**
- Create a dedicated table for tracking invitation attempts
- Add detailed logging for each step of the invitation process
- Implement a dashboard for viewing invitation status

**Files to Create/Update:**
- `migrations/create-invitation-log-table.sql`
- `src/lib/auth/invitation-logger.ts`
- `src/app/dashboard/admin/invitations/page.tsx`

## Phase 3: Comprehensive Solution (1-2 Weeks)

### 3.1. Implement Custom Invitation Queue

**Action Items:**
- Create a queue-based invitation system that processes invitations asynchronously
- Implement retry logic with configurable delays
- Add email notification when backend invitation succeeds

**Files to Create:**
- `src/lib/auth/invitation-queue.ts`
- `src/app/api/users/invitation-queue/route.ts`
- `migrations/create-invitation-queue-table.sql`

### 3.2. Build Alternative Authentication Integration

**Action Items:**
- Research alternative authentication options (Auth0, Clerk, custom)
- Create a proof-of-concept implementation
- Plan migration path from Supabase Auth

**Files to Create:**
- `docs/auth-alternatives-research.md`
- `src/lib/auth/alternative-provider.ts` (POC)

### 3.3. Implement User Email Verification Bypass

**Action Items:**
- Create a mechanism to mark users as verified without email verification
- Implement admin-level verification override
- Add UI for administrators to manually verify users

**Files to Create/Update:**
- `src/app/api/users/verify/route.ts`
- `src/app/dashboard/admin/users/verify/page.tsx`

## Testing Plan

### Unit Tests

- Test fallback mechanism with different error scenarios
- Verify CSV export/import functionality
- Test queue system with simulated failures

### Integration Tests

- End-to-end invitation flow testing
- Verify email delivery through Supabase and alternative methods
- Test admin verification process

### Production Verification

- Monitor invitation success rates before and after changes
- Gather metrics on fallback mechanism usage
- Track user onboarding completion rates

## Rollout Strategy

1. Deploy Phase 1 changes immediately to address critical failures
2. Test Phase 2 changes in staging environment for 3-5 days before production deployment
3. Develop Phase 3 changes with careful testing and gradual rollout
4. Maintain backward compatibility throughout all phases

## Success Criteria

- 95%+ success rate for user invitations
- Clear error messages and recovery paths for any failures
- Administrator ability to manually resolve invitation issues
- Comprehensive logging for all invitation attempts 