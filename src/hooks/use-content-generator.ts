'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api-client';
import { normalizeOutputsMap } from '@/lib/content/html-normalizer';
import type { InputField, OutputField, ContentTemplate as Template, FieldType, NormalizedContent } from '@/types/template';
import type { ProductContext } from '@/types/claims';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
  logo_url?: string | null;
  language?: string | null;
  country?: string | null;
}

interface WorkflowSummary {
  id: string;
  name: string;
  template_id?: string | null;
  brand_id: string;
  brand_name: string;
}

export function useContentGenerator(templateId?: string | null) {
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data state
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [isLoadingAllBrands, setIsLoadingAllBrands] = useState(true);
  const [displayableBrands, setDisplayableBrands] = useState<Brand[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [generatedOutputs, setGeneratedOutputs] = useState<Record<string, NormalizedContent>>({});
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  
  const [associatedWorkflowDetails, setAssociatedWorkflowDetails] = useState<WorkflowSummary | null>(null);
  const [isFetchingAssociatedWorkflow, setIsFetchingAssociatedWorkflow] = useState(false);
  
  const [workflowsForCurrentTemplate, setWorkflowsForCurrentTemplate] = useState<WorkflowSummary[]>([]);
  const [isLoadingWorkflowsForTemplate, setIsLoadingWorkflowsForTemplate] = useState(true);
  
  const [isGeneratingSuggestionFor, setIsGeneratingSuggestionFor] = useState<string | null>(null);
  const [retryingFieldId, setRetryingFieldId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const [canGenerateContent] = useState<boolean>(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  const [productContext, setProductContext] = useState<ProductContext | null>(null);
  const [isFetchingProductContext, setIsFetchingProductContext] = useState(false);
  
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  
  const currentBrand = allBrands.find(b => b.id === selectedBrand);
  
  // Calculate missing required fields
  const missingRequiredFields = useMemo(() => {
    if (!template) return [];
    
    const required = template.inputFields
      ?.filter(field => field.required)
      .filter(field => !templateFieldValues[field.id] || templateFieldValues[field.id].trim() === '');
    
    return required?.map(field => field.name) || [];
  }, [template, templateFieldValues]);
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!templateId) {
        setIsLoadingTemplate(false);
        setIsLoadingAllBrands(false);
        setIsLoadingWorkflowsForTemplate(false);
        return;
      }
      
      const [templateResult, brandsResult, workflowsResult] = await Promise.allSettled([
        apiFetch(`/api/content-templates/${templateId}`).then(res => res.json()),
        apiFetch('/api/brands').then(res => res.json()),
        apiFetch(`/api/workflows?template_id=${templateId}`).then(res => res.json())
      ]);
      
      if (templateResult.status === 'fulfilled' && templateResult.value.success) {
        const templateData = templateResult.value;
        setTemplate(templateData.template);
        
        if (templateData.template?.inputFields) {
          const initialValues: Record<string, string> = {};
          templateData.template.inputFields.forEach((field: InputField) => {
            initialValues[field.id] = '';
          });
          setTemplateFieldValues(initialValues);
        }
      } else {
        toast.error('Failed to load template');
      }
      setIsLoadingTemplate(false);
      
      if (brandsResult.status === 'fulfilled' && brandsResult.value.success) {
        const brandsData = brandsResult.value;
        const brands = brandsData.data || [];
        setAllBrands(brands);
        
        if (brands.length === 1) {
          setSelectedBrand(brands[0].id);
        }
      } else {
        toast.error('Failed to load brands');
      }
      setIsLoadingAllBrands(false);
      
      if (workflowsResult.status === 'fulfilled' && workflowsResult.value.success) {
        const wfForTemplateData = workflowsResult.value;
        setWorkflowsForCurrentTemplate(wfForTemplateData.data || []);
      }
      setIsLoadingWorkflowsForTemplate(false);
      
      setInitialDataLoaded(true);
    };
    
    fetchInitialData();
  }, [templateId]);
  
  // Update displayable brands when data changes
  useEffect(() => {
    if (!initialDataLoaded || !templateId || workflowsForCurrentTemplate.length === 0) {
      setDisplayableBrands(allBrands);
      return;
    }
    
    const brandIdsWithWorkflowForThisTemplate = new Set(
      workflowsForCurrentTemplate.map(wf => wf.brand_id)
    );
    const filtered = allBrands.filter(brand => brandIdsWithWorkflowForThisTemplate.has(brand.id));
    setDisplayableBrands(filtered);
    
    if (filtered.length === 1 && !selectedBrand) {
      setSelectedBrand(filtered[0].id);
    } else if (selectedBrand && !filtered.find(b => b.id === selectedBrand)) {
      setSelectedBrand('');
    }
  }, [allBrands, workflowsForCurrentTemplate, templateId, initialDataLoaded, selectedBrand]);
  
  // Fetch workflow details when brand is selected
  useEffect(() => {
    if (!selectedBrand || !templateId) {
      setAssociatedWorkflowDetails(null);
      return;
    }
    
    const fetchSpecificWorkflow = async () => {
      setIsFetchingAssociatedWorkflow(true);
      try {
        const response = await apiFetch(`/api/workflows?brand_id=${selectedBrand}&template_id=${templateId}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          setAssociatedWorkflowDetails(data.data[0]);
        } else {
          setAssociatedWorkflowDetails(null);
        }
      } catch (error) {
        console.error('Error fetching specific workflow:', error);
        setAssociatedWorkflowDetails(null);
      } finally {
        setIsFetchingAssociatedWorkflow(false);
      }
    };
    
    fetchSpecificWorkflow();
  }, [selectedBrand, templateId]);
  
  
  // Handle template field changes
  const handleTemplateFieldChange = useCallback(async (fieldId: string, value: string, fieldType?: FieldType) => {
    setTemplateFieldValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Handle product selection changes
    if (fieldType === 'product-selector' && selectedBrand) {
      if (!value) {
        setProductContext(null);
        return;
      }
      
      setIsFetchingProductContext(true);
      const abortController = new AbortController();
      
      try {
        const response = await apiFetch('/api/content/prepare-product-context', {
          method: 'POST',
          body: JSON.stringify({
            brandId: selectedBrand,
            productId: value
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error('Failed to fetch product context');
        
        const data = await response.json();
        if (data.success && (data.productName || data.styledClaims)) {
          setProductContext({
            productName: data.productName,
            styledClaims: data.styledClaims
          });
          if (data.styledClaims) {
            toast.success(`Loaded claims for: ${data.productName}`);
          } else {
            toast.info(`No claims found for: ${data.productName}`);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching product context:', error);
          toast.error('Failed to load product information');
        }
      } finally {
        setIsFetchingProductContext(false);
      }
      
      return () => abortController.abort();
    }
  }, [selectedBrand]);
  
  // Generate content
  const generateContent = useCallback(async () => {
    if (!selectedBrand || !template) {
      toast.error('Please select a brand and ensure template is loaded');
      return;
    }
    
    setIsLoading(true);
    setAiError(null);
    setGeneratedOutputs({}); // Clear previous outputs
    
    try {
      // Prepare input fields with values for the API
      const input_fields_with_values = (template.inputFields || []).map(field => ({
        ...field,
        value: templateFieldValues[field.id] || ''
      }));

      const inputPayload = productContext
        ? { product_context: productContext }
        : undefined;

      const requestBody = {
        brand_id: selectedBrand,
        template: {
          id: template.id,
          name: template.name,
          inputFields: input_fields_with_values,
          outputFields: template.outputFields || []
        },
        ...(inputPayload ? { input: inputPayload } : {}),
      };

      const response = await apiFetch('/api/content/generate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }
      
      if (data.success) {
        const normalized = normalizeOutputsMap(
          data.generatedOutputs as Record<string, unknown>,
          template.outputFields || []
        );

        if (Object.keys(normalized).length > 0) {
          setGeneratedOutputs(normalized);
          toast.success('Content generated successfully!');
        } else {
          throw new Error('No content fields were generated');
        }
      } else {
        throw new Error(data.error || 'No content was generated');
      }
    } catch (error: unknown) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      setAiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrand, template, templateFieldValues, productContext]);
  
  // Generate title using AI
  const generateTitle = useCallback(async (contentBody: string): Promise<string | null> => {
    if (!selectedBrand || !contentBody) {
      return null;
    }

    setIsGeneratingTitle(true);
    try {
      const response = await apiFetch('/api/ai/generate-title', {
        method: 'POST',
        body: JSON.stringify({
          contentBody: contentBody,
          brand_id: selectedBrand,
          topic: templateFieldValues.topic || templateFieldValues.title || undefined,
          keywords: templateFieldValues.keywords ? 
            (typeof templateFieldValues.keywords === 'string' ? 
              templateFieldValues.keywords.split(',').map(k => k.trim()).filter(Boolean) : 
              templateFieldValues.keywords) : 
            undefined
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.title) {
        setTitle(data.title);
        return data.title;
      } else {
        console.error('Failed to generate title:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error generating title:', error);
      return null;
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [selectedBrand, templateFieldValues]);

  // Save content
  const saveContent = useCallback(async () => {
    if (!selectedBrand || !template) {
      toast.error('Please complete all required fields');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const outputFields = template.outputFields || [];
      const isRichOutput = (fieldType: OutputField['type']) => {
        const normalizedType = fieldType?.toLowerCase();
        return normalizedType === 'richtext' || normalizedType === 'rich-text' || normalizedType === 'html';
      };

      let primaryField: OutputField | undefined;
      if (outputFields.length > 0) {
        primaryField = outputFields.find((field) => isRichOutput(field.type) && generatedOutputs[field.id])
          || outputFields.find((field) => generatedOutputs[field.id]);
      }

      const primaryNormalized = primaryField ? generatedOutputs[primaryField.id] : undefined;
      const primaryBodyContentHtml = primaryNormalized?.html ?? '';
      const primaryBodyContentPlain = primaryNormalized?.plain ?? '';
      const bodyPayload = primaryField && isRichOutput(primaryField.type)
        ? primaryBodyContentHtml
        : primaryBodyContentPlain;

      // Generate AI title if not already set and we have content
      let finalTitle = title.trim();
      if (!finalTitle && primaryBodyContentPlain) {
        const generatedTitle = await generateTitle(primaryBodyContentPlain);
        finalTitle = generatedTitle || `${template.name} - ${format(new Date(), 'MMMM d, yyyy')}`;
      } else if (!finalTitle) {
        finalTitle = `${template.name} - ${format(new Date(), 'MMMM d, yyyy')}`;
      }

      const response = await apiFetch('/api/content', {
        method: 'POST',
        body: JSON.stringify({
          brand_id: selectedBrand,
          template_id: template.id,
          title: finalTitle,
          workflow_id: associatedWorkflowDetails?.id,
          body: bodyPayload,
          due_date: dueDate?.toISOString() || null,
          content_data: {
            templateInputValues: templateFieldValues,
            generatedOutputs: generatedOutputs
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save content');
      }
      
      if (data.success) {
        toast.success('Content saved successfully!');
        return data.data?.id;
      }
    } catch (error: unknown) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save content';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [selectedBrand, template, generatedOutputs, templateFieldValues, associatedWorkflowDetails, title, generateTitle, dueDate]);
  
  return {
    // State
    isLoading,
    isGeneratingTitle,
    isSaving,
    allBrands,
    isLoadingAllBrands,
    displayableBrands,
    selectedBrand,
    generatedOutputs,
    title,
    template,
    isLoadingTemplate,
    templateFieldValues,
    associatedWorkflowDetails,
    isFetchingAssociatedWorkflow,
    workflowsForCurrentTemplate,
    isLoadingWorkflowsForTemplate,
    isGeneratingSuggestionFor,
    retryingFieldId,
    aiError,
    canGenerateContent,
    currentBrand,
    productContext,
    isFetchingProductContext,
    missingRequiredFields,
    dueDate,
    
    // Actions
    setSelectedBrand,
    setTitle,
    setGeneratedOutputs,
    setTemplateFieldValues,
    setIsGeneratingSuggestionFor,
    setRetryingFieldId,
    setAiError,
    handleTemplateFieldChange,
    generateContent,
    generateTitle,
    saveContent,
    setDueDate,
  };
}
