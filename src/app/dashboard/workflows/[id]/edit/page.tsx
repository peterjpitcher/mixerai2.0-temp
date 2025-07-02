'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
// import { notFound } from 'next/navigation'; // notFound can be used if needed based on API response
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2, ArrowLeft, ShieldAlert, UserPlus, Info } from 'lucide-react'; // Added Info
import debounce from 'lodash.debounce';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/brand-icon';
import { ActiveBrandIndicator } from '@/components/ui/active-brand-indicator';
import { apiFetch } from '@/lib/api-client';
// Assuming UserOption might be defined elsewhere or keep it local if specific
// import { MultiSelectUserCombobox, UserOption } from '@/components/ui/multi-select-user-combobox';


interface WorkflowEditPageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
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

interface BrandSummary {
    id: string;
    name: string;
    color?: string;
    logo_url?: string | null;
}

interface ContentTemplateSummary {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface WorkflowStepDefinition {
  id: string; 
  name: string;
  description: string;
  role: string;
  approvalRequired: boolean;
  assignees: UserOption[];
}

interface WorkflowFull {
  id: string;
  name: string;
  description?: string | null;
  brand_id: string;
  status: string;
  template_id?: string | null;
  steps: WorkflowStepDefinition[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  brand?: BrandSummary; // For displaying brand info
}

interface WorkflowSummary { 
  id: string;
  template_id?: string | null;
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
  disabled?: boolean;
}

const RoleSelectionCards: React.FC<RoleSelectionCardsProps> = ({ selectedRole, onRoleSelect, disabled }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onRoleSelect(role.id)}
            disabled={disabled}
            className={cn(
              'border rounded-lg p-3 text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              selectedRole === role.id
                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                : 'hover:bg-accent hover:text-accent-foreground',
              disabled ? 'opacity-50 cursor-not-allowed' : ''
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

export default function WorkflowEditPage({ params, searchParams }: WorkflowEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assigneeInputs, setAssigneeInputs] = useState<string[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<Record<number, UserOption[]>>({});
  const [userSearchLoading, setUserSearchLoading] = useState<Record<number, boolean>>({});
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('NO_TEMPLATE_SELECTED');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stepDescLoading, setStepDescLoading] = useState<Record<number, boolean>>({});
  
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allFetchedBrands, setAllFetchedBrands] = useState<BrandSummary[]>([]);

  const [otherBrandWorkflows, setOtherBrandWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoadingBrandWorkflows, setIsLoadingBrandWorkflows] = useState(false);
  const [isDuplicated, setIsDuplicated] = useState(false);

  const currentBrandForDisplay = brands.find(b => b.id === workflow?.brand_id);

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
        toast.error('Error fetching user data: ' + (err as Error).message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      // Check if this is a duplicated workflow
      const isDuplicatedWorkflow = searchParams?.duplicated === 'true';
      setIsDuplicated(isDuplicatedWorkflow);
      
      try {
        const workflowResponse = await fetch(`/api/workflows/${id}`);
        if (!workflowResponse.ok) {
          if (workflowResponse.status === 404) {
            // notFound(); // Alternative: use error state to display message
            setError("Workflow not found.");
            throw new Error('Workflow not found');
          } 
          throw new Error(`Failed to fetch workflow: ${workflowResponse.statusText}`);
        }
        const workflowData = await workflowResponse.json();
        if (!workflowData.success || !workflowData.workflow) {
          throw new Error(workflowData.error || 'Failed to process workflow data');
        }
        
        // If this is a duplicated workflow, clear the IDs to make it a new workflow
        const processedWorkflow = isDuplicatedWorkflow ? {
          ...workflowData.workflow,
          id: null, // Clear the ID so it creates a new workflow
          name: workflowData.workflow.name, // Keep the "Copy of" name from duplication
          steps: workflowData.workflow.steps.map((step: WorkflowStepDefinition) => ({
            ...step,
            id: uuidv4() // Generate new IDs for all steps
          }))
        } : workflowData.workflow;
        
        setWorkflow(processedWorkflow);
        setSelectedTemplateId(processedWorkflow?.template_id || 'NO_TEMPLATE_SELECTED');
        setAssigneeInputs(new Array(processedWorkflow?.steps?.length || 0).fill(''));


        const brandsResponse = await fetch('/api/brands');
        if (!brandsResponse.ok) throw new Error(`Failed to fetch brands: ${brandsResponse.statusText}`);
        const brandsData = await brandsResponse.json();
        if (!brandsData.success) throw new Error(brandsData.error || 'Failed to process brands data');
        setAllFetchedBrands(Array.isArray(brandsData.data) ? brandsData.data : []);

        const templatesResponse = await fetch('/api/content-templates');
        if (!templatesResponse.ok) throw new Error(`Failed to fetch content templates: ${templatesResponse.statusText}`);
        const templatesData = await templatesResponse.json();
        if (!templatesData.success) throw new Error(templatesData.error || 'Failed to process content templates data');
        setContentTemplates(Array.isArray(templatesData.templates) ? templatesData.templates : []);

      } catch (err) {
        setError((err as Error).message || 'Failed to load workflow data.');
        toast.error((err as Error).message || 'Failed to load workflow data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, searchParams]);

  useEffect(() => {
    if (isLoadingUser || isLoading || !currentUser || !workflow || allFetchedBrands.length === 0) return;

    const isGlobalAdminUser = currentUser?.user_metadata?.role === 'admin';
    const userBrandAdminPerms = currentUser?.brand_permissions?.filter(p => p.role === 'admin').map(p => p.brand_id) || [];

    if (isGlobalAdminUser) {
      setBrands(allFetchedBrands);
    } else if (userBrandAdminPerms.length > 0) {
      const manageableBrands = allFetchedBrands.filter(b => userBrandAdminPerms.includes(b.id));
      setBrands(manageableBrands);
    } else {
      setBrands([]);
    }
  }, [isLoadingUser, isLoading, currentUser, workflow, allFetchedBrands]);

  useEffect(() => {
    const currentBrandId = workflow?.brand_id;
    if (!currentBrandId) {
      setOtherBrandWorkflows([]);
      return;
    }
    const fetchOtherBrandWorkflows = async () => {
      setIsLoadingBrandWorkflows(true);
      try {
        const response = await fetch(`/api/workflows?brand_id=${currentBrandId}`);
        if (!response.ok) throw new Error('Failed to fetch other workflows for brand');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setOtherBrandWorkflows(data.data.filter((wf: WorkflowSummary) => wf.id !== id));
        } else {
          setOtherBrandWorkflows([]);
          toast.error(data.error || 'Could not load other workflows for the brand.');
        }
      } catch (error) {
        console.error('Error fetching other brand workflows:', error);
        toast.error((error as Error).message || 'Failed to load other workflows for brand.');
        setOtherBrandWorkflows([]);
      } finally {
        setIsLoadingBrandWorkflows(false);
      }
    };
    fetchOtherBrandWorkflows();
  }, [workflow?.brand_id, id]);

  const availableContentTemplates = useMemo(() => {
    const currentWorkflowTemplateId = workflow?.template_id;
    if (!workflow?.brand_id) return contentTemplates;
    if (isLoadingBrandWorkflows && !currentWorkflowTemplateId) return [];

    const usedTemplateIdsByOtherWorkflows = new Set(
      otherBrandWorkflows.map(wf => wf.template_id).filter(Boolean)
    );
    return contentTemplates.filter(template => 
      template.id === currentWorkflowTemplateId || 
      !usedTemplateIdsByOtherWorkflows.has(template.id)
    );
  }, [contentTemplates, otherBrandWorkflows, workflow?.template_id, workflow?.brand_id, isLoadingBrandWorkflows]);

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const userBrandAdminPermissions = currentUser?.brand_permissions?.filter(p => p.role === 'admin').map(p => p.brand_id) || [];
  const canEditThisWorkflow = workflow && (isGlobalAdmin || (workflow.brand_id && userBrandAdminPermissions.includes(workflow.brand_id)));

  const debouncedUserSearch = useCallback(
    (searchTerm: string, stepIndex: number) => {
      const debouncedFn = debounce(async (term: string, index: number) => {
        if (term.trim().length < 2) {
          setUserSearchResults(prev => ({ ...prev, [index]: [] }));
          return;
        }
        setUserSearchLoading(prev => ({ ...prev, [index]: true }));
        try {
          const response = await fetch(`/api/users/search?query=${encodeURIComponent(term)}`);
          const data = await response.json();
          if (data.success && Array.isArray(data.users)) {
            setUserSearchResults(prev => ({ ...prev, [index]: data.users }));
          } else {
            setUserSearchResults(prev => ({ ...prev, [index]: [] }));
          }
        } catch (error) {
          console.error('User search error:', error);
          setUserSearchResults(prev => ({ ...prev, [index]: [] }));
        } finally {
          setUserSearchLoading(prev => ({ ...prev, [index]: false }));
        }
      }, 300);
      debouncedFn(searchTerm, stepIndex);
    },
    []
  );

  const handleAssigneeInputChange = (stepIndex: number, value: string) => {
    setAssigneeInputs(prev => {
      const newInputs = [...prev];
      newInputs[stepIndex] = value;
      return newInputs;
    });
    if (value.trim()) {
      debouncedUserSearch(value, stepIndex);
    } else {
      setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
    }
  };

  const handleAddUserToStep = (stepIndex: number, user: UserOption) => {
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newSteps = [...prevWorkflow.steps];
      const currentStep = newSteps[stepIndex];
      if (!currentStep.assignees.find(a => a.id === user.id || a.email === user.email)) {
        currentStep.assignees = [...currentStep.assignees, user];
      }
      return { ...prevWorkflow, steps: newSteps };
    });
    setAssigneeInputs(prev => {
      const newInputs = [...prev];
      newInputs[stepIndex] = '';
      return newInputs;
    });
    setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
  };

  const handleAddEmailAsAssignee = (stepIndex: number) => {
    const email = assigneeInputs[stepIndex]?.trim();
    if (email && workflow) {
      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
      }
      const currentStep = workflow.steps[stepIndex];
      if (!currentStep.assignees.some(a => a.email?.toLowerCase() === email.toLowerCase())) {
        handleAddUserToStep(stepIndex, { id: `email_${email}_${Date.now()}`, email: email, full_name: email, avatar_url: null });
      } else {
        toast.info("This email is already an assignee for this step.");
      }
    }
  };

