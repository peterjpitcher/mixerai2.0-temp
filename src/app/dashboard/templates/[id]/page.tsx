'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { toast } from 'sonner';

// export const metadata: Metadata = {
//   title: 'Edit Template | MixerAI 2.0',
//   description: 'Modify and configure an existing content template.',
// };

// Placeholder Breadcrumbs component - to be replaced with actual implementation
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
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
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add debugging logs
  // console.log('Template Edit Page - Params:', params);
  // console.log('Template Edit Page - ID:', id);

  useEffect(() => {
    const fetchTemplate = async () => {
      // console.log('Starting to fetch template with ID:', id);
      setLoading(true);
      setDeleteError(null); // Clear delete error on load

      // Check if this is a default template
      if (id === 'article-template' || id === 'product-template') {
        // console.log('Using default template:', id);
        setTemplate(defaultTemplates[id as keyof typeof defaultTemplates]);
        setLoading(false);
        return;
      }

      // Otherwise, try to fetch from the API
      try {
        // console.log('Fetching template from API for ID:', id);
        const response = await fetch(`/api/content-templates/${id}`);
        const data = await response.json();
        // console.log('API response:', data);

        if (data.success) {
          // console.log('Successfully fetched template:', data.template);
          setTemplate(data.template);
        } else {
          // console.error('Error from API:', data.error);
          toast.error(data.error || 'Failed to load the template.');
          // console.log('Redirecting to templates page due to API error');
          router.push('/dashboard/templates');
        }
      } catch (error) {
        // console.error('Error fetching template:', error);
        toast.error('Failed to load the template.');
        // console.log('Redirecting to templates page due to fetch error');
        router.push('/dashboard/templates');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      // console.log('Template ID is available, fetching template');
      fetchTemplate();
    } else {
      // console.error('No template ID provided');
      toast.error('Template ID is required.');
      router.push('/dashboard/templates');
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const handleOpenDeleteDialog = () => {
    setDeleteError(null); // Clear previous errors
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!id || (id === 'article-template' || id === 'product-template')) {
      toast.error('System templates cannot be deleted.');
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/content-templates/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast('Template deleted successfully.');
        router.push('/dashboard/templates');
        setShowDeleteDialog(false);
      } else {
        // Specific error from API (e.g., template in use)
        setDeleteError(data.error || 'Failed to delete template.');
        // Keep dialog open to show the error
      }
    } catch (error) {
      toast.error('An unexpected error occurred while deleting the template.');
      setShowDeleteDialog(false); // Close dialog on unexpected error
    }
    setIsDeleting(false);
  };

  // Prevent rendering if template is null and not loading (error case handled by useEffect)
  if (!loading && !template) {
    // useEffect should have redirected if there was an error and template is still null
    // This is a fallback to prevent rendering with a null template
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" }, 
          { label: "Content Templates", href: "/dashboard/templates" }, 
          { label: template?.name || (id ? "Loading Template..." : "Edit Template"), href: id ? `/dashboard/templates/${id}` : undefined },
          { label: "Edit" }
        ]} />
        
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p>Error: Template data could not be loaded or template not found.</p>
        </div>
      </div>
    );
  }

  const isSystemTemplate = id === 'article-template' || id === 'product-template';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: template?.name || (id ? "Loading Template..." : "Edit Template"), href: id ? `/dashboard/templates/${id}` : undefined },
        { label: "Edit" }
      ]} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/templates" passHref>
            <Button variant="outline" size="icon" aria-label="Back to Templates">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit: {template?.name || 'Template'}</h1>
            <p className="text-muted-foreground mt-1">Modify your content template configuration.</p>
          </div>
        </div>
        {!isSystemTemplate && (
          <Button variant="destructive" onClick={handleOpenDeleteDialog} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Template
          </Button>
        )}
      </div>
      
      {template && <TemplateForm initialData={template} />}
      {/* AlertDialog for delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteError ? 'Cannot Delete Template' : 'Are you sure you want to delete this template?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? deleteError : 
                `Are you sure you want to delete the template "${template?.name}"? Any content items currently using this template will have it unassigned and their status will be set to 'cancelled'. This action cannot be undone for the template itself.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            )}
            {deleteError && (
              <AlertDialogAction onClick={() => setShowDeleteDialog(false)}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 