# Breadcrumb Navigation Component

This document describes the standardized breadcrumb navigation component for MixerAI 2.0.

## Overview

The `BreadcrumbNav` component provides a consistent breadcrumb navigation experience across the application with support for:
- Schema.org structured data
- Responsive design with mobile optimization
- Automatic truncation for long paths
- Icon support
- Customizable separators
- Accessibility features

## Component Location

**Primary Component**: `/src/components/ui/breadcrumb-nav.tsx`

**Legacy Wrappers** (for backward compatibility):
- `/src/components/ui/breadcrumbs.tsx`
- `/src/components/dashboard/breadcrumbs.tsx`
- `/src/components/content/breadcrumbs.tsx`

## Basic Usage

```tsx
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

// Simple usage
<BreadcrumbNav 
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Content', href: '/dashboard/content' },
    { label: 'Edit' } // Current page - no href
  ]} 
/>

// With all options
<BreadcrumbNav
  items={items}
  className="mb-6"
  separator={<ChevronRight className="h-4 w-4" />}
  showHome={true}
  maxItems={5}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `BreadcrumbItem[]` | Required | Array of breadcrumb items |
| `className` | `string` | - | Additional CSS classes |
| `separator` | `ReactNode` | `<ChevronRight />` | Separator between items |
| `showHome` | `boolean` | `true` | Auto-prepend Dashboard link |
| `maxItems` | `number` | - | Maximum items to show (with ellipsis) |

## BreadcrumbItem Type

```typescript
interface BreadcrumbItem {
  label: string;              // Display text
  href?: string;             // Link URL (omit for current page)
  icon?: React.ComponentType; // Optional icon component
}
```

## Usage Examples

### Dashboard Pages

```tsx
// In /dashboard/brands/[id]/edit/page.tsx
<BreadcrumbNav
  items={[
    { label: 'Brands', href: '/dashboard/brands' },
    { label: brand.name, href: `/dashboard/brands/${id}` },
    { label: 'Edit' }
  ]}
/>
```

### With Icons

```tsx
import { FileText, Settings } from 'lucide-react';

<BreadcrumbNav
  items={[
    { label: 'Content', href: '/dashboard/content', icon: FileText },
    { label: 'Settings', icon: Settings }
  ]}
/>
```

### Mobile-Friendly

```tsx
import { ResponsiveBreadcrumbNav } from '@/components/ui/breadcrumb-nav';

// Automatically shows only last 2 items on mobile
<ResponsiveBreadcrumbNav items={items} />
```

### Custom Separator

```tsx
// Using forward slash
<BreadcrumbNav
  items={items}
  separator="/"
  showHome={false}
/>

// Using custom component
<BreadcrumbNav
  items={items}
  separator={<span className="mx-2">→</span>}
/>
```

## Migration Guide

### From Inline Breadcrumbs

**Before:**
```tsx
const Breadcrumbs = ({ items }) => (
  <nav className="mb-4">
    {/* Custom implementation */}
  </nav>
);

<Breadcrumbs items={items} />
```

**After:**
```tsx
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

<BreadcrumbNav 
  items={items} 
  className="mb-4"
  showHome={false}
  separator="/"
/>
```

### From Legacy Components

**Before:**
```tsx
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

<Breadcrumbs items={items} className="custom-class" />
```

**After:**
```tsx
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

<BreadcrumbNav items={items} className="custom-class" showHome={false} />
```

## Styling

The component uses Tailwind CSS classes and follows the design system:
- Text color: `text-muted-foreground` for links
- Active page: `text-foreground font-medium`
- Hover state: `hover:text-foreground`
- Responsive padding and spacing

### Custom Styling

```tsx
<BreadcrumbNav
  items={items}
  className="text-xs opacity-80" // Override default styles
/>
```

## Accessibility

- Proper ARIA labels (`aria-label="Breadcrumb"`)
- Semantic HTML with `<nav>` and `<ol>` elements
- Schema.org structured data for SEO
- Keyboard navigation support
- Screen reader friendly

## Best Practices

1. **Current Page**: Don't include `href` for the current page
2. **Labels**: Keep labels concise but descriptive
3. **Hierarchy**: Reflect actual site hierarchy
4. **Consistency**: Use the same structure across similar pages
5. **Home Link**: Use `showHome={true}` for dashboard pages

## Common Patterns

### Content Editing
```tsx
<BreadcrumbNav
  items={[
    { label: 'Content', href: '/dashboard/content' },
    { label: content.title, href: `/dashboard/content/${id}` },
    { label: 'Edit' }
  ]}
/>
```

### Settings Pages
```tsx
<BreadcrumbNav
  items={[
    { label: 'Account', href: '/dashboard/account' },
    { label: 'Security Settings' }
  ]}
/>
```

### Multi-Level Navigation
```tsx
<BreadcrumbNav
  items={[
    { label: 'Claims', href: '/dashboard/claims' },
    { label: 'Products', href: '/dashboard/claims/products' },
    { label: product.name, href: `/dashboard/claims/products/${id}` },
    { label: 'Edit' }
  ]}
  maxItems={4} // Show ellipsis if more than 4
/>
```

## Troubleshooting

### Breadcrumbs Not Showing
- Check if items array is empty
- Verify `showHome` prop if expecting Dashboard link
- Check CSS classes for display issues

### Links Not Working
- Ensure `href` is provided for clickable items
- Verify routes exist in Next.js
- Check for navigation blockers

### Styling Issues
- Check for conflicting CSS classes
- Verify Tailwind classes are being applied
- Use browser DevTools to inspect elements