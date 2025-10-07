'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownDisplay } from '@/components/content/markdown-display';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { VettingAgencyFeedbackCard } from '@/components/content/vetting-agency-feedback-card';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon,  } from '@/components/brand-icon';
import { ArrowLeft, Edit3, CheckCircle } from 'lucide-react';
import { RestartWorkflowButton } from '@/components/content/restart-workflow-button';
import { RejectionFeedbackCard } from '@/components/content/rejection-feedback-card';
import { format as formatDateFns } from 'date-fns';
import { normalizeOutputsMap } from '@/lib/content/html-normalizer';
import type { NormalizedContent } from '@/types/template';
import type { VettingFeedbackStageResult } from '@/types/vetting-feedback';

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

interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority: number; // 1 = High, 2 = Medium, 3 = Low
}

interface BrandData {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
  icon_url?: string | null;
  avatar_url?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
  selected_vetting_agencies?: VettingAgency[];
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
  workflow?: { id: string; name: string; steps: WorkflowStep[] };
  current_step: number;
  versions?: ContentVersion[];
  published_url?: string | null;
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
    generatedOutputs?: Record<string, unknown>;
    body_snapshot?: string;
  } | null;
  published_url?: string | null;
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
  const [activeBrandData, setActiveBrandData] = useState<BrandData | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>('[data-dashboard-main]');
    if (!mainEl) return;
    mainEl.classList.add('lg:overflow-hidden');
    return () => {
      mainEl.classList.remove('lg:overflow-hidden');
    };
  }, []);

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

  const outputFieldDefinitions = useMemo(
    () => (template?.fields?.outputFields as Array<{ id: string; type: string }> | undefined) ?? [],
    [template]
  );

  const generatedOutputs: Record<string, NormalizedContent> = useMemo(() => {
    const rawOutputs = (content?.content_data?.generatedOutputs ?? null) as Record<string, unknown> | null;
    return normalizeOutputsMap(rawOutputs ?? undefined, outputFieldDefinitions);
  }, [content?.content_data?.generatedOutputs, outputFieldDefinitions]);

  const vettingFeedbackByStage = useMemo(() => {
    const rawData = content?.content_data as Record<string, unknown> | undefined;
    if (!rawData) return {} as Record<string, VettingFeedbackStageResult>;
    const feedback = rawData.vettingFeedback as Record<string, VettingFeedbackStageResult> | undefined;
    if (!feedback || typeof feedback !== 'object') {
      return {} as Record<string, VettingFeedbackStageResult>;
    }
    return feedback;
  }, [content?.content_data]);

  const refreshContentData = useCallback(() => {
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
  }, [id, router]);

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

  const currentStageId = content.current_step ? String(content.current_step) : null;

  let currentStepObject: WorkflowStep | undefined = undefined;
  if (content.workflow && content.workflow.steps && currentStageId) {
    currentStepObject = content.workflow.steps.find(
      (step: unknown) => (step as { id?: unknown }).id === currentStageId
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

  const brandForHeader = (activeBrandData ?? (content.brands as Partial<BrandData> | undefined)) || undefined;
  const brandName = brandForHeader?.name || 'Brand';
  const brandColor = brandForHeader?.brand_color || '#cccccc';
  const brandIcon = brandForHeader?.logo_url || brandForHeader?.icon_url || brandForHeader?.avatar_url;

  const selectedVettingAgencies = activeBrandData?.selected_vetting_agencies ?? [];
  const currentStageFeedback = currentStageId ? vettingFeedbackByStage[currentStageId] : undefined;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Content', href: '/dashboard/content' },
    { label: content.title || 'Details' }
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0 space-y-6">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {brandIcon ? (
              <Image src={brandIcon} alt={`${brandName} logo`} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <BrandIcon name={brandName} color={brandColor} size="md" />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{content.title || 'Content Details'}</h1>
              <p className="mt-1 text-muted-foreground">
                View details, content body, SEO metadata, and manage the approval workflow.
                <br />
                Template: {template?.name || content.template_name || 'N/A'} | Brand: {brandName} | Created: {getFormattedDate(content.created_at)}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {content.status === 'rejected' ? (
              <div className="flex gap-2">
                <Button asChild variant="default">
                  <Link href={`${pathname}/edit`}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Content
                  </Link>
                </Button>
                <RestartWorkflowButton
                  contentId={content.id}
                  contentTitle={content.title}
                  onRestart={refreshContentData}
                  variant="outline"
                />
              </div>
            ) : content.status !== 'approved' && content.status !== 'published' ? (
              <Button asChild variant="default">
                <Link href={`${pathname}/edit`}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Content
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Content is {content.status}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-6">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden lg:pr-3">
          <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain">
            {content.status === 'rejected' && (() => {
              const rejectionVersion = versions
                .slice()
                .reverse()
                .find(v => v.action_status === 'rejected' && v.feedback);

              return rejectionVersion ? (
                <RejectionFeedbackCard
                  feedback={rejectionVersion.feedback}
                  reviewerName={rejectionVersion.reviewer?.full_name}
                  rejectedAt={rejectionVersion.created_at}
                />
              ) : null;
            })()}

            <Card>
              <CardHeader>
                <CardTitle>Current Topic: {currentStepObject?.name || `Review Step ${content.current_step || 1}`}</CardTitle>
                <CardDescription>
                  {currentStepObject?.description || 'Review the content below and take appropriate action.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0 ? (
                  template.fields.outputFields.map(field => {
                    const normalized = generatedOutputs[field.id];
                    const isPlainTextField = field.type?.toLowerCase() === 'plaintext';
                    const plainTextContent = normalized?.plain?.trim() ?? '';
                    const htmlContent = normalized?.html?.trim();
                    const emptyPlainText = (
                      <span className="text-muted-foreground italic">No content provided for this field.</span>
                    );

                    return (
                      <div key={field.id} className="mb-6" data-field-container-id={field.id}>
                        <h3 className="mb-2 text-lg font-semibold">{field.name}</h3>
                        {isPlainTextField ? (
                          <div
                            data-field-id={field.id}
                            className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground shadow-xs whitespace-pre-wrap"
                          >
                            {plainTextContent ? plainTextContent : emptyPlainText}
                          </div>
                        ) : (
                          <div
                            data-field-id={field.id}
                            className="prose prose-sm max-w-none rounded-md border bg-gray-50/50 p-4 dark:bg-gray-800/50"
                            dangerouslySetInnerHTML={{
                              __html:
                                htmlContent && htmlContent.length > 0
                                  ? htmlContent
                                  : '<p class="text-muted-foreground italic">This field has no content yet.</p>',
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="prose prose-sm max-w-none rounded-md border bg-gray-50/50 p-4 dark:bg-gray-800/50">
                    <MarkdownDisplay markdown={content.body || 'No dynamic fields configured or template not loaded. Showing primary content body.'} />
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden lg:w-[360px] lg:shrink-0 lg:pl-1">
          <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain">
            {content.workflow_id && currentUserId ? (
              <>
                <VettingAgencyFeedbackCard
                  contentId={content.id}
                  brandName={brandName}
                  agencies={selectedVettingAgencies}
                  outputFieldLabels={outputFieldIdToNameMap}
                  stageId={currentStageId}
                  stageName={currentStepObject?.name || null}
                  existingFeedback={currentStageFeedback}
                  onFeedbackUpdated={(_result) => refreshContentData()}
                  autoRun
                />

                <ContentApprovalWorkflow
                  contentId={content.id}
                  contentTitle={content.title}
                  currentStepObject={currentStepObject}
                  isCurrentUserStepOwner={isCurrentUserStepOwner}
                  versions={versions}
                  template={template}
                  onActionComplete={refreshContentData}
                  initialPublishedUrl={content.published_url ?? null}
                  workflowSteps={content.workflow?.steps}
                />
              </>
            ) : (
              <Card>
                <CardContent>
                  <p className="py-4 text-sm text-muted-foreground">No workflow is associated with this content.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
