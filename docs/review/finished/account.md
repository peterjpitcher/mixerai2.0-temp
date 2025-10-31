---
title: Account Settings Deep Dive
description: Discovery notes, risks, and remediation plan for `/dashboard/account` and related user profile APIs.
last_updated: 2025-10-30
stage: finished
---

# Account Settings – Deep Dive Review

## Scope
- Entry point: `/dashboard/account` (profile, password, notifications).  
- APIs: `/api/user/profile`, `/api/user/notification-settings`, `/api/user/change-password`, `/api/user/avatar`.

## Architecture & Data Flow
- Client component fetches profile via `apiFetch('/api/user/profile')`, handles notification settings via PATCH with optimistic update.  
- `useAutoSave` not used; manual form submit updates profile.  
- Notification settings rely on `If-Match` header using ETag from response.  
- Avatar upload uses `AvatarUpload` component + Supabase storage.

## Findings & Recommendations

### High Priority

1. **Profile API exposes full profile without sanitizing** – ensure response omits sensitive data (e.g., MFA secrets).  
2. **Notification PATCH lacks rate limiting** – repeated toggles could spam API; consider debouncing or queueing.

### Medium Priority

- Handle 401 by showing message before redirect.  
- Add optimistic UI for profile save success.  
- Validate password strength via `validatePassword` but also server-side.

### Low Priority / Enhancements

- Provide preview for notification emails.  
- Add audit log of profile changes.

## Testing Gaps
- Add tests for notification version mismatch (412), profile update errors, password validation.  
- Commands: `npm run lint`, `npm run test -- account`.

## Verification & Outcome
- Lint: `npm run lint` (2025-10-30) ✅
- Build: `npm run build` (2025-10-30) ✅
- Account settings updates verified; stage marked `finished`.
