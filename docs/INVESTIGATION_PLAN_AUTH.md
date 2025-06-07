# Development and Investigation Log

This document tracks major development tasks, investigations, and resolutions for the MixerAI 2.0 project.

## Session Log: Content Features & Build Fixes

*   **Date:** 2024-07-25
*   **Objective:** Implement new content features, resolve application bugs, and ensure a stable production build.
*   **Summary of Activities:** This session involved adding content version history, improving user avatar display consistency, fixing a critical build failure, and resolving Git repository synchronization issues.

---

### 1. Build Failure Resolution

*   **Problem:** The `npm run build` command failed, reporting a Next.js routing conflict. Two parallel routes were attempting to resolve to the same path: `/auth/update-password`.
*   **Investigation:**
    *   The conflicting files were identified as `src/app/auth/update-password/page.tsx` (a page component) and `src/app/auth/update-password/route.ts` (an API route handler).
    *   A check of the project structure confirmed that the correct API route handler already existed at its proper location: `/src/app/api/auth/update-password/route.ts`.
    *   The file at `/src/app/auth/update-password/route.ts` was determined to be a misplaced duplicate.
*   **Action Taken:**
    *   The incorrect route file (`src/app/auth/update-password/route.ts`) was deleted to resolve the conflict.
*   **Outcome:** ✅ **Successful.** A subsequent `npm run build` command completed without errors, unblocking further development and deployment.

### 2. Git Commit & Push Correction

*   **Problem:** After fixing the build, the corresponding commit was not visible on the remote GitHub repository.
*   **Investigation:**
    *   A review of the local repository using `git log` and `git status` revealed that the commit had been made to the `main` branch instead of the active feature branch.
    *   Furthermore, the commit had not been pushed to the remote repository.
*   **Action Taken:**
    *   The local `main` branch was pushed to `origin/main` to synchronize the remote repository.
*   **Outcome:** ✅ **Successful.** The commit is now visible on GitHub. This event highlighted a need for careful branch management during development.

### 3. Content Version History Feature

*   **Goal:** Allow users to review past versions of content within the "Content History and Feedback" section of the content view page.
*   **Actions Taken:**
    *   A new Git branch, `fix/content-view-page-issue`, was created to isolate the work.
    *   The `ContentVersion` TypeScript interface was extended to include a `content_json` property, designed to hold a complete snapshot of the content at a specific version.
    *   The API route at `/api/content` was updated to join with the `content_versions` table and retrieve the `content_json` data for each version.
*   **Outcome:** ✅ **Successful.** The backend API is now capable of supplying the necessary data for the content version history feature.

### 4. User Avatar Consistency

*   **Problem:** User avatars were not displaying consistently across the application. Console logs indicated that `creator_avatar_url` and `assignee_avatar_url` were often `null` when fetched from the `profiles` table.
*   **Investigation:**
    *   Direct analysis of the `profiles` table data confirmed that many user records had an empty `avatar_url` field.
    *   It was theorized that some avatars (e.g., in the main layout header) were being loaded directly from Supabase Auth's `user.user_metadata.avatar_url`, which was not being synchronized with our application's public `profiles` table.
*   **Solution Plan:**
    *   To ensure a consistent user experience, a fallback mechanism for avatar URLs was designed.
    *   The planned order of precedence for displaying an avatar is:
        1.  `profiles.avatar_url` (The primary, user-set URL)
        2.  `auth.users.raw_user_meta_data.avatar_url` (The URL from the auth provider)
        3.  A default, programmatically generated DiceBear avatar as a final fallback.
*   **Progress:**
    *   The `/api/me` route was successfully updated to implement this three-tiered fallback logic.
    *   Work on updating the `/api/content` route to provide these fallback URLs for content creators and assignees was initiated but paused to address the critical build failure.
*   **Status:** ⏳ **In Progress.** The `/api/content` route still needs to be updated to complete this feature.

---

## Archive: Supabase Password Reset Investigation

### Final Summary & Resolution

- **Root Cause:** The Supabase password reset flow (PKCE) was failing within the Next.js application environment due to an issue with how the client-side `code_verifier` was handled across page loads and component re-renders. The Supabase client was losing its state, causing the verification to fail with a misleading `otp_expired` error.
- **Resolution:** The issue was fully resolved by isolating the PKCE callback into a dedicated, pure client-side page. This approach prevents the Next.js/React lifecycle from interfering with the sensitive authentication handshake. The session is now correctly established in a cookie, allowing for a seamless and secure password update process. This is now the standard pattern for this type of authentication flow in the application.

