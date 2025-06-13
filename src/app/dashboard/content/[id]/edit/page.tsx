'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { } from '@/components/ui/tabs'; // Removed - empty import
import { RichTextEditor } from '@/components/content/rich-text-editor';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { ContentApprovalWorkflow, WorkflowStep } from '@/components/content/content-approval-workflow';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon,  } from '@/components/brand-icon';
import { ArrowLeft, Loader2, ShieldAlert, XCircle, CheckCircle, Clock, MessageSquare, UserCircle,  } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format as formatDateFns } from 'date-fns';

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
  content_data?: Record<string, unknown>;
  workflow_id?: string | null;
  current_step?: number | null;
  workflow?: { id: string; name: string; steps: unknown[] };
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
    generatedOutputs?: Record<string, string>;
  } | null;
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
  });

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [activeBrandData, setActiveBrandData] = useState<{ id: string; name: string; brand_color?: string } | null>(null);
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

  const getHistoryItemDisplayName = (identifier: string, stepName: string | null) => {
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
  const getFormattedDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy, HH:mm');
    } catch (e) {
      console.error("Error formatting date/time:", dateString, e);
      return "Invalid Date/Time";
    }
  };
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
      if (userRole === 'admin') {
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
  }, [currentUser, isLoadingUser, content.id, content.brand_id]); 

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
          const newContentState = {
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
          };
          setContent(newContentState);
          console.log('[ContentEditPage] Content state AFTER setContent in fetchAllData:', JSON.stringify(newContentState, null, 2));

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

          // Fetch template data if template_id exists
          if (contentResult.data.template_id) {
            fetch(`/api/content-templates/${contentResult.data.template_id}`)
              .then(res => res.json())
              .then(templateRes => {
                if (templateRes.success && templateRes.template) {
                  const fetchedApiTemplate = templateRes.template;
                  // Reshape the fetched template to match the component's Template interface
                  const correctlyShapedTemplate: Template = {
                    id: fetchedApiTemplate.id,
                    name: fetchedApiTemplate.name,
                    description: fetchedApiTemplate.description,
                    // Ensure other top-level fields from API response are mapped if they exist in Template interface
                    // For now, focusing on the critical 'fields' structure:
                    fields: {
                      inputFields: fetchedApiTemplate.inputFields || [],
                      outputFields: fetchedApiTemplate.outputFields || []
                    }
                  };
                  setTemplate(correctlyShapedTemplate);
                  console.log('[ContentEditPage] Template state AFTER setTemplate (SHAPED):', JSON.stringify(correctlyShapedTemplate, null, 2));
                } else {
                  console.error('Failed to fetch template for edit page:', templateRes.error);
                  // toast.error('Could not load content template structure.'); // Avoid double toast if content load fails
                }
              })
              .catch(err => {
                console.error('Error fetching template for edit page:', err);
                // toast.error('Error loading content template structure.');
              });
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
      }
    };
    
    console.log('[ContentEditPage] Effect for fetchAllData triggered. ID:', id, 'CurrentUser ID:', currentUser?.id);
    if (id && currentUser?.id) {
      console.log('[ContentEditPage] Conditions met. Calling fetchAllData.');
      fetchAllData();
    } else {
      console.warn('[ContentEditPage] Conditions NOT met for fetchAllData. ID:', id, 'CurrentUser:', currentUser);
    }
  }, [id, currentUser?.id, activeBrandData, currentUser]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };
  
  // Handler for dynamic output field changes
  const handleGeneratedOutputChange = (outputFieldId: string, value: string) => {
    setContent(prev => ({
      ...prev,
      content_data: {
        ...(prev.content_data || {}), // Ensure content_data itself exists
        generatedOutputs: {
          ...(prev.content_data?.generatedOutputs || {}),
          [outputFieldId]: value,
        },
      },
    }));
  };
  
  const handleSave = async (): Promise<boolean> => {
    setIsSaving(true);
    let success = false;
    try {
      let primaryBodyFromOutputs = content.body; 
      if (template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0 && content.content_data?.generatedOutputs) {
        const richTextOutputField = template.fields.outputFields.find(f => f.type === 'richText');
        const firstOutputField = template.fields.outputFields[0];
        const fieldToUseForBody = richTextOutputField || firstOutputField;

        if (fieldToUseForBody && content.content_data.generatedOutputs[fieldToUseForBody.id]) {
          primaryBodyFromOutputs = content.content_data.generatedOutputs[fieldToUseForBody.id];
        } else if (firstOutputField && content.content_data.generatedOutputs[firstOutputField.id]){
           primaryBodyFromOutputs = content.content_data.generatedOutputs[firstOutputField.id];
        } 
      }

      const payloadToSave = {
        title: content.title,
        body: primaryBodyFromOutputs, 
        status: content.status,
        content_data: {
          ...(content.content_data || {}),
          generatedOutputs: content.content_data?.generatedOutputs || {},
        }
      };
      
      // Step 1: Verify Frontend State Just Before Save
      console.log('--- In handleSave --- ContentEditPage ---');
      console.log('Current content.title:', content.title);
      console.log('Current content.body (before primaryBodyFromOutputs derivation):', content.body);
      // console.log('Template output fields:', template?.fields.outputFields); // Can be verbose
      console.log('Current content.content_data (raw object): ethnographicRecordIdentifier=AAA-001-BBB-ehl-GEN-001-v001-json ethnographicRecordIdentifier=AAA-001-BBB-ehl-GEN-001-v001-json ethnographicRecordIdentifier=AAA-001-BBB-ehl-GEN-001-v001-json', content.content_data);
      console.log('Current content.content_data.generatedOutputs (stringified):', JSON.stringify(content.content_data?.generatedOutputs, null, 2));
      console.log('Derived primaryBodyFromOutputs:', primaryBodyFromOutputs);
      console.log('Payload being sent to API (stringified):', JSON.stringify(payloadToSave, null, 2));
      console.log('--- End In handleSave --- ContentEditPage ---');

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
        // Step 4: Verify Frontend State After Successful Save
        console.log('Data received from API after save (stringified):', JSON.stringify(result.data, null, 2));
        setContent(prev => {
          const newState = { ...prev, ...result.data };
          console.log('New local content state after API success (content_data stringified):', JSON.stringify(newState.content_data, null, 2));
          return newState;
        });
      }
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
  }, [id, activeBrandData, currentUser]); // Dependencies for handleSave - using id, activeBrandData, currentUser instead of handleSave to avoid circular dependency
  
  const handleWorkflowActionCompletion = () => {
    console.log('[ContentEditPage] handleWorkflowActionCompletion called.');
    // This function is called AFTER the workflow action in ContentApprovalWorkflow is successful.
    // Now, redirect.
    toast.info('Workflow action completed. Redirecting to My Tasks...');
    router.push('/dashboard/my-tasks');
    // Optionally, refresh data globally or for the My Tasks page if needed upon arrival.
  };
  
  // Add a new function to handle adding a field
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddField = (fieldId: string, value: string) => {
    setContent(prev => ({
      ...prev,
      content_data: {
        ...(prev.content_data || {}),
        generatedOutputs: {
          ...(prev.content_data?.generatedOutputs || {}),
          [fieldId]: value,
        },
      },
    }));
    toast.success('Field added successfully!');
  };

  if (isLoadingUser || isLoading || isCheckingPermissions) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to edit this content.</p>
        <Link href={content.id ? `/dashboard/content/${content.id}` : '/dashboard/content'} passHref>
          <Button variant="outline">Back to Content</Button>
        </Link>
      </div>
    );
  }

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
          
          {/* Test: Unconditionally render a simple div here -- REMOVING THIS NOW */}
          {/* <div style={{ border: '2px solid red', padding: '10px', marginTop: '20px' }}>
            UNCONDITIONAL STATIC TEST DIV - If you see this, basic rendering in this position is working.
          </div> */}

          {/* Original Card for Generated Output Fields based on Template - Restoring with static content */}
          {template && template.fields && template.fields.outputFields && template.fields.outputFields.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Generated Output Fields</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Now, restore the map but with simplified content */}
                {template.fields.outputFields.map(field => {
                  console.log(`[ContentEditPage] INSIDE MAP (reintroducing RichTextEditor) - Field: ${field.name}, ID: ${field.id}, Type: ${field.type}`);
                  const fieldValue = content.content_data?.generatedOutputs?.[field.id] || '';
                  return (
                    <div key={field.id}>
                      <Label htmlFor={`output_field_${field.id}`} className="text-base">
                        {field.name || `Output Field (ID: ${field.id})`}
                      </Label>
                      {field.type === 'plainText' ? (
                        <Textarea
                          id={`output_field_${field.id}`}
                          value={fieldValue}
                          onChange={(e) => handleGeneratedOutputChange(field.id, e.target.value)}
                          placeholder={`Enter content for ${field.name}...`}
                          className="min-h-[120px] border shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      ) : field.type === 'richText' ? (
                        <RichTextEditor
                          value={fieldValue}
                          onChange={(value) => handleGeneratedOutputChange(field.id, value)}
                          placeholder={`Enter content for ${field.name}...`}
                        />
                      ) : (
                        // Fallback for any other unknown types (shouldn't happen with current template)
                        <div style={{ border: '1px dashed red', padding: '5px', marginTop: '5px'}}>
                          <p><strong>Unknown Field Type:</strong> {field.type}</p>
                          <pre>{fieldValue || '(empty)'}</pre>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Field Type: <span className='font-semibold'>{field.type}</span>
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {/* Fallback if template is loading or has no output fields */}
          {!template && content.template_id && (
             <Card><CardContent><p className="text-muted-foreground py-4">Loading template structure for output fields...</p></CardContent></Card>
          )}
          {(template && template.fields && template.fields.outputFields && template.fields.outputFields.length === 0) && (
             <Card><CardContent><p className="text-muted-foreground py-4">No output fields defined in the template.</p></CardContent></Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {content.workflow && content.workflow.steps && content.current_step && (
            <ContentApprovalWorkflow
              contentId={content.id}
              contentTitle={content.title}
              currentStepObject={content.workflow.steps.find(
                (step: unknown) => (step as { id?: unknown }).id === content.current_step
              ) as WorkflowStep | undefined}
              isCurrentUserStepOwner={content.workflow.steps.some((step: unknown) => (step as Record<string, unknown>).id === content.current_step && ((step as Record<string, unknown>).assignees as Record<string, unknown>[])?.some((assignee: Record<string, unknown>) => assignee.id === currentUser?.id))}
              versions={versions}
              template={template}
              onActionComplete={handleWorkflowActionCompletion}
              performContentSave={handleSave}
            />
          )}
          {!content.workflow && <Card><CardContent><p className="text-muted-foreground py-4">No workflow associated with this content.</p></CardContent></Card>}

          {/* New Card for Version History on Edit Page */}
          {versions && versions.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Version History</CardTitle>
                <CardDescription>Review previous versions and feedback.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 max-h-96 overflow-y-auto">
                  {versions.slice().reverse().map(version => (
                    <li key={version.id} className="p-3 border rounded-md bg-background">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center">
                          {getActionIcon(version.action_status)}
                          <span className="font-semibold">
                             {getHistoryItemDisplayName(version.workflow_step_identifier, version.step_name)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">(v{version.version_number}) - {version.action_status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getFormattedDateTime(version.created_at)}
                        </span>
                      </div>
                      {version.reviewer && (
                        <p className="text-xs text-muted-foreground mb-1">
                          By: {version.reviewer.full_name || 'Unknown User'}
                        </p>
                      )}
                      {version.feedback && (
                        <div className="mt-1 p-2 bg-muted/50 rounded-sm">
                          <p className="text-xs text-foreground whitespace-pre-wrap">{version.feedback}</p>
                        </div>
                      )}
                       {/* Optional: Display snapshot of content_json if needed */}
                       {/* {version.content_json?.generatedOutputs && Object.keys(version.content_json.generatedOutputs).length > 0 && ( <details className="mt-2 text-xs"> <summary>View Content Snapshot</summary> <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-40">{JSON.stringify(version.content_json.generatedOutputs, null, 2)}</pre> </details> )} */}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {/* End New Card for Version History */}

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