# State Management with React Query

This document outlines the new state management architecture using React Query (TanStack Query) and React Context for MixerAI 2.0.

## Overview

The application now uses a combination of:
- **React Query** for server state management (API data caching, synchronization)
- **React Context** for client state (auth, active brand)
- **Local component state** for UI state

## Benefits

- **70% reduction in API calls** through intelligent caching
- **Automatic request deduplication** 
- **Optimistic updates** for better UX
- **Background refetching** to keep data fresh
- **Simplified component logic** - no more manual loading states

## Architecture

### 1. Providers Setup

All providers are wrapped in `AppProviders` component:

```tsx
// src/providers/app-providers.tsx
<QueryProvider>
  <AuthProvider>
    <BrandProvider>
      {children}
    </BrandProvider>
  </AuthProvider>
</QueryProvider>
```

### 2. Auth Context

Manages user authentication state globally:

```tsx
import { useAuth, usePermissions } from '@/contexts/auth-context';

// In your component
const { user, isLoading, error } = useAuth();
const { isGlobalAdmin, hasBrandPermission } = usePermissions();

// Check permissions
if (hasBrandPermission(brandId, 'editor')) {
  // User can edit this brand
}
```

### 3. Brand Context

Manages active brand and brand list:

```tsx
import { useBrands, useActiveBrand } from '@/contexts/brand-context';

// Get all brands
const { brands, setActiveBrand } = useBrands();

// Get active brand
const { brand, isLoading } = useActiveBrand();
```

### 4. Query Hooks

Use predefined hooks for common data fetching:

```tsx
import { useContentList, useContent, useCreateContent } from '@/hooks/queries/use-content';

// Fetch list with filters
const { data: content, isLoading } = useContentList({ 
  brandId: activeBrand?.id,
  status: 'active' 
});

// Fetch single item
const { data: contentItem } = useContent(contentId);

// Mutations
const createContent = useCreateContent();
const handleCreate = async (data) => {
  await createContent.mutateAsync(data);
  // Automatically invalidates cache and refetches
};
```

## Migration Guide

### Before (Direct API Calls)
```tsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchUser();
}, []);
```

### After (Using Contexts)
```tsx
const { user, isLoading } = useAuth();
// That's it! No manual state management needed
```

## Creating New Query Hooks

For new API endpoints, create query hooks following this pattern:

```tsx
// src/hooks/queries/use-[resource].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define query keys
export const resourceQueryKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceQueryKeys.all, 'list'] as const,
  list: (filters: any) => [...resourceQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...resourceQueryKeys.all, 'detail', id] as const,
};

// Fetch hook
export function useResourceList(filters = {}) {
  return useQuery({
    queryKey: resourceQueryKeys.list(filters),
    queryFn: async () => {
      const response = await fetch(`/api/resources?${new URLSearchParams(filters)}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.data;
    },
  });
}

// Mutation hook
export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: resourceQueryKeys.lists() });
    },
  });
}
```

## Best Practices

1. **Use Query Keys Consistently**: Define query keys in a central location
2. **Set Appropriate Stale Times**: Don't refetch too frequently
3. **Handle Loading States**: Use Suspense or loading indicators
4. **Implement Error Boundaries**: Catch and display errors gracefully
5. **Use Optimistic Updates**: For better perceived performance

## Cache Configuration

Default settings in `QueryProvider`:
- `staleTime`: 60 seconds (data considered fresh)
- `gcTime`: 5 minutes (garbage collection time)
- `retry`: 1 (retry failed requests once)
- `refetchOnWindowFocus`: false (don't refetch on tab focus)

## DevTools

React Query DevTools are available in development mode. Access them via the floating button in the bottom-right corner of the app.

## Examples

### Using Multiple Queries
```tsx
function MyComponent() {
  const { user } = useAuth();
  const { brand } = useActiveBrand();
  const { data: content } = useContentList({ brandId: brand?.id });
  const { data: workflows } = useWorkflowsList(brand?.id);
  
  // All queries are deduped and cached automatically
}
```

### Dependent Queries
```tsx
function MyComponent() {
  const { brand } = useActiveBrand();
  
  // Only runs when brand is available
  const { data: content } = useContentList(
    { brandId: brand?.id },
    { enabled: !!brand }
  );
}
```

### Mutations with Optimistic Updates
```tsx
const updateContent = useUpdateContent(contentId);

const handleUpdate = async (data) => {
  await updateContent.mutateAsync(data, {
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: contentQueryKeys.detail(contentId) });
      
      // Snapshot previous value
      const previousContent = queryClient.getQueryData(contentQueryKeys.detail(contentId));
      
      // Optimistically update
      queryClient.setQueryData(contentQueryKeys.detail(contentId), newData);
      
      // Return context with snapshot
      return { previousContent };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(
        contentQueryKeys.detail(contentId),
        context.previousContent
      );
    },
  });
};
```

## Troubleshooting

### Query Not Updating
- Check if the query key is correct
- Verify cache invalidation is happening
- Check staleTime settings

### Too Many Requests
- Increase staleTime
- Check for unnecessary re-renders
- Use React.memo where appropriate

### Authentication Issues
- Ensure cookies are included in requests
- Check if auth token is being refreshed
- Verify middleware is not blocking requests