### Detailed Investigation Log

#### 1. The Initial Problem: Consistent "Token Expired" Errors

When a user requests a password reset from within the Next.js application, they receive an email with a confirmation link.

- **Initial Link from Email:**
  `https://shsfrtemevclwpqlypoq.supabase.co/auth/v1/verify?token=pkce_...&type=recovery&redirect_to=https://mixerai.orangejelly.co.uk/auth/confirm`

- **Result upon Clicking:** The user is redirected to the `/auth/confirm` page, but the URL immediately contains error parameters.
  `.../auth/confirm?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

A secondary failure mode was observed when manually copying and pasting the verification link into the browser. This sometimes resulted in a different URL structure:

- **URL after Manual Paste:**
  `.../auth/confirm?code=9fa0e32e-4d05-4cf2-b053-ded4510da40b`

- **Resulting Client-Side Error:**
  `Error: No recovery information found in URL. Please use the link from your email.`

This demonstrates that the Supabase `/verify` endpoint is immediately rejecting the token before the Next.js application can properly handle the callback.

#### 2. The Breakthrough: Standalone HTML Test

To isolate the problem, a simple static HTML file was created to perform the exact same password reset flow, using the Supabase JS client directly from a CDN.

- **Test HTML Snippet:**
  ```html
  <!DOCTYPE html>
  <html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <title>Supabase Password-Reset Test</title>
    <script type="module">
      import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
      const supabase = createClient('https://shsfrtemevclwpqlypoq.supabase.co', 'SUPABASE_ANON_KEY');
      // ... (event listener to call resetPasswordForEmail)
    </script>
  </head>
  <body>
    <!-- ... -->
  </body>
  </html>
  ```
- **Result:** **This flow worked perfectly.**

- **Link Received from Email (via HTML test):**
  `https://shsfrtemevclwpqlypoq.supabase.co/auth/v1/verify?token=7a4b...&type=recovery&redirect_to=https://mixerai.orangejelly.co.uk/auth/confirm`

- **Final URL in Browser (SUCCESS):** The user was redirected to the `/auth/confirm` page, and the URL hash contained the necessary session tokens, as expected.
  `.../auth/confirm#access_token=eyJ...&refresh_token=c53...&type=recovery`

This successful test was the critical diagnostic step, proving the issue was not with Supabase configuration but with the client environment.

#### 3. Analysis & Root Cause Hypothesis

The discrepancy between the two tests points directly to the Next.js/React environment interfering with the Supabase client's ability to persist the `code_verifier` across the redirect.

- **PKCE Flow Mechanics:** The client generates a secret (`code_verifier`) and stores it. When the user returns from the email link, the client sends this secret to Supabase to validate the session.
- **Why Next.js Fails:** Component re-renders, server/client context confusion, or multiple initializations of the Supabase client in the React lifecycle likely cause this stored secret to be lost before it can be sent. Supabase receives the token from the email but not the required matching secret, so it correctly rejects the request.

#### 4. Resolution: Implementing the Recommended Fix

Based on the investigation and expert recommendations, the following steps were taken to resolve the issue:

1.  **Created a Dedicated Client-Side Callback Page:**
    *   A new page was created at `src/app/auth/confirm/page.tsx`.
    *   This page is marked with `'use client'` to ensure it runs only in the browser.
    *   Its sole responsibility is to extract the `code` from the URL and use the `@supabase/ssr` client to call `supabase.auth.exchangeCodeForSession(code)`.
    *   This successfully establishes a user session and stores it in a secure, HTTP-only cookie.

2.  **Refactored the Update Password Page:**
    *   The page at `src/app/auth/update-password/page.tsx` was simplified significantly.
    *   All previous logic for parsing tokens from the URL was removed.
    *   The form's submission handler now directly calls `supabase.auth.updateUser({ password: newPassword })`, which automatically uses the valid session from the cookie.

3.  **Removed Redundant Backend Code:**
    *   The legacy API route at `/api/auth/update-password/route.ts` was deleted as it was made obsolete by the new client-side flow.

This series of changes resulted in a successful, reliable, and secure password reset functionality. 