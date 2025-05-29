'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { Loader2, ChevronLeft, Trash2, ShieldAlert } from 'lucide-react';
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
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import type { Metadata } from 'next';

// Define UserSessionData interface
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string;
  }>;
}

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
      } catch (err: any) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + err.message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      toast.error('Template ID is missing.');
      // Optionally redirect if ID is crucial and missing from start
      // router.push('/dashboard/templates'); 
      return;
    }

    // Wait for user to be loaded before deciding to fetch template data
    if (isLoadingUser) return;

    // If user is loaded and not an admin, don't fetch template, setLoading to false
    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
      setLoading(false);
      return; 
    }

    const fetchTemplate = async () => {
      setLoading(true);
      if (defaultTemplates[id as keyof typeof defaultTemplates]) {
        setTemplate(defaultTemplates[id as keyof typeof defaultTemplates]);
        setLoading(false);
      } else {
        try {
          const response = await fetch(`/api/content-templates/${id}`);
          const data = await response.json();
          if (data.success && data.template) {
            setTemplate(data.template);
          } else {
            setTemplate(null); // Explicitly set to null if not found or error
            toast.error(data.error || 'Template not found.');
          }
        } catch (error) {
          console.error('Error fetching template:', error);
          toast.error('Failed to load template details.');
          setTemplate(null);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchTemplate();
  }, [id, isLoadingUser, currentUser, router]); // Added router to dependencies due to potential use

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const isSystemTemplate = defaultTemplates[id as keyof typeof defaultTemplates];

  if (isLoadingUser || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading template data...</p>
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to view or manage this Content Template.</p>
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
    if (!isGlobalAdmin || isSystemTemplate) {
        toast.error(isSystemTemplate ? "System templates cannot be deleted." : "You don't have permission to delete templates.");
        return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!isGlobalAdmin || isSystemTemplate) {
        toast.error(isSystemTemplate ? "System templates cannot be deleted." : "You don't have permission to delete templates.");
        setIsDeleting(false);
        setShowDeleteDialog(false);
        return;
    }
    if (!template || template.id === 'article-template' || template.id === 'product-template') {
      toast.error('System templates cannot be deleted.');
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/content-templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(`Template "${template.name}" deleted successfully.`);
        router.push('/dashboard/templates');
      } else {
        toast.error(data.error || 'Failed to delete template.');
      }
    } catch (error) {
      toast.error('An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: template?.name || id }
      ]} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/templates" passHref>
            <Button variant="outline" size="icon" aria-label="Back to Templates">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{template?.name || 'Edit Template'}</h1>
            <p className="text-muted-foreground mt-1">Modify the fields and settings for this template.</p>
          </div>
        </div>
        {isGlobalAdmin && !isSystemTemplate && (
          <Button variant="destructive" onClick={handleOpenDeleteDialog} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Template
          </Button>
        )}
      </div>

      {/* Pass isReadOnly prop to TemplateForm if it's a system template and user is admin, 
          or always if user is not admin (though they shouldn't reach here) 
          Alternatively, TemplateForm needs its own internal permission checks or relies on API for saves
      */}
      <TemplateForm 
        initialData={template} 
        // If TemplateForm supports a readOnly prop for system templates, it would be like:
        // isReadOnly={!!isSystemTemplate}
      />

      {isGlobalAdmin && !isSystemTemplate && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the template "{template?.name}". This cannot be undone.
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