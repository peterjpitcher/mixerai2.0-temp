# Custom React Hooks

This directory contains custom React hooks used throughout MixerAI 2.0.

## Available Hooks

### Data Fetching
- `use-brands.ts` - Fetch and manage brand data
- `use-workflows.ts` - Workflow data management
- `use-content-templates.ts` - Content template operations
- `use-products.ts` - Product data fetching
- `use-ingredients.ts` - Ingredient management
- `use-countries.ts` - Country list fetching

### UI State
- `use-debounce.ts` - Debounce values for search/filter inputs
- `use-mobile.ts` - Detect mobile viewport
- `use-media-query.ts` - Responsive design media queries
- `use-toast.ts` - Toast notification system

### Features
- `use-github.ts` - GitHub integration for issue tracking
- `use-claims.ts` - Claims system operations

## Usage Guidelines

1. All hooks should follow the `use-` prefix convention
2. Hooks should be pure and not cause side effects on mount
3. Use TypeScript for all hook definitions
4. Document complex hooks with JSDoc comments
5. Export hooks as named exports

## Example

```typescript
import { useBrands } from '@/hooks/use-brands';

function MyComponent() {
  const { brands, isLoading, error } = useBrands();
  // ... rest of component
}
```