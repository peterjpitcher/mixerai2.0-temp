# Brand Display Guidelines

This document outlines the consistent usage of brand display components across the MixerAI application.

## Overview

To ensure consistent brand representation throughout the application, we use a centralized set of components and utilities for displaying brand information, including logos, names, and associated metadata.

## Core Components

### 1. BrandDisplay
The main component for displaying brand information in various contexts.

```tsx
import { BrandDisplay } from '@/components/ui/brand-display';

// Basic usage
<BrandDisplay
  brand={{
    id: "brand-id",
    name: "Brand Name",
    brand_color: "#2563eb",
    logo_url: "https://...",
    country: "US",
    language: "en"
  }}
  variant="default"
  size="md"
/>
```

#### Variants:
- `default`: Standard display with icon and name
- `compact`: Icon only (with optional tooltip)
- `detailed`: Icon, name, and metadata
- `inline`: Horizontal layout for dropdowns

#### Sizes:
- `sm`: 32px icon, small text
- `md`: 40px icon, base text
- `lg`: 48px icon, large text

### 2. Specialized Components

#### BrandCell
For use in tables and lists:
```tsx
<BrandCell brand={brandData} onClick={handleClick} />
```

#### BrandHeader
For page headers and prominent displays:
```tsx
<BrandHeader brand={brandData} />
```

#### BrandBadge
For compact displays in tags or badges:
```tsx
<BrandBadge brand={brandData} />
```

### 3. BrandIcon
Low-level component for just the icon/logo:
```tsx
<BrandIcon
  name="Brand Name"
  color="#2563eb"
  logoUrl="https://..."
  size="md"
/>
```

## Utility Functions

### Brand Color Generation
Consistent color generation for brands without custom colors:
```tsx
import { generateBrandColor } from '@/lib/utils/brand-logo';

const color = generateBrandColor("Brand Name"); // Returns consistent hex color
```

### Logo Validation
Check if a logo URL is valid:
```tsx
import { validateLogoUrl } from '@/lib/utils/brand-logo';

const isValid = await validateLogoUrl(logoUrl);
```

## Usage Guidelines

### 1. In Lists and Tables
Always use `BrandCell` for consistent display:
```tsx
{
  id: "brand",
  header: "Brand",
  cell: ({ row }) => (
    <BrandCell 
      brand={{
        id: row.id,
        name: row.name,
        brand_color: row.brand_color,
        logo_url: row.logo_url
      }}
    />
  )
}
```

### 2. In Dropdowns and Selects
Use `BrandDisplay` with `inline` variant:
```tsx
<SelectItem value={brand.id}>
  <BrandDisplay
    brand={brand}
    variant="inline"
    size="sm"
  />
</SelectItem>
```

### 3. In Headers and Navigation
Use `ActiveBrandIndicator` or `BrandHeader`:
```tsx
<ActiveBrandIndicator
  brandName={brand.name}
  brandColor={brand.brand_color}
  brandLogoUrl={brand.logo_url}
/>
```

### 4. In Cards and Widgets
Use `BrandDisplay` with appropriate variant:
```tsx
<BrandDisplay
  brand={brand}
  variant="compact"
  size="sm"
  showTooltip
/>
```

## Data Structure

Always ensure brand data follows this structure:
```typescript
interface BrandData {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
  country?: string | null;
  language?: string | null;
}
```

## Logo Requirements

1. **Formats**: JPEG, PNG, WebP, SVG
2. **Recommended Size**: 512x512px minimum
3. **Aspect Ratio**: Square (1:1) preferred
4. **File Size**: Max 5MB
5. **Background**: Transparent preferred for non-rectangular logos

## Fallback Behavior

When a brand doesn't have a logo:
1. Display the first letter of the brand name
2. Use a consistent background color generated from the brand name
3. Maintain the same size and styling as logo displays

## Performance Considerations

1. **Image Optimization**: Logos are automatically optimized except for Supabase URLs
2. **Lazy Loading**: Logos outside viewport are lazy-loaded
3. **Caching**: Brand data is cached for 5 minutes
4. **Preloading**: Use `preloadBrandLogos()` for critical brand logos

## Accessibility

1. All brand logos include proper alt text
2. Color contrast is maintained for fallback displays
3. Interactive elements have appropriate ARIA labels
4. Tooltips provide additional context when needed

## Examples

### Dashboard Widget
```tsx
<div className="flex items-center gap-2">
  <BrandDisplay
    brand={task.brand}
    variant="compact"
    size="sm"
  />
  <span>{task.title}</span>
</div>
```

### Brand Selection
```tsx
<BrandSelector
  brands={brands}
  selectedBrand={selectedBrandId}
  onBrandChange={handleBrandChange}
/>
```

### Content Header
```tsx
<ContentHeader
  templateName="Article"
  activeBrand={{
    id: brand.id,
    name: brand.name,
    brand_color: brand.brand_color,
    logo_url: brand.logo_url
  }}
/>
```

## Migration Guide

To update existing code:

1. Replace `<BrandIcon>` with `<BrandDisplay>` for most uses
2. Update prop names: `logoUrl` → `logo_url`, `color` → `brand_color`
3. Use specialized components (`BrandCell`, `BrandBadge`) where appropriate
4. Ensure brand data structure matches the interface

## Testing

When testing brand displays:
1. Test with and without logos
2. Test with long brand names
3. Test with invalid logo URLs
4. Verify fallback colors are consistent
5. Check responsive behavior