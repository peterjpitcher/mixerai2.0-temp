'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Separator } from '@/components/separator';
import { MarkdownDisplay } from './markdown-display';
import { RichTextEditor } from './rich-text-editor';
import { useRouter } from 'next/navigation';
import { BrandIcon } from '@/components/brand-icon';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, PlusCircle, Sparkles } from 'lucide-react';
import { marked } from 'marked';
import Link from 'next/link';
import type { InputField, OutputField, ContentTemplate as Template, SelectOptions } from '@/types/template';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

interface WorkflowSummary {
  id: string;
  name: string;
  template_id?: string | null;
  brand_name: string;
}

interface ContentGeneratorFormProps {
  templateId?: string | null;
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

export function ContentGeneratorForm({ templateId }: ContentGeneratorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [generatedOutputs, setGeneratedOutputs] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  const [associatedWorkflowDetails, setAssociatedWorkflowDetails] = useState<WorkflowSummary | null>(null);
  const [isFetchingWorkflow, setIsFetchingWorkflow] = useState(false);
  const [isGeneratingSuggestionFor, setIsGeneratingSuggestionFor] = useState<string | null>(null);
  const [retryingFieldId, setRetryingFieldId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const currentBrand = brands.find(b => b.id === selectedBrand);

  const fetchTemplate = async (id: string) => {
    setIsLoadingTemplate(true);
    try {
      const response = await fetch(`/api/content-templates/${id}`);
      const data = await response.json();
      if (data.success && data.template) {
        setTemplate(data.template as Template);
        const initialValues: Record<string, string> = {};
        if (data.template.inputFields) {
          (data.template.inputFields as InputField[]).forEach((field: InputField) => {
            initialValues[field.id] = ''; 
          });
        }
        setTemplateFieldValues(initialValues);
      } else {
        toast.error(data.error || "Failed to load content template.");
        setTemplate(null);
      }
    } catch (error) {
      toast.error("Error fetching template details.");
      console.error("Error fetching template details:", error);
      setTemplate(null);
    } finally {
      setIsLoadingTemplate(false);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        if (brandsData.success && Array.isArray(brandsData.data)) {
          setBrands(brandsData.data);
          if (brandsData.data.length === 1) setSelectedBrand(brandsData.data[0].id);
        } else {
          toast.error('Failed to fetch brands');
        }
      } catch (error) {
        toast.error('Error fetching brands');
      }
    };
    fetchData();
    if (templateId) fetchTemplate(templateId);
    else toast.error("No template ID provided.");
  }, [templateId]);

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (templateId && selectedBrand) {
        setIsFetchingWorkflow(true);
        setAssociatedWorkflowDetails(null);
        try {
          const res = await fetch(`/api/workflows?brand_id=${selectedBrand}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const matchingWorkflow = (data.data as WorkflowSummary[]).find(wf => wf.template_id === templateId);
            if (matchingWorkflow) {
              setAssociatedWorkflowDetails(matchingWorkflow);
            }
          } else {
            // toast.error('Could not determine workflow.'); // Optional: less noisy
          }
        } catch (error) { /* toast.error('Error determining workflow.'); */ } // Optional: less noisy
        finally { setIsFetchingWorkflow(false); }
      }
    };
    fetchWorkflow();
  }, [templateId, selectedBrand]);

  const handleTemplateFieldChange = (fieldId: string, value: string) => {
    setTemplateFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const interpolatePrompt = (prompt: string): string => {
    let interpolated = prompt;
    if (template) {
      (template.inputFields || []).forEach(inputField => {
        const placeholderByName = `{{${inputField.name}}}`;
        const placeholderById = `{{${inputField.id}}}`;
        const value = templateFieldValues[inputField.id] || '';
        interpolated = interpolated.replace(new RegExp(placeholderByName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
        interpolated = interpolated.replace(new RegExp(placeholderById.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
      });
    }

    if (title) {
      const articleTitlePlaceholder = /\{\{\s*article title\s*\}\}/gi;
      interpolated = interpolated.replace(articleTitlePlaceholder, title);
    }
    
    return interpolated;
  };

  const handleGenerateSuggestion = async (field: InputField) => {
    if (!selectedBrand) {
      toast.error("Please select a brand first.");
      return;
    }
    if (!field.aiPrompt) {
      toast.error("No AI prompt configured for this field.");
      return;
    }

    setIsGeneratingSuggestionFor(field.id);
    try {
      const populatedPrompt = interpolatePrompt(field.aiPrompt);
      
      const requestBody = {
        brand_id: selectedBrand,
        prompt: populatedPrompt,
      };

      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success && data.suggestion) {
        setTemplateFieldValues(prev => ({ ...prev, [field.id]: data.suggestion }));
        toast.success(`Suggestion generated for ${field.name}`);
      } else {
        toast.error(data.error || `Failed to generate suggestion for ${field.name}.`);
      }
    } catch (error) {
      toast.error(`Error generating suggestion for ${field.name}.`);
      console.error(`Error generating suggestion for ${field.name}:`, error);
    } finally {
      setIsGeneratingSuggestionFor(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBrand || !template) {
      toast.error("Please select a brand and ensure template is loaded.");
      return;
    }
    const missingFields = (template.inputFields || []).filter(
      field => field.required && !templateFieldValues[field.id]
    );
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    setIsLoading(true);
    setGeneratedOutputs({});
    setTitle('');
    setAiError(null);

    try {
      const input_fields_with_values = (template.inputFields || []).map(field => ({
        ...field,
        value: templateFieldValues[field.id] || '' 
      }));

      const generationRequestBody = {
        brand_id: selectedBrand,
        template_id: template.id,
        template: {
            id: template.id,
            name: template.name,
            inputFields: input_fields_with_values,
            outputFields: template.outputFields || []
        },
        input: { /* additionalInstructions can be added here if needed */ }
      };

      const response = await fetch('/api/content/generate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(generationRequestBody) 
      });
      const data = await response.json();
      
      if (data.success) {
        const aiResponseData = data.data || data.content || data;

        const outputsToSet: Record<string, string> = (aiResponseData && typeof aiResponseData.outputs === 'object') ? aiResponseData.outputs : 
                             (typeof aiResponseData === 'object' && aiResponseData !== null) ? aiResponseData : 
                             null;

        if (outputsToSet) {
          setGeneratedOutputs(outputsToSet);
          toast.success('Content generated for output fields.');
        } else if (typeof aiResponseData === 'string' && (template.outputFields || []).length === 1 && template.outputFields) {
          setGeneratedOutputs({ [template.outputFields[0].id]: aiResponseData });
          toast.success('Content generated for the output field.');
        } else {
          toast.error('Generated content format is unexpected or not structured per output field.');
          console.warn('Unexpected AI response format:', aiResponseData);
          setGeneratedOutputs({});
        }
        
        let contextForTitle = '';
        if (outputsToSet && (template.outputFields || []).length > 0) {
          const primaryOutputField = 
            (template.outputFields || []).find(f => f.name.toLowerCase().includes('body') || f.name.toLowerCase().includes('content')) ||
            (template.outputFields || [])[0];
          if (primaryOutputField && outputsToSet[primaryOutputField.id]) {
            contextForTitle = outputsToSet[primaryOutputField.id];
          } else if (Object.values(outputsToSet).length > 0) {
            contextForTitle = Object.values(outputsToSet)[0] as string;
          }
        }

        if (contextForTitle) {
          setIsGeneratingTitle(true);
          try {
            const topicField = (template.inputFields || []).find(f => f.id === 'topic' || f.name.toLowerCase().includes('topic'));
            const keywordsField = (template.inputFields || []).find(f => f.id === 'keywords' || f.name.toLowerCase().includes('keyword'));
            
            const titleRequestContext = {
              contentBody: contextForTitle,
              brand_id: selectedBrand,
              topic: topicField ? templateFieldValues[topicField.id] : undefined,
              keywords: keywordsField ? (templateFieldValues[keywordsField.id] || '').split(',').map(k => k.trim()).filter(k => k) : undefined,
            };

            const titleResponse = await fetch('/api/ai/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(titleRequestContext)
            });
            const titleData = await titleResponse.json();
            if (titleData.success && titleData.title) {
              setTitle(titleData.title);
              toast.success('Content title auto-generated.');
            } else {
              setTitle('Error generating title. Please set manually.');
              toast.error(titleData.error || 'Failed to auto-generate title.');
            }
          } catch (titleError) {
            console.error('Error generating title:', titleError);
            setTitle('Error generating title. Please set manually.');
            toast.error('Failed to auto-generate title.');
          } finally {
            setIsGeneratingTitle(false);
          }
        } else if (Object.keys(outputsToSet || {}).length > 0) {
            setTitle('Content generated. Please set title manually.');
        }
      } else {
        toast.error(data.error || 'Failed to generate content.');
        setGeneratedOutputs({});
      }
    } catch (error) { 
      toast.error('Error during content generation process.'); 
      console.error('Content generation process error:', error);
      setGeneratedOutputs({});
    }
    finally { setIsLoading(false); }
  };
  
  const handleRetryFieldGeneration = async (outputField: OutputField) => {
    if (!selectedBrand || !template) {
      toast.error("Brand and template must be selected.");
      return;
    }
    if (isLoading || isGeneratingTitle) {
      toast.info("Please wait for the current generation process to complete.");
      return;
    }

    setRetryingFieldId(outputField.id);
    try {
      const requestBody = {
        brand_id: selectedBrand,
        template_id: template.id,
        template_field_values: templateFieldValues,
        output_field_to_generate_id: outputField.id,
        existing_outputs: generatedOutputs,
        title: title,
      };

      const response = await fetch('/api/content/generate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success && data.output_field_id && typeof data.generated_text === 'string') {
        setGeneratedOutputs(prev => ({ ...prev, [data.output_field_id]: data.generated_text }));
        toast.success(`Content for '${outputField.name || 'field'}' regenerated.`);
        if (!data.generated_text) {
            toast.info(`AI returned empty content for '${outputField.name || 'field'}'. You can retry or edit manually.`);
        }
      } else {
        toast.error(data.error || `Failed to regenerate content for '${outputField.name || 'field'}'.`);
      }
    } catch (error: any) {
      toast.error(`Error regenerating field: ${error.message || 'Unknown error'}`);
      console.error(`Error regenerating field ${outputField.name}:`, error);
    } finally {
      setRetryingFieldId(null);
    }
  };

  const handleSave = async () => {
    const hasGeneratedOutputs = Object.keys(generatedOutputs).length > 0;
    if (!hasGeneratedOutputs) { toast.error('No content to save.'); return; }
    if (isFetchingWorkflow || isGeneratingTitle) { 
        toast.info(isGeneratingTitle ? 'Auto-generating title, please wait...' : 'Determining workflow, please wait...'); 
        return; 
    }
    if (!title && !isGeneratingTitle) {
        toast.error('Content title is missing. Please wait for auto-generation or set manually if generation failed.');
        return;
    }
    setIsSaving(true);
    try {
      let primaryBodyContent = '';
      if (template && (template.outputFields || []).length > 0) {
        const richTextOutput = (template.outputFields || []).find(f => f.type === 'richText' && generatedOutputs[f.id]);
        if (richTextOutput) {
          primaryBodyContent = generatedOutputs[richTextOutput.id];
        } else {
          const firstOutputField = (template.outputFields || [])[0];
          if (firstOutputField && generatedOutputs[firstOutputField.id]) {
            primaryBodyContent = generatedOutputs[firstOutputField.id];
          }
        }
      }

      const payload = {
        brand_id: selectedBrand,
        template_id: template?.id,
        title,
        workflow_id: associatedWorkflowDetails?.id,
        body: primaryBodyContent,
        content_data: {
            templateInputValues: templateFieldValues,
            generatedOutputs: generatedOutputs
        }
      };
      const response = await fetch('/api/content', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const data = await response.json();
      console.log('Server response in handleSave:', data);

      if (data.success && data.data?.id) {
        toast.success('Content saved.');
        router.push(`/dashboard/content`);
      } else {
        toast.error(data.error || 'Failed to save content.');
      }
    } catch (error) { toast.error('Error saving content.'); }
    finally { setIsSaving(false); }
  };
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Templates", href: "/dashboard/templates" }, 
        { label: template ? template.name : (templateId ? "Loading Template..." : "Select Template"), 
          href: templateId ? `/dashboard/templates/${templateId}` : "/dashboard/templates" 
        },
        { label: "Create Content" }
      ]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {currentBrand && 
            <BrandIcon name={currentBrand.name} color={currentBrand.brand_color} size="lg" />
          }
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Generator</h1>
            <p className="text-muted-foreground mt-1">
              {template ? `Using template: ${template.name}` : 'Generate content using AI-powered templates.'}
              {currentBrand && <span className="block text-xs">For brand: {currentBrand.name}</span>}
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {isGeneratingTitle ? <div className="flex items-center"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating Title...</div> : title || (template ? template.name : 'New Content')}
          </CardTitle>
          <CardDescription>
            {isLoadingTemplate ? 'Loading template...' : (template ? template.description : 'Select a brand and fill in the details.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand} required>
                <SelectTrigger id="brand"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                <SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            
            {isLoadingTemplate && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> <p>Loading template fields...</p></div>}
            {template && !isLoadingTemplate && (
                <React.Fragment>
                    <Separator />
                    <h3 className="text-lg font-medium pt-2">Template Fields</h3>
                    {(template.inputFields || []).map((field) => (
                    <div key={field.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={field.id}>{field.name}{field.required && <span className="text-destructive">*</span>}</Label>
                            {field.aiSuggester && field.aiPrompt && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateSuggestion(field)}
                                disabled={isGeneratingSuggestionFor !== null || !selectedBrand}
                                className="ml-2"
                              >
                                {isGeneratingSuggestionFor === field.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                {isGeneratingSuggestionFor === field.id ? 'Generating...' : 'Suggest'}
                              </Button>
                            )}
                        </div>
                        {field.type === 'shortText' && (
                        <Input 
                            id={field.id} 
                            value={templateFieldValues[field.id] || ''} 
                            onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)} 
                            placeholder={`Enter ${field.name}`}
                        />
                        )}
                        {field.type === 'longText' && (
                        <Textarea 
                            id={field.id} 
                            value={templateFieldValues[field.id] || ''} 
                            onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)} 
                            placeholder={`Enter ${field.name}`}
                        />
                        )}
                        {field.type === 'select' && field.options && (field.options as SelectOptions).choices && (
                        <Select 
                            value={templateFieldValues[field.id] || ''} 
                            onValueChange={(value) => handleTemplateFieldChange(field.id, value)}
                        >
                            <SelectTrigger id={field.id}><SelectValue placeholder={`Select ${field.name}`} /></SelectTrigger>
                            <SelectContent>
                            {((field.options as SelectOptions).choices!).map(choice => (
                                <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                        {field.type === 'tags' && (
                            <Input 
                            id={field.id} 
                            value={templateFieldValues[field.id] || ''} 
                            onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)} 
                            placeholder={`Enter ${field.name} (comma-separated)`}
                        />
                        )}
                    </div>
                    ))}
                </React.Fragment>
            )}
            
            {templateId && selectedBrand && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  {isFetchingWorkflow ? "Determining workflow..." :
                    associatedWorkflowDetails ? 
                      `${associatedWorkflowDetails.brand_name || 'Brand'} / ${associatedWorkflowDetails.name || 'Workflow'} (Associated)` :
                      "No specific workflow linked for this brand/template."
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {Object.keys(generatedOutputs).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content Review {isGeneratingTitle ? "(Generating Title...)" : (title ? `- \"${title}\"` : "")}</CardTitle>
            <CardDescription>Review and edit the generated content below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(template?.outputFields || []).map(outputField => (
              <div key={outputField.id} className="pt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`output_field_${outputField.id}`} className="text-base font-medium">
                    {outputField.name || `Output Field (ID: ${outputField.id})`}
                  </Label>
                  {!isLoading && 
                   !isGeneratingTitle && 
                   !retryingFieldId && 
                   Object.keys(generatedOutputs).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetryFieldGeneration(outputField)}
                      disabled={retryingFieldId !== null}
                      className="ml-2"
                    >
                      <Sparkles className="mr-2 h-3 w-3" /> Retry Generation
                    </Button>
                  )}
                  {retryingFieldId === outputField.id && (
                    <Button variant="outline" size="sm" disabled className="ml-2">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Retrying...
                    </Button>
                  )}
                </div>
                {outputField.type === 'plainText' ? (
                  <Input
                    id={`output_field_${outputField.id}`}
                    value={generatedOutputs[outputField.id] || ''}
                    onChange={(e) => {
                      if (retryingFieldId !== outputField.id) {
                        setGeneratedOutputs(prev => ({ ...prev, [outputField.id]: e.target.value }));
                      }
                    }}
                    placeholder={`Content for ${outputField.name}...`}
                    className="border shadow-sm focus-visible:ring-1 focus-visible:ring-ring text-sm p-2 w-full"
                    readOnly={retryingFieldId === outputField.id}
                  />
                ) : (
                  <RichTextEditor 
                    value={generatedOutputs[outputField.id] || ''}
                    onChange={(value) => {
                      if (retryingFieldId !== outputField.id) {
                        setGeneratedOutputs(prev => ({ ...prev, [outputField.id]: value }));
                      }
                    }}
                    placeholder={`Content for ${outputField.name}...`}
                  />
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Field Type: <span className='font-semibold'>{outputField.type}</span>
                </p>
              </div>
            ))}
            {Object.keys(generatedOutputs).length === 0 && !isLoading && template && (
              <p className="text-muted-foreground">Generated content will appear here for each output field once generated.</p>
            )}
            {isLoading && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> <p>Generating initial content...</p></div>}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.back()} 
          disabled={isLoading || isLoadingTemplate || isGeneratingTitle || isSaving || isFetchingWorkflow || retryingFieldId !== null}
        >
          Cancel
        </Button>

        {/* Initial Generate Button - Only if NO outputs yet */}
        {Object.keys(generatedOutputs).length === 0 && (
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || isLoadingTemplate || isFetchingWorkflow || isGeneratingTitle || !selectedBrand || !template || retryingFieldId !== null}
            className="flex items-center gap-2"
          >
            {(isLoading || isLoadingTemplate || isFetchingWorkflow || isGeneratingTitle) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Generating Body...' : (isLoadingTemplate ? 'Loading Template...' : (isFetchingWorkflow ? 'Loading Workflow...' : (isGeneratingTitle ? 'Generating Title...' : 'Generate Content & Title')))}
          </Button>
        )}

        {/* Buttons that appear AFTER first generation */}
        {Object.keys(generatedOutputs).length > 0 && (
          <>
            <Button // New "Regenerate All Content" Button
              variant="outline"
              onClick={handleGenerate} // Calls the existing full generation logic
              disabled={isLoading || isLoadingTemplate || isFetchingWorkflow || isGeneratingTitle || !selectedBrand || !template || retryingFieldId !== null || isSaving}
              className="flex items-center gap-2"
            >
              {(isLoading || isGeneratingTitle) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Regenerating Body...' : (isGeneratingTitle ? 'Regenerating Title...' : 'Regenerate All Content')}
            </Button>

            <Button // Existing "Save" Button
              onClick={handleSave} 
              disabled={isSaving || isFetchingWorkflow || isGeneratingTitle || !title || retryingFieldId !== null || isLoading}
              className="flex items-center gap-2"
            >
              {(isSaving || isFetchingWorkflow || isGeneratingTitle) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : (isFetchingWorkflow ? 'Checking Workflow...' : (isGeneratingTitle ? 'Generating Title...': 'Save Content'))}
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 