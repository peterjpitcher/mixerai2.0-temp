# Components Directory

This directory contains all reusable React components for MixerAI 2.0.

## Structure

- `/ui` - Base UI components (buttons, inputs, cards, etc.) built with shadcn/ui
- `/dashboard` - Dashboard-specific components (navigation, headers, metrics)
- `/content` - Content management components (editors, generators, workflows)
- `/layout` - Layout components (navigation, sidebars, headers)
- `/common` - Shared components used across the application

## Component Guidelines

1. All components should be TypeScript
2. Use functional components with hooks
3. Export components as named exports
4. Include proper TypeScript interfaces for props
5. Follow the established naming conventions
6. Components should be self-contained and reusable

## UI Library

We use shadcn/ui components as our base component library. These are located in `/ui` and are customizable, accessible React components built on Radix UI.