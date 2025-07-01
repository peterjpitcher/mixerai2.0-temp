'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, WorkflowIcon, Loader2, Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDate } from '@/lib/utils/date';
import { touchFriendly } from '@/lib/utils/touch-target';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { apiFetch } from '@/lib/api-client';

interface ClaimsWorkflow {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    role: string;
    approval_required: boolean;
  }>;
  steps_count: number;
  created_at: string;
  updated_at: string;
  description?: string;
}

export default function ClaimsWorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<ClaimsWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ClaimsWorkflow | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/claims/workflows');
      const apiResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to fetch claims workflows');
      }
      
      setWorkflows(apiResponse.data || []);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to load claims workflows. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setWorkflows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/claims/workflows/${workflowToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Claims workflow "${workflowToDelete.name}" deleted successfully.`);
        setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));
      } else {
        toast.error(data.error || 'Failed to delete claims workflow.');
      }
    } catch {
      toast.error('An error occurred while deleting the claims workflow.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setWorkflowToDelete(null);
    }
  };

  // Define columns for the data table
  const columns: DataTableColumn<ClaimsWorkflow>[] = [
    {
      id: "name",
      header: "Workflow",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "steps_count",
      header: "Steps",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.steps_count} step{row.steps_count !== 1 ? 's' : ''}
        </Badge>
      ),
      enableSorting: true,
      sortingFn: (a, b) => a.steps_count - b.steps_count,
    },
    {
      id: "updated_at",
      header: "Modified",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.updated_at || row.created_at)}
        </span>
      ),
      enableSorting: true,
      sortingFn: (a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateA - dateB;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={touchFriendly('tableAction')}
            >
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/claims/workflows/${row.id}/edit`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/claims/workflows/${row.id}/edit`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setWorkflowToDelete(row);
                setShowDeleteDialog(true);
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[100px]",
    },
  ];

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-destructive">
        <AlertTriangle size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to Load Claims Workflows</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-muted-foreground">
        <WorkflowIcon size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">No Claims Workflows Yet</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        Get started by creating your first claims approval workflow.
      </p>
      <Button asChild>
        <Link href="/dashboard/claims/workflows/new">Create Claims Workflow</Link>
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" }, 
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Workflows" }
        ]} />
        <PageHeader
          title="Claims Workflows"
          description="Manage approval workflows for claims validation."
          actions={
            <Button asChild>
              <Link href="/dashboard/claims/workflows/new">
                <Plus className="mr-2 h-4 w-4" /> Create Workflow
              </Link>
            </Button>
          }
        />
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Workflows" }
      ]} />
      <PageHeader
        title="Claims Workflows"
        description="Manage approval workflows for claims validation."
        actions={
          <Button asChild>
            <Link href="/dashboard/claims/workflows/new">
              <Plus className="mr-2 h-4 w-4" /> Create Workflow
            </Link>
          </Button>
        }
      />
      
      {error ? (
        <ErrorState />
      ) : workflows.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable
          columns={columns}
          data={workflows}
          searchKey="name"
          searchPlaceholder="Search workflows by name..."
          onRowClick={(row) => router.push(`/dashboard/claims/workflows/${row.id}/edit`)}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <h3 className="text-xl font-bold mb-2">No workflows found</h3>
              <p className="text-muted-foreground mb-4">No workflows match your search criteria.</p>
            </div>
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      {workflowToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the claims workflow &quot;{workflowToDelete.name}&quot;.
                Any claims using this workflow will need to be updated. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWorkflow} disabled={isDeleting} className="bg-destructive hover:bg-destructive text-destructive-foreground">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}