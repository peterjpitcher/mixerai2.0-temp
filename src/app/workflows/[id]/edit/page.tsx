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
import { Checkbox } from '@/components/checkbox';
import { useToast } from '@/components/toast-provider';
import { BrandIcon } from '@/components/brand-icon';
import { 
  PlusIcon, TrashIcon, XIcon, Wand2Icon, 
  ChevronUpIcon, ChevronDownIcon, GripVerticalIcon, Users
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/tooltip';
import { Badge } from '@/components/badge';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  approved_content_types?: string[];
  language?: string;
  country?: string;
}

interface ContentType {
  id: string;
  name: string;
}

interface WorkflowStepAssignee {
  email: string;
  id?: string;
}

interface Step {
  id: number;
  name: string;
  description: string;
  role: string;
  approvalRequired?: boolean;
  assignees: WorkflowStepAssignee[];
  order?: number;
}

interface WorkflowFormData {
  id: string;
  name: string;
  brand_id: string;
  content_type_id: string;
  steps: Step[];
}

// Role descriptions for display
const roleDescriptions = {
  editor: "General content editor responsible for content quality",
  legal: "Legal reviewer who ensures content compliance with regulations",
  brand: "Brand reviewer who ensures content aligns with brand standards",
  seo: "SEO specialist who optimizes content for search engines",
  culinary: "Culinary expert who reviews food content for safety and correctness",
  publisher: "Publisher who adds content to production sites"
};

