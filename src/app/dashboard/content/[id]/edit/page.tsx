'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QuillEditor } from '@/components/content/quill-editor';
import 'quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { VettingAgencyFeedbackCard } from '@/components/content/vetting-agency-feedback-card';
import { BrandIcon,  } from '@/components/brand-icon';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { ArrowLeft, Loader2, ShieldAlert, XCircle, CheckCircle,  } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { useAutoSave } from '@/hooks/use-auto-save';
import { apiFetch } from '@/lib/api-client';
import { ensureNormalizedContent, normalizeOutputsMap } from '@/lib/content/html-normalizer';
import type { NormalizedContent } from '@/types/template';
import type { VettingFeedbackStageResult } from '@/types/vetting-feedback';


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
  content_data?: Record<string, unknown>;
  workflow_id?: string | null;
  current_step?: number | null;
  workflow?: { id: string; name: string; steps: WorkflowStep[] };
  due_date?: string | null;
  published_url?: string | null;
  // Add other fields from your actual content structure as needed
  // Add fields for actual template output fields if they need to be directly editable
  // For example, if an outputField from template is 'summary', you might add: summary?: string;
}

// Define UserSessionData interface (mirroring what /api/me is expected to return)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
    avatar_url?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; 
  }>;
  avatar_url?: string; 
  full_name?: string; 
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
  content_json?: { // Added for displaying content at this step
    generatedOutputs?: Record<string, unknown>;
  } | null;
  published_url?: string | null;
}

// Define Template related interfaces if not imported
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
  priority: number;
}

