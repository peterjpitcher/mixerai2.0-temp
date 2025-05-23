'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Switch } from '@/components/switch';
import { Badge } from '@/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import debounce from 'lodash.debounce';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/brand-icon';
import { MultiSelectUserCombobox, UserOption } from '@/components/ui/multi-select-user-combobox';

// export const metadata: Metadata = {
//   title: 'Edit Workflow | MixerAI 2.0',
//   description: 'Modify the details, steps, and configuration of an existing content workflow.',
// };

interface WorkflowEditPageProps {
  params: {
    id: string;
  };
}

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

interface ContentTemplateSummary {
  id: string;
  name: string;
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
 * WorkflowEditPage allows users to modify an existing content approval workflow.
 * Users can update the workflow's name, description, status, and associated brand.
 * The core functionality involves managing the workflow steps: adding, removing, reordering,
 * and configuring each step's name, description, assigned role, approval requirement,
 * and specific user assignees by email.
 */
export default function WorkflowEditPage({ params }: WorkflowEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assigneeInputs, setAssigneeInputs] = useState<string[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<Record<number, any[]>>({});
  const [userSearchLoading, setUserSearchLoading] = useState<Record<number, boolean>>({});
  const [brands, setBrands] = useState<any[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stepDescLoading, setStepDescLoading] = useState<Record<number, boolean>>({});
  
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allFetchedBrands, setAllFetchedBrands] = useState<any[]>([]);

