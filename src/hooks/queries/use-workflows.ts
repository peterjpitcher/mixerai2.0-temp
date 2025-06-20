import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Query keys
export const workflowQueryKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowQueryKeys.all, 'list'] as const,
  list: (brandId?: string) => [...workflowQueryKeys.lists(), { brandId }] as const,
  details: () => [...workflowQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowQueryKeys.details(), id] as const,
};

interface Workflow {
  id: string;
  name: string;
  description?: string;
  brand_id: string;
  brand_name?: string;
  template_id?: string;
  status: string;
  created_at: string;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  assignees: string[];
}

// Fetch workflows list
export function useWorkflowsList(brandId?: string) {
  return useQuery({
    queryKey: workflowQueryKeys.list(brandId),
    queryFn: async () => {
      const url = brandId 
        ? `/api/workflows?brandId=${brandId}`
        : '/api/workflows';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      const data = await response.json();
      return data.data as Workflow[];
    },
  });
}

// Fetch single workflow
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowQueryKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }

      const data = await response.json();
      return data.data as Workflow;
    },
    enabled: !!id,
  });
}

// Create workflow mutation
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowData: any) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create workflow');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate workflow lists
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.lists() });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update workflow mutation
export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowData: any) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update workflow');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate both the specific workflow and lists
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.lists() });
      toast.success('Workflow updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete workflow mutation
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete workflow');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: workflowQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowQueryKeys.lists() });
      toast.success('Workflow deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}