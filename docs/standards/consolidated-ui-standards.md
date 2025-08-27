# Consolidated UI Standards and Design System

## Overview
This document consolidates all UI standards, component guidelines, and design system documentation for MixerAI 2.0.

## Table of Contents
1. [Core UI Standards](#core-ui-standards)
2. [Component Standards](#component-standards)
3. [Button Standards](#button-standards)
4. [Form Standards](#form-standards)
5. [shadcn/ui Integration](#shadcnui-integration)
6. [Styling Guidelines](#styling-guidelines)
7. [Implementation Standards](#implementation-standards)

---

## Core UI Standards

### Design Principles
- **Consistency**: Use shadcn/ui components as the base
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Responsiveness**: Mobile-first design approach
- **Performance**: Optimize for Core Web Vitals

### Color System
- Follow shadcn/ui theming with CSS variables
- Support light/dark mode
- Maintain contrast ratios ≥ 4.5:1

### Typography
- Use system font stack for performance
- Consistent heading hierarchy
- Readable line heights and spacing

---

## Component Standards

### Base Components Location
All UI components should be in `/src/components/ui/` and follow shadcn/ui patterns.

### Component Structure
```typescript
// Standard component template
export function ComponentName({ className, ...props }: ComponentProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {/* Component content */}
    </div>
  );
}
```

### Required Props
- `className` - For style overrides
- `children` - For content
- Spread `...props` for flexibility

---

## Button Standards

### Action Buttons
Used for primary actions in forms and dialogs.

#### Variants
- **Primary**: Main CTA actions
- **Secondary**: Alternative actions
- **Destructive**: Delete/remove actions
- **Ghost**: Subtle actions
- **Link**: Navigation actions

#### Sizes
- `sm`: Compact interfaces
- `default`: Standard usage
- `lg`: Prominent CTAs

#### Best Practices
- Always include loading states
- Disable during async operations
- Provide clear action labels
- Include icons for clarity when appropriate

### Form Buttons
Special considerations for forms:
- Submit button: Primary variant, right-aligned
- Cancel button: Ghost/secondary variant, left of submit
- Include proper type attributes
- Handle loading and disabled states

---

## Form Standards

### Form Layout
- Use consistent spacing (8px grid)
- Label above input pattern
- Group related fields
- Progressive disclosure for complex forms

### Form Validation
- Real-time validation where appropriate
- Clear error messages below fields
- Success indicators for valid fields
- Summary of errors at form level

### Form Controls
- Use shadcn/ui form components
- Consistent sizing across inputs
- Clear focus states
- Proper ARIA labels

---

## shadcn/ui Integration

### Current Implementation Status
- ✅ Core components integrated
- ✅ Theming system configured
- ✅ Accessibility features enabled
- ⚠️ Some custom components need migration

### Migration Plan
1. Identify non-standard components
2. Replace with shadcn/ui equivalents
3. Maintain backward compatibility
4. Update documentation

### Component Customization
- Extend via `cn()` utility
- Use CSS variables for theming
- Avoid inline styles
- Document custom variants

---

## Styling Guidelines

### CSS Architecture
- Tailwind CSS for utilities
- CSS Modules for complex components
- CSS variables for theming
- No inline styles

### Responsive Design
```css
/* Mobile First Breakpoints */
sm: 640px
md: 768px  
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Spacing System
- Use consistent spacing scale
- 4px base unit
- Multiples of base for all spacing

### Animation Standards
- Subtle, purposeful animations
- Respect prefers-reduced-motion
- Consistent timing functions
- No animation longer than 300ms

---

## Implementation Standards

### File Naming
- Components: PascalCase (UserProfile.tsx)
- Utilities: camelCase (formatDate.ts)
- Styles: kebab-case (user-profile.css)

### Import Organization
```typescript
// 1. External imports
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Internal imports
import { cn } from '@/lib/utils';

// 3. Types
import type { ButtonProps } from './types';

// 4. Styles
import styles from './styles.module.css';
```

### Performance Guidelines
- Lazy load heavy components
- Use React.memo for expensive renders
- Optimize images with next/image
- Code split at route level

### Accessibility Requirements
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA labels and descriptions
- Color contrast compliance

---

## References
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Best Practices](https://react.dev)

---

*This document consolidates: ACTION_BUTTON_STANDARDS.md, FORM_BUTTON_STANDARDS.md, ui-standards.md, ui-standards-review-plan.md, and all shadcn-related documentation.*