interface BrandData {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
  icon_url?: string | null;
  avatar_url?: string | null;
  guardrails?: string | null;
  selected_vetting_agencies?: VettingAgency[];
}


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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fetchingRef = React.useRef(false);
  
  // User and Permissions State
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);
  
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
    published_url: null,
  });

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [activeBrandData, setActiveBrandData] = useState<BrandData | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);

  // For ContentApprovalWorkflow to trigger save
  const contentSaveRef = React.useRef<() => Promise<boolean>>();

  // Added from view page for version display
  const outputFieldIdToNameMap = React.useMemo(() => {
    if (!template || !template.fields || !template.fields.outputFields) {
      return {};
    }
    return template.fields.outputFields.reduce((acc, field) => {
      acc[field.id] = field.name;
      return acc;
    }, {} as Record<string, string>);
  }, [template]);

  const outputFieldDefinitions = React.useMemo(() => {
    return template?.fields?.outputFields ?? [];
  }, [template]);

  const isRichFieldType = React.useCallback((fieldType: string) => {
    const normalized = fieldType?.toLowerCase();
    return normalized === 'richtext' || normalized === 'rich-text' || normalized === 'html';
  }, []);

  const normalizedGeneratedOutputs = React.useMemo(() => {
    return normalizeOutputsMap(
      (content.content_data?.generatedOutputs as Record<string, unknown> | undefined) ?? undefined,
      outputFieldDefinitions
    );
  }, [content.content_data?.generatedOutputs, outputFieldDefinitions]);

  React.useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>('[data-dashboard-main]');
    if (!mainEl) return;
    mainEl.classList.add('lg:overflow-hidden');
    return () => {
      mainEl.classList.remove('lg:overflow-hidden');
    };
  }, []);

  // End added from view page

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      setUserError(null);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          setUserError(data.error || 'User data not found in session.');
        }
      } catch (error: unknown) {
        console.error('[ContentEditPage] Error fetching current user:', error);
        setCurrentUser(null);
        setUserError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching user data.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Effect to check permissions once user and content (for brand_id) are loaded
  useEffect(() => {
    if (!isLoadingUser && currentUser && content.id && content.brand_id) {
      setIsCheckingPermissions(true);
      const userRole = currentUser.user_metadata?.role;
      let allowed = false;
      
      // First check if content is approved - if so, no one can edit it
      if (content.status === 'approved' || content.status === 'published') {
        allowed = false;
      } else if (userRole === 'admin') {
        allowed = true;
      } else if (content.brand_id && currentUser.brand_permissions) {
        const brandPerm = currentUser.brand_permissions.find(p => p.brand_id === content.brand_id);
        if (brandPerm && (brandPerm.role === 'admin' || brandPerm.role === 'editor')) {
          allowed = true;
        }
      }
      setIsAllowedToEdit(allowed);
      setIsCheckingPermissions(false);
    } else if (!isLoadingUser && (!currentUser || !content.id)) {
      // If user is loaded but no user, or content not loaded yet (or no brand_id), deny permission until data is ready
      setIsAllowedToEdit(false);
      setIsCheckingPermissions(false); 
    }
    // Do not run if content.id or content.brand_id is not yet available from fetchAllData
  }, [currentUser, isLoadingUser, content.id, content.brand_id, content.status]); 

  useEffect(() => {
    const fetchAllData = async () => {
      // Prevent multiple simultaneous fetches
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;
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
          const newContentState = {
            id: contentResult.data.id,
            title: contentResult.data.title || '',
            body: contentResult.data.body || (contentResult.data.content_data?.contentBody || ''),
            status: contentResult.data.status || 'draft',
            brand_id: contentResult.data.brand_id || contentResult.data.brands?.id,
            brand_name: contentResult.data.brand_name || contentResult.data.brands?.name || 'N/A',
            brand_color: contentResult.data.brands?.brand_color || contentResult.data.brand_color,
            brand_avatar_url: contentResult.data.brands?.avatar_url || contentResult.data.brand_avatar_url,
            template_name: contentResult.data.template_name || contentResult.data.content_templates?.name || 'N/A',
            template_id: contentResult.data.template_id || '',
            content_data: contentResult.data.content_data || {},
            workflow_id: contentResult.data.workflow_id || null,
            current_step: contentResult.data.current_step || null,
            workflow: contentResult.data.workflow || undefined,
            due_date: contentResult.data.due_date || null
          };
          setContent(newContentState);

          // Set brand data from the content response if available
          if (contentResult.data.brands) {
            setActiveBrandData(contentResult.data.brands as BrandData);
          } else if (contentResult.data.brand_id && contentResult.data.brand_name) {
            // Use brand data from content if brands relation is not populated
            setActiveBrandData({
              id: contentResult.data.brand_id,
              name: contentResult.data.brand_name,
              brand_color: contentResult.data.brand_color,
              logo_url: (contentResult.data.brand_logo_url as string | null | undefined) ?? null,
            });
          }

          if (contentResult.data.brand_id) {
            try {
              const brandResponse = await fetch(`/api/brands/${contentResult.data.brand_id}`);
              if (brandResponse.ok) {
                const brandJson = await brandResponse.json();
                if (brandJson.success && brandJson.brand) {
                  setActiveBrandData(brandJson.brand as BrandData);
                }
              }
            } catch (brandError) {
              console.error('[ContentEditPage] Error fetching brand details:', brandError);
            }
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

          // Fetch template data if template_id exists
          if (contentResult.data.template_id) {
            try {
              const templateResponse = await fetch(`/api/content-templates/${contentResult.data.template_id}`);
              const templateRes = await templateResponse.json();
              
              if (templateRes.success && templateRes.template) {
                const fetchedApiTemplate = templateRes.template;
                // Reshape the fetched template to match the component's Template interface
                const correctlyShapedTemplate: Template = {
                  id: fetchedApiTemplate.id,
                  name: fetchedApiTemplate.name,
                  description: fetchedApiTemplate.description,
                  fields: {
                    inputFields: fetchedApiTemplate.inputFields || [],
                    outputFields: fetchedApiTemplate.outputFields || []
                  }
                };
                setTemplate(correctlyShapedTemplate);
              } else {
                console.error('Failed to fetch template for edit page:', templateRes.error);
              }
            } catch (err) {
              console.error('Error fetching template for edit page:', err);
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

      } catch (error: unknown) {
        console.error('Error fetching data for edit page:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load page data.');
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    };
    
    if (id && currentUser?.id) {
      fetchAllData();
    }
  }, [id, currentUser]);
  
  // Handler for dynamic output field changes
  const handleGeneratedOutputChange = (outputFieldId: string, value: NormalizedContent) => {
    setContent(prev => {
      const previousOutputs = normalizeOutputsMap(
        (prev.content_data?.generatedOutputs as Record<string, unknown> | undefined) ?? undefined,
        outputFieldDefinitions
      );
      return {
        ...prev,
        content_data: {
          ...(prev.content_data || {}),
          generatedOutputs: {
            ...previousOutputs,
            [outputFieldId]: value,
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  };
  
  const handleSave = async (): Promise<boolean> => {
    setIsSaving(true);
    let success = false;
    try {
      const outputsForSave = normalizeOutputsMap(
        (content.content_data?.generatedOutputs as Record<string, unknown> | undefined) ?? undefined,
        outputFieldDefinitions
      );

      let primaryBodyFromOutputs = content.body;
      if (template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0) {
        const richTextOutputField = template.fields.outputFields.find(f => isRichFieldType(f.type));
        const firstOutputField = template.fields.outputFields[0];
        const fieldToUseForBody = richTextOutputField || firstOutputField;

        if (fieldToUseForBody) {
          const normalized = outputsForSave[fieldToUseForBody.id];
          if (normalized) {
            primaryBodyFromOutputs = isRichFieldType(fieldToUseForBody.type) ? normalized.html : normalized.plain;
          }
        }
      }

      const payloadToSave = {
        title: content.title,
        body: primaryBodyFromOutputs, 
        status: content.status,
        due_date: content.due_date,
        content_data: {
          ...(content.content_data || {}),
          generatedOutputs: outputsForSave,
        }
      };
      
      const response = await apiFetch(`/api/content/${id}`, {
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
        setContent(prev => ({ ...prev, ...result.data }));
      }
      setHasUnsavedChanges(false);
      success = true;
    } catch (error: unknown) {
      console.error('Error updating content:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update content. Please try again.');
      success = false;
    } finally {
      setIsSaving(false);
    }
    return success;
  };

  // Assign to ref so ContentApprovalWorkflow can call it if needed
  useEffect(() => {
    contentSaveRef.current = handleSave;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, template]); // Dependencies that handleSave actually uses
  
  const handleWorkflowActionCompletion = () => {
    // This function is called AFTER the workflow action in ContentApprovalWorkflow is successful.
    // Now, redirect.
    toast.info('Workflow action completed. Redirecting to My Tasks...');
    router.push('/dashboard/my-tasks');
    // Optionally, refresh data globally or for the My Tasks page if needed upon arrival.
  };
  
  // Configure auto-save (DISABLED per user request - manual save only)
  const { isSaving: isAutoSaving } = useAutoSave({
    data: content,
    onSave: async () => {
      const success = await handleSave();
      if (!success) {
        throw new Error('Failed to save content');
      }
    },
    debounceMs: 3000, // Auto-save after 3 seconds of inactivity
    enabled: false, // DISABLED - manual save only
    onError: (error) => {
      console.error('Auto-save error:', error);
      toast.error('Auto-save failed. Your changes are not being saved automatically.');
    },
    onSuccess: () => {}
  });

  if (isLoadingUser || isLoading || isCheckingPermissions) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-8 w-1/2 mb-4" /> 
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive-foreground">Error loading user data: {userError}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (!isAllowedToEdit) {
    const isApproved = content.status === 'approved' || content.status === 'published';
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        {isApproved ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Content is Locked</h3>
            <p className="text-muted-foreground text-center mb-6">
              This content has been {content.status} and cannot be edited.<br />
              To make changes, the content would need to be reopened through the workflow.
            </p>
          </>
        ) : (
          <>
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center mb-6">You do not have permission to edit this content.</p>
          </>
        )}
        <Link href={content.id ? `/dashboard/content/${content.id}` : '/dashboard/content'} passHref>
          <Button variant="outline">Back to Content</Button>
        </Link>
      </div>
    );
  }

  const currentStageId = content.current_step ? String(content.current_step) : null;

  const currentWorkflowStep = content.workflow?.steps?.find(
    (step) => (currentStageId ? String(step.id) === currentStageId : false)
  ) as WorkflowStep | undefined;

  const isCurrentUserStepOwner = Boolean(
    currentWorkflowStep?.assignees?.some((assignee) => assignee.id === currentUser?.id)
  );

  const rawVettingFeedback = content.content_data?.vettingFeedback;
  const vettingFeedbackByStage = (rawVettingFeedback && typeof rawVettingFeedback === 'object'
    ? (rawVettingFeedback as Record<string, VettingFeedbackStageResult>)
    : {}) as Record<string, VettingFeedbackStageResult>;

  const currentStageFeedback = currentStageId ? vettingFeedbackByStage[currentStageId] : undefined;

  const selectedVettingAgencies: VettingAgency[] = activeBrandData?.selected_vetting_agencies ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0 space-y-6">
        <BreadcrumbNav
          items={[
            { label: "Content", href: "/dashboard/content" },
            { label: content.title || "Loading Content...", href: `/dashboard/content/${id}` },
            { label: "Edit" }
          ]}
          showHome
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/dashboard/content/${id}`)}
              aria-label="View content (read only)"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <BrandIcon
                name={activeBrandData?.name || content.brand_name || 'Brand'}
                color={(activeBrandData?.brand_color ?? content.brand_color) || undefined}
                logoUrl={activeBrandData?.logo_url ?? null}
                size="md"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Edit: {content.title || 'Content'}</h1>
                <p className="mt-1 text-muted-foreground">
                  Update generated outputs and workflow details for this item.
                  <br />
                  Template: {content.template_name || 'N/A'} | Brand: {activeBrandData?.name || content.brand_name || 'N/A'} | Status: {content.status}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">You have unsaved changes</span>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)}>
                View Content (Read-only)
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-6">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden lg:pr-3">
          <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain">
            <Card>
              <CardHeader>
                <CardTitle>Content Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title (auto-generated)</Label>
                <Input id="title" name="title" value={content.title} readOnly disabled />
                <p className="text-xs text-muted-foreground mt-1">Titles are generated automatically and cannot be edited.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Content Template</Label><Input value={content.template_name || 'N/A'} disabled /></div>
                <div><Label>Brand</Label><Input value={content.brand_name || 'N/A'} disabled /></div>
              </div>
              <div>
                <Label htmlFor="due-date">Due Date (Optional)</Label>
                <DatePicker
                  date={content.due_date ? new Date(content.due_date) : undefined}
                  onDateChange={(date) => {
                    setContent(prev => ({ ...prev, due_date: date?.toISOString() || null }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Select a due date"
                  disabled={false}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Set a due date for when this content should be published or reviewed
                </p>
              </div>
            </CardContent>
          </Card>
          
            {template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Output Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.fields.outputFields.map(field => {
                    const normalizedValue = normalizedGeneratedOutputs[field.id];
                    const plainValue = normalizedValue?.plain ?? '';
                    const htmlValue = normalizedValue?.html ?? '';
                    return (
                      <div key={field.id}>
                        <Label htmlFor={`output_field_${field.id}`} className="text-base">
                          {field.name || `Output Field (ID: ${field.id})`}
                        </Label>
                        {field.type === 'plainText' ? (
                          <Textarea
                            id={`output_field_${field.id}`}
                            value={plainValue}
                            onChange={(e) => handleGeneratedOutputChange(field.id, ensureNormalizedContent(e.target.value, field.type))}
                            placeholder={`Enter content for ${field.name}...`}
                            rows={5}
                            className="rounded-md border bg-muted/40 px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        ) : isRichFieldType(field.type) ? (
                          <div className="rounded-md border bg-gray-50/50 p-4 shadow-xs dark:bg-gray-800/50">
                            <QuillEditor
                              value={htmlValue}
                              onChange={(value) => handleGeneratedOutputChange(field.id, ensureNormalizedContent(value, field.type))}
                              placeholder={`Enter content for ${field.name}...`}
                              className="rounded-md"
                            />
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">Unknown Field Type: {field.type}</p>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">{plainValue || htmlValue || '(empty)'}</pre>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Field Type: <span className="font-semibold">{field.type}</span>
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            {!template && content.template_id && (
              <Card>
                <CardContent>
                  <p className="py-4 text-muted-foreground">Loading template structure for output fields...</p>
                </CardContent>
              </Card>
            )}
            {template && template.fields && template.fields.outputFields && template.fields.outputFields.length === 0 && (
              <Card>
                <CardContent>
                  <p className="py-4 text-muted-foreground">No output fields defined in the template.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden lg:w-[360px] lg:shrink-0 lg:pl-1">
          <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain">
          {content.workflow_id && (
            <VettingAgencyFeedbackCard
              contentId={content.id}
              brandName={content.brand_name || activeBrandData?.name || 'Brand'}
              agencies={selectedVettingAgencies}
              outputFieldLabels={outputFieldIdToNameMap}
              stageId={currentStageId}
              stageName={currentWorkflowStep?.name || null}
              existingFeedback={currentStageFeedback}
              onFeedbackUpdated={(result) => {
                if (!result) return;
                const stageKey = result.stageId || currentStageId;
                if (!stageKey) {
                  return;
                }
                setContent(prev => {
                  const existingData = (prev.content_data || {}) as Record<string, unknown>;
                  const previousFeedback = (existingData.vettingFeedback as Record<string, VettingFeedbackStageResult> | undefined) ?? {};
                  return {
                    ...prev,
                    content_data: {
                      ...existingData,
                      vettingFeedback: {
                        ...previousFeedback,
                        [stageKey]: result,
                      },
                    },
                  };
                });
              }}
              autoRun
            />
          )}

          {content.workflow && content.workflow.steps && content.current_step && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={currentWorkflowStep}
              isCurrentUserStepOwner={isCurrentUserStepOwner}
              versions={versions}
              template={template}
              onActionComplete={handleWorkflowActionCompletion}
              performContentSave={handleSave}
              initialPublishedUrl={content.published_url ?? null}
            />
          )}
          {!content.workflow && (
            <Card>
              <CardContent>
                <p className="py-4 text-muted-foreground">No workflow associated with this content.</p>
              </CardContent>
            </Card>
          )}

          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t pt-4">
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isAutoSaving}>
            {(isSaving || isAutoSaving) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
