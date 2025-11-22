import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

// Query keys
export const contentQueryKeys = {
  all: ['content'] as const,
  lists: () => [...contentQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...contentQueryKeys.lists(), filters] as const,
  details: () => [...contentQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...contentQueryKeys.details(), id] as const,
};

interface ContentFilters {
  brandId?: string;
  status?: string;
  query?: string;
}

interface Content {
  id: string;
  title: string;
  brand_id: string;
  brand_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Add other content fields as needed
}

// Fetch content list
export function useContentList(filters: ContentFilters = {}) {
  return useQuery({
    queryKey: contentQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await apiFetch(`/api/content?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      return data.data as Content[];
    },
  });
}

// Fetch single content
export function useContent(id: string) {
  return useQuery({
    queryKey: contentQueryKeys.detail(id),
    queryFn: async () => {
      const response = await apiFetch(`/api/content/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      return data.data as Content;
    },
    enabled: !!id,
  });
}

// Create content mutation
export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentData: any) => {
      const response = await apiFetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(contentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create content');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate content list queries
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.lists() });
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update content mutation
export function useUpdateContent(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentData: any) => {
      const response = await apiFetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(contentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update content');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both the specific content and the list
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.lists() });
      toast.success('Content updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete content mutation
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/content/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete content');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: contentQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.lists() });
      toast.success('Content deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}