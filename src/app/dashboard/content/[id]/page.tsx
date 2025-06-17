'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownDisplay } from '@/components/content/markdown-display';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon,  } from '@/components/brand-icon';
import { ArrowLeft, Edit3, MessageSquare, CheckCircle, XCircle, Clock, UserCircle } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';

interface TemplateOutputField {
  id: string;
  name: string;
  type: string; // e.g., 'plainText', 'richText', 'html'
}

interface TemplateFields {
  inputFields: unknown[];
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
  brands?: unknown;
  template_name?: string;
  content_templates?: unknown;
  template_id?: string;
  content_data?: Record<string, unknown>;
  created_at: string;
  workflow_id?: string;
  workflow?: { id: string; name: string; steps: unknown[] };
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
  content_json?: {
    generatedOutputs?: Record<string, string>;
    body_snapshot?: string;
  } | null;
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
  const [activeBrandData, setActiveBrandData] = useState<{ name: string; brand_color?: string; logo_url?: string; icon_url?: string; avatar_url?: string } | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
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

          if (process.env.NODE_ENV === 'development') {
            console.log('[Template Debug] Attempting to load template. Template ID from content:', contentResult.data.template_id);
            if (contentResult.data.content_templates) {
              console.log('[Template Debug] Found embedded template data in content:', JSON.stringify(contentResult.data.content_templates, null, 2));
            }
          }

