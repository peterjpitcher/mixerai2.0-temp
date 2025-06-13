'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2, ArrowLeft, ShieldAlert, UserPlus } from 'lucide-react';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/brand-icon';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

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

// Define UserOption for assignee structures
interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null; // Optional, typically used for display
}

// Define WorkflowStep interface for clarity
interface WorkflowStep {
  id: string; // Can be temp_step_id or actual UUID from DB
  name: string;
  description: string;
  role: string;
  approvalRequired: boolean;
  assignees: UserOption[]; // Changed from string[] to UserOption[]
}

interface WorkflowData {
  name: string;
  description: string;
  brand_id: string;
  status: string;
  template_id: string | null;
  steps: WorkflowStep[];
}

interface WorkflowSummary { // For storing fetched workflows for brand
  id: string;
  template_id?: string | null;
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
}

const RoleSelectionCards: React.FC<RoleSelectionCardsProps> = ({ selectedRole, onRoleSelect }) => {
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

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allFetchedBrands, setAllFetchedBrands] = useState<Brand[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('NO_TEMPLATE_SELECTED');
  const [brandWorkflows, setBrandWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoadingBrandWorkflows, setIsLoadingBrandWorkflows] = useState(false);

  const [stepDescLoading, setStepDescLoading] = useState<Record<number, boolean>>({});

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [workflow, setWorkflow] = useState<WorkflowData>(() => ({ 
    name: '',
    description: '',
    brand_id: '',
    status: 'active',
    template_id: null,
    steps: [
      {
        id: `temp_step_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        name: 'Review Step 1',
        description: 'Initial review of the content.',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      }
    ]
  }));
  
  const selectedBrandFull = brands.find(b => b.id === workflow.brand_id);

  const [assigneeInputs, setAssigneeInputs] = useState<string[]>(() => new Array(workflow.steps.length).fill(''));
  const [userSearchResults, setUserSearchResults] = useState<Record<number, UserOption[]>>({});
  const [userSearchLoading, setUserSearchLoading] = useState<Record<number, boolean>>({});

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

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  
  const hasAnyBrandAdminPermission = currentUser?.brand_permissions?.some(p => p.role === 'admin');

  const canAccessPage = isGlobalAdmin || hasAnyBrandAdminPermission;

  useEffect(() => {
    if (isLoadingUser) return; 

    if (!canAccessPage) {
      setIsLoading(false); 
      // Redirect or show access denied message.
      // router.push('/dashboard'); // Example redirect
      // toast.error("You don't have permission to create workflows.");
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

        const templatesResponse = await fetch('/api/content-templates');
        if (!templatesResponse.ok) throw new Error(`Failed to fetch content templates: ${templatesResponse.status}`);
        const templatesData = await templatesResponse.json();
        if (!templatesData.success) throw new Error(templatesData.error || 'Failed to fetch content templates data');
        setContentTemplates(Array.isArray(templatesData.templates) ? templatesData.templates : []);

      } catch (error) {
        console.error('Error fetching initial data for new workflow page:', error);
        toast.error((error as Error).message || 'Failed to load initial data.');
      } finally {
        setIsLoading(false); 
      }
    };
    fetchInitialData();
  }, [isLoadingUser, canAccessPage, router]);


  useEffect(() => {
    if (isLoadingUser || !currentUser) return;

    let userSpecificBrands: Brand[];
    if (isGlobalAdmin) {
      userSpecificBrands = allFetchedBrands;
    } else {
      const adminBrandIds = currentUser?.brand_permissions
                              ?.filter(p => p.role === 'admin')
                              .map(p => p.brand_id) || [];
      userSpecificBrands = allFetchedBrands.filter(brand => adminBrandIds.includes(brand.id));
    }
    setBrands(userSpecificBrands);
    
    if (userSpecificBrands.length > 0 && !workflow.brand_id) {
      setWorkflow(prev => ({ ...prev, brand_id: userSpecificBrands[0].id }));
    } else if (userSpecificBrands.length === 0 && !isGlobalAdmin) {
       toast.info("You are not an administrator for any brands. Please contact an administrator to gain access.", { duration: 5000 });
    }

  }, [isLoadingUser, currentUser, allFetchedBrands, isGlobalAdmin, workflow.brand_id]);

  // Fetch workflows for the selected brand
  useEffect(() => {
    if (!workflow.brand_id) {
      setBrandWorkflows([]); // Clear if no brand is selected
      return;
    }
    const fetchBrandWorkflows = async () => {
      setIsLoadingBrandWorkflows(true);
      try {
        const response = await fetch(`/api/workflows?brand_id=${workflow.brand_id}`);
        if (!response.ok) throw new Error('Failed to fetch workflows for brand');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setBrandWorkflows(data.data);
        } else {
          setBrandWorkflows([]);
          toast.error(data.error || 'Could not load workflows for the selected brand.');
        }
      } catch (error) {
        console.error('Error fetching brand workflows:', error);
        toast.error((error as Error).message || 'Failed to load workflows for brand.');
        setBrandWorkflows([]);
      } finally {
        setIsLoadingBrandWorkflows(false);
      }
    };
    fetchBrandWorkflows();
  }, [workflow.brand_id]);

  // Memoize available content templates
  const availableContentTemplates = useMemo(() => {
    if (!workflow.brand_id) {
      // If no brand is selected, show all templates initially or templates not tied to any brand.
      // For simplicity here, showing all if no brand. Could be refined.
      return contentTemplates;
    }
    if (isLoadingBrandWorkflows || brandWorkflows.length === 0 && workflow.brand_id) {
        // If loading or no workflows for the brand yet, all templates are available
        return contentTemplates;
    }
    const usedTemplateIds = new Set(brandWorkflows.map(wf => wf.template_id).filter(Boolean));
    return contentTemplates.filter(template => !usedTemplateIds.has(template.id));
  }, [contentTemplates, brandWorkflows, workflow.brand_id, isLoadingBrandWorkflows]);

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
          if (data.success) {
            setUserSearchResults(prev => ({ ...prev, [index]: data.users }));
          } else {
            setUserSearchResults(prev => ({ ...prev, [index]: [] }));
            // Optionally toast an error: toast.error(`Search failed: ${data.error}`);
          }
        } catch (error) {
          console.error('User search error:', error);
          setUserSearchResults(prev => ({ ...prev, [index]: [] }));
          // Optionally toast an error: toast.error('Failed to search users.');
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
      setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] })); // Clear results if input is empty
    }
  };

  const handleAddUserToStep = (stepIndex: number, user: UserOption) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      const currentStep = newSteps[stepIndex];
      if (!currentStep.assignees.find(a => a.id === user.id)) {
        currentStep.assignees = [...currentStep.assignees, user];
      }
      return { ...prevWorkflow, steps: newSteps };
    });
    // Clear input and search results for this step
    setAssigneeInputs(prev => {
      const newInputs = [...prev];
      newInputs[stepIndex] = '';
      return newInputs;
    });
    setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
  };


  // Function to add an email address as an assignee if it's not already in the list
  // This is typically called when an "Add" button next to the email input is clicked
  const handleAddEmailAsAssignee = (stepIndex: number) => {
    const email = assigneeInputs[stepIndex]?.trim();
    if (email) {
      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address.");
        return;
      }

      setWorkflow(prevWorkflow => {
        const newSteps = [...prevWorkflow.steps];
        const currentStep = newSteps[stepIndex];
        // Check if email already exists (case-insensitive check)
        if (!currentStep.assignees.some(a => a.email?.toLowerCase() === email.toLowerCase())) {
          // Add as a new assignee with a temporary ID, assuming email is the primary identifier here
          currentStep.assignees = [...currentStep.assignees, { id: `email_${email}_${Date.now()}`, email: email, full_name: email }];
        } else {
          toast.info("This email is already an assignee for this step.");
        }
        return { ...prevWorkflow, steps: newSteps };
      });
      // Clear input and search results for this step
      setAssigneeInputs(prev => {
        const newInputs = [...prev];
        newInputs[stepIndex] = '';
        return newInputs;
      });
      setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
    }
  };

  const handleRemoveUserFromStep = (stepIndex: number, userIdToRemove: string) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      newSteps[stepIndex].assignees = newSteps[stepIndex].assignees.filter(
        user => user.id !== userIdToRemove
      );
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleUpdateWorkflowDetails = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkflow(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateWorkflowStatus = (value: string) => {
    setWorkflow(prev => ({ ...prev, status: value }));
  };

  const handleUpdateBrand = (value: string) => {
    setWorkflow(prev => ({ 
        ...prev, 
        brand_id: value,
        template_id: null // Reset template when brand changes
    }));
    setSelectedTemplateId('NO_TEMPLATE_SELECTED'); // Reset UI for template dropdown
    setBrandWorkflows([]); // Clear old brand workflows immediately
  };

  const handleUpdateTemplate = (value: string) => {
    setSelectedTemplateId(value);
    setWorkflow(prev => ({ ...prev, template_id: value === 'NO_TEMPLATE_SELECTED' ? null : value }));
  };

  const handleUpdateStepName = (index: number, value: string) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      newSteps[index].name = value;
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleUpdateStepDescription = (index: number, value: string) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      newSteps[index].description = value;
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleUpdateStepRole = (index: number, value: string) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      newSteps[index].role = value;
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleUpdateStepApprovalRequired = (index: number, value: boolean) => {
    setWorkflow(prevWorkflow => {
      const newSteps = [...prevWorkflow.steps];
      newSteps[index].approvalRequired = value;
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleGenerateStepDescription = async (stepIndex: number) => {
    setStepDescLoading(prev => ({ ...prev, [stepIndex]: true }));
    try {
      const step = workflow.steps[stepIndex];
      const response = await fetch('/api/ai/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: workflow.name,
          workflowDescription: workflow.description,
          stepName: step.name,
          role: step.role,
          existingSteps: workflow.steps.slice(0, stepIndex).map(s => ({ name: s.name, description: s.description, role: s.role }))
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }
      const data = await response.json();
      if (data.success && data.description) {
        handleUpdateStepDescription(stepIndex, data.description);
        toast.success('Step description generated!');
      } else {
        throw new Error(data.error || 'No description returned from AI');
      }
    } catch (error) {
      console.error('Error generating step description:', error);
      toast.error((error as Error).message || 'Could not generate step description.');
    } finally {
      setStepDescLoading(prev => ({ ...prev, [stepIndex]: false }));
    }
  };

  const handleAddStep = () => {
    setWorkflow(prevWorkflow => {
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
      setAssigneeInputs(prevInputs => [...prevInputs, '']); // Add input state for new step
      setUserSearchResults(prevResults => ({...prevResults, [newSteps.length -1]: []})); // Init search results for new step
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleRemoveStep = (index: number) => {
    setWorkflow(prevWorkflow => {
      const newSteps = prevWorkflow.steps.filter((_, i) => i !== index);
      setAssigneeInputs(prevInputs => prevInputs.filter((_, i) => i !== index));
      setUserSearchResults(prevResults => {
        const newResults = {...prevResults};
        delete newResults[index];
        // Adjust keys for subsequent steps if necessary, though usually direct key removal is fine
        // if keys are simply step indices. If other logic relies on a contiguous sequence of keys,
        // then re-indexing might be needed, but for this state structure, it's okay.
        return newResults;
      });
      return { ...prevWorkflow, steps: newSteps };
    });
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setWorkflow(prevWorkflow => {
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
  };

  const handleMoveStepDown = (index: number) => {
    if (index === workflow.steps.length - 1) return;
    setWorkflow(prevWorkflow => {
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
        toast.error('All steps must have a name.');
        return false;
      }
      if (!step.role) {
        toast.error(`Step "${step.name}" must have an assigned role.`);
        return false;
      }
    }
    return true;
  };

  const handleCreateWorkflow = async () => {
    if (!validateWorkflow()) return;
    setIsSaving(true);

    const workflowToSave = {
      ...workflow,
      steps: workflow.steps.map(step => ({
        ...step,
        // Ensure assignees are just an array of user IDs or emails if that's what backend expects.
        // If backend expects UserOption[], then this map might not be needed for assignees.
        // For now, assuming backend handles UserOption[] or that this structure is what's saved.
        // Example: assignees: step.assignees.map(a => a.id) if only IDs are needed.
      }))
    };

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowToSave),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workflow. Please try again.');
      }
      toast.success('Workflow created successfully!');
      router.push(`/dashboard/workflows`); // Navigate to workflows list page
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error((error as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading user data...</p>
      </div>
    );
  }

  if (!canAccessPage) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">
          You do not have permission to create new workflows.
          <br />
          Please contact an administrator if you believe this is an error.
        </p>
        <Link href="/dashboard" passHref>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading initial data...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Workflows", href: "/dashboard/workflows" }, 
        { label: "New" }
      ]} />

      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
           <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/workflows')} aria-label="Back to Workflows">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {selectedBrandFull && 
            <BrandIcon name={selectedBrandFull.name} color={selectedBrandFull.color ?? undefined} size="md" className="mr-1" />
          }
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Workflow</h1>
            <p className="text-muted-foreground mt-1">
              Design and configure a new content approval workflow.
              {selectedBrandFull && <span className="block text-xs">For Brand: {selectedBrandFull.name}</span>}
            </p>
          </div>
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
                <Label htmlFor="name">Workflow Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={workflow.name}
                  onChange={handleUpdateWorkflowDetails}
                  placeholder="e.g., Blog Post Approval"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={workflow.status} onValueChange={handleUpdateWorkflowStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Brand <span className="text-destructive">*</span></Label>
                <Select value={workflow.brand_id} onValueChange={handleUpdateBrand} disabled={brands.length === 0 && !isGlobalAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder={brands.length === 0 && !isGlobalAdmin ? "No brands assigned" : "Select brand"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.length === 0 && !isGlobalAdmin && (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        You are not an admin for any brands.
                      </div>
                    )}
                    {brands.map((brand) => (
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
                  value={selectedTemplateId} 
                  onValueChange={handleUpdateTemplate}
                  disabled={!workflow.brand_id || isLoadingBrandWorkflows}
                >
                  <SelectTrigger id="contentTemplate">
                    <SelectValue placeholder={!workflow.brand_id ? "Select a brand first" : isLoadingBrandWorkflows ? "Loading templates..." : "Select a content template"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_TEMPLATE_SELECTED">No Template</SelectItem>
                    {availableContentTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                    {workflow.brand_id && !isLoadingBrandWorkflows && availableContentTemplates.length === 0 && contentTemplates.length > 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            All templates are in use for this brand.
                        </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this workflow to a template to auto-apply it when new content is created from that template for the selected brand.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="description">Workflow Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={workflow.description}
                onChange={handleUpdateWorkflowDetails}
                placeholder="Briefly describe what this workflow is for..."
                rows={3}
              />
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
              <Button onClick={handleAddStep} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {workflow.steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined for this workflow. Click &quot;Add Step&quot; to create your first workflow step.
              </div>
            ) : (
              <div className="space-y-6">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4 bg-background">
                    {/* Step Header: Number, Name Input, Action Buttons */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                        <Label htmlFor={`step-name-${index}`} className="sr-only">Step Name <span className="text-destructive">*</span></Label>
                        <Input
                          id={`step-name-${index}`}
                          value={step.name}
                          onChange={(e) => handleUpdateStepName(index, e.target.value)}
                          placeholder={`Step ${index + 1} Name *`}
                          className="text-base font-medium flex-grow"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepUp(index)}
                          disabled={index === 0}
                          aria-label="Move step up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveStepDown(index)}
                          disabled={index === workflow.steps.length - 1}
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
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Assigned Role <span className="text-destructive">*</span></Label>
                      <RoleSelectionCards
                        selectedRole={step.role}
                        onRoleSelect={(roleId) => handleUpdateStepRole(index, roleId)}
                      />
                    </div>

                    {/* Step Description */}
                    <div className="mb-4 space-y-2">
                      <Label htmlFor={`step-description-${index}`} className="text-sm font-medium">Step Description</Label>
                       <div className="relative">
                        <Textarea
                          id={`step-description-${index}`}
                          value={step.description}
                          onChange={(e) => handleUpdateStepDescription(index, e.target.value)}
                          placeholder="Describe the purpose or actions for this step..."
                          rows={3}
                          className="pr-28" // Add padding to the right for the button
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateStepDescription(index)}
                            disabled={stepDescLoading[index]}
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

                    {/* Optional Step Switch */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id={`approval-required-${index}`}
                        checked={!step.approvalRequired} // UI shows "Optional", so invert logic
                        onCheckedChange={(checked) => handleUpdateStepApprovalRequired(index, !checked)}
                      />
                      <Label htmlFor={`approval-required-${index}`} className="text-sm font-medium cursor-pointer">
                        This step is optional (approval not strictly required)
                      </Label>
                    </div>
                    
                    {/* Assignees Section */}
                    <div className="space-y-3">
                        <Label htmlFor={`assignee-input-${index}`} className="text-sm font-medium">Assign Users (Optional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id={`assignee-input-${index}`}
                                type="text"
                                placeholder="Enter email or search by name/email"
                                value={assigneeInputs[index] || ''}
                                onChange={(e) => handleAssigneeInputChange(index, e.target.value)}
                                className="flex-grow"
                            />
                            <Button 
                                type="button" 
                                onClick={() => handleAddEmailAsAssignee(index)}
                                disabled={!assigneeInputs[index]?.trim() || !assigneeInputs[index]?.includes('@')}
                                variant="outline"
                            >
                                <UserPlus className="mr-2 h-4"/> Add Email
                            </Button>
                        </div>

                        {/* User Search Results */}
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


                        {/* Added Assignees Badges */}
                        {step.assignees.length > 0 && (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">Assigned:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {step.assignees.map((assignee) => (
                                        <Badge key={assignee.id} variant="secondary" className="pl-2 text-sm">
                                            {assignee.full_name || assignee.email}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveUserFromStep(index, assignee.id)}
                                                className="ml-1.5 p-0.5 rounded-full hover:bg-destructive/20 text-destructive"
                                                aria-label={`Remove ${assignee.full_name || assignee.email}`}
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
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

      <div className="flex justify-end space-x-3 mt-8 sticky bottom-0 bg-background/95 py-4 z-10 border-t border-border">
        <Button variant="outline" onClick={() => router.push('/dashboard/workflows')} disabled={isSaving}>
            Cancel
        </Button>
        <Button onClick={handleCreateWorkflow} disabled={isSaving || isLoading}>
          {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            'Create Workflow'
          )}
        </Button>
      </div>
      
    </div>
  );
} 