  const currentBrandForDisplay = brands.find(b => b.id === (workflow?.brand_id || workflow?.brand?.id));

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
      } catch (err) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching your user data.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch workflow data
        const workflowResponse = await fetch(`/api/workflows/${id}`);
        if (!workflowResponse.ok) throw new Error(`Failed to fetch workflow: ${workflowResponse.status}`);
        const workflowData = await workflowResponse.json();
        if (!workflowData.success) throw new Error(workflowData.error || 'Failed to fetch workflow data');
        setWorkflow(workflowData.workflow);
        setSelectedTemplateId(workflowData.workflow?.template_id || '');

        // Fetch brands data
        const brandsResponse = await fetch('/api/brands');
        if (!brandsResponse.ok) throw new Error(`Failed to fetch brands: ${brandsResponse.status}`);
        const brandsData = await brandsResponse.json();
        if (!brandsData.success) throw new Error(brandsData.error || 'Failed to fetch brands data');
        setBrands(Array.isArray(brandsData.data) ? brandsData.data : []);
        setAllFetchedBrands(Array.isArray(brandsData.data) ? brandsData.data : []); // Store all brands

        // Fetch content templates data
        const templatesResponse = await fetch('/api/content-templates');
        if (!templatesResponse.ok) throw new Error(`Failed to fetch content templates: ${templatesResponse.status}`);
        const templatesData = await templatesResponse.json();
        if (!templatesData.success) throw new Error(templatesData.error || 'Failed to fetch content templates data');
        setContentTemplates(Array.isArray(templatesData.templates) ? templatesData.templates : []);

      } catch (error) {
        setError((error as Error).message || 'Failed to load data.');
        toast.error('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Derived permissions and access control
  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const userBrandAdminPermissions = currentUser?.brand_permissions?.filter(p => p.role === 'admin').map(p => p.brand_id) || [];
  
  const canEditThisWorkflow = workflow && (
    isGlobalAdmin || 
    (workflow.brand_id && userBrandAdminPermissions.includes(workflow.brand_id))
  );

  const canAccessPage = !isLoadingUser && !isLoading && workflow ? canEditThisWorkflow : false;
  // More refined canAccessPage logic will be placed after data fetching completed check

  // useEffect to filter brands based on user permissions AFTER all data is loaded
  useEffect(() => {
    if (isLoadingUser || isLoading || !currentUser || !workflow || allFetchedBrands.length === 0) {
      return; // Wait for all necessary data
    }

    if (isGlobalAdmin) {
      setBrands(allFetchedBrands);
    } else if (userBrandAdminPermissions.length > 0) {
      const manageableBrands = allFetchedBrands.filter(b => userBrandAdminPermissions.includes(b.id));
      setBrands(manageableBrands);
      // If current workflow's brand is not in manageable brands, it implies an issue,
      // but canEditThisWorkflow check should handle overall page access.
      // For brand dropdown, it will be correctly filtered.
    } else {
      setBrands([]); // No brands manageable if not global admin and no brand_admin permissions
    }
  }, [isLoadingUser, isLoading, currentUser, workflow, allFetchedBrands, isGlobalAdmin, userBrandAdminPermissions]);

  // --- Role Card Selection Component ---
  const roles = [
    { id: 'editor', name: 'Editor', description: 'Reviews and edits content for clarity, grammar, and style.' },
    { id: 'seo', name: 'SEO', description: 'Optimises content for search engines, including keywords and metadata.' },
    { id: 'legal', name: 'Legal', description: 'Ensures content complies with legal and regulatory requirements.' },
    { id: 'culinary', name: 'Culinary', description: 'Verifies recipes, cooking instructions, and culinary accuracy.' },
    { id: 'brand', name: 'Brand', description: 'Checks content for brand alignment, tone of voice, and messaging.' },
    { id: 'publisher', name: 'Publisher', description: 'Manages the final publication and distribution of content.' }
  ];

  interface RoleSelectionCardsProps {
    selectedRole: string;
    onRoleSelect: (roleId: string) => void;
    stepIndex: number;
    disabled?: boolean; // Added disabled prop
  }

  const RoleSelectionCards: React.FC<RoleSelectionCardsProps> = ({ selectedRole, onRoleSelect, stepIndex, disabled }) => {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleSelect(role.id)}
              disabled={disabled} // Apply disabled prop
              className={cn(
                'border rounded-lg p-3 text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selectedRole === role.id
                  ? 'bg-primary/10 border-primary ring-1 ring-primary'
                  : 'hover:bg-accent hover:text-accent-foreground',
                disabled ? 'opacity-50 cursor-not-allowed' : '' // Style for disabled state
              )}
            >
              <p className="font-medium text-sm">{role.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };
  // --- End Role Card Selection Component ---

  const handleGenerateStepDescription = async (index: number) => {
    if (!workflow || !workflow.steps || !workflow.steps[index]) {
      toast.error('Step data not available.');
      return;
    }
    const step = workflow.steps[index];
    if (!step.name || !step.role) {
      toast.error('Step name and role are required to generate a description.');
      return;
    }

    setStepDescLoading(prev => ({ ...prev, [index]: true }));

    try {
      const currentBrand = allFetchedBrands.find(b => b.id === (workflow.brand_id || workflow.brand?.id));
      const currentTemplate = contentTemplates.find(ct => ct.id === selectedTemplateId);

      const response = await fetch('/api/ai/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: workflow.name,
          brandName: currentBrand?.name,
          templateName: currentTemplate?.name,
          stepName: step.name,
          role: step.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const result = await response.json();
      if (result.success && result.description) {
        handleUpdateStepDescription(index, result.description);
        toast.success('Step description generated!');
      } else {
        throw new Error(result.error || 'AI service did not return a description.');
      }
    } catch (error: any) {
      console.error('Error generating step description:', error);
      toast.error(error.message || 'Could not generate step description.');
    } finally {
      setStepDescLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleUpdateWorkflowDetails = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkflow((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateWorkflowStatus = (value: string) => {
    setWorkflow((prev: any) => ({
      ...prev,
      status: value
    }));
  };

  const handleUpdateBrand = (value: string) => {
    // Find the selected brand in the brands array, not workflow.brands
    const selectedBrand = brands.find((brand: any) => brand.id === value);
    if (selectedBrand) {
      setWorkflow((prev: any) => ({
        ...prev,
        brand: selectedBrand,
        brand_id: selectedBrand.id
      }));
    }
  };

  const handleUpdateTemplate = (value: string) => {
    setSelectedTemplateId(value);
    setWorkflow((prev: any) => ({
      ...prev,
      template_id: value || null,
    }));
  };

  const handleUpdateStepName = (index: number, value: string) => {
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        name: value
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleUpdateStepDescription = (index: number, value: string) => {
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        description: value
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleUpdateStepRole = (index: number, value: string) => {
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        role: value
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleUpdateStepApprovalRequired = (index: number, value: boolean) => {
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        approvalRequired: value
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  // Initialize/resize assigneeInputs when steps change (if workflow and steps are defined)
  useEffect(() => {
    if (workflow && workflow.steps) {
        setAssigneeInputs(prevInputs => {
            const newInputs = new Array(workflow.steps.length).fill('');
            // Preserve existing inputs if an old step still exists at the same index
            for (let i = 0; i < Math.min(prevInputs.length, newInputs.length); i++) {
                newInputs[i] = prevInputs[i];
            }
            return newInputs;
        });
    }
  }, [workflow?.steps?.length]); // Depend on the length of steps array

  // Debounced user search function
  const searchUsers = React.useCallback(
    debounce(async (query: string, stepIndex: number) => {
      if (!query || query.length < 2) {
        setUserSearchResults((prev) => ({ ...prev, [stepIndex]: [] }));
        return;
      }
      setUserSearchLoading((prev) => ({ ...prev, [stepIndex]: true }));
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setUserSearchResults((prev) => ({ ...prev, [stepIndex]: data.users || [] }));
        } else {
          setUserSearchResults((prev) => ({ ...prev, [stepIndex]: [] }));
        }
      } catch {
        setUserSearchResults((prev) => ({ ...prev, [stepIndex]: [] }));
      } finally {
        setUserSearchLoading((prev) => ({ ...prev, [stepIndex]: false }));
      }
    }, 300),
    []
  );

  const handleAddAssignee = (stepIndex: number, email?: string) => {
    const value = typeof email === 'string' ? email : assigneeInputs[stepIndex];
    if (!value || !value.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!workflow || !workflow.steps || !workflow.steps[stepIndex]) {
      toast.error('Cannot add assignee - workflow step not found.');
      return;
    }
    const stepAssignees = workflow.steps[stepIndex].assignees || [];
    const exists = Array.isArray(stepAssignees) && stepAssignees.some((a: any) => a.email === value);
    if (exists) {
      toast.error('This assignee is already added to this step.');
      return;
    }
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      const updatedSteps = [...prev.steps];
      if (!updatedSteps[stepIndex].assignees) {
        updatedSteps[stepIndex].assignees = [];
      }
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        assignees: [
          ...updatedSteps[stepIndex].assignees,
          {
            id: `temp-${Date.now()}`,
            email: value
          }
        ]
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
    // Clear only this input
    setAssigneeInputs((prev) => {
      const updated = [...prev];
      updated[stepIndex] = '';
      return updated;
    });
    setUserSearchResults((prev) => ({ ...prev, [stepIndex]: [] }));
  };

  const handleRemoveAssignee = (stepIndex: number, assigneeId: string) => {
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      
      if (!updatedSteps[stepIndex] || !Array.isArray(updatedSteps[stepIndex].assignees)) {
        return prev;
      }
      
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        assignees: updatedSteps[stepIndex].assignees.filter(
          (a: any) => a.id !== assigneeId
        )
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      // Save the step we want to move up
      const stepToMove = updatedSteps[index];
      // Remove it from its current position
      updatedSteps.splice(index, 1);
      // Insert it at the new position (one index up)
      updatedSteps.splice(index - 1, 0, stepToMove);
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
    
    // Show success message
    toast.success('Step moved up successfully');
  };

  const handleMoveStepDown = (index: number) => {
    if (!workflow || !Array.isArray(workflow.steps) || index === workflow.steps.length - 1) return;
    
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      // Save the step we want to move down
      const stepToMove = updatedSteps[index];
      // Remove it from its current position
      updatedSteps.splice(index, 1);
      // Insert it at the new position (one index down)
      updatedSteps.splice(index + 1, 0, stepToMove);
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
    
    // Show success message
    toast.success('Step moved down successfully');
  };

  const handleAddStep = () => {
    setWorkflow((prev: any) => {
      if (!prev) return prev;
      
      const steps = Array.isArray(prev.steps) ? prev.steps : [];
      const newStep = {
        id: `step${steps.length + 1}`,
        name: `Step ${steps.length + 1}`,
        description: '',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      };
      
      return {
        ...prev,
        steps: [...steps, newStep]
      };
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!workflow || !Array.isArray(workflow.steps)) return;
    
    if (workflow.steps.length <= 1) {
      toast.error('A workflow must have at least one step.');
      return;
    }
    
    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = prev.steps.filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      if (!workflow) throw new Error('Workflow data is missing');
      
      const workflowDataToSave = {
        ...workflow,
        template_id: selectedTemplateId || null,
        updated_at: new Date().toISOString()
      };
      
      // Remove client-side only brand object if it exists to avoid sending nested object if API expects only brand_id
      if (workflowDataToSave.brand) delete workflowDataToSave.brand;
      
      console.log("Saving workflow with data:", workflowDataToSave);

      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowDataToSave)
      });
      
      if (!response.ok) throw new Error(`Failed to update workflow: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update workflow.');
      
      toast.success('Workflow updated successfully');
      router.push(`/dashboard/workflows/${id}`);
    } catch (error) {
      toast.error('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false); // Close confirm dialog

    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Workflow deleted successfully');
        router.push('/dashboard/workflows');
      } else {
        throw new Error(data.error || 'Failed to delete workflow.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An unexpected error occurred.',
        {
          description: 'Please check if content items are using this workflow.',
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (isLoadingUser || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading workflow details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive-foreground mt-4">Error: {error}</p>
        <p className="text-muted-foreground">Could not load workflow data. It might have been deleted or an error occurred.</p>
        <Link href="/dashboard/workflows" passHref>
          <Button variant="outline" className="mt-6">Back to Workflows</Button>
        </Link>
      </div>
    );
  }
  
  if (!workflow) { // Workflow not found after loading, or initial error (redundant with error state but good check)
    // This can also happen if initial fetch failed and error state was set, but as a fallback.
    // Or if workflow ID is invalid and API returns no workflow without explicit error.
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive-foreground mt-4">Workflow not found.</p>
        <p className="text-muted-foreground">The requested workflow does not exist or could not be loaded.</p>
        <Link href="/dashboard/workflows" passHref>
          <Button variant="outline" className="mt-6">Back to Workflows</Button>
        </Link>
      </div>
    );
  }

  // Access Denied Check (after user and workflow data are loaded)
  if (!isLoadingUser && !isLoading && workflow && !canEditThisWorkflow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to edit this workflow.</p>
        <Link href="/dashboard/workflows" passHref>
          <Button variant="outline">Back to Workflows</Button>
        </Link>
      </div>
    );
  }

  // If we reach here, user is loaded, workflow is loaded, and user has permission.

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Workflows", href: "/dashboard/workflows" }, 
        { label: workflow?.name || "Loading...", href: `/dashboard/workflows/${id}` },
        { label: "Edit" }
      ]} />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
           <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/workflows/${id}`)} aria-label="Back to Workflow view">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {currentBrandForDisplay && 
            <BrandIcon name={currentBrandForDisplay.name} color={currentBrandForDisplay.color ?? undefined} size="md" className="mr-1" />
          }
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit: {workflow?.name || 'Workflow'}</h1>
            <p className="text-muted-foreground mt-1">
              Modify the details, steps, assignees, and other settings for this workflow.
              {currentBrandForDisplay && <span className="block text-xs">For Brand: {currentBrandForDisplay.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || isSaving}
            title="Delete this workflow"
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" /> Delete Workflow</>
            )}
          </Button>
          {/* Save and Cancel (to view) moved to bottom of form */}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>Basic information about the workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={workflow.name || ''}
                  onChange={handleUpdateWorkflowDetails}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={workflow.status} onValueChange={handleUpdateWorkflowStatus} disabled={!canEditThisWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select defaultValue={workflow.brand?.id || workflow.brand_id || ''} onValueChange={handleUpdateBrand} value={workflow.brand?.id || workflow.brand_id || ''} disabled={!canEditThisWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand: any) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: brand.color || '#CCCCCC' }}
                          />
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contentTemplate">Content Template (Optional)</Label>
                <Select value={selectedTemplateId} onValueChange={handleUpdateTemplate} disabled={!canEditThisWorkflow}>
                  <SelectTrigger id="contentTemplate">
                    <SelectValue placeholder="Select a content template" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this workflow to a specific content template to automatically use it when new content is created from that template for the selected brand.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflow Steps</CardTitle>
                <CardDescription>Define the approval stages for this workflow.</CardDescription>
              </div>
              <Button onClick={handleAddStep} size="sm" disabled={!canEditThisWorkflow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {workflow.steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined for this workflow. Click "Add Step" to create your first workflow step.
              </div>
            ) : (
              <div className="space-y-6">
                {workflow.steps.map((step: any, index: number) => (
                  <div key={step.id || index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs font-medium mr-3">
                          {index + 1}
                        </span>
                        <h3 className="font-medium">Step {index + 1}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepDown(index)}
                          disabled={index === workflow.steps.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`step-name-${index}`}>Step Name <span className="text-destructive">*</span></Label>
                          <Input id={`step-name-${index}`} value={step.name || ''} onChange={(e) => handleUpdateStepName(index, e.target.value)} placeholder="Enter step name" disabled={!canEditThisWorkflow}/>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <RoleSelectionCards 
                            stepIndex={index} 
                            selectedRole={step.role || 'editor'} 
                            onRoleSelect={(value) => handleUpdateStepRole(index, value)} 
                            disabled={!canEditThisWorkflow}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`step-description-${index}`}>Step Description</Label>
                          <Button 
                             type="button" 
                             variant="outline" 
                             size="sm" 
                             onClick={() => handleGenerateStepDescription(index)}
                             disabled={stepDescLoading[index] || !workflow.steps[index]?.name || !workflow.steps[index]?.role || !canEditThisWorkflow}
                           >
                            {stepDescLoading[index] ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Auto-Generate
                          </Button>
                        </div>
                        <Textarea
                          id={`step-description-${index}`}
                          value={step.description || ''}
                          onChange={(e) => handleUpdateStepDescription(index, e.target.value)}
                          rows={2}
                          disabled={!canEditThisWorkflow}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`step-approval-${index}`}
                          checked={!step.approvalRequired}
                          onCheckedChange={(value) => handleUpdateStepApprovalRequired(index, !value)}
                          disabled={!canEditThisWorkflow}
                        />
                        <Label htmlFor={`step-approval-${index}`}>This step is optional</Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`step-assignees-${index}`}>Assignees</Label>
                        <div className="relative flex items-center space-x-2">
                          <Input
                            id={`step-assignees-${index}`}
                            placeholder="Enter email address or search for user."
                            value={assigneeInputs[index] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setAssigneeInputs(prev => {
                                const updated = [...prev];
                                updated[index] = val;
                                return updated;
                              });
                              searchUsers(val, index);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAssignee(index);
                              }
                            }}
                            className="flex-grow mr-2"
                            disabled={!canEditThisWorkflow}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAddAssignee(index)}
                            disabled={!canEditThisWorkflow || !assigneeInputs[index]?.trim()}
                          >
                            Add
                          </Button>
                          {userSearchLoading[index] && <span className="ml-2 text-xs">Searching...</span>}
                          {userSearchResults[index] && userSearchResults[index].length > 0 && (
                            <div className="absolute left-0 top-full z-10 bg-white border rounded shadow mt-1 w-full max-w-xs">
                              {userSearchResults[index].map((user: any) => (
                                <div
                                  key={user.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => handleAddAssignee(index, user.email)}
                                >
                                  {user.full_name ? `${user.full_name} <${user.email}>` : user.email}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Array.isArray(step.assignees) ? (
                            step.assignees.map((assignee: any) => (
                              <Badge key={assignee.id || assignee.email} variant="outline" className="text-xs flex items-center">
                                {assignee.email || 'No email'}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignee(index, assignee.id)}
                                  className="ml-1 text-muted-foreground hover:text-destructive"
                                >
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No assignees</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Workflow?"
        description="Are you sure you want to delete this workflow? This action cannot be undone. Any content items using this workflow may need to be reassigned."
        confirmText="Delete"
        onConfirm={handleDeleteWorkflow}
      />

      {/* Standard 3.1: Consolidated Form Actions - Bottom Right */}
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
        <Button variant="outline" asChild disabled={isSaving || isDeleting}>
            <Link href={`/dashboard/workflows/${id}`}>Cancel</Link>
        </Button>
        <Button onClick={handleSaveWorkflow} disabled={isSaving || isDeleting}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
        </Button>
      </div>
    </div>
  );
} 