          if (contentResult.data.template_id) {
            fetch(`/api/content-templates/${contentResult.data.template_id}`)
              .then(res => res.json())
              .then(templateRes => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Template Debug] Received template API response:', JSON.stringify(templateRes, null, 2));
                }
                if (templateRes.success && templateRes.template) {
                  const apiTemplateData = templateRes.template;
                  // Normalize the API template structure to match the component's Template interface
                  const normalizedTemplate: Template = {
                    id: apiTemplateData.id,
                    name: apiTemplateData.name,
                    description: apiTemplateData.description,
                    // Ensure 'fields' property exists and contains inputFields and outputFields
                    fields: {
                      inputFields: apiTemplateData.inputFields || [],
                      outputFields: apiTemplateData.outputFields || []
                    }
                  };
                  setTemplate(normalizedTemplate);
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[Template Debug] Successfully set template state (normalized):', JSON.stringify(normalizedTemplate, null, 2));
                  }
                } else {
                  console.error('Failed to fetch template:', templateRes.error);
                  toast.error('Could not load content template structure.');
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[Template Debug] Failed to set template state. Error:', templateRes.error);
                  }
                }
              })
              .catch(err => {
                console.error('Error fetching template:', err);
                toast.error('Error loading content template structure.');
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Template Debug] Exception during template fetch:', err.message);
                }
              });
          } else if (contentResult.data.content_templates) {
            setTemplate(contentResult.data.content_templates);
            if (process.env.NODE_ENV === 'development') {
              console.log('[Template Debug] Set template state from embedded data:', JSON.stringify(contentResult.data.content_templates, null, 2));
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Template Debug] No template_id found and no embedded template data in content.');
            }
            toast.message('Content does not have an associated template. Field names may not display correctly in history.');
          }

        } else {
          throw new Error(contentResult.error || 'Failed to load content data.');
        }

      } catch (error: unknown) {
        console.error('Error fetching page data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load page data. Please try again.');
        if (error instanceof Error && (error.message.includes('404') || (error as unknown as Record<string, unknown>).response && (error as unknown as Record<string, { status?: number }>).response.status === 404)) {
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

      } catch (error: unknown) {
        console.error('Error refetching page data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to reload page data. Please try again.');
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
      <div className="space-y-6">
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
      (step: unknown) => (step as { id?: unknown }).id === content.current_step
    ) as WorkflowStep | undefined;
  }

  let isCurrentUserStepOwner = false;
  if (currentStepObject && currentUserId) {
    if (Array.isArray(currentStepObject.assignees)) {
      isCurrentUserStepOwner = currentStepObject.assignees.some((assignee: unknown) => (assignee as { id?: string }).id === currentUserId);
    }
  }

  const getFormattedDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  const getFormattedDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'MMMM d, yyyy, HH:mm');
    } catch (e) {
      console.error("Error formatting date/time:", dateString, e);
      return "Invalid Date/Time";
    }
  };

  const brandForHeader = activeBrandData || (content.brands as { name?: string; brand_color?: string; logo_url?: string; icon_url?: string; avatar_url?: string } | undefined);
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

  const toggleVersionExpansion = (versionId: string) => {
    setExpandedVersions(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          {brandIcon ? (
            <Image src={brandIcon} alt={`${brandName} logo`} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
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
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mr-3">
                            {getFormattedDateTime(version.created_at)}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => toggleVersionExpansion(version.id)}>
                            {expandedVersions[version.id] ? 'Hide' : 'Show'} Details
                          </Button>
                        </div>
                      </div>
                      {version.reviewer && (
                        <div className="flex items-center mt-1 mb-1">
                          <div className="relative h-6 w-6 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2">
                            {version.reviewer.avatar_url ? (
                              <Image
                                src={version.reviewer.avatar_url}
                                alt={version.reviewer.full_name || 'Reviewer avatar'}
                                fill
                                className="object-cover"
                              />
                            ) : null}
                            {(!version.reviewer.avatar_url) && (
                              <div className="flex items-center justify-center h-full w-full text-xs font-semibold text-primary bg-muted-foreground/20">
                                {(version.reviewer.full_name || 'R').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            By: {version.reviewer.full_name || 'Unknown User'}
                          </p>
                        </div>
                      )}
                      {version.feedback && (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{version.feedback}</p>
                        </div>
                      )}

                      {expandedVersions[version.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-100">Content Snapshot (Version {version.version_number})</h4>
                          
                          {(() => {
                            if (process.env.NODE_ENV === 'development') {
                              console.log(`[Version Snapshot Debug] Version ID: ${version.id}, Number: ${version.version_number}`);
                              console.log('[Version Snapshot Debug] outputFieldIdToNameMap:', JSON.stringify(outputFieldIdToNameMap, null, 2));
                              console.log('[Version Snapshot Debug] version.content_json:', JSON.stringify(version.content_json, null, 2));
                            }

                            const generatedOutputs = version.content_json?.generatedOutputs;
                            if (generatedOutputs && typeof generatedOutputs === 'object' && template?.fields?.outputFields) {
                              // --- Start Diagnostic Logging for generatedOutputs processing ---
                              if (process.env.NODE_ENV === 'development') {
                                console.log('[Version Snapshot Debug] All keys in generatedOutputs:', Object.keys(generatedOutputs));
                                console.log('[Version Snapshot Debug] Template outputFields order:', template.fields.outputFields.map(f => ({id: f.id, name: f.name})));
                              }
                              // --- End Diagnostic Logging ---

                              // Iterate over template.fields.outputFields to maintain order
                              const fieldsToRender = template.fields.outputFields
                                .map(templateField => {
                                  if (generatedOutputs.hasOwnProperty(templateField.id)) {
                                    return {
                                      id: templateField.id,
                                      name: templateField.name, // Use name directly from template definition
                                      value: generatedOutputs[templateField.id]
                                    };
                                  }
                                  return null;
                                })
                                .filter(field => field !== null) as { id: string; name: string; value: unknown }[];

                              // --- Start Diagnostic Logging for displayableFields (now fieldsToRender) ---
                              if (process.env.NODE_ENV === 'development') {
                                console.log('[Version Snapshot Debug] Fields to render (ordered by template) count:', fieldsToRender.length);
                                if (fieldsToRender.length > 0) {
                                  console.log('[Version Snapshot Debug] Fields to render details (ID, Name, Value Preview):', 
                                    fieldsToRender.map(field => ({ 
                                      id: field.id, 
                                      name: field.name, 
                                      valuePreview: String(field.value).substring(0, 50) + (String(field.value).length > 50 ? '...' : '') 
                                    }))
                                  );
                                }
                              }
                              // --- End Diagnostic Logging ---

                              if (fieldsToRender.length > 0) {
                                return fieldsToRender.map(field => {
                                  // const fieldName = outputFieldIdToNameMap[field.id]; // No longer needed as we use field.name
                                  return (
                                    <div key={field.id} className="mb-4">
                                      <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">{field.name}</h5>
                                      <div className="prose prose-sm max-w-none p-3 border rounded-md bg-gray-50 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200">
                                        <MarkdownDisplay markdown={String(field.value) || 'No content for this field in this version.'} />
                                      </div>
                                    </div>
                                  );
                                });
                              } 
                            }
                            // Fallback if no displayable generatedOutputs or if generatedOutputs is not in the expected format
                            if (version.content_json?.body_snapshot) {
                              return (
                                <div className="mb-4">
                                  <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Body</h5>
                                  <div className="prose prose-sm max-w-none p-3 border rounded-md bg-gray-50 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200">
                                    <MarkdownDisplay markdown={version.content_json.body_snapshot} />
                                  </div>
                                </div>
                              );
                            }
                            return <p className="text-sm text-gray-500 dark:text-gray-400">No displayable content snapshot available for this version.</p>;
                          })()}
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