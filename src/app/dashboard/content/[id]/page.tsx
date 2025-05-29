'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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
import { ArrowLeft, Edit3, MessageSquare, CheckCircle, XCircle, Clock, UserCircle } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

interface TemplateOutputField {
  id: string;
  name: string;
  type: string; // e.g., 'plainText', 'richText', 'html'
}

interface TemplateFields {
  inputFields: any[];
  outputFields: TemplateOutputField[];
}

interface Template {
  id: string;
  name: string;
  description?: string;
  fields: TemplateFields;
}

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
  versions?: ContentVersion[];
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
  const [template, setTemplate] = useState<Template | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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
        const contentResponse = await fetch(`/api/content/${id}`);

        if (!contentResponse.ok) {
          if (contentResponse.status === 404) notFound();
          throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
        }
        const contentResult = await contentResponse.json();
        if (contentResult.success && contentResult.data) {
          setContent(contentResult.data);
          console.log('[ContentDetailPage] Received content data:', contentResult.data);
          const fetchedVersions = contentResult.data.versions || [];
          setVersions(fetchedVersions);
          console.log('[ContentDetailPage] Set versions state to:', fetchedVersions);
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

          if (contentResult.data.template_id) {
            fetch(`/api/content-templates/${contentResult.data.template_id}`)
              .then(res => res.json())
              .then(templateRes => {
                if (templateRes.success && templateRes.template) {
                  setTemplate(templateRes.template);
                } else {
                  console.error('Failed to fetch template:', templateRes.error);
                  toast.error('Could not load content template structure.');
                }
              })
              .catch(err => {
                console.error('Error fetching template:', err);
                toast.error('Error loading content template structure.');
              });
          } else if (contentResult.data.content_templates) {
            setTemplate(contentResult.data.content_templates);
          }

        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

      } catch (error: any) {
        console.error('Error fetching page data:', error);
        toast.error(error.message || 'Failed to load page data. Please try again.');
        if (error.message.includes('404') || (error.response && error.response.status === 404)) {
           notFound();
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);

  const outputFieldIdToNameMap = useMemo(() => {
    if (!template || !template.fields || !template.fields.outputFields) {
      return {};
    }
    return template.fields.outputFields.reduce((acc, field) => {
      acc[field.id] = field.name;
      return acc;
    }, {} as Record<string, string>);
  }, [template]);

  const handleWorkflowAction = () => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const contentResponse = await fetch(`/api/content/${id}`);

        if (!contentResponse.ok) {
          if (contentResponse.status === 404) notFound();
          throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
        }
        const contentResult = await contentResponse.json();
        if (contentResult.success && contentResult.data) {
          setContent(contentResult.data);
          console.log('[ContentDetailPage] Refreshed content data:', contentResult.data);
          const refreshedVersions = contentResult.data.versions || [];
          setVersions(refreshedVersions);
          console.log('[ContentDetailPage] Set versions state after refresh to:', refreshedVersions);
        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

      } catch (error: any) {
        console.error('Error refetching page data:', error);
        toast.error(error.message || 'Failed to reload page data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    router.refresh(); 
  };

  if (isLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6 text-blue-600"></div>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title="Content Not Found" description="The content you are looking for could not be loaded or does not exist." />
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
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

  const brandForHeader = activeBrandData || content.brands;
  const brandName = brandForHeader?.name || 'Brand';
  const brandColor = brandForHeader?.brand_color || '#cccccc';
  const brandIcon = brandForHeader?.logo_url || brandForHeader?.icon_url || brandForHeader?.avatar_url;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Content', href: '/dashboard/content' },
    { label: content.title || 'Details' }
  ];
  
  const generatedOutputs = content.content_data?.generatedOutputs || {};

  const getHistoryItemDisplayName = (identifier: string, stepName: string) => {
    return outputFieldIdToNameMap[identifier] || stepName || identifier;
  };

  const getActionIcon = (actionStatus: string) => {
    switch (actionStatus?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500 mr-2" />;
      case 'rejected':
      case 'sent_back':
        return <XCircle className="h-4 w-4 text-red-500 mr-2" />;
      case 'submitted':
      case 'pending_review':
        return <Clock className="h-4 w-4 text-yellow-500 mr-2" />;
      case 'commented':
        return <MessageSquare className="h-4 w-4 text-blue-500 mr-2" />;
      default:
        return <UserCircle className="h-4 w-4 text-gray-400 mr-2" />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          {brandIcon ? (
            <img src={brandIcon} alt={`${brandName} logo`} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <BrandIcon name={brandName} color={brandColor} size="md" />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{content.title || 'Content Details'}</h1>
            <p className="text-muted-foreground mt-1">
              View details, content body, SEO metadata, and manage the approval workflow.
              <br />
              Template: {template?.name || content.template_name || 'N/A'} | 
              Brand: {brandName} | 
              Created: {getFormattedDate(content.created_at)}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button asChild variant="default">
            <Link href={`${pathname}/edit`}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Content
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Topic: {currentStepObject?.name || `Review Step ${content.current_step || 1}`}</CardTitle>
              <CardDescription>
                {currentStepObject?.description || 'Review the content below and take appropriate action.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0 ? (
                template.fields.outputFields.map(field => (
                  <div key={field.id} className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">{field.name}</h3>
                    <div className="prose prose-sm max-w-none p-4 border rounded-md bg-gray-50/50 dark:bg-gray-800/50">
                      <MarkdownDisplay markdown={generatedOutputs[field.id] || 'This field has no content yet.'} />
                    </div>
                  </div>
                ))
              ) : (
                 <div className="prose prose-sm max-w-none p-4 border rounded-md bg-gray-50/50 dark:bg-gray-800/50">
                  <MarkdownDisplay markdown={content.body || 'No dynamic fields configured or template not loaded. Showing primary content body.'} />
                </div>
              )}
            </CardContent>
          </Card>

          {versions && versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Content History & Feedback</CardTitle>
                <CardDescription>Review previous versions and feedback for this content.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {versions.slice().reverse().map(version => (
                    <li key={version.id} className="p-4 border rounded-md shadow-sm bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getActionIcon(version.action_status)}
                          <span className="font-semibold">
                             {getHistoryItemDisplayName(version.workflow_step_identifier, version.step_name)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(v{version.version_number}) - {version.action_status}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getFormattedDateTime(version.created_at)}
                        </span>
                      </div>
                      {version.reviewer && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          By: {version.reviewer.full_name || 'Unknown User'}
                        </p>
                      )}
                      {version.feedback && (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{version.feedback}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="lg:col-span-1 space-y-6">
           {content.workflow_id && content.workflow && currentUserId && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={currentStepObject}
              isCurrentUserStepOwner={isCurrentUserStepOwner}
              versions={versions}
              template={template}
              onActionComplete={handleWorkflowAction}
            />
          )}
        </div>
      </div>
    </div>
  );
} 