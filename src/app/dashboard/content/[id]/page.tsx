'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { MarkdownDisplay } from '@/components/content/markdown-display';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon, BrandIconProps } from '@/components/brand-icon';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

interface ContentData {
  id: string;
  title: string;
  body: string;
  meta_title: string;
  meta_description: string;
  status: string;
  brand_id?: string;
  brand_name?: string;
  brand_color?: string;
  brand_avatar_url?: string;
  brands?: any;
  template_name?: string;
  content_templates?: any;
  template_id?: string;
  content_data?: Record<string, any>;
  created_at: string;
  workflow_id?: string;
  workflow?: { id: string; name: string; steps: any[] };
  current_step: number;
}

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

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

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

export default function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { id } = params;
  const [content, setContent] = useState<ContentData | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeBrandData, setActiveBrandData] = useState<any>(null);
  const router = useRouter();

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
    const fetchData = async () => {
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
          setContent(contentResult.data);
          if (contentResult.data.brand_id) {
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
        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

        if (!versionsResponse.ok) {
          console.error(`Failed to fetch content versions: ${versionsResponse.statusText}`);
          toast.error('Could not load content history.');
        } else {
          const versionsResult = await versionsResponse.json();
          if (versionsResult.success && versionsResult.data) {
            setVersions(versionsResult.data);
          } else {
            console.error(versionsResult.error || 'Failed to load versions data.');
          }
        }

      } catch (error: any) {
        console.error('Error fetching page data:', error);
        toast.error(error.message || 'Failed to load page data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleWorkflowAction = () => {
    router.refresh();
  };

  if (isLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  if (!content) {
    return <p>Content could not be loaded or was not found.</p>; 
  }

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

  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  const getFormattedDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy, HH:mm');
    } catch (e) {
      console.error("Error formatting date/time:", dateString, e);
      return "Invalid Date/Time";
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        ...(activeBrandData ? 
          [
            { label: "Brands", href: "/dashboard/brands" },
            { label: activeBrandData.name || "Brand", href: `/dashboard/brands/${content?.brand_id}` },
            { label: "Content", href: `/dashboard/content?brandId=${content?.brand_id}` }
          ] : 
          [{ label: "Content", href: "/dashboard/content" }]),
        { label: content.title || "View Content" }
      ]} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/content')} aria-label="Back to Content List">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              {activeBrandData && 
                <BrandIcon name={activeBrandData.name} color={activeBrandData.brand_color} size="md" className="mr-3" />
              }
              {content.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              View details, content body, SEO metadata, and manage the approval workflow.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Template: {content.template_name || content.content_templates?.name || 'N/A'} 
              {activeBrandData && `• Brand: ${activeBrandData.name}`} 
              • Created: {getFormattedDate(content.created_at)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isCurrentUserStepOwner && (
            <Button variant="default" asChild>
              <Link href={`/dashboard/content/${id}/edit`} className="flex items-center">
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      {currentStepObject && currentStepObject.description && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-700">Current Task: {currentStepObject.name || 'Review Current Step'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-600">{currentStepObject.description}</p>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Details</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  content.status === 'published' 
                    ? 'bg-success/20 text-success'
                    : content.status === 'rejected'
                    ? 'bg-destructive/20 text-destructive'
                    : content.status === 'pending_review'
                    ? 'bg-yellow-300/20 text-yellow-700'
                    : content.status === 'approved'
                    ? 'bg-blue-300/20 text-blue-700'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {content.status.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none mb-6">
                <h3 className="text-sm font-medium mb-1 border-b pb-1">Main Content Body</h3>
                <MarkdownDisplay markdown={content.body || (content.content_data?.contentBody || 'No main body content available.')} />
              </div>

              <h3 className="text-sm font-medium mb-2 border-b pb-1 pt-4">Additional Generated Fields</h3>
              {content.content_data && Object.keys(content.content_data).length > 0 ? (
                Object.entries(content.content_data).map(([key, value]) => {
                  if (key.toLowerCase() === 'contentbody' && content.body) return null;
                  if (key.toLowerCase() === 'templateinputvalues') return null;

                  let displayValue = value;
                  if (typeof value === 'object' && value !== null) {
                    displayValue = Object.entries(value).map(([k,v]) => `${k}: ${v}`).join(', ') || 'Complex object data';
                  } else if (typeof value !== 'string') {
                    displayValue = String(value);
                  }

                  return (
                    <div key={key} className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                      {(typeof displayValue === 'string' && (displayValue.includes('\n') || displayValue.includes('#') || displayValue.includes('*'))) ? (
                        <div className="prose prose-sm max-w-none border rounded p-2 bg-muted/20">
                            <MarkdownDisplay markdown={displayValue} />
                        </div>
                      ) : (
                        <p className="border rounded p-2 bg-muted/20 text-sm">{displayValue || 'Not set'}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No additional output fields available or template structure not fully loaded.</p>
              )}
            </CardContent>
          </Card>

          {versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Content History & Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {versions.map(version => (
                  <div key={version.id} className="p-3 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{version.step_name || `Step ${version.workflow_step_identifier}`} - <span className={`font-semibold ${version.action_status === 'Completed' ? 'text-green-600' : version.action_status === 'Rejected' ? 'text-red-600' : 'text-gray-600'}`}>{version.action_status}</span></span>
                      <span className="text-xs text-muted-foreground">v{version.version_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      By: {version.reviewer?.full_name || 'N/A'} on {getFormattedDateTime(version.created_at)}
                    </p>
                    {version.feedback && (
                      <p className="mt-2 text-sm italic border-l-2 pl-2 border-border">{version.feedback}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1">
          {content.workflow && currentStepObject && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={currentStepObject}
              isCurrentUserStepOwner={false}
              versions={versions}
              onActionComplete={handleWorkflowAction}
            />
          )}
        </div>
      </div>
    </div>
  );
} 