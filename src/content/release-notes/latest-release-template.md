---
title: "Release Template"
date: ""
summary: "Placeholder template outlining the structure for future release entries."
---

Use this template to document future releases.

## 🎯 Key Features

- **User Management API** – Fixed database functions for user details fetching and updating.
- **SVG Image Support** – Enabled SVG avatars from `api.dicebear.com` with proper Next.js configuration.

## 🐛 Bug Fixes

- **Database Permissions** – Added `SECURITY DEFINER` clause to fix `auth.users` table access.
- **Column References** – Corrected `raw_user_meta_data` column name (was `raw_app_meta_data`).
- **Role Aliasing** – Fixed `globalRole` alias in `get_user_details` function.
