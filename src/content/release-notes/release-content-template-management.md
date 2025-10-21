---
title: "Release: Content Template Management"
date: ""
summary: "Fixes for creating and editing content templates with consistent field structures."
---

## 🐛 Bug Fixes

- **Payload Structure** – Fixed inconsistent `inputFields` and `outputFields` handling. (`9c33f24`)
- **API Alignment** – `POST /content-templates` now matches the `PUT` endpoint structure.
- **Field Storage** – Proper reconstruction of nested `fields` object for database. (`9c33f24`)
