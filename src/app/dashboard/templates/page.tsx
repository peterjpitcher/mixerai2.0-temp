'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/badge';
import { toast } from 'sonner';
import { Loader2, PlusCircle, LayoutTemplate, Edit3, FileTextIcon, MoreVertical, FileCog, Eye, Trash2, ShieldAlert } from 'lucide-react';
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

// Placeholder Breadcrumbs component - replace with actual implementation later
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

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: any[];
    outputFields: any[];
  };
  usageCount?: number;
  created_at?: string;
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Fetch templates only if user is loaded and is an admin, or if currentUser is still null (initial load before check)
    if (!isLoadingUser && (!currentUser || currentUser.user_metadata?.role !== 'admin')) {
      setLoading(false); // Stop loading templates if user is not admin
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

    // Only fetch if user is loaded and is an admin, or if user data isn't loaded yet
    if (isLoadingUser || (currentUser && currentUser.user_metadata?.role === 'admin')) {
        fetchTemplates();
    }
  }, [isLoadingUser, currentUser]);

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
      const response = await fetch(`/api/content-templates/${templateToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Template "${templateToDelete.name}" deleted successfully.`);
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      } else {
        toast.error(data.error || 'Failed to delete template.');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the template.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';

  if (isLoadingUser || loading) { // Combined loading state
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading templates...</p>
      </div>
    );
  }

  if (!isGlobalAdmin) {
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
      <PageHeader
        title="Content Templates"
        description="Create and manage your content templates for AI-powered content generation"
        actions={
          isGlobalAdmin ? (
            <Link href="/dashboard/templates/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </Link>
          ) : null
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription className="mt-1 h-10 overflow-hidden text-ellipsis">
                  {template.description || 'No description provided.'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow pt-2">
              <div className="space-y-2">
                <Badge variant="outline" className="flex items-center w-fit">
                  <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                  {template.fields.inputFields.length} input field{template.fields.inputFields.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="flex items-center w-fit">
                  <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                  {template.fields.outputFields.length} output field{template.fields.outputFields.length !== 1 ? 's' : ''}
                </Badge>
                <div className="text-sm text-muted-foreground pt-2">
                  Used: {template.usageCount !== undefined ? template.usageCount : '0'} time{template.usageCount !== 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild title="View this template">
                  <Link href={`/dashboard/templates/${template.id}`} className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Link>
                </Button>
                {isGlobalAdmin && (
                  <Button variant="ghost" size="sm" asChild title="Edit this template">
                    <Link href={`/dashboard/templates/${template.id}`} className="flex items-center">
                       <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                )}
              </div>
              {isGlobalAdmin && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-destructive hover:text-destructive/90"
                  title="Delete this template"
                  onClick={() => {
                    setTemplateToDelete(template);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
        
        {templates.length === 0 && !loading && isGlobalAdmin && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-10">
            <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground/70" />
            <h3 className="mt-4 text-lg font-medium">No Templates Found</h3>
            <p className="mt-1 text-sm text-muted-foreground mb-6">
                Create your first content template to get started.
            </p>
            <Link href="/dashboard/templates/new">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Template
                </Button>
            </Link>
          </div>
        )}
      </div>

      {/* AlertDialog for delete confirmation */}
      {isGlobalAdmin && templateToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the template "{templateToDelete?.name}". 
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