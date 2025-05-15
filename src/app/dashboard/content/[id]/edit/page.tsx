'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { RichTextEditor } from '@/components/content/rich-text-editor';
import { toast } from 'sonner';
import type { Metadata } from 'next';
import { createBrowserClient } from '@supabase/ssr';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon, BrandIconProps } from '@/components/brand-icon';
import { ArrowLeft, Loader2 } from 'lucide-react';

// export const metadata: Metadata = {
//   title: 'Edit Content | MixerAI 2.0',
//   description: 'Modify the details, body, and SEO metadata for a piece of content.',
// };

interface ContentEditPageProps {
  params: {
    id: string;
  };
}

// Define a more specific type for the content state
interface ContentState {
  id: string;
  title: string;
  body: string;
  status: string;
  brand_id?: string;
  brand_name?: string;
  brand_color?: string;
  brand_avatar_url?: string;
  template_name?: string;
  template_id?: string;
  content_data?: Record<string, any>;
  workflow_id?: string | null;
  current_step?: number | null;
  workflow?: { id: string; name: string; steps: any[] };
  // Add other fields from your actual content structure as needed
  // Add fields for actual template output fields if they need to be directly editable
  // For example, if an outputField from template is 'summary', you might add: summary?: string;
}

// Add ContentVersion if it's not identical to the one in view page, or import if sharable
interface ContentVersion {
  id: string;
  workflow_step_identifier: string;
  step_name: string;
  version_number: number;
  action_status: string;
  feedback?: string;
  reviewer_id?: string;
  reviewer?: { id: string; full_name?: string; avatar_url?: string };
  created_at: string;
}

// Placeholder Breadcrumbs component
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

/**
 * ContentEditPage allows users to modify an existing piece of content.
 * It provides fields for editing the title, body (using Markdown with a live preview), 
 * and SEO metadata (meta title, meta description).
 * Note: This component currently uses mock data and simulated API calls.
 */
