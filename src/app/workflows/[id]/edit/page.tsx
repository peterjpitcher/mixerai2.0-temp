'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Label } from '@/components/label';
import { useToast } from '@/components/toast-provider';
import { BrandIcon } from '@/components/brand-icon';

interface Step {
  id: number;
  name: string;
  description: string;
  role: string;
  approvalRequired?: boolean;
}

interface WorkflowFormData {
  id: string;
  name: string;
  brand_id: string;
  content_type_id: string;
  steps: Step[];
}

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

interface ContentType {
  id: string;
  name: string;
}

export default function WorkflowEditPage({ params }: { params: { id: string }}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<WorkflowFormData>({
    id: params.id,
    name: '',
    brand_id: '',
    content_type_id: '',
    steps: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch workflow data
        const workflowResponse = await fetch(`/api/workflows/${params.id}`);
        if (!workflowResponse.ok) {
          if (workflowResponse.status === 404) {
            throw new Error('Workflow not found');
          }
          throw new Error('Failed to fetch workflow');
        }
        
        const workflowData = await workflowResponse.json();
        if (!workflowData.success) {
          throw new Error(workflowData.error || 'Failed to fetch workflow');
        }
        
        // Fetch brands
        const brandsResponse = await fetch('/api/brands');
        if (!brandsResponse.ok) {
          throw new Error('Failed to fetch brands');
        }
        
        const brandsData = await brandsResponse.json();
        if (!brandsData.success) {
          throw new Error(brandsData.error || 'Failed to fetch brands');
        }
        
        // Fetch content types
        const contentTypesResponse = await fetch('/api/content-types');
        if (!contentTypesResponse.ok) {
          throw new Error('Failed to fetch content types');
        }
        
        const contentTypesData = await contentTypesResponse.json();
        if (!contentTypesData.success) {
          throw new Error(contentTypesData.error || 'Failed to fetch content types');
        }
        
        // Set the data
        setBrands(brandsData.data || []);
        setContentTypes(contentTypesData.data || []);
        
        // Format workflow data for form
        const workflow = workflowData.workflow;
        setFormData({
          id: workflow.id,
          name: workflow.name,
          brand_id: workflow.brand_id,
          content_type_id: workflow.content_type_id,
          steps: workflow.steps || []
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setError((error as Error).message || 'Failed to load data');
        toast({
          title: 'Error',
          description: 'Failed to load workflow data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [params.id, toast]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleStepChange = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        [field]: value
      };
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };
  
  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: prev.steps.length > 0 ? Math.max(...prev.steps.map(s => s.id)) + 1 : 1,
          name: '',
          description: '',
          role: 'editor',
          approvalRequired: true
        }
      ]
    }));
  };
  
  const removeStep = (index: number) => {
    setFormData(prev => {
      const updatedSteps = prev.steps.filter((_, i) => i !== index);
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.brand_id || !formData.content_type_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/workflows/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Workflow updated successfully'
        });
        
        router.push(`/workflows/${params.id}`);
      } else {
        throw new Error(data.error || 'Failed to update workflow');
      }
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to update workflow. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="py-10 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading workflow data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Error Loading Workflow</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {error}
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link href="/workflows">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Workflows
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
              Workflows
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href={`/workflows/${params.id}`} className="text-muted-foreground hover:text-foreground">
              {formData.name}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>Edit</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Workflow</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
              <CardDescription>
                Update the basic information for this workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter workflow name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(value) => handleSelectChange('brand_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          <div className="flex items-center">
                            <BrandIcon name={brand.name} color={brand.brand_color} size="sm" className="mr-2" />
                            {brand.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content_type_id">Content Type</Label>
                  <Select
                    value={formData.content_type_id}
                    onValueChange={(value) => handleSelectChange('content_type_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map(contentType => (
                        <SelectItem key={contentType.id} value={contentType.id}>
                          {contentType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            
            <CardHeader className="border-t pt-6">
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>
                Define the approval steps for this workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.steps.map((step, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 p-4 border rounded-lg relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => removeStep(index)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                    <span className="sr-only">Remove Step</span>
                  </Button>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold">Step {index + 1}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`step-${index}-name`}>Step Name</Label>
                    <Input
                      id={`step-${index}-name`}
                      value={step.name}
                      onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                      placeholder="e.g., Editorial Review"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`step-${index}-description`}>Description</Label>
                    <Textarea
                      id={`step-${index}-description`}
                      value={step.description}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      placeholder="Describe what happens in this step"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`step-${index}-role`}>Required Role</Label>
                    <Select
                      value={step.role}
                      onValueChange={(value) => handleStepChange(index, 'role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addStep}
                className="w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add Step
              </Button>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link href={`/workflows/${params.id}`}>Cancel</Link>
              </Button>
              <Button 
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
} 