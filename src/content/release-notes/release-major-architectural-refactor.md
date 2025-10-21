---
title: "Release: Major Architectural Refactor"
date: ""
summary: "Major architectural release resolving systemic security vulnerabilities, performance bottlenecks and stability issues."
---

## 🎯 Key Features

- **Server-Side Authorisation** – Migrated all pages to server components with secure server-side checks.
- **Performance Optimisation** – Eliminated inefficient client-side data fetching patterns.
- **Database Transactions** – Added atomic operations for multi-step API operations.
- **Component Refactoring** – Split monolithic components into manageable child components.

## ✨ Improvements

- **Content API** – Fixed N+1 query making 50+ database calls; now uses bulk fetching.
- **Brand Detail API** – Reduced from six+ queries to a single efficient database function.
- **User Detail API** – Replaced N+1 queries with `get_user_details` function.
- **Centralised Services** – Unified Supabase client initialisation.
