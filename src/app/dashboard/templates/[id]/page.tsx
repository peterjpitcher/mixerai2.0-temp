'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TemplateForm } from '@/components/template/template-form';
import { Loader2, ArrowLeft, Trash2, ShieldAlert, AlertTriangle } from 'lucide-react';
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
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import type { ContentTemplate } from '@/types/template';
import { apiFetch } from '@/lib/api-client';
import { useTemplateSession } from '../use-template-session';
import { isSystemTemplateId } from '@/lib/templates/system-templates';

const SessionErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
    <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
    <h3 className="text-xl font-bold mb-2">Unable to verify your access</h3>
    <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

// Default templates data for system templates
const defaultTemplates = {
  'article-template': {
    id: 'article-template',
    name: 'Basic Article Template',
    description: 'A simple article template with title, body, and metadata',
    fields: {
      inputFields: [
        {
          id: 'title',
          name: 'Title',
          type: 'shortText',
          required: true,
          options: { maxLength: 100 },
          aiSuggester: true,
          aiPrompt: 'Suggest a catchy title based on the article topic and brand voice.'
        },
        {
          id: 'topic',
          name: 'Topic',
          type: 'shortText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'keywords',
          name: 'Keywords',
          type: 'tags',
          required: false,
          options: { maxTags: 5 },
          aiSuggester: true,
          aiPrompt: 'Suggest relevant SEO keywords for this article about {{topic}}.'
        }
      ],
      outputFields: [
        {
          id: 'body',
          name: 'Article Body',
          type: 'richText',
          required: true,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'Write an informative article about {{topic}} using the keywords {{keywords}}.'
        },
        {
          id: 'meta-description',
          name: 'Meta Description',
          type: 'plainText',
          required: false,
          options: { maxLength: 160 },
          aiAutoComplete: true,
          aiPrompt: 'Write an SEO-optimized meta description for an article about {{topic}}.'
        }
      ]
    }
  },
  'product-template': {
    id: 'product-template',
    name: 'Product Description Template',
    description: 'Template for creating product descriptions with features and benefits',
    fields: {
      inputFields: [
        {
          id: 'product-name',
          name: 'Product Name',
          type: 'shortText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'category',
          name: 'Product Category',
          type: 'select',
          required: true,
          options: { choices: ['Electronics', 'Clothing', 'Home Goods', 'Beauty', 'Food'] },
          aiSuggester: false
        },
        {
          id: 'features',
          name: 'Key Features',
          type: 'longText',
          required: true,
          options: {},
          aiSuggester: false
        },
        {
          id: 'target-audience',
          name: 'Target Audience',
          type: 'shortText',
          required: false,
          options: {},
          aiSuggester: true,
          aiPrompt: 'Suggest target audiences for a {{category}} product named {{product-name}}.'
        }
      ],
      outputFields: [
        {
          id: 'short-description',
          name: 'Short Description',
          type: 'plainText',
          required: true,
          options: { maxLength: 200 },
          aiAutoComplete: true,
          aiPrompt: 'Write a short, compelling product description for {{product-name}} highlighting the main features.'
        },
        {
          id: 'long-description',
          name: 'Long Description',
          type: 'richText',
          required: true,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'Write a detailed product description for {{product-name}} with these key features: {{features}}. Target audience: {{target-audience}}.'
        },
        {
          id: 'benefits',
          name: 'Key Benefits',
          type: 'plainText',
          required: false,
          options: {},
          aiAutoComplete: true,
          aiPrompt: 'List the main benefits of {{product-name}} for the {{target-audience}}.'
        }
      ]
    }
  }
};

/**
 * TemplateEditPage allows users to view and modify a specific content template.
 * It handles both system-defined default templates (like 'article-template') and
 * user-created templates fetched from an API.
 * The core editing functionality is provided by the `TemplateForm` component.
 */
