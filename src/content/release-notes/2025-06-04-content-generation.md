---
title: "Release: 4 June 2025 - Content Generation"
date: "2025-06-04"
summary: "Major enhancements to content generation capabilities, UI/UX improvements and build stability fixes."
---

## 🎯 Key Features

- **Field Retry Mechanism** – Individual regeneration buttons for each output field. (`09947b7`)
- **Regenerate All** – Option to regenerate entire content including title. (`09947b7`)
- **AI Template Descriptions** – Real Azure OpenAI integration for descriptions.
- **Enhanced Retry Context** – Comprehensive brand context for quality regeneration. (`09947b7`)

## ✨ Improvements

- **Toast Notifications** – Moved to top-right with solid white background. (`2954b5e`)
- **Navigation Highlighting** – Correct active state for “Create Content” items.
- **API Structure** – Flattened template field structure for consistency.
- **Type Safety** – Aligned `ContentTemplate` types across components.
- **Build Stability** – Added `Suspense` boundary for `useSearchParams`.
