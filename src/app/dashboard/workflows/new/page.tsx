'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Switch } from '@/components/switch';
import { Badge } from '@/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/brand-icon';

// export const metadata: Metadata = {
//   title: 'Create New Workflow | MixerAI 2.0',
//   description: 'Design and configure a new content approval workflow for your brands.',
// };

/**
 * NewWorkflowPage allows users to create a new content approval workflow.
 * It provides fields for defining the workflow's name, description, associated brand, and status.
 * Users can dynamically add, remove, reorder, and configure multiple steps, including step name,
 * description, assigned role, approval requirements, and user assignees by email.
 * This page currently uses mock data for brand selection.
 */

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

interface Brand {
  id: string;
  name: string;
  color?: string; // Ensure brand object has color if used directly
}

interface ContentTemplateSummary {
  id: string;
  name: string;
}

// --- New Role Card Selection Component ---
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
}

const RoleSelectionCards: React.FC<RoleSelectionCardsProps> = ({ selectedRole, onRoleSelect, stepIndex }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onRoleSelect(role.id)}
            className={cn(
              'border rounded-lg p-3 text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              selectedRole === role.id
                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                : 'hover:bg-accent hover:text-accent-foreground'
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

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allFetchedBrands, setAllFetchedBrands] = useState<Brand[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [stepDescLoading, setStepDescLoading] = useState<Record<number, boolean>>({});

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [workflow, setWorkflow] = useState<any>({
    name: '',
    description: '',
    brand_id: '',
    status: 'active',
    template_id: null,
    steps: [
      {
        id: `temp_step_${Date.now()}`,
        name: 'Review Step 1',
        description: 'Initial review of the content.',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      }
    ]
  });
  
  const selectedBrandFull = brands.find(b => b.id === workflow.brand_id);

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

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const hasAnyBrandAdminPermission = currentUser?.brand_permissions?.some(p => p.role === 'brand_admin');
  const canAccessPage = isGlobalAdmin || hasAnyBrandAdminPermission;

  useEffect(() => {
    if (isLoadingUser) return; // Wait for user to be loaded

    if (!canAccessPage) {
      setIsLoading(false); // Not loading initial data if no access
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const brandsResponse = await fetch('/api/brands');
        if (!brandsResponse.ok) throw new Error(`Failed to fetch brands: ${brandsResponse.status}`);
        const brandsData = await brandsResponse.json();
        if (!brandsData.success) throw new Error(brandsData.error || 'Failed to process brands data');
        const fetchedBrandsFromApi = brandsData.data || [];
        setAllFetchedBrands(fetchedBrandsFromApi);
        // Filtering and setting of `brands` and `workflow.brand_id` will be handled in another useEffect dependent on currentUser

        const templatesResponse = await fetch('/api/content-templates');
        if (!templatesResponse.ok) throw new Error(`Failed to fetch content templates: ${templatesResponse.status}`);
        const templatesData = await templatesResponse.json();
        if (!templatesData.success) throw new Error(templatesData.error || 'Failed to fetch content templates data');
        setContentTemplates(Array.isArray(templatesData.templates) ? templatesData.templates : []);

      } catch (error: any) {
        console.error('Error fetching initial data for new workflow page:', error);
        toast.error(error.message || 'Failed to load initial data.');
      } finally {
        setIsLoading(false); // Still set to false after this initial fetch
      }
    };
    fetchInitialData();
  }, [isLoadingUser, canAccessPage]); // Depends on user loading and access rights

  // New useEffect to filter brands and set default brand_id once allFetchedBrands and currentUser are available
  useEffect(() => {
    if (isLoadingUser || !currentUser || allFetchedBrands.length === 0) return;

    let manageableBrands: Brand[] = [];
    if (isGlobalAdmin) {
      manageableBrands = allFetchedBrands;
    } else if (hasAnyBrandAdminPermission) {
      const adminBrandIds = currentUser.brand_permissions
        ?.filter(p => p.role === 'brand_admin')
        .map(p => p.brand_id) || [];
      manageableBrands = allFetchedBrands.filter(b => adminBrandIds.includes(b.id));
    }
    setBrands(manageableBrands);

    if (manageableBrands.length > 0 && !workflow.brand_id) {
      setWorkflow(prev => ({ ...prev, brand_id: manageableBrands[0].id }));
    }
    // If no manageable brands, brand_id will remain empty, form validation should catch this

  }, [isLoadingUser, currentUser, allFetchedBrands, isGlobalAdmin, hasAnyBrandAdminPermission, workflow.brand_id]);

  const handleUpdateWorkflowDetails = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkflow((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleUpdateWorkflowStatus = (value: string) => {
    setWorkflow((prev: any) => ({ ...prev, status: value }));
  };

  const handleUpdateBrand = (value: string) => {
    setWorkflow((prev: any) => ({ ...prev, brand_id: value }));
  };

  const handleUpdateTemplate = (value: string) => {
    setSelectedTemplateId(value);
    setWorkflow((prev: any) => ({ ...prev, template_id: value || null }));
  };

  const handleUpdateStepName = (index: number, value: string) => {
    setWorkflow((prev: any) => {
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

  const handleGenerateStepDescription = async (stepIndex: number) => {
    const stepToUpdate = workflow.steps[stepIndex];
    if (!stepToUpdate || !stepToUpdate.name) {
      toast.error('Please provide a step name before generating a description.');
      return;
    }

    setStepDescLoading(prev => ({ ...prev, [stepIndex]: true }));
    try {
      // Simulating API call for generating description
      // Replace with actual API call: e.g., await fetch('/api/ai/generate-step-description', ...)
      const response = await fetch('/api/ai/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepName: stepToUpdate.name, workflowName: workflow.name, brandName: selectedBrandFull?.name || 'the brand' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      if (data.success && data.description) {
        handleUpdateStepDescription(stepIndex, data.description);
        toast.success(`Description generated for "${stepToUpdate.name}"`);
      } else {
        throw new Error(data.error || 'No description was generated.');
      }
    } catch (error: any) {
      console.error('Error generating step description:', error);
      toast.error(`Error generating description: ${error.message}`);
    } finally {
      setStepDescLoading(prev => ({ ...prev, [stepIndex]: false }));
    }
  };

  const handleAddStep = () => {
    setWorkflow((prev: any) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: `temp_step_${Date.now()}`,
          name: `Review Step ${prev.steps.length + 1}`,
          description: '',
          role: 'editor',
          approvalRequired: true,
          assignees: []
        }
      ]
    }));
  };

  const handleRemoveStep = (index: number) => {
    setWorkflow((prev: any) => ({
      ...prev,
      steps: prev.steps.filter((_: any, i: number) => i !== index)
    }));
  };
  
  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setWorkflow((prev: any) => {
      const newSteps = [...prev.steps];
      const temp = newSteps[index];
      newSteps[index] = newSteps[index - 1];
      newSteps[index - 1] = temp;
      return { ...prev, steps: newSteps };
    });
  };
  
  const handleMoveStepDown = (index: number) => {
    if (index === workflow.steps.length - 1) return;
    setWorkflow((prev: any) => {
      const newSteps = [...prev.steps];
      const temp = newSteps[index];
      newSteps[index] = newSteps[index + 1];
      newSteps[index + 1] = temp;
      return { ...prev, steps: newSteps };
    });
  };

  const validateWorkflow = () => {
    if (!workflow.name.trim()) {
      toast.error('Workflow name is required.');
      return false;
    }
    if (!workflow.brand_id) {
      toast.error('Please select a brand for the workflow.');
      return false;
    }
    if (workflow.steps.length === 0) {
      toast.error('A workflow must have at least one step.');
      return false;
    }
    for (const step of workflow.steps) {
      if (!step.name.trim()) {
        toast.error(`Step "${step.name || 'Unnamed Step'}" needs a name.`);
        return false;
      }
      if (!step.role) {
        toast.error(`Step "${step.name}" needs a role assigned.`);
        return false;
      }
    }
    return true;
  };

  const handleCreateWorkflow = async () => {
    if (!validateWorkflow()) return;

    if (!canAccessPage) { // Re-check access before submission
      toast.error("You don't have permission to create workflows.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...workflow,
        steps: workflow.steps.map((step: any) => ({
          ...step,
          // Ensure assignees are just an array of user IDs if your API expects that
          // Or pass the full assignee objects if that's what the backend handles
          // For now, assuming backend handles the structure as is in `workflow.steps`
        }))
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Workflow created successfully!');
        router.push('/dashboard/workflows'); 
      } else {
        toast.error(data.error || 'Failed to create workflow.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoadingUser || (isLoading && canAccessPage)) { // Combined loading state
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    );
  }

  if (!canAccessPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to create new Workflows.</p>
        <Link href="/dashboard/workflows">
          <Button variant="outline" className="mt-4">Back to Workflows</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Workflows", href: "/dashboard/workflows" }, 
        { label: "Create New Workflow" }
      ]} />

      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
              <Link href="/dashboard/workflows" passHref>
                  <Button variant="outline" size="icon" aria-label="Back to Workflows">
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
              </Link>
              <div>
                  <h1 className="text-2xl font-bold tracking-tight">Create New Workflow</h1>
                  <p className="text-muted-foreground mt-1">Define the steps and reviewers for your content approval process.</p>
              </div>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Details</CardTitle>
          <CardDescription>Basic information for your new workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" value={workflow.name} onChange={handleUpdateWorkflowDetails} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_id">Brand <span className="text-destructive">*</span></Label>
              <Select value={workflow.brand_id} onValueChange={handleUpdateBrand}>
                <SelectTrigger>
                    <SelectValue placeholder={brands.length > 0 ? "Select a brand" : (isLoading ? "Loading brands..." : "No manageable brands")} >
                        {selectedBrandFull ? 
                            <span className="flex items-center">
                                <BrandIcon name={selectedBrandFull.name} color={selectedBrandFull.color} className="mr-2 h-4 w-4" />
                                {selectedBrandFull.name}
                            </span> : (brands.length > 0 ? "Select a brand" : (isLoading ? "Loading brands..." : "No manageable brands"))
                        }
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                       <span className="flex items-center">
                         <BrandIcon name={brand.name} color={brand.color} className="mr-2 h-4 w-4" />
                         {brand.name}
                       </span>
                    </SelectItem>
                  ))}
                  {brands.length === 0 && !isLoading && <p className="p-2 text-sm text-muted-foreground">No brands available.</p>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={workflow.description} onChange={handleUpdateWorkflowDetails} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template_id">Associated Content Template (Optional)</Label>
            <Select value={selectedTemplateId} onValueChange={handleUpdateTemplate}>
                <SelectTrigger><SelectValue placeholder="Select a template (optional)" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {contentTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">If selected, this workflow will be suggested for content created with this template.</p>
          </div>
           <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={workflow.status} onValueChange={handleUpdateWorkflowStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
          <CardDescription>Define the sequence of approval for this workflow. Add at least one step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow.steps.map((step: any, index: number) => (
            <Card key={step.id || `step-${index}`} className="border p-4 space-y-4 bg-muted/30">
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <Label htmlFor={`step-name-${index}`}>Step Name <span className="text-destructive">*</span></Label>
                    <Input 
                        id={`step-name-${index}`} 
                        value={step.name} 
                        onChange={(e) => handleUpdateStepName(index, e.target.value)} 
                        className="text-base font-semibold"/>
                </div>
                <div className="flex items-center ml-4 pt-1 space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleMoveStepUp(index)} disabled={index === 0} title="Move step up">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleMoveStepDown(index)} disabled={index === workflow.steps.length - 1} title="Move step down">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {workflow.steps.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleRemoveStep(index)} title="Remove step">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`step-description-${index}`}>Step Description</Label>
                <div className="relative">
                    <Textarea 
                        id={`step-description-${index}`} 
                        value={step.description} 
                        onChange={(e) => handleUpdateStepDescription(index, e.target.value)} 
                        rows={2}/>
                    <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateStepDescription(index)}
                        disabled={stepDescLoading[index] || !step.name.trim() || !workflow.brand_id}
                        className="absolute bottom-2 right-2 text-xs"
                    >
                        {stepDescLoading[index] ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : null}
                        AI Suggest
                    </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role for this step <span className="text-destructive">*</span></Label>
                <RoleSelectionCards 
                    stepIndex={index} 
                    selectedRole={step.role} 
                    onRoleSelect={(roleId) => handleUpdateStepRole(index, roleId)} 
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                    id={`approvalRequired-${index}`} 
                    checked={step.approvalRequired} 
                    onCheckedChange={(value) => handleUpdateStepApprovalRequired(index, value)} />
                <Label htmlFor={`approvalRequired-${index}`}>Approval Required</Label>
              </div>
            </Card>
          ))}
          <Button variant="outline" onClick={handleAddStep} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Step
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/workflows')} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleCreateWorkflow} disabled={isSaving || isLoading || isLoadingUser}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Workflow
        </Button>
      </div>
    </div>
  );
} 