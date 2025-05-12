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
export default function NewWorkflowPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState('');
  const [workflow, setWorkflow] = useState<any>({
    name: '',
    description: '',
    brand: null,
    status: 'draft',
    steps: [
      {
        id: 'step1',
        name: 'Content Review',
        description: 'Review content for accuracy and quality',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      }
    ]
  });
  
  useEffect(() => {
    const fetchRealBrands = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/brands');
        if (!response.ok) {
          throw new Error(`Failed to fetch brands: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to process brands data');
        }
        
        const fetchedBrands = data.data || [];
        setBrands(fetchedBrands);
        
        if (fetchedBrands.length > 0) {
          setWorkflow(prev => ({
            ...prev,
            brand: fetchedBrands[0] // Set the full brand object for initial default
          }));
        }
      } catch (error: any) {
        console.error('Error fetching brands:', error);
        toast.error(error.message || 'Failed to load brands. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRealBrands();
  }, []);

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
    const selectedBrand = brands.find((brand: any) => brand.id === value);
    if (selectedBrand) {
      setWorkflow((prev: any) => ({
        ...prev,
        brand: selectedBrand
      }));
    }
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

  const handleAddAssignee = (stepIndex: number) => {
    if (!newAssigneeEmail || !newAssigneeEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    // Check if assignee already exists in this step
    const stepAssignees = workflow.steps[stepIndex].assignees;
    const exists = stepAssignees.some((a: any) => a.email === newAssigneeEmail);
    
    if (exists) {
      toast.error('This assignee is already added to this step.');
      return;
    }

    setWorkflow((prev: any) => {
      const updatedSteps = [...prev.steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        assignees: [
          ...updatedSteps[stepIndex].assignees,
          {
            id: `temp-${Date.now()}`,
            email: newAssigneeEmail
          }
        ]
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });

    setNewAssigneeEmail('');
  };

  const handleRemoveAssignee = (stepIndex: number, assigneeId: string) => {
    setWorkflow((prev: any) => {
      const updatedSteps = [...prev.steps];
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

  const handleAddStep = () => {
    setWorkflow((prev: any) => {
      const newStep = {
        id: `step${prev.steps.length + 1}`,
        name: `Step ${prev.steps.length + 1}`,
        description: '',
        role: 'editor',
        approvalRequired: true,
        assignees: []
      };
      
      return {
        ...prev,
        steps: [...prev.steps, newStep]
      };
    });
  };

  const handleRemoveStep = (index: number) => {
    if (workflow.steps.length <= 1) {
      toast.error('A workflow must have at least one step.');
      return;
    }
    
    setWorkflow((prev: any) => {
      const updatedSteps = prev.steps.filter((_: any, i: number) => i !== index);
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

    if (!workflow.brand) {
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
      brand_id: workflow.brand?.id, // Ensure you get the ID from the brand object
      steps: workflow.steps.map((step: any) => ({ // Ensure steps are formatted as expected by the API
        id: step.id, // Or remove if API generates it
        name: step.name,
        description: step.description,
        role: step.role,
        approvalRequired: step.approvalRequired,
        assignees: step.assignees.map((assignee: any) => ({ email: assignee.email })) // Send only email
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
          <Button onClick={handleCreateWorkflow} disabled={isSaving || brands.length === 0}>
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
                <Select defaultValue={workflow.status} onValueChange={handleUpdateWorkflowStatus}>
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
              <Select 
                defaultValue={workflow.brand?.id} 
                onValueChange={handleUpdateBrand}
                disabled={brands.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={brands.length > 0 ? "Select brand" : "No brands available"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand: any) => (
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
              {brands.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No brands available. Please create a brand first.
                </p>
              )}
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
                <div key={step.id} className="border rounded-lg p-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`step-name-${index}`}>Step Name <span className="text-destructive">*</span></Label>
                        <Input
                          id={`step-name-${index}`}
                          value={step.name}
                          onChange={(e) => handleUpdateStepName(index, e.target.value)}
                          placeholder="Enter step name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`step-role-${index}`}>Role</Label>
                        <Select 
                          defaultValue={step.role} 
                          onValueChange={(value) => handleUpdateStepRole(index, value)}
                        >
                          <SelectTrigger id={`step-role-${index}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="seo">SEO Specialist</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`step-description-${index}`}>Description</Label>
                      <Textarea
                        id={`step-description-${index}`}
                        value={step.description}
                        onChange={(e) => handleUpdateStepDescription(index, e.target.value)}
                        placeholder="Enter step description"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`step-approval-${index}`}
                        checked={step.approvalRequired}
                        onCheckedChange={(value) => handleUpdateStepApprovalRequired(index, value)}
                      />
                      <Label htmlFor={`step-approval-${index}`}>
                        Require approval for this step
                      </Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`step-assignees-${index}`}>Assignees</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id={`step-assignees-${index}`}
                          placeholder="Enter email address."
                          value={newAssigneeEmail}
                          onChange={(e) => setNewAssigneeEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAssignee(index);
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddAssignee(index)}
                        >
                          Add
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {step.assignees.map((assignee: any) => (
                          <Badge key={assignee.id} variant="outline" className="text-xs flex items-center">
                            {assignee.email}
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignee(index, assignee.id)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
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