export default function TemplateEditPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewMode = searchParams?.get('mode') === 'view';
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    user: currentUser,
    isLoading: isLoadingUser,
    error: sessionError,
    status: sessionStatus,
    refetch: refetchSession,
  } = useTemplateSession();

  const userRole = currentUser?.user_metadata?.role;
  const canEditTemplate = userRole === 'admin'; // Only admins can edit/delete templates
  const canViewTemplate = userRole === 'admin' || userRole === 'editor' || userRole === 'viewer';
  const defaultTemplateDefinition = defaultTemplates[id as keyof typeof defaultTemplates];
  const isSystemTemplate = isSystemTemplateId(id);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      toast.error('Template ID is missing.');
      return;
    }

    if (isLoadingUser) {
      return;
    }

    if (sessionError && sessionStatus !== 403) {
      setLoading(false);
      return;
    }

    if (!currentUser || !canViewTemplate) {
      setLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      setLoading(true);

      if (defaultTemplateDefinition) {
        setTemplate(defaultTemplateDefinition as Record<string, unknown>);
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch(`/api/content-templates/${id}`, {
          retry: 1,
          retryDelayMs: 300,
        });
        const data = await response.json() as {
          success: boolean;
          template?: Record<string, unknown> & {
            fields?: {
              inputFields?: unknown[];
              outputFields?: unknown[];
            };
            inputFields?: unknown[];
            outputFields?: unknown[];
          };
          error?: string;
        };

        if (data.success && data.template) {
          const templateFields = data.template.fields ?? {
            inputFields: Array.isArray(data.template.inputFields) ? data.template.inputFields : [],
            outputFields: Array.isArray(data.template.outputFields) ? data.template.outputFields : [],
          };

          setTemplate({
            ...data.template,
            fields: {
              inputFields: Array.isArray(templateFields.inputFields) ? templateFields.inputFields : [],
              outputFields: Array.isArray(templateFields.outputFields) ? templateFields.outputFields : [],
            },
          });
        } else {
          setTemplate(null);
          toast.error(data.error || 'Template not found.');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        toast.error('Failed to load template details.');
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchTemplate();
  }, [
    id,
    isLoadingUser,
    currentUser,
    canViewTemplate,
    sessionError,
    sessionStatus,
    defaultTemplateDefinition,
  ]);

  if (isLoadingUser || (loading && !sessionError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading template data...</p>
      </div>
    );
  }

  if (!isLoadingUser && sessionError && sessionStatus !== 403) {
    return <SessionErrorState message={sessionError} onRetry={() => void refetchSession()} />;
  }

  const isForbidden =
    !isLoadingUser &&
    (sessionStatus === 403 || (!!currentUser && !canViewTemplate));

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">
          {sessionStatus === 403
            ? sessionError || 'You do not have permission to view this Content Template.'
            : 'You do not have permission to view this Content Template.'}
        </p>
        <Link href="/dashboard/templates">
          <Button variant="outline" className="mt-4">Back to Templates</Button>
        </Link>
      </div>
    );
  }
  
  if (!template && !loading) { // If not loading and template is still null (e.g. API error, not found)
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-orange-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Template Not Found</h3>
        <p className="text-muted-foreground">The template you are looking for could not be found.</p>
        <Link href="/dashboard/templates">
          <Button variant="outline" className="mt-4">Back to Templates</Button>
        </Link>
      </div>
    );
  }

  const handleOpenDeleteDialog = () => {
    if (!canEditTemplate || isSystemTemplate) {
        toast.error(isSystemTemplate ? "System templates cannot be deleted." : "You don't have permission to delete templates.");
        return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!canEditTemplate || isSystemTemplate) {
        toast.error(isSystemTemplate ? "System templates cannot be deleted." : "You don't have permission to delete templates.");
        setIsDeleting(false);
        setShowDeleteDialog(false);
        return;
    }
    if (!template || isSystemTemplateId(String(template.id))) {
      toast.error('System templates cannot be deleted.');
      return;
    }
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/content-templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(`Template "${template.name}" deleted successfully.`);
        router.push('/dashboard/templates');
      } else {
        toast.error(data.error || 'Failed to delete template.');
      }
    } catch {
      toast.error('An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: String(template?.name || id) }
      ]} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/templates')}
            aria-label="Back to Templates"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{String(template?.name || (isViewMode ? 'View Template' : 'Edit Template'))}</h1>
            <p className="text-muted-foreground mt-1">
              {isViewMode ? 'View the fields and settings for this template.' : 'Modify the fields and settings for this template.'}
            </p>
          </div>
        </div>
        {canEditTemplate && !isSystemTemplate && !isViewMode && (
          <Button variant="destructive" onClick={handleOpenDeleteDialog} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Template
          </Button>
        )}
      </div>

      {/* Pass isReadOnly prop to TemplateForm based on user permissions or view mode */}
      <TemplateForm 
        initialData={template as unknown as ContentTemplate | undefined} 
        isReadOnly={!canEditTemplate || !!isSystemTemplate || isViewMode}
      />

      {canEditTemplate && !isSystemTemplate && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the template &quot;{String(template?.name || 'this template')}&quot;. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive text-destructive-foreground">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 
