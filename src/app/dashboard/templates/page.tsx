'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlusCircle, LayoutTemplate, ShieldAlert, Copy, Eye, Edit, Trash2, MoreVertical, Pencil, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { touchFriendly } from '@/lib/utils/touch-target';
import type { InputField, OutputField } from '@/types/template';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { apiFetch } from '@/lib/api-client';

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: InputField[];
    outputFields: OutputField[];
  };
  icon?: string | null;
  brand_id?: string | null;
  usageCount?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Define UserSessionData interface (if not already defined or imported)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; // Global role e.g., 'admin', 'editor'
    full_name?: string;
  };
  brand_permissions?: Array<{ // Brand-specific permissions (not directly used here but good for consistency)
    brand_id: string;
    role: string;
  }>;
}

/**
 * TemplatesPage component.
 * Displays a list of available content templates, allowing users to view, 
 * manage, and create new content based on these templates.
 */
export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          toast.error(data.error || 'Could not verify your session.');
        }
      } catch (err: unknown) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const userRole = currentUser?.user_metadata?.role;
  const userBrandPermissions = currentUser?.brand_permissions || [];
  const isAdmin = userRole === 'admin';
  const isEditor = userRole === 'editor';
  const canViewTemplates = isAdmin || isEditor;

  useEffect(() => {
    if (isLoadingUser) {
      return;
    }

    if (!currentUser || !canViewTemplates) {
      setLoading(false);
      return;
    }

    const fetchTemplates = async () => {
      try {
        setLoading(true);

        const response = await fetch('/api/content-templates');
        const data = await response.json();

        if (data.success && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        } else {
          setTemplates([]);
          if (!data.success) {
            toast.error('Error Loading Templates', {
              description: data.error || 'An unknown error occurred while fetching templates.',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load templates. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [isLoadingUser, currentUser, canViewTemplates]);

  const generateFieldId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `field_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const deepClone = <T,>(value: T): T => {
    if (value === undefined || value === null) {
      return value;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to deep clone value during template duplication; returning original reference.', error);
      return value;
    }
  };

  const isSlugOptions = (options: unknown): options is { sourceField?: string } => {
    return Boolean(options && typeof options === 'object' && 'sourceField' in (options as Record<string, unknown>));
  };

  const hasFieldsMapping = (
    options: unknown
  ): options is { fieldsMapping?: Record<string, string | undefined> } => {
    return Boolean(options && typeof options === 'object' && 'fieldsMapping' in (options as Record<string, unknown>));
  };

  const cloneTemplateFieldSets = (template: Template) => {
    const originalInputFields = template.fields?.inputFields || [];
    const originalOutputFields = template.fields?.outputFields || [];
    const idMap = new Map<string, string>();

    for (const field of [...originalInputFields, ...originalOutputFields]) {
      idMap.set(field.id, generateFieldId());
    }

    const remapId = (maybeId?: string | null) => {
      if (!maybeId) return maybeId;
      return idMap.get(maybeId) ?? maybeId;
    };

    const clonedInputFields = originalInputFields.map((field) => {
      const clonedOptions = deepClone(field.options);

      if (field.type === 'slug' && isSlugOptions(clonedOptions) && clonedOptions.sourceField) {
        clonedOptions.sourceField = remapId(clonedOptions.sourceField) ?? clonedOptions.sourceField;
      }

      if (
        field.type === 'recipeUrl' &&
        hasFieldsMapping(clonedOptions) &&
        clonedOptions.fieldsMapping
      ) {
        const remappedMapping: Record<string, string | undefined> = {};
        Object.entries(clonedOptions.fieldsMapping).forEach(([key, targetFieldId]) => {
          remappedMapping[key] = remapId(targetFieldId) ?? targetFieldId;
        });
        clonedOptions.fieldsMapping = remappedMapping;
      }

      return {
        ...field,
        id: idMap.get(field.id) as string,
        options: clonedOptions,
      };
    });

    const clonedOutputFields = originalOutputFields.map((field) => {
      const clonedOptions = deepClone(field.options);
      return {
        ...field,
        id: idMap.get(field.id) as string,
        options: clonedOptions,
      };
    });

    return { inputFields: clonedInputFields, outputFields: clonedOutputFields };
  };

  const handleDuplicateTemplate = async (templateToDuplicate: Template) => {
    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
      toast.error('You do not have permission to duplicate templates.');
      return;
    }
    setIsDuplicating(templateToDuplicate.id);
    try {
      // Check if template has valid field structure
      if (!templateToDuplicate.fields?.inputFields || !templateToDuplicate.fields?.outputFields) {
        toast.error('Template structure is invalid for duplication');
        return;
      }

      const clonedFields = cloneTemplateFieldSets(templateToDuplicate);

      const newTemplateData = {
        name: `Copy of ${templateToDuplicate.name}`,
        description: templateToDuplicate.description,
        icon: templateToDuplicate.icon,
        // Deep-cloned field sets with safe ID remapping
        inputFields: clonedFields.inputFields,
        outputFields: clonedFields.outputFields,
        brand_id: templateToDuplicate.brand_id,
      };

      const response = await apiFetch('/api/content-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateData),
      });

      const result = await response.json();
      if (result.success && result.template) {
        toast.success(`Template "${result.template.name}" duplicated successfully!`);
        // Add to templates list or refetch for immediate UI update
        // setTemplates(prev => [...prev, result.template]); // simple add
        router.push(`/dashboard/templates/${result.template.id}`); // Navigate to edit page (assuming /id is edit)
      } else {
        throw new Error(result.error || 'Failed to duplicate template.');
      }
    } catch (error: unknown) {
      console.error('Error duplicating template:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while duplicating the template.');
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
      toast.error('You do not have permission to delete templates.');
      return;
    }
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      // Note: System templates (article-template, product-template) are handled on their edit page.
      // This delete is for user-created templates.
      const response = await apiFetch(`/api/content-templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Template "${templateToDelete.name}" deleted successfully.`);
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      } else {
        toast.error(data.error || 'Failed to delete template.');
      }
    } catch {
      toast.error('An error occurred while deleting the template.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const isPlatformAdmin = isAdmin && userBrandPermissions.length === 0;
  const isScopedAdmin = isAdmin && userBrandPermissions.length > 0;
  const isGlobalAdmin = isPlatformAdmin || isScopedAdmin; // Admin users can see templates
  
  // Define columns for the data table
  const columns: DataTableColumn<Template>[] = [
    {
      id: "name",
      header: "Template Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.icon && (
            <span className="text-xl">{row.icon}</span>
          )}
          <span className="font-medium">{row.name}</span>
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "inputFields",
      header: "Input Fields",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.fields.inputFields.length} field{row.fields.inputFields.length !== 1 ? 's' : ''}
        </Badge>
      ),
      enableSorting: true,
      sortingFn: (a, b) => a.fields.inputFields.length - b.fields.inputFields.length,
    },
    {
      id: "outputFields",
      header: "Output Fields",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.fields.outputFields.length} field{row.fields.outputFields.length !== 1 ? 's' : ''}
        </Badge>
      ),
      enableSorting: true,
      sortingFn: (a, b) => a.fields.outputFields.length - b.fields.outputFields.length,
    },
    {
      id: "usageCount",
      header: "Usage",
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-medium">
            {row.usageCount || 0}
          </span>
          <span className="text-sm text-muted-foreground block">
            time{(row.usageCount || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      ),
      enableSorting: true,
      sortingFn: (a, b) => (a.usageCount || 0) - (b.usageCount || 0),
    },
    {
      id: "updated_at",
      header: "Last updated",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.updated_at ? formatDate(row.updated_at) : row.created_at ? formatDate(row.created_at) : 'N/A'}
        </span>
      ),
      enableSorting: true,
      sortingFn: (a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateA - dateB;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={touchFriendly('tableAction')}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/templates/${row.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              {isGlobalAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/templates/${row.id}`);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTemplate(row);
                    }}
                    disabled={isDuplicating === row.id}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateToDelete(row);
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: "w-[120px]",
    },
  ];

  if (isLoadingUser || loading) { // Combined loading state
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Content Templates" }]} />
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Templates</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your content templates for AI-powered content generation
            </p>
          </div>
        </div>
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  if (!canViewTemplates) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to view or manage Content Templates.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Content Templates" }]} />
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your content templates for AI-powered content generation
          </p>
        </div>
        {isGlobalAdmin && (
          <Link href="/dashboard/templates/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        )}
      </div>
      
      {templates.length === 0 && !loading ? (
        <div className="text-center py-10">
          <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground/70" />
          <h3 className="mt-4 text-lg font-medium">No Templates Found</h3>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
              Create your first content template to get started.
          </p>
          {isGlobalAdmin && (
            <Link href="/dashboard/templates/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Template
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={templates}
          searchKey="name"
          searchPlaceholder="Search templates by name..."
          onRowClick={(row) => router.push(`/dashboard/templates/${row.id}`)}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <h3 className="text-xl font-bold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">No templates match your search criteria.</p>
            </div>
          }
        />
      )}

      {/* AlertDialog for delete confirmation */}
      {isGlobalAdmin && templateToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the template &quot;{templateToDelete?.name}&quot;. 
                Any content items using this template may need to be updated. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTemplate}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 
