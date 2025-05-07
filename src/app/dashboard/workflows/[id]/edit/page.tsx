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
import { ChevronDown, ChevronUp, Plus, Trash2, XCircle, Loader2 } from 'lucide-react';

interface WorkflowEditPageProps {
  params: {
    id: string;
  };
}

export default function WorkflowEditPage({ params }: WorkflowEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch both workflow and brands data
    const fetchData = async () => {
      try {
        // Fetch workflow data
        const workflowResponse = await fetch(`/api/workflows/${id}`);
        
        if (!workflowResponse.ok) {
          throw new Error(`Failed to fetch workflow: ${workflowResponse.status}`);
        }
        
        const workflowData = await workflowResponse.json();
        
        if (!workflowData.success) {
          throw new Error(workflowData.error || 'Failed to fetch workflow data');
        }
        
        // Fetch brands data
        const brandsResponse = await fetch('/api/brands');
        
        if (!brandsResponse.ok) {
          throw new Error(`Failed to fetch brands: ${brandsResponse.status}`);
        }
        
        const brandsData = await brandsResponse.json();
        
        if (!brandsData.success) {
          throw new Error(brandsData.error || 'Failed to fetch brands data');
        }
        
        setWorkflow(workflowData.workflow);
        setBrands(brandsData.brands || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError((error as Error).message || 'Failed to load data');
        toast.error('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

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

  const handleAddAssignee = (stepIndex: number) => {
    if (!newAssigneeEmail || !newAssigneeEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!workflow || !workflow.steps || !workflow.steps[stepIndex]) {
      toast.error('Cannot add assignee - workflow step not found');
      return;
    }

    // Check if assignee already exists in this step
    const stepAssignees = workflow.steps[stepIndex].assignees || [];
    const exists = Array.isArray(stepAssignees) && stepAssignees.some((a: any) => a.email === newAssigneeEmail);
    
    if (exists) {
      toast.error('This assignee is already added to this step');
      return;
    }

    setWorkflow((prev: any) => {
      if (!prev || !Array.isArray(prev.steps)) return prev;
      
      const updatedSteps = [...prev.steps];
      
      // Ensure assignees array exists
      if (!updatedSteps[stepIndex].assignees) {
        updatedSteps[stepIndex].assignees = [];
      }
      
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
      toast.error('Workflow must have at least one step');
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
      if (!workflow) {
        throw new Error('Workflow data is missing');
      }
      
      // Prepare data for API call
      const workflowData = {
        ...workflow,
        updated_at: new Date().toISOString()
      };
      
      // Send updated workflow to the API
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update workflow: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update workflow');
      }
      
      toast.success('Workflow updated successfully');
      router.push(`/dashboard/workflows/${id}`);
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Workflow</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  // If workflow doesn't exist, show 404 page
  if (!workflow) {
    notFound();
  }
  
  // Extract safe values with fallbacks
  const workflowSteps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const workflowStatus = workflow.status || 'draft';
  const brandId = workflow.brand?.id || workflow.brand_id || '';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Workflow</h1>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/workflows/${id}`}>Cancel</Link>
          </Button>
          <Button onClick={handleSaveWorkflow} disabled={isSaving}>
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
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>Basic information about the workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
                <Select defaultValue={workflowStatus} onValueChange={handleUpdateWorkflowStatus}>
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select defaultValue={brandId} onValueChange={handleUpdateBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: brand.color || '#cccccc' }}
                        />
                        {brand.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={workflow.description || ''}
                onChange={handleUpdateWorkflowDetails}
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
                <CardDescription>Define the steps in your workflow</CardDescription>
              </div>
              <Button onClick={handleAddStep} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {workflowSteps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined for this workflow. Click "Add Step" to create your first workflow step.
              </div>
            ) : (
              <div className="space-y-6">
                {workflowSteps.map((step: any, index: number) => (
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
                          disabled={index === workflowSteps.length - 1}
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
                          <Label htmlFor={`step-name-${index}`}>Step Name</Label>
                          <Input
                            id={`step-name-${index}`}
                            value={step.name || ''}
                            onChange={(e) => handleUpdateStepName(index, e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`step-role-${index}`}>Role</Label>
                          <Select 
                            defaultValue={step.role || 'editor'} 
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
                          value={step.description || ''}
                          onChange={(e) => handleUpdateStepDescription(index, e.target.value)}
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`step-approval-${index}`}
                          checked={!!step.approvalRequired}
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
                            placeholder="Enter email address"
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
    </div>
  );
} 