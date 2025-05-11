'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { useToast } from '@/components/toast-provider';
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

// export const metadata: Metadata = {
//   title: 'Edit Template | MixerAI 2.0',
//   description: 'Modify and configure an existing content template.',
// };

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
  const { toast } = useToast();
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
          toast({
            title: 'Error',
            description: data.error || 'Failed to load the template.',
            variant: 'destructive',
          });
          // console.log('Redirecting to templates page due to API error');
          router.push('/dashboard/templates');
        }
      } catch (error) {
        // console.error('Error fetching template:', error);
        toast({
          title: 'Error',
          description: 'Failed to load the template.',
          variant: 'destructive',
        });
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
      toast({
        title: 'Error',
        description: 'Template ID is required.',
        variant: 'destructive',
      });
      router.push('/dashboard/templates');
    }
  }, [id, router, toast]);

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
      toast({
        title: 'Error',
        description: 'System templates cannot be deleted.',
        variant: 'destructive',
      });
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
        toast({
          title: 'Success',
          description: 'Template deleted successfully.',
        });
        router.push('/dashboard/templates');
        setShowDeleteDialog(false);
      } else {
        // Specific error from API (e.g., template in use)
        setDeleteError(data.error || 'Failed to delete template.');
        // Keep dialog open to show the error
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the template.',
        variant: 'destructive',
      });
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
        <PageHeader
          title="Edit Template"
          description="Modify your content template configuration."
          actions={
            <Link href="/dashboard/templates">
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
          }
        />
        <div className="p-4 border border-destructive bg-destructive/10 text-destructive rounded-md">
          <p>Error: Template data could not be loaded or template not found.</p>
        </div>
      </div>
    );
  }

  const isSystemTemplate = id === 'article-template' || id === 'product-template';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title={`Edit ${template?.name || 'Template'}`}
        description="Modify your content template configuration."
        actions={
          <div className="flex space-x-2">
            <Link href="/dashboard/templates">
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Templates
              </Button>
            </Link>
            {!isSystemTemplate && (
              <Button variant="destructive" onClick={handleOpenDeleteDialog}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Template
              </Button>
            )}
          </div>
        }
      />
      
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
                `This action will permanently delete the template "${template?.name}". This cannot be undone.`
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