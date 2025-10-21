---
title: "Release: Brand Creation Workflow Fix"
date: ""
summary: "Critical fixes ensuring administrators can reliably create new brands."
---

## 🐛 Bug Fixes

- **Invalid Role Enum** – Fixed RPC attempting to assign invalid `brand_admin` role. (`7fed487`)
- **Missing Column** – Removed reference to non-existent `created_by` column.
- **Direct Approach** – Replaced faulty RPC with direct Supabase calls for brand creation. (`7fed487`)

## ✨ Improvements

- Two-step process: insert brand record, then assign admin permissions.
- Proper error handling and database schema alignment.