export default function WorkflowEditPage({ params }: { params: { id: string }}) {
  const router = useRouter();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [filteredContentTypes, setFilteredContentTypes] = useState<ContentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState<{[key: number]: string}>({});
  const [isGeneratingDescription, setIsGeneratingDescription] = useState<{[key: number]: boolean}>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [formData, setFormData] = useState<WorkflowFormData>({
    id: params.id,
    name: '',
    brand_id: '',
    content_type_id: '',
    steps: []
  });
  
  useEffect(() => {
    const loadData = async () => {
      // Skip loading if data is already loaded
      if (dataLoaded) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch workflow, brands, and content types
        const [workflowResponse, brandsResponse, contentTypesResponse] = await Promise.all([
          fetch(`/api/workflows/${params.id}`, { cache: 'no-store' }),
          fetch('/api/brands', { cache: 'no-store' }),
          fetch('/api/content-types', { cache: 'no-store' })
        ]);
        
        if (!workflowResponse.ok) {
          throw new Error('Failed to fetch workflow');
        }
        
        if (!brandsResponse.ok) {
          throw new Error('Failed to fetch brands');
        }
        
        if (!contentTypesResponse.ok) {
          throw new Error('Failed to fetch content types');
        }
        
        const workflowData = await workflowResponse.json();
        const brandsData = await brandsResponse.json();
        const contentTypesData = await contentTypesResponse.json();
        
        if (!workflowData.success) {
          throw new Error(workflowData.error || 'Failed to fetch workflow');
        }
        
        if (!brandsData.success) {
          throw new Error(brandsData.error || 'Failed to fetch brands');
        }
        
        if (!contentTypesData.success) {
          throw new Error(contentTypesData.error || 'Failed to fetch content types');
        }
        
        // Set the data
        setBrands(brandsData.brands || []);
        const allContentTypes = contentTypesData.data || [];
        setContentTypes(allContentTypes);
        
        // Format workflow data for form - ensure steps have assignees array
        const workflow = workflowData.workflow;
        const steps = workflow.steps?.map((step: any) => ({
          ...step,
          assignees: step.assignees || []
        })) || [];
        
        setFormData({
          id: workflow.id,
          name: workflow.name,
          brand_id: workflow.brand_id,
          content_type_id: workflow.content_type_id,
          steps: steps
        });
        
        // Initially filter content types based on the workflow's brand
        const selectedBrand = brandsData.brands?.find((b: Brand) => b.id === workflow.brand_id);
        if (selectedBrand && selectedBrand.approved_content_types && 
            Array.isArray(selectedBrand.approved_content_types) && 
            selectedBrand.approved_content_types.length > 0) {
          const filtered = allContentTypes.filter(ct => 
            selectedBrand.approved_content_types?.includes(ct.id)
          );
          setFilteredContentTypes(filtered);
        } else {
          setFilteredContentTypes(allContentTypes);
        }
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
        setDataLoaded(true);
      }
    };
    
    loadData();
  }, [params.id, toast, dataLoaded]);
  
  // Filter content types when brand changes
  useEffect(() => {
    if (formData.brand_id && brands.length > 0) {
      const selectedBrand = brands.find(brand => brand.id === formData.brand_id);
      
      if (selectedBrand && selectedBrand.approved_content_types && 
          Array.isArray(selectedBrand.approved_content_types) && 
          selectedBrand.approved_content_types.length > 0) {
        // Filter content types to only show those approved for this brand
        const filteredTypes = contentTypes.filter(contentType => 
          selectedBrand.approved_content_types?.includes(contentType.id)
        );
        
        setFilteredContentTypes(filteredTypes);
        
        // If the currently selected content type is not in the filtered list, reset it
        if (formData.content_type_id && !filteredTypes.some(ct => ct.id === formData.content_type_id)) {
          setFormData(prev => ({
            ...prev,
            content_type_id: ''
          }));
        }
      } else {
        // If no approved content types specified, show all
        setFilteredContentTypes(contentTypes);
      }
    } else {
      // If no brand selected, show all content types
      setFilteredContentTypes(contentTypes);
    }
  }, [formData.brand_id, brands, contentTypes]);
  
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
  
  const handleStepChange = (index: number, field: string, value: any) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    
    setFormData(prevState => ({
      ...prevState,
      steps: updatedSteps
    }));
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
          approvalRequired: true,
          assignees: []
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
  
  const addAssignee = (stepIndex: number) => {
    const email = newAssigneeEmail[stepIndex]?.trim();
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if email already exists in this step
    if (formData.steps[stepIndex].assignees?.some(a => a.email === email)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email is already assigned to this step',
        variant: 'destructive'
      });
      return;
    }
    
    // Add the assignee
    handleStepChange(stepIndex, 'assignees', [
      ...(formData.steps[stepIndex].assignees || []),
      { email }
    ]);
    
    // Clear the input
    setNewAssigneeEmail(prev => ({
      ...prev,
      [stepIndex]: ''
    }));
  };
  
  const removeAssignee = (stepIndex: number, assigneeIndex: number) => {
    handleStepChange(
      stepIndex, 
      'assignees', 
      formData.steps[stepIndex].assignees.filter((_, i) => i !== assigneeIndex)
    );
  };
  
  const moveStepUp = (index: number) => {
    if (index === 0) return; // Can't move first step up
    
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      
      // Swap the step with the one above it
      [updatedSteps[index], updatedSteps[index - 1]] = [updatedSteps[index - 1], updatedSteps[index]];
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
    
    toast({
      title: 'Step Moved',
      description: 'The step has been moved up'
    });
  };
  
  const moveStepDown = (index: number) => {
    setFormData(prev => {
      if (index === prev.steps.length - 1) return prev; // Can't move last step down
      
      const updatedSteps = [...prev.steps];
      
      // Swap the step with the one below it
      [updatedSteps[index], updatedSteps[index + 1]] = [updatedSteps[index + 1], updatedSteps[index]];
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
    
    toast({
      title: 'Step Moved',
      description: 'The step has been moved down'
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
    <div className="flex flex-col">
      {/* Header */}
      <div className="w-full bg-background border-b px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Workflow</h1>
            <p className="text-muted-foreground">{formData.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href={`/workflows/${params.id}`}>Cancel</Link>
            </Button>
            <Button 
              type="submit" 
              form="workflow-form" 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        <form id="workflow-form" onSubmit={handleSubmit} className="max-w-4xl mx-auto">
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
                      {filteredContentTypes.map(contentType => (
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
            <CardContent className="space-y-4">
              {formData.steps.map((step, index) => (
                <div key={index} className="border border-border rounded-md p-6 relative bg-card mb-6 shadow-sm">
                  {/* Step number and reordering */}
                  <div className="absolute left-4 top-4 flex flex-col items-center">
                    <div className="flex items-center justify-center bg-muted rounded-full h-8 w-8 font-semibold text-muted-foreground mb-2">
                      {index + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button" 
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveStepUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        type="button" 
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveStepDown(index)}
                        disabled={index === formData.steps.length - 1}
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                        <span className="sr-only">Move down</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Delete step button */}
                  <div className="absolute top-4 right-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Remove step</span>
                    </Button>
                  </div>
                  
                  <div className="pl-12 pr-4 mt-3">
                    {/* Step name */}
                    <div className="mb-6">
                      <Label htmlFor={`step-${index}-name`} className="text-base font-medium mb-2 block">
                        Step Name
                      </Label>
                      <Input
                        id={`step-${index}-name`}
                        value={step.name}
                        onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                        placeholder="e.g., Draft Review"
                        className="border-input"
                        required
                      />
                    </div>
                    
                    {/* Step description */}
                    <div className="mb-6">
                      <Label htmlFor={`step-${index}-description`} className="text-base font-medium mb-2 block">
                        Description
                      </Label>
                      <Textarea
                        id={`step-${index}-description`}
                        value={step.description}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                        placeholder="Describe what happens in this step"
                        className="min-h-24 border-input w-full mb-2"
                        data-stepindex={index}
                      />
                      <div className="flex justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 py-1 text-xs"
                                disabled={isGeneratingDescription[index]}
                                onClick={async (e) => {
                                  // Prevent default behavior
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  if (isGeneratingDescription[index]) return;
                                  
                                  try {
                                    // Mark this step as loading
                                    setIsGeneratingDescription(prev => ({
                                      ...prev,
                                      [index]: true
                                    }));
                                    
                                    // Get step data
                                    const step = formData.steps[index];
                                    if (!step.name) {
                                      toast({
                                        title: 'Missing Step Name',
                                        description: 'Please provide a name for this step before generating a description.',
                                        variant: 'destructive'
                                      });
                                      setIsGeneratingDescription(prev => ({
                                        ...prev,
                                        [index]: false
                                      }));
                                      return;
                                    }
                                    
                                    // First, check if Azure OpenAI is configured properly
                                    const testResponse = await fetch('/api/test-azure-openai', {
                                      // Add cache: 'no-store' to prevent caching which might cause refreshes
                                      cache: 'no-store',
                                      // Add next.js specific cache options
                                      next: { revalidate: 0 }
                                    });
                                    
                                    if (!testResponse.ok) {
                                      const testData = await testResponse.json();
                                      console.error('Azure OpenAI configuration error:', testData);
                                      toast({
                                        title: 'Azure OpenAI Configuration Error',
                                        description: testData.error || 'Azure OpenAI is not properly configured. Please check your environment variables.',
                                        variant: 'destructive'
                                      });
                                      setIsGeneratingDescription(prev => ({
                                        ...prev,
                                        [index]: false
                                      }));
                                      return;
                                    }
                                    
                                    // Get other steps for context
                                    const otherSteps = formData.steps.filter((_, i) => i !== index);
                                    console.log('Generating description for step:', step.name);
                                    
                                    // Get brand info for language/country context
                                    const selectedBrand = brands.find(brand => brand.id === formData.brand_id);
                                    const brandContext = selectedBrand 
                                      ? { 
                                          name: selectedBrand.name,
                                          language: selectedBrand.language || 'English',
                                          country: selectedBrand.country || 'Global'
                                        }
                                      : undefined;
                                    
                                    // Call the API
                                    try {
                                      const response = await fetch('/api/workflows/generate-description', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                          type: 'generate',
                                          stepName: step.name,
                                          otherSteps: otherSteps.map(s => ({ name: s.name, description: s.description })),
                                          brandContext
                                        }),
                                        // Prevent caching to avoid refreshes
                                        cache: 'no-store',
                                        // Add next.js specific cache options
                                        next: { revalidate: 0 }
                                      });
                                      
                                      const responseText = await response.text();
                                      let data;
                                      
                                      try {
                                        data = JSON.parse(responseText);
                                      } catch (parseError) {
                                        console.error('Error parsing API response:', responseText);
                                        throw new Error(`Invalid API response: ${responseText.substring(0, 100)}...`);
                                      }
                                      
                                      if (!response.ok) {
                                        console.error('Error response from API:', response.status, data);
                                        throw new Error(`API error: ${response.status} ${data?.error || 'Unknown error'}`);
                                      }
                                      
                                      console.log('API response:', data);
                                      
                                      if (data.success && data.description) {
                                        // Clean the description by removing any wrapping quotes
                                        const cleanDescription = data.description.replace(/^["']|["']$/g, '');
                                        console.log('Generated description (cleaned):', cleanDescription);
                                        
                                        // Update the textarea directly first, before React state updates
                                        try {
                                          // Update main textarea
                                          const textarea = document.getElementById(`step-${index}-description`) as HTMLTextAreaElement;
                                          if (textarea) {
                                            textarea.value = cleanDescription;
                                            console.log('Updated main textarea directly');
                                          }
                                        } catch (domError) {
                                          console.error('Error updating DOM directly:', domError);
                                        }
                                        
                                        // Update the React state - use functional update to ensure we have latest state
                                        setFormData(prevFormData => {
                                          const updatedSteps = prevFormData.steps.map((s, i) => {
                                            if (i === index) {
                                              return {
                                                ...s,
                                                description: cleanDescription
                                              };
                                            }
                                            return s;
                                          });
                                          
                                          return {
                                            ...prevFormData,
                                            steps: updatedSteps
                                          };
                                        });
                                        
                                        // Method 2: Use handleStepChange as a backup approach
                                        setTimeout(() => {
                                          try {
                                            handleStepChange(index, 'description', cleanDescription);
                                            console.log('Updated description using handleStepChange fallback');
                                          } catch (stateError) {
                                            console.error('Error in handleStepChange fallback:', stateError);
                                          }
                                        }, 50);
                                        
                                        toast({
                                          title: 'Description Generated',
                                          description: 'Step description has been auto-generated.'
                                        });
                                      } else {
                                        throw new Error(data.error || 'Failed to generate description');
                                      }
                                    } catch (apiError) {
                                      console.error('API call error:', apiError);
                                      toast({
                                        title: 'API Error',
                                        description: apiError instanceof Error 
                                          ? apiError.message 
                                          : 'Failed to generate description. API communication error.',
                                        variant: 'destructive'
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error generating description:', error);
                                    toast({
                                      title: 'Error',
                                      description: error instanceof Error 
                                        ? error.message 
                                        : 'Failed to generate description. Please try again.',
                                      variant: 'destructive'
                                    });
                                  } finally {
                                    setIsGeneratingDescription(prev => ({
                                      ...prev,
                                      [index]: false
                                    }));
                                  }
                                }}
                              >
                                {isGeneratingDescription[index] ? (
                                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                                ) : (
                                  <Wand2Icon className="h-3.5 w-3.5 mr-1" />
                                )}
                                Auto-generate
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Generate a description for this step</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Role selection */}
                    <div className="mb-6">
                      <Label className="text-base font-medium block mb-3">Required Role</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'editor' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'editor')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-editor`}
                              checked={step.role === 'editor'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'editor')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-editor`}
                                className="font-medium cursor-pointer"
                              >
                                Editor
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.editor}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'legal' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'legal')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-legal`}
                              checked={step.role === 'legal'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'legal')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-legal`}
                                className="font-medium cursor-pointer"
                              >
                                Legal
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.legal}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'brand' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'brand')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-brand`}
                              checked={step.role === 'brand'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'brand')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-brand`}
                                className="font-medium cursor-pointer"
                              >
                                Brand
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.brand}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'seo' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'seo')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-seo`}
                              checked={step.role === 'seo'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'seo')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-seo`}
                                className="font-medium cursor-pointer"
                              >
                                SEO
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.seo}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'culinary' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'culinary')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-culinary`}
                              checked={step.role === 'culinary'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'culinary')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-culinary`}
                                className="font-medium cursor-pointer"
                              >
                                Culinary
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.culinary}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-md p-3 cursor-pointer transition-colors ${
                            step.role === 'publisher' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent'
                          }`}
                          onClick={() => handleStepChange(index, 'role', 'publisher')}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              id={`step-${index}-role-publisher`}
                              checked={step.role === 'publisher'}
                              onCheckedChange={() => handleStepChange(index, 'role', 'publisher')}
                              className="mt-0.5"
                            />
                            <div>
                              <Label 
                                htmlFor={`step-${index}-role-publisher`}
                                className="font-medium cursor-pointer"
                              >
                                Publisher
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {roleDescriptions.publisher}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Optional Step checkbox */}
                    <div className="mb-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`step-${index}-optional`}
                          checked={step.approvalRequired === false}
                          onCheckedChange={(checked) => 
                            handleStepChange(index, 'approvalRequired', checked !== true)
                          }
                        />
                        <Label 
                          htmlFor={`step-${index}-optional`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Optional Step
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        If enabled, this step will be optional and can be skipped in the workflow.
                      </p>
                    </div>
                    
                    {/* Assignees */}
                    <div className="mb-6">
                      <Label className="text-base font-medium mb-2 block">Assignees</Label>
                      <div className="border rounded-md p-4">
                        {step.assignees && step.assignees.length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {step.assignees.map((assignee, assigneeIndex) => (
                              <div key={assigneeIndex} className="flex items-center justify-between bg-accent/50 px-3 py-2 rounded-md">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{assignee.email}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAssignee(index, assigneeIndex)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <XIcon className="h-4 w-4" />
                                  <span className="sr-only">Remove assignee</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm mb-4">
                            No assignees yet. Add users to this step below.
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Input
                            value={newAssigneeEmail[index] || ''}
                            onChange={(e) => setNewAssigneeEmail({
                              ...newAssigneeEmail,
                              [index]: e.target.value
                            })}
                            placeholder="Enter email address"
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addAssignee(index);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addAssignee(index)}
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Assignees will be notified when content reaches this step
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}