export default function ContentEditPage({ params }: ContentEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [content, setContent] = useState<ContentState>({
    id: '',
    title: '',
    body: '',
    status: 'draft',
    brand_id: '',
    brand_name: '',
    brand_color: '',
    brand_avatar_url: '',
    template_name: '',
    template_id: '',
    content_data: {},
    workflow_id: null,
    current_step: null,
  });

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeBrandData, setActiveBrandData] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, [supabase.auth]);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [contentResponse, versionsResponse] = await Promise.all([
          fetch(`/api/content/${id}`),
          fetch(`/api/content/${id}/versions`)
        ]);

        if (!contentResponse.ok) {
          if (contentResponse.status === 404) notFound();
          throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
        }
        const contentResult = await contentResponse.json();
        if (contentResult.success && contentResult.data) {
          setContent({
            id: contentResult.data.id,
            title: contentResult.data.title || '',
            body: contentResult.data.body || (contentResult.data.content_data?.contentBody || ''),
            status: contentResult.data.status || 'draft',
            brand_id: contentResult.data.brand_id || contentResult.data.brands?.id,
            brand_name: contentResult.data.brand_name || contentResult.data.brands?.name || 'N/A',
            brand_color: contentResult.data.brands?.brand_color,
            brand_avatar_url: contentResult.data.brands?.avatar_url,
            template_name: contentResult.data.template_name || contentResult.data.content_templates?.name || 'N/A',
            template_id: contentResult.data.template_id || '',
            content_data: contentResult.data.content_data || {},
            workflow_id: contentResult.data.workflow_id || null,
            current_step: contentResult.data.current_step || null,
            workflow: contentResult.data.workflow || undefined
          });

          if (contentResult.data.brand_id && !activeBrandData) {
            fetch(`/api/brands/${contentResult.data.brand_id}`)
              .then(res => res.json())
              .then(brandRes => {
                if (brandRes.success && brandRes.brand) {
                  setActiveBrandData(brandRes.brand);
                }
              });
          } else if (contentResult.data.brands) {
            setActiveBrandData(contentResult.data.brands);
          }

          if (contentResult.data.workflow_id && !contentResult.data.workflow?.steps) {
            const wfResponse = await fetch(`/api/workflows/${contentResult.data.workflow_id}`);
            if (wfResponse.ok) {
              const wfData = await wfResponse.json();
              if (wfData.success && wfData.workflow) {
                setContent(prev => ({...prev, workflow: wfData.workflow }));
              }
            }
          }

        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

        if (versionsResponse.ok) {
          const versionsResult = await versionsResponse.json();
          if (versionsResult.success && versionsResult.data) {
            setVersions(versionsResult.data);
          }
        } else {
          console.warn('Could not load content versions for edit page.');
        }

      } catch (error: any) {
        console.error('Error fetching data for edit page:', error);
        toast.error(error.message || 'Failed to load page data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id && currentUserId) {
      fetchAllData();
    }
  }, [id, currentUserId, supabase.auth]); 
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleContentBodyChange = (newBodyValue: string) => {
    setContent(prev => ({ ...prev, body: newBodyValue }));
  };

  // Handler for dynamic output field changes (if we make them editable)
  const handleOutputFieldChange = (fieldName: string, value: string) => {
    setContent(prev => ({
      ...prev,
      content_data: {
        ...prev.content_data,
        [fieldName]: value,
      },
    }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadToSave = {
        title: content.title,
        body: content.body,
        status: content.status,
        content_data: content.content_data 
      };
      
      console.log('Saving content with payload:', payloadToSave);
      const response = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to update content. Status: ${response.status}`);
      }
      toast.success('Content updated successfully!');
      if (result.data) {
        setContent(prev => ({ 
            ...prev, 
            ...result.data, 
        }));
      }
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast.error(error.message || 'Failed to update content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  // Logic to get output field definitions from template (needs template fetching if not already on content)
  // This is a placeholder - actual template fetching/structure would be needed.
  // For now, we assume content.content_data holds the output fields from generation.
  const outputFieldsToDisplay = content.template_id && content.content_data 
    ? Object.keys(content.content_data) // Simplistic: assumes all keys in content_data are output fields to display
        .filter(key => key !== 'templateInputValues' && key !== 'generatedOutput' && key !== 'contentBody') // Filter out known non-output data
        .map(key => ({ id: key, name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) , type: 'text' /* Default type, ideally from template */ }))
    : [];

  // Calculate currentStepObject and isCurrentUserStepOwner (similar to view page)
  let currentStepObject: WorkflowStep | undefined = undefined;
  if (content.workflow && content.workflow.steps && content.current_step) {
    currentStepObject = content.workflow.steps.find(
      (step: any) => step.id === content.current_step
    ) as WorkflowStep | undefined;
  }

  let isCurrentUserStepOwner = false;
  if (currentStepObject && currentUserId) {
    if (Array.isArray(currentStepObject.assignees)) {
      isCurrentUserStepOwner = currentStepObject.assignees.some((assignee: any) => assignee.id === currentUserId);
    }
  }
  
  const handleWorkflowAction = () => {
    router.refresh();
    const fetchContentAgain = async () => {
      const response = await fetch(`/api/content/${id}`);
      const result = await response.json();
      if (result.success && result.data) {
         setContent(prev => ({ 
            ...prev, 
            status: result.data.status,
            current_step: result.data.current_step,
            workflow: result.data.workflow || prev.workflow
          }));
      }
       const versionsResponse = await fetch(`/api/content/${id}/versions`);
       if (versionsResponse.ok) {
          const versionsResult = await versionsResponse.json();
          if (versionsResult.success && versionsResult.data) setVersions(versionsResult.data);
        }
    };
    fetchContentAgain();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Content", href: "/dashboard/content" },
        { label: content.title || "Loading Content...", href: `/dashboard/content/${id}` },
        { label: "Edit" }
      ]} />

      <div className="flex items-center mb-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/content/${id}`)} aria-label="View Content">
            <ArrowLeft className="h-4 w-4" />
        </Button>
        {activeBrandData && (
          <div className="ml-4 flex items-center">
            <BrandIcon name={activeBrandData.name} color={activeBrandData.brand_color} size="sm" />
            <span className="ml-2 text-sm font-medium text-muted-foreground">Brand: {activeBrandData.name}</span>
          </div>
        )}
      </div>

      <PageHeader
        title={`Edit: ${content.title || 'Content'}`}
        description="Modify the title, body, and other generated fields for this piece of content."
        actions={
          <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)}>
            View Content (Read-only)
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" value={content.title} onChange={handleInputChange}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Content Template</Label><Input value={content.template_name || 'N/A'} disabled /></div>
                <div><Label>Brand</Label><Input value={content.brand_name || 'N/A'} disabled /></div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Content Body</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor 
                value={content.body} 
                onChange={handleContentBodyChange} 
                placeholder="Enter your content here..." 
                className="border rounded-md"
                editorClassName="font-sans min-h-[18rem]"
              />
            </CardContent>
          </Card>

          {outputFieldsToDisplay.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Generated Output Fields</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {outputFieldsToDisplay.map(field => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.name}</Label>
                    <Textarea 
                      id={field.id} 
                      name={field.id} 
                      value={content.content_data?.[field.id] || ''} 
                      onChange={(e) => handleOutputFieldChange(field.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {content.workflow && currentStepObject && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={currentStepObject}
              isCurrentUserStepOwner={isCurrentUserStepOwner}
              versions={versions}
              onActionComplete={handleWorkflowAction}
            />
          )}
          {!content.workflow && <Card><CardContent><p className="text-muted-foreground py-4">No workflow associated with this content.</p></CardContent></Card>}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
        <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)} disabled={isSaving}>
            Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 