  const handleRemoveUserFromStep = (stepIndex: number, userIdToRemove: string) => {
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newSteps = [...prevWorkflow.steps];
      newSteps[stepIndex].assignees = newSteps[stepIndex].assignees.filter(
        assignee => assignee.id !== userIdToRemove && assignee.email !== userIdToRemove // Allow removal by email if ID is temp
      );
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleUpdateWorkflowDetails = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkflow((prev: WorkflowFull | null) => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleUpdateWorkflowStatus = (value: string) => {
    setWorkflow((prev: WorkflowFull | null) => prev ? ({ ...prev, status: value }) : null);
  };

  const handleUpdateBrand = (value: string) => {
    const selectedBrand = brands.find((brand: BrandSummary) => brand.id === value);
    if (selectedBrand) {
      setWorkflow((prev: WorkflowFull | null) => prev ? ({
        ...prev,
        brand_id: selectedBrand.id,
        brand: selectedBrand, // Keep the brand object for display consistency
        template_id: null // Reset template when brand changes
      }) : null);
      setSelectedTemplateId('NO_TEMPLATE_SELECTED');
      setOtherBrandWorkflows([]);
    }
  };

  const handleUpdateTemplate = (value: string) => {
    setSelectedTemplateId(value);
    setWorkflow((prev: WorkflowFull | null) => prev ? ({
      ...prev,
      template_id: value === 'NO_TEMPLATE_SELECTED' ? null : value,
    }) : null);
  };

  const handleUpdateStepName = (index: number, value: string) => {
    setWorkflow((prev: WorkflowFull | null) => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], name: value };
      return { ...prev, steps: newSteps };
    });
  };

