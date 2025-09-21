'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, ChevronUp, XCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';
import { apiFetch } from '@/lib/api-client';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  role: string;
  assignees: UserOption[];
}

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

// Define the role card selection component
const roles = [
  { id: 'lrc', name: 'Labelling and Regulatory Compliance', description: 'Reviews claims for accuracy, regulatory requirements, and labelling standards across all markets' },
  { id: 'bdt', name: 'Brand Development Team', description: 'Ensures claims align with brand positioning, messaging strategy, and marketing objectives' },
  { id: 'mat', name: 'Market Activation Team', description: 'Validates claims for local market requirements, cultural appropriateness, and regional compliance' },
  { id: 'legal', name: 'Legal', description: 'Verifies claims meet all legal requirements, substantiation standards, and risk management protocols' },
  { id: 'sme', name: 'Subject Matter Expert', description: 'Provides technical expertise on specific ingredients, formulations, or scientific claims' },
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

export default function NewClaimsWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: `temp_step_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      name: 'Initial Review',
      description: '',
      role: 'lrc',
      assignees: [],
    },
  ]);
  const [isLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stepDescLoading, setStepDescLoading] = useState<Record<number, boolean>>({});
  
  // User search states
  const [assigneeInputs, setAssigneeInputs] = useState<string[]>(() => new Array(steps.length).fill(''));
  const [userSearchResults, setUserSearchResults] = useState<Record<number, UserOption[]>>({});
  const [userSearchLoading, setUserSearchLoading] = useState<Record<number, boolean>>({});

  // Debounced user search function
  const debouncedSearchFn = debounce(async (query: string, stepIndex: number) => {
      if (!query || query.length < 2) {
        setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
        return;
      }

      setUserSearchLoading(prev => ({ ...prev, [stepIndex]: true }));
      
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.users)) {
          // Filter out already assigned users
          const currentAssigneeIds = steps[stepIndex].assignees.map(a => a.id);
          const filteredUsers = data.users.filter((user: UserOption) => !currentAssigneeIds.includes(user.id));
          setUserSearchResults(prev => ({ ...prev, [stepIndex]: filteredUsers }));
        } else {
          setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
      } finally {
        setUserSearchLoading(prev => ({ ...prev, [stepIndex]: false }));
      }
    }, 300);

  const searchUsers = useCallback((query: string, stepIndex: number) => {
    debouncedSearchFn(query, stepIndex);
  }, [debouncedSearchFn]);

  const handleAssigneeInputChange = (stepIndex: number, value: string) => {
    setAssigneeInputs(prev => {
      const newInputs = [...prev];
      newInputs[stepIndex] = value;
      return newInputs;
    });
    searchUsers(value, stepIndex);
  };

  const handleAddUserToStep = (stepIndex: number, user: UserOption) => {
    setSteps(prev => {
      const newSteps = [...prev];
      // Check if user is already assigned to prevent duplicates
      const isAlreadyAssigned = newSteps[stepIndex].assignees.some(
        assignee => assignee.id === user.id
      );
      
      if (!isAlreadyAssigned) {
        newSteps[stepIndex].assignees = [...newSteps[stepIndex].assignees, user];
      }
      return newSteps;
    });
    
    // Clear search
    setAssigneeInputs(prev => {
      const newInputs = [...prev];
      newInputs[stepIndex] = '';
      return newInputs;
    });
    setUserSearchResults(prev => ({ ...prev, [stepIndex]: [] }));
  };

  const handleAddEmailAsAssignee = (stepIndex: number) => {
    const email = assigneeInputs[stepIndex]?.trim();
    if (!email || !email.includes('@')) return;
    
    // Check if email is already assigned
    const isEmailAlreadyAssigned = steps[stepIndex].assignees.some(
      assignee => assignee.email === email
    );
    
    if (isEmailAlreadyAssigned) {
      toast.error('This email is already assigned to this step');
      return;
    }
    
    const newUser: UserOption = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      email: email,
      full_name: null
    };
    
    handleAddUserToStep(stepIndex, newUser);
  };

  const handleRemoveUserFromStep = (stepIndex: number, userId: string) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[stepIndex].assignees = newSteps[stepIndex].assignees.filter(user => user.id !== userId);
      return newSteps;
    });
  };

  const handleUpdateStepName = (index: number, value: string) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index].name = value;
      return newSteps;
    });
  };

  const handleUpdateStepDescription = (index: number, value: string) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index].description = value;
      return newSteps;
    });
  };

  const handleUpdateStepRole = (index: number, value: string) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index].role = value;
      return newSteps;
    });
  };

  const handleGenerateStepDescription = async (stepIndex: number) => {
    setStepDescLoading(prev => ({ ...prev, [stepIndex]: true }));
    try {
      const step = steps[stepIndex];
      const response = await apiFetch('/api/ai/generate-step-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowName: name,
          workflowDescription: description,
          stepName: step.name,
          role: step.role,
          existingSteps: steps.slice(0, stepIndex).map(s => ({ name: s.name, description: s.description, role: s.role }))
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

  // Function kept for future use
  void ((stepIndex: number, role: string) => {
    const roleLabel = roles.find(r => r.id === role)?.name || role.toUpperCase();
    const stepNumber = stepIndex + 1;
    return `Step ${stepNumber}: ${roleLabel} Review`;
  });

  const handleAddStep = () => {
    const newStepId = `temp_step_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const newStep: WorkflowStep = {
      id: newStepId,
      name: `Review Step ${steps.length + 1}`,
      description: '',
      role: 'lrc',
      assignees: [],
    };
    setSteps([...steps, newStep]);
    setAssigneeInputs(prev => [...prev, '']);
    setUserSearchResults(prev => ({ ...prev, [steps.length]: [] }));
    
    // Scroll to the new step after it's added
    setTimeout(() => {
      const newStepElement = document.getElementById(`step-${newStepId}`);
      if (newStepElement) {
        newStepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('A workflow must have at least one step');
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
    setAssigneeInputs(prev => prev.filter((_, i) => i !== index));
    setUserSearchResults(prev => {
      const newResults = { ...prev };
      delete newResults[index];
      return newResults;
    });
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setSteps(prev => {
      const newSteps = [...prev];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      return newSteps;
    });
  };

  const handleMoveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    setSteps(prev => {
      const newSteps = [...prev];
      [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
      return newSteps;
    });
  };

  const validateWorkflow = () => {
    if (!name.trim()) {
      toast.error('Workflow name is required.');
      return false;
    }
    if (steps.length === 0) {
      toast.error('A workflow must have at least one step.');
      return false;
    }
    for (const step of steps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateWorkflow()) return;

    setIsSaving(true);

    try {
      const response = await apiFetch('/api/claims/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          is_active: status === 'active',
          steps: steps.map(step => ({
            name: step.name.trim(),
            description: step.description.trim(),
            role: step.role,
            approval_required: true, // Always true for claims workflows
            assigned_user_ids: step.assignees.map(a => a.id),
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Claims workflow created successfully!');
        router.push('/dashboard/claims/workflows');
      } else {
        throw new Error(data.error || 'Failed to create workflow');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Workflows", href: "/dashboard/claims/workflows" },
        { label: "New" }
      ]} />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/claims/workflows')} aria-label="Back to Claims Workflows">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Claims Workflow</h1>
            <p className="text-muted-foreground mt-1">
              Design and configure approval steps for claims validation.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
              <CardDescription>Basic information about the claims approval workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Workflow Name <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Standard Claims Review"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <Label htmlFor="status" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Status</Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <Label htmlFor="description" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Workflow Description (Optional)</Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the purpose of this workflow..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workflow Steps</CardTitle>
                  <CardDescription>Define the approval stages for claims validation.</CardDescription>
                </div>
                <Button type="button" onClick={handleAddStep} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No steps defined for this workflow. Click &ldquo;Add Step&rdquo; to create your first workflow step.
                </div>
              ) : (
                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <div key={step.id} id={`step-${step.id}`} className="border rounded-lg p-4 bg-background">
                      {/* Step Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                            {index + 1}
                          </span>
                          <Label htmlFor={`step-name-${index}`} className="sr-only">Step Name <span className="text-destructive">*</span></Label>
                          <Input
                            id={`step-name-${index}`}
                            value={step.name}
                            onChange={(e) => handleUpdateStepName(index, e.target.value)}
                            placeholder={`Step ${index + 1} Name *`}
                            className="text-base font-medium flex-1"
                          />
                        </div>
                        <div className="flex items-center space-x-1 ml-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveStepUp(index)}
                            disabled={index === 0}
                            aria-label="Move step up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveStepDown(index)}
                            disabled={index === steps.length - 1}
                            aria-label="Move step down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
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
                            className="pr-28"
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

                      {/* Assignees Section */}
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
                          />
                          <Button 
                            type="button" 
                            onClick={() => handleAddEmailAsAssignee(index)}
                            disabled={!assigneeInputs[index]?.trim() || !assigneeInputs[index]?.includes('@')}
                            variant="outline"
                          >
                            <UserPlus className="mr-2 h-4 w-4"/> Add Email
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAddUserToStep(index, user);
                                  }}
                                  className="w-full text-left p-2 hover:bg-accent rounded-md text-sm flex items-center justify-between"
                                >
                                  <span>{user.full_name || user.email} {user.full_name && user.email && `(${user.email})`}</span>
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </button>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                        {assigneeInputs[index] && userSearchResults[index]?.length === 0 && !userSearchLoading[index] && assigneeInputs[index].length >= 2 && (
                          <p className="text-sm text-muted-foreground py-2">No users found matching &ldquo;{assigneeInputs[index]}&rdquo;. You can still add by full email address.</p>
                        )}

                        {/* Added Assignees Badges */}
                        {step.assignees.length > 0 ? (
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

        <Card>
          <CardFooter className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/claims/workflows')} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Create Workflow'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
