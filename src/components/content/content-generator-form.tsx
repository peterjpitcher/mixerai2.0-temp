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
import { useRouter } from 'next/navigation';
import { BrandIcon } from '@/components/brand-icon';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

interface TemplateInputField {
  id: string;
  name: string;
  type: 'shortText' | 'longText' | 'select' | 'tags' | string;
  required?: boolean;
  value?: string; 
  options?: {
    choices?: string[];
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: TemplateInputField[];
    outputFields: any[]; 
  };
}

interface WorkflowSummary {
  id: string;
  name: string;
  template_id?: string | null;
}

interface ContentGeneratorFormProps {
  templateId?: string | null;
}

export function ContentGeneratorForm({ templateId }: ContentGeneratorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  const [associatedWorkflowId, setAssociatedWorkflowId] = useState<string | null>(null);
  const [isFetchingWorkflow, setIsFetchingWorkflow] = useState(false);
  
  const fetchTemplate = async (id: string) => {
    setIsLoadingTemplate(true);
    try {
      const response = await fetch(`/api/content-templates/${id}`);
      const data = await response.json();
      if (data.success && data.template) {
        setTemplate(data.template);
        const initialValues: Record<string, string> = {};
        if (data.template.fields && data.template.fields.inputFields) {
          (data.template.fields.inputFields as TemplateInputField[]).forEach(field => {
            initialValues[field.id] = field.value || '';
          });
        }
        setTemplateFieldValues(initialValues);
      } else {
        toast.error(data.error || "Failed to load template details");
      }
    } catch (error) {
      toast.error("Error fetching template details");
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
        setAssociatedWorkflowId(null);
        try {
          const res = await fetch(`/api/workflows?brand_id=${selectedBrand}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const matchingWorkflow = (data.data as WorkflowSummary[]).find(wf => wf.template_id === templateId);
            if (matchingWorkflow) setAssociatedWorkflowId(matchingWorkflow.id);
            else toast.info("No specific workflow for this brand/template.");
          } else {
            toast.error('Could not determine workflow.');
          }
        } catch (error) { toast.error('Error determining workflow.'); }
        finally { setIsFetchingWorkflow(false); }
      }
    };
    fetchWorkflow();
  }, [templateId, selectedBrand]);

  const handleTemplateFieldChange = (fieldId: string, value: string) => {
    setTemplateFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedBrand || !template) {
      toast.error("Please select a brand and ensure template is loaded.");
      return;
    }
    const missingFields = template.fields.inputFields.filter(
      field => field.required && !templateFieldValues[field.id]
    );
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    setIsLoading(true);
    setGeneratedContent('');
    setTitle('');
    let generatedBodyContent = '';

    try {
      const input_fields_with_values = template.fields.inputFields.map(field => ({
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
            outputFields: template.fields.outputFields
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
        generatedBodyContent = typeof data.content === 'string' ? data.content : data[template.fields.outputFields[0]?.id] || 'Error: Could not extract content body.';
        setGeneratedContent(generatedBodyContent);
        toast.success('Main content generated.');

        if (generatedBodyContent && generatedBodyContent !== 'Error: Could not extract content body.') {
          setIsGeneratingTitle(true);
          try {
            const topicField = template.fields.inputFields.find(f => f.id === 'topic' || f.name.toLowerCase().includes('topic'));
            const keywordsField = template.fields.inputFields.find(f => f.id === 'keywords' || f.name.toLowerCase().includes('keyword'));
            
            const titleRequestContext = {
              contentBody: generatedBodyContent,
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
        }
      } else {
        toast.error(data.error || 'Failed to generate content.');
      }
    } catch (error) { 
      toast.error('Error during content generation process.'); 
      console.error('Content generation process error:', error);
    }
    finally { setIsLoading(false); }
  };
  
  const handleSave = async () => {
    if (!generatedContent) { toast.error('No content to save.'); return; }
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
      const payload = {
        brand_id: selectedBrand,
        template_id: template?.id,
        title,
        workflow_id: associatedWorkflowId,
        body: generatedContent,
        content_data: {
            templateInputValues: templateFieldValues,
            generatedOutput: generatedContent
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
        router.push(`/dashboard/content/${data.data.id}`);
      } else {
        toast.error(data.error || 'Failed to save content.');
      }
    } catch (error) { toast.error('Error saving content.'); }
    finally { setIsSaving(false); }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Generator</h1>
          <p className="text-muted-foreground mt-1">
            {template ? `Using template: ${template.name}` : 'Generate content using AI-powered templates.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
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
                    {template.fields.inputFields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                        <Label htmlFor={field.id}>{field.name}{field.required && <span className="text-destructive">*</span>}</Label>
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
                        {field.type === 'select' && field.options?.choices && (
                        <Select 
                            value={templateFieldValues[field.id] || ''} 
                            onValueChange={(value) => handleTemplateFieldChange(field.id, value)}
                        >
                            <SelectTrigger id={field.id}><SelectValue placeholder={`Select ${field.name}`} /></SelectTrigger>
                            <SelectContent>
                            {field.options.choices.map(choice => (
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
                    associatedWorkflowId ? `Workflow: ${associatedWorkflowId} (Associated)` :
                    "No specific workflow linked for this brand/template."
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isLoading || isLoadingTemplate || isFetchingWorkflow || isGeneratingTitle} className="flex items-center gap-2">
            {(isLoading || isLoadingTemplate || isFetchingWorkflow || isGeneratingTitle) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Generating Body...' : (isLoadingTemplate ? 'Loading Template...' : (isFetchingWorkflow ? 'Loading Workflow...' : (isGeneratingTitle ? 'Generating Title...' : 'Generate Content & Title')))}
          </Button>
        </CardFooter>
      </Card>
      
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content Review {isGeneratingTitle ? "(Generating Title...)" : (title ? `- \"${title}\"` : "")}</CardTitle>
            <CardDescription>Review and edit the generated content below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Generated Body Content</Label>
            <Textarea 
                value={generatedContent} 
                onChange={(e) => setGeneratedContent(e.target.value)} 
                rows={10} 
                placeholder="Generated content will appear here..."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || isFetchingWorkflow || isGeneratingTitle} className="flex items-center gap-2">
              {(isSaving || isFetchingWorkflow || isGeneratingTitle) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : (isFetchingWorkflow ? 'Checking Workflow...' : (isGeneratingTitle ? 'Generating Title...': 'Save Content'))}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 