  const handleUpdateStepDescription = (index: number, value: string) => {
    setWorkflow((prev: WorkflowFull | null) => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], description: value };
      return { ...prev, steps: newSteps };
    });
  };

  const handleUpdateStepRole = (index: number, value: string) => {
    setWorkflow((prev: WorkflowFull | null) => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], role: value };
      return { ...prev, steps: newSteps };
    });
  };

  const handleUpdateStepApprovalRequired = (index: number, value: boolean) => {
    setWorkflow((prev: WorkflowFull | null) => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], approvalRequired: value };
      return { ...prev, steps: newSteps };
    });
  };

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
      const currentBrand = allFetchedBrands.find(b => b.id === workflow.brand_id);
      const currentTemplate = contentTemplates.find(ct => ct.id === selectedTemplateId);
      const response = await apiFetch('/api/ai/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: workflow.name,
          brandName: currentBrand?.name,
          templateName: currentTemplate?.name,
          stepName: step.name,
          role: step.role,
          existingSteps: workflow.steps.slice(0, index).map(s => ({ name: s.name, description: s.description, role: s.role }))
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }
      const data = await response.json();
      if (data.success && data.description) {
        handleUpdateStepDescription(index, data.description);
        toast.success('Step description generated!');
        } else {
        throw new Error(data.error || 'AI service did not return a description.');
        }
    } catch (error) {
      console.error('Error generating step description:', error);
      toast.error((error as Error).message || 'Could not generate step description.');
      } finally {
      setStepDescLoading(prev => ({ ...prev, [index]: false }));
      }
  };

  const handleAddStep = () => {
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newStepId = `temp_step_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const newSteps = [
        ...prevWorkflow.steps,
        {
          id: newStepId,
          name: `Review Step ${prevWorkflow.steps.length + 1}`,
          description: '',
          role: 'editor',
          approvalRequired: true,
          assignees: []
        }
      ];
      setAssigneeInputs(prevInputs => [...prevInputs, '']);
      setUserSearchResults(prevResults => ({...prevResults, [newSteps.length -1]: []}));
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!workflow || workflow.steps.length <= 1) {
      toast.error('A workflow must have at least one step.');
      return;
    }
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newSteps = prevWorkflow.steps.filter((_, i) => i !== index);
      setAssigneeInputs(prevInputs => prevInputs.filter((_, i) => i !== index));
      setUserSearchResults(prevResults => {
        const newResults = {...prevResults};
        delete newResults[index];
        return newResults;
      });
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0 || !workflow) return;
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newSteps = [...prevWorkflow.steps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setAssigneeInputs(prevInputs => {
        const newInputs = [...prevInputs];
        [newInputs[index - 1], newInputs[index]] = [newInputs[index], newInputs[index - 1]];
        return newInputs;
      });
      setUserSearchResults(prevResults => {
        const newResults = {...prevResults};
        const temp = newResults[index-1];
        newResults[index-1] = newResults[index];
        newResults[index] = temp;
        return newResults;
      });
      return { ...prevWorkflow, steps: newSteps };
    });
    toast.success('Step moved up successfully');
  };

  const handleMoveStepDown = (index: number) => {
    if (!workflow || index === workflow.steps.length - 1) return;
    setWorkflow((prevWorkflow: WorkflowFull | null) => {
      if (!prevWorkflow) return null;
      const newSteps = [...prevWorkflow.steps];
      [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
      setAssigneeInputs(prevInputs => {
        const newInputs = [...prevInputs];
        [newInputs[index + 1], newInputs[index]] = [newInputs[index], newInputs[index + 1]];
        return newInputs;
      });
      setUserSearchResults(prevResults => {
        const newResults = {...prevResults};
        const temp = newResults[index+1];
        newResults[index+1] = newResults[index];
        newResults[index] = temp;
        return newResults;
      });
      return { ...prevWorkflow, steps: newSteps };
    });
    toast.success('Step moved down successfully');
  };

  const validateWorkflow = (): boolean => {
    if (!workflow) return false;
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
        toast.error('All steps must have a name.');
        return false;
      }
      if (!step.role) {
        toast.error(`Step "${step.name}" must have an assigned role.`);
        return false;
      }
      if (!step.assignees || step.assignees.length === 0) {
        toast.error(`Step "${step.name}" must have at least one assignee.`);
        return false;
      }
    }
    return true;
  };

  const handleSaveWorkflow = async () => {
    if (!validateWorkflow() || !workflow) return;
    setIsSaving(true);
    const workflowToSave: Partial<WorkflowFull> = {
      name: workflow.name,
      description: workflow.description,
      brand_id: workflow.brand_id,
      status: workflow.status,
      template_id: selectedTemplateId === 'NO_TEMPLATE_SELECTED' ? null : selectedTemplateId,
      steps: workflow.steps.map((step, index) => ({
        // Ensure only necessary fields are sent, especially if step.id is temporary client-side ID
        id: step.id && typeof step.id === 'string' && !step.id.startsWith('temp_') && !step.id.startsWith('email_') ? step.id : uuidv4(), // Generate a proper UUID for new steps
        name: step.name,
        description: step.description,
        role: step.role,
        approvalRequired: step.approvalRequired,
        step_order: index + 1, // Add step_order based on array position
        assignees: step.assignees.map(a => ({ 
          email: a.email, 
          id: a.id && typeof a.id === 'string' && !a.id.startsWith('temp_') && !a.id.startsWith('email_') ? a.id : '', 
          full_name: a.full_name || null 
        }))
      })),
        updated_at: new Date().toISOString()
      };
      
    try {
      let response;
      let newWorkflowId;
      
      if (isDuplicated) {
        // For duplicated workflows, create a new workflow instead of updating
        response = await apiFetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowToSave)
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create workflow. Please try again.');
        }
        newWorkflowId = data.workflow?.id;
        toast.success('Workflow created successfully!');
      } else {
        // For existing workflows, update as normal
        response = await apiFetch(`/api/workflows/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowToSave)
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update workflow. Please try again.');
        }
        newWorkflowId = id;
        toast.success('Workflow updated successfully!');
      }
      
      router.push('/dashboard/workflows');
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error((error as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      const response = await apiFetch(`/api/workflows/${id}`, {
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
        (error as Error).message || 'An unexpected error occurred.',
        { description: 'Please check if content items are using this workflow.' }
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
  
  if (!workflow) {
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

  return (
    <div className="space-y-6 pb-20">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Workflows", href: "/dashboard/workflows" }, 
        { label: workflow.name || "Loading...", href: isDuplicated ? undefined : `/dashboard/workflows/${id}` },
        { label: isDuplicated ? "Create" : "Edit" }
      ]} />

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push(isDuplicated ? '/dashboard/workflows' : `/dashboard/workflows/${id}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {isDuplicated ? 'Workflows' : 'Workflow'}
      </Button>

      {currentBrandForDisplay && (
        <div className="my-4">
          <ActiveBrandIndicator
            brandName={currentBrandForDisplay.name}
            brandColor={currentBrandForDisplay.color}
            brandLogoUrl={currentBrandForDisplay.logo_url}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {currentBrandForDisplay && 
            <BrandIcon name={currentBrandForDisplay.name} color={currentBrandForDisplay.color ?? undefined} logoUrl={currentBrandForDisplay.logo_url} size="md" className="mr-1" />
          }
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isDuplicated ? 'Create New Workflow' : `Edit: ${workflow.name || 'Workflow'}`}</h1>
            <p className="text-muted-foreground mt-1">
              {isDuplicated ? 'Configure the details for your new workflow based on the duplicated template.' : 'Modify the details, steps, assignees, and other settings for this workflow.'}
              {currentBrandForDisplay && <span className="block text-xs">For Brand: {currentBrandForDisplay.name}</span>}
            </p>
          </div>
        </div>
        {!isDuplicated && (
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
          </div>
        )}
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
                  disabled={!canEditThisWorkflow}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={workflow.status || 'draft'} onValueChange={handleUpdateWorkflowStatus} disabled={!canEditThisWorkflow}>
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
                <Select value={workflow.brand_id || ''} onValueChange={handleUpdateBrand} disabled={!canEditThisWorkflow || (brands.length === 0 && !isGlobalAdmin)}>
                  <SelectTrigger>
                    <SelectValue placeholder={brands.length === 0 && !isGlobalAdmin ? "No brands assigned" : "Select brand"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand: BrandSummary) => (
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
                 {brands.length === 0 && isGlobalAdmin && (
                  <p className="text-xs text-muted-foreground">No brands found. <Link href="/dashboard/brands/new" className="underline">Create one?</Link></p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contentTemplate">Content Template (Optional)</Label>
                <Select 
                  value={selectedTemplateId || 'NO_TEMPLATE_SELECTED'} 
                  onValueChange={handleUpdateTemplate} 
                  disabled={!canEditThisWorkflow || !workflow?.brand_id || isLoadingBrandWorkflows}
                >
                  <SelectTrigger id="contentTemplate">
                    <SelectValue placeholder={!workflow?.brand_id ? "Select a brand first" : isLoadingBrandWorkflows ? "Loading templates..." : "Select a content template"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_TEMPLATE_SELECTED">No Template</SelectItem>
                    {availableContentTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                     {workflow?.brand_id && !isLoadingBrandWorkflows && availableContentTemplates.length === 0 && contentTemplates.length > 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            All templates are in use for this brand, or no templates available.
                        </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center">
                 <Info className="h-3 w-3 mr-1 shrink-0" /> Link this workflow to a template.
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
            {(!workflow.steps || workflow.steps.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined for this workflow. Click &quot;Add Step&quot; to create your first workflow step.
              </div>
            ) : (
              <div className="space-y-6">
                {workflow.steps.map((step: WorkflowStepDefinition, index: number) => (
                  <div key={step.id || `step-${index}`} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Input
                            id={`step-name-${index}`}
                            value={step.name}
                            onChange={(e) => handleUpdateStepName(index, e.target.value)}
                            placeholder={`Step ${index + 1} Name`}
                            className="text-base font-medium flex-grow"
                            disabled={!canEditThisWorkflow}
                          />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepUp(index)}
                            disabled={index === 0 || !canEditThisWorkflow}
                            aria-label="Move step up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepDown(index)}
                            disabled={index === workflow.steps.length - 1 || !canEditThisWorkflow}
                            aria-label="Move step down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="text-destructive hover:text-destructive/90"
                            aria-label="Remove step"
                            disabled={!canEditThisWorkflow || workflow.steps.length <=1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                        </div>
                        
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Assigned Role</Label>
                          <RoleSelectionCards 
                        selectedRole={step.role}
                        onRoleSelect={(roleId) => handleUpdateStepRole(index, roleId)}
                            disabled={!canEditThisWorkflow}
                          />
                      </div>
                      
                    <div className="mb-4 space-y-2">
                      <Label htmlFor={`step-description-${index}`} className="text-sm font-medium">Step Description</Label>
                       <div className="relative">
                        <Textarea
                          id={`step-description-${index}`}
                          value={step.description}
                          onChange={(e) => handleUpdateStepDescription(index, e.target.value)}
                          placeholder="Describe the purpose or actions for this step..."
                          rows={3}
                          className="pr-32" 
                          disabled={!canEditThisWorkflow}
                        />
                          <Button 
                             type="button" 
                             variant="outline" 
                             size="sm" 
                             onClick={() => handleGenerateStepDescription(index)}
                            disabled={stepDescLoading[index] || !step.name || !step.role || !canEditThisWorkflow}
                            className="absolute bottom-2 right-2"
                           >
                            {stepDescLoading[index] ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating...</>
                            ) : (
                                <>✨ Auto-Generate</>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                    <div className="flex items-center space-x-2 mb-4">
                        <Switch
                        id={`approval-required-${index}`}
                          checked={!step.approvalRequired}
                        onCheckedChange={(checked) => handleUpdateStepApprovalRequired(index, !checked)}
                          disabled={!canEditThisWorkflow}
                        />
                      <Label htmlFor={`approval-required-${index}`} className="text-sm font-medium cursor-pointer">
                        This step is optional (approval not strictly required)
                      </Label>
                      </div>
                      
                    <div className="space-y-3">
                        <Label htmlFor={`assignee-input-${index}`} className="text-sm font-medium">Assign Users <span className="text-destructive">*</span></Label>
                        <div className="flex items-center gap-2">
                          <Input
                                id={`assignee-input-${index}`}
                                type="text"
                                placeholder="Enter email or search by name/email"
                            value={assigneeInputs[index] || ''}
                                onChange={(e) => handleAssigneeInputChange(index, e.target.value)}
                                className="flex-grow"
                            disabled={!canEditThisWorkflow}
                          />
                          <Button 
                                type="button" 
                                onClick={() => handleAddEmailAsAssignee(index)}
                                disabled={!canEditThisWorkflow || !assigneeInputs[index]?.trim() || !assigneeInputs[index]?.includes('@')}
                            variant="outline" 
                          >
                                <UserPlus className="mr-2 h-4"/> Add Email
                          </Button>
                        </div>

                        {userSearchLoading[index] && <div className="text-sm text-muted-foreground py-2"><Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />Searching users...</div>}
                          {userSearchResults[index] && userSearchResults[index].length > 0 && (
                            <Card className="mt-2 max-h-48 overflow-y-auto">
                                <CardContent className="p-2 space-y-1">
                                    {userSearchResults[index].map((user) => (
                                        <button
                                  key={user.id}
                                            type="button"
                                            onClick={() => handleAddUserToStep(index, user)}
                                            className="w-full text-left p-2 hover:bg-accent rounded-md text-sm flex items-center justify-between"
                                            disabled={!canEditThisWorkflow}
                                >
                                          <span>{user.full_name || user.email} {user.full_name && user.email && `(${user.email})`}</span>
                                          <Plus className="h-4 w-4 text-muted-foreground" />
                                        </button>
                              ))}
                                </CardContent>
                            </Card>
                          )}
                        {assigneeInputs[index] && userSearchResults[index]?.length === 0 && !userSearchLoading[index] && assigneeInputs[index].length >=2 && (
                             <p className="text-sm text-muted-foreground py-2">No users found matching &quot;{assigneeInputs[index]}&quot;. You can still add by full email address.</p>
                        )}

                        {step.assignees.length > 0 ? (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">Assigned:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {step.assignees.map((assignee) => (
                                        <Badge key={assignee.id || assignee.email} variant="secondary" className="pl-2 text-sm">
                                            {assignee.full_name || assignee.email}
                                <button
                                  type="button"
                                                onClick={() => handleRemoveUserFromStep(index, assignee.id || assignee.email!)}
                                                className="ml-1.5 p-0.5 rounded-full hover:bg-destructive/20 text-destructive"
                                                aria-label={`Remove ${assignee.full_name || assignee.email}`}
                                                disabled={!canEditThisWorkflow}
                                >
                                                <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </Badge>
                                    ))}
                        </div>
                      </div>
                        ) : (
                            <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10">
                                <p className="text-sm text-destructive">No assignees added. At least one assignee is required for this step.</p>
                            </div>
                        )}
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

      <div className="flex justify-end space-x-3 mt-8 sticky bottom-0 bg-background py-4 px-4 -mx-4 z-10 border-t border-border">
        <Button variant="outline" onClick={() => router.push('/dashboard/workflows')} disabled={isSaving || isDeleting}>
            Cancel
        </Button>
        <Button onClick={handleSaveWorkflow} disabled={isSaving || isDeleting || !canEditThisWorkflow}>
            {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isDuplicated ? 'Creating...' : 'Saving...'}</>
            ) : (
              isDuplicated ? 'Create Workflow' : 'Save Changes'
            )}
        </Button>
      </div>
    </div>
  );
} 