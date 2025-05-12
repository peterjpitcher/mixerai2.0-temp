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
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { debounce } from 'lodash';

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

interface Brand {
  id: string;
  name: string;
  color?: string; // Ensure brand object has color if used directly
}

interface ContentTemplateSummary {
  id: string;
  name: string;
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // State for per-step assignee handling (like edit page)
  const [assigneeInputs, setAssigneeInputs] = useState<string[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<Record<number, any[]>>({});
  const [userSearchLoading, setUserSearchLoading] = useState<Record<number, boolean>>({});

  const [workflow, setWorkflow] = useState<any>({
    name: '',
    description: '',
    brand_id: '',
    status: 'draft',
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
  
  // Initialize/resize assigneeInputs when steps change
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
  }, [workflow?.steps?.length]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const brandsResponse = await fetch('/api/brands');
        if (!brandsResponse.ok) throw new Error(`Failed to fetch brands: ${brandsResponse.status}`);
        const brandsData = await brandsResponse.json();
        if (!brandsData.success) throw new Error(brandsData.error || 'Failed to process brands data');
        const fetchedBrands = brandsData.data || [];
        setBrands(fetchedBrands);
        if (fetchedBrands.length > 0) {
          setWorkflow(prev => ({ ...prev, brand_id: fetchedBrands[0].id })); 
        }

        const templatesResponse = await fetch('/api/content-templates');
        if (!templatesResponse.ok) throw new Error(`Failed to fetch content templates: ${templatesResponse.status}`);
        const templatesData = await templatesResponse.json();
        if (!templatesData.success) throw new Error(templatesData.error || 'Failed to fetch content templates data');
        setContentTemplates(Array.isArray(templatesData.templates) ? templatesData.templates : []);

      } catch (error: any) {
        console.error('Error fetching initial data for new workflow page:', error);
        toast.error(error.message || 'Failed to load initial data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

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

  // Debounced user search function (adapted from edit page)
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

  const handleAddAssignee = (stepIndex: number, userToAdd?: { id: string, email: string, name?: string }) => {
    const emailToAdd = userToAdd ? userToAdd.email : assigneeInputs[stepIndex];
    if (!emailToAdd || !emailToAdd.includes('@')) {
      toast.error('Please enter or select a valid email address.');
      return;
    }
    if (!workflow || !workflow.steps || !workflow.steps[stepIndex]) {
      toast.error('Cannot add assignee - workflow step not found.');
      return;
    }
    const currentStepAssignees = workflow.steps[stepIndex].assignees || [];
    const exists = currentStepAssignees.some((a: any) => a.email === emailToAdd);
    if (exists) {
      toast.info('This assignee is already added to this step.');
      return;
    }
    setWorkflow((prev: any) => {
      const updatedSteps = [...prev.steps];
      const newAssignee = userToAdd 
        ? { id: userToAdd.id, email: userToAdd.email, name: userToAdd.name } 
        : { id: `temp_new_${Date.now()}` , email: emailToAdd };
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        assignees: [...(updatedSteps[stepIndex].assignees || []), newAssignee]
      };
      return { ...prev, steps: updatedSteps };
    });
    setAssigneeInputs((prevInp) => {
      const updated = [...prevInp];
      updated[stepIndex] = ''; 
      return updated;
    });
    setUserSearchResults((prevRes) => ({ ...prevRes, [stepIndex]: [] })); 
  };

  const handleRemoveAssignee = (stepIndex: number, assigneeEmailToRemove: string) => {
    setWorkflow((prev: any) => {
      if (!prev || !prev.steps || !prev.steps[stepIndex] || !prev.steps[stepIndex].assignees) return prev;
      const updatedSteps = [...prev.steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        assignees: updatedSteps[stepIndex].assignees.filter((a: any) => a.email !== assigneeEmailToRemove)
      };
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleAddStep = () => {
    setWorkflow((prev: any) => {
      const newStep = {
        id: `temp_step_${Date.now()}`,
        name: `Step ${prev.steps.length + 1}`,
        description: '',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      };
      setAssigneeInputs(currentInputs => [...currentInputs, '']); // Add new input field state
      return { ...prev, steps: [...prev.steps, newStep] };
    });
  };

  const handleRemoveStep = (index: number) => {
    if (workflow.steps.length <= 1) {
      toast.error('A workflow must have at least one step.');
      return;
    }
    setWorkflow((prev: any) => {
      const updatedSteps = prev.steps.filter((_: any, i: number) => i !== index);
      setAssigneeInputs(currentInputs => currentInputs.filter((_:any, i:number) => i !== index)); // Remove corresponding input state
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    
    setWorkflow((prev: any) => {
      const updatedSteps = [...prev.steps];
      const temp = updatedSteps[index];
      updatedSteps[index] = updatedSteps[index - 1];
      updatedSteps[index - 1] = temp;
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const handleMoveStepDown = (index: number) => {
    if (index === workflow.steps.length - 1) return;
    
    setWorkflow((prev: any) => {
      const updatedSteps = [...prev.steps];
      const temp = updatedSteps[index];
      updatedSteps[index] = updatedSteps[index + 1];
      updatedSteps[index + 1] = temp;
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  const validateWorkflow = () => {
    if (!workflow.name.trim()) {
      toast.error('Please enter a workflow name.');
      return false;
    }

    if (!workflow.brand_id) {
      toast.error('Please select a brand.');
      return false;
    }

    // Check if all steps have names
    const invalidSteps = workflow.steps.filter((step: any) => !step.name.trim());
    if (invalidSteps.length > 0) {
      toast.error('All steps must have a name.');
      return false;
    }

    return true;
  };

  const handleCreateWorkflow = async () => {
    if (!validateWorkflow()) {
      return;
    }

    setIsSaving(true);
    
    const payload = {
      name: workflow.name,
      description: workflow.description,
      brand_id: workflow.brand_id,
      status: workflow.status,
      template_id: selectedTemplateId || null,
      steps: workflow.steps.map((step: any) => ({
        name: step.name,
        description: step.description,
        role: step.role,
        approvalRequired: step.approvalRequired,
        assignees: (step.assignees || []).map((assignee: any) => ({
          email: assignee.email,
          id: assignee.id?.startsWith('temp_new_') ? undefined : assignee.id
        }))
      }))
    };

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workflow');
      }
      
      const result = await response.json();

      if (result.success) {
        toast.success('Workflow created successfully');
        router.push('/dashboard/workflows');
      } else {
        throw new Error(result.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      toast.error(error.message || 'Failed to create workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Workflow</h1>
          <p className="text-muted-foreground mt-1">
            Define the name, brand, and steps for your new content approval process.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/workflows">Cancel</Link>
          </Button>
          <Button onClick={handleCreateWorkflow} disabled={isSaving || isLoading || brands.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workflow'
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>Basic information about the workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={workflow.name}
                  onChange={handleUpdateWorkflowDetails}
                  placeholder="Enter workflow name"
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Brand <span className="text-destructive">*</span></Label>
              <Select value={workflow.brand_id} onValueChange={handleUpdateBrand} disabled={brands.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={brands.length > 0 ? "Select brand" : "Loading brands..."} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand: Brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: brand.color || 'var(--muted)' }}
                        />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {brands.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground mt-1">
                  No brands available. Please create a brand first.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contentTemplate">Content Template (Optional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleUpdateTemplate} disabled={isLoading || contentTemplates.length === 0}>
                <SelectTrigger id="contentTemplate">
                  <SelectValue placeholder={contentTemplates.length > 0 ? "Select a content template" : (isLoading ? "Loading templates..." : "No templates available")} />
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
                Optionally link this workflow to a specific content template.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={workflow.description}
                onChange={handleUpdateWorkflowDetails}
                placeholder="Enter workflow description"
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
                <CardDescription>Define the steps in your workflow.</CardDescription>
              </div>
              <Button onClick={handleAddStep} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {workflow.steps.map((step: any, index: number) => (
                <div key={step.id || `step-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center"><span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium mr-3">{index + 1}</span><h3 className="font-medium">{step.name || `Step ${index + 1}`}</h3></div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleMoveStepUp(index)} disabled={index === 0} aria-label="Move step up"><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleMoveStepDown(index)} disabled={index === workflow.steps.length - 1} aria-label="Move step down"><ChevronDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(index)} className="text-destructive hover:text-destructive/90" aria-label="Remove step"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor={`step-name-${index}`}>Step Name <span className="text-destructive">*</span></Label><Input id={`step-name-${index}`} value={step.name || ''} onChange={(e) => handleUpdateStepName(index, e.target.value)} placeholder="Enter step name"/></div>
                      <div className="space-y-2"><Label htmlFor={`step-role-${index}`}>Role</Label><Select value={step.role || 'editor'} onValueChange={(value) => handleUpdateStepRole(index, value)}><SelectTrigger id={`step-role-${index}`}><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="seo">SEO Specialist</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor={`step-description-${index}`}>Description</Label><Textarea id={`step-description-${index}`} value={step.description || ''} onChange={(e) => handleUpdateStepDescription(index, e.target.value)} placeholder="Enter step description" rows={2}/></div>
                    <div className="flex items-center space-x-2"><Switch id={`step-approval-${index}`} checked={!!step.approvalRequired} onCheckedChange={(value) => handleUpdateStepApprovalRequired(index, value)}/><Label htmlFor={`step-approval-${index}`}>Require approval for this step</Label></div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`step-assignees-${index}`}>Assignees</Label>
                      <div className="relative flex items-center space-x-2">
                        <Input
                          id={`step-assignees-${index}`}
                          placeholder="Enter email or search user..."
                          value={assigneeInputs[index] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setAssigneeInputs(prevInp => {
                              const updated = [...prevInp];
                              if (index < updated.length) updated[index] = val;
                              return updated;
                            });
                            searchUsers(val, index);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && assigneeInputs[index]) {
                              e.preventDefault();
                              handleAddAssignee(index);
                            }
                          }}
                          className="flex-grow"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddAssignee(index)}
                          disabled={!assigneeInputs[index] || !assigneeInputs[index].includes('@')}
                        >
                          Add Email
                        </Button>
                      </div>
                      {userSearchLoading[index] && <p className="text-xs text-muted-foreground mt-1">Searching users...</p>}
                      {userSearchResults[index] && userSearchResults[index].length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                          {userSearchResults[index].map((user: any) => (
                            <div
                              key={user.id}
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                              onClick={() => handleAddAssignee(index, { id: user.id, email: user.email, name: user.full_name || user.email })}
                            >
                              {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(step.assignees || []).map((assignee: any) => (
                          <Badge key={assignee.id || assignee.email} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-0.5">
                            {assignee.name || assignee.email}
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignee(index, assignee.email)}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 flex items-center justify-center"
                              aria-label="Remove assignee"
                            >
                              <XCircle className="h-3.5 w-3.5" /> 
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive">*</span> Indicates required fields
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 