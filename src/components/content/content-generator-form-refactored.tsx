'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

// Import our new components
import { ContentHeader } from './content-header';
import { BrandSelector } from './brand-selector';
import { TemplateFieldRenderer } from './template-field-renderer';
import { GeneratedContentPreview } from './generated-content-preview';
import { ClaimsViewerSection } from './claims-viewer-section';
import { useContentGenerator } from '@/hooks/use-content-generator';
import { DatePicker } from '@/components/ui/date-picker';
import { apiFetch } from '@/lib/api-client';

interface ContentGeneratorFormProps {
  templateId?: string | null;
}

export function ContentGeneratorForm({ templateId }: ContentGeneratorFormProps) {
  const router = useRouter();
  
  const {
    // State
    isLoading,
    isGeneratingTitle,
    isSaving,
    displayableBrands,
    selectedBrand,
    generatedOutputs,
    title,
    template,
    isLoadingTemplate,
    templateFieldValues,
    associatedWorkflowDetails,
    isGeneratingSuggestionFor,
    retryingFieldId,
    aiError,
    productContext,
    isFetchingProductContext,
    missingRequiredFields,
    dueDate,
    currentBrand,
    
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
  } = useContentGenerator(templateId);

  const handleBack = () => {
    router.push('/dashboard/content');
  };
  


  const handleSuggestion = async (fieldId: string) => {
    if (!selectedBrand || !template) {
      toast.error('Please select a brand first');
      return;
    }
    
    const field = template.inputFields?.find(f => f.id === fieldId);
    if (!field?.aiPrompt) {
      toast.error('No AI prompt configured for this field');
      return;
    }
    
    setIsGeneratingSuggestionFor(fieldId);
    
    try {
      // Create a mapping of field names to values for template variable replacement
      const fieldNameToValueMap: Record<string, string> = {};
      template.inputFields?.forEach(inputField => {
        fieldNameToValueMap[inputField.name] = templateFieldValues[inputField.id] || '';
      });
      
      const response = await apiFetch('/api/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({
          brand_id: selectedBrand,
          prompt: field.aiPrompt,
          formValues: fieldNameToValueMap, // Pass field names instead of IDs
          context: {
            productContext: productContext
          }
        }),
      });

      const data = await response.json();

      if (data.success && data.suggestion) {
        setTemplateFieldValues(prev => ({ ...prev, [fieldId]: data.suggestion }));
        toast.success(`Suggestion generated for ${field.name}`);
      } else {
        toast.error(data.error || `Failed to generate suggestion for ${field.name}`);
      }
    } catch (error) {
      toast.error(`Error generating suggestion`);
      console.error(`Error generating suggestion for ${field.name}:`, error);
    } finally {
      setIsGeneratingSuggestionFor(null);
    }
  };

  const handleRetryField = async (fieldId: string) => {
    if (!selectedBrand || !template) {
      toast.error('Please select a brand and ensure template is loaded');
      return;
    }
    
    const field = template.outputFields?.find(f => f.id === fieldId);
    if (!field) {
      toast.error('Field not found');
      return;
    }
    
    setRetryingFieldId(fieldId);
    setAiError(null);
    
    try {
      // Prepare the same data as full generation but request only one field
      const input_fields_with_values = (template.inputFields || []).map(field => ({
        ...field,
        value: templateFieldValues[field.id] || ''
      }));

      const response = await apiFetch('/api/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          brand_id: selectedBrand,
          template: {
            id: template.id,
            name: template.name,
            inputFields: input_fields_with_values,
            outputFields: [field] // Only send the field we want to regenerate
          },
          input: {
            product_context: productContext,
          }
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate field');
      }
      
      if (data.success) {
        // Extract the regenerated field
        const { ...generatedFields } = data;
        
        if (generatedFields[fieldId]) {
          setGeneratedOutputs(prev => ({ 
            ...prev, 
            [fieldId]: generatedFields[fieldId] 
          }));
          toast.success(`${field.name} regenerated successfully!`);
        } else {
          throw new Error('No content was generated for this field');
        }
      } else {
        throw new Error(data.error || 'Failed to regenerate field');
      }
    } catch (error: unknown) {
      console.error('Field regeneration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate field';
      setAiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRetryingFieldId(null);
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      const contentId = await saveContent();
      if (contentId) {
        router.push(`/dashboard/content/${contentId}/edit`);
      }
    } catch {
      // Error already handled in hook
    }
  };
  
  const handleGenerateContent = async () => {
    // Double-check brand selection before generating
    if (!selectedBrand) {
      toast.error('Please select a brand before generating content');
      return;
    }
    
    if (missingRequiredFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingRequiredFields.join(', ')}`);
      return;
    }
    
    setHasAutoRegenerated(false); // Reset the flag when generating new content
    await generateContent();
  };

  const hasGeneratedContent = Object.keys(generatedOutputs).length > 0;
  const canGenerate = selectedBrand && missingRequiredFields.length === 0 && !isFetchingProductContext;
  
  // Track if we've already attempted auto-regeneration
  const [hasAutoRegenerated, setHasAutoRegenerated] = useState(false);

  // Auto-regenerate missing fields after initial generation
  useEffect(() => {
    if (!hasGeneratedContent || !template || hasAutoRegenerated) return;
    
    const checkAndRegenerateMissingFields = async () => {
      const missingFields = (template.outputFields || []).filter(field => {
        const value = generatedOutputs[field.id];
        // Check ALL fields, not just aiAutoComplete ones
        return !value || value.trim().length === 0;
      });
      
      if (missingFields.length > 0) {
        setHasAutoRegenerated(true);
        console.log(`Found ${missingFields.length} missing fields, auto-regenerating...`);
        toast.info(`Generating ${missingFields.length} missing field${missingFields.length > 1 ? 's' : ''}...`);
        
        for (const field of missingFields) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between requests
          await handleRetryField(field.id);
        }
      }
    };
    
    checkAndRegenerateMissingFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGeneratedContent, template, hasAutoRegenerated]);

  if (!templateId) {
    return (
      <div className="space-y-6">
        <ContentHeader onBack={handleBack} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No template selected. Please go back and select a template.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContentHeader 
        templateName={template?.name} 
        onBack={handleBack}
        activeBrand={currentBrand}
      />

      {/* Template Description */}
      {template?.description && (
        <p className="text-sm text-muted-foreground mb-6">{template.description}</p>
      )}

      {/* Main Content Card */}
      <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle>Create Content</CardTitle>
                <CardDescription>
                  Fill in the required information to generate your {template?.name || 'content'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Brand Selection</h3>
              <BrandSelector
                brands={displayableBrands}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                disabled={isLoading}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <DatePicker
                date={dueDate}
                onDateChange={setDueDate}
                placeholder="Select a due date"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Set a due date for when this content should be published or reviewed
              </p>
            </div>

            {/* Template Fields */}
            {template && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Content Details</h3>
                  {isLoadingTemplate ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    (template.inputFields || []).map((field) => (
                      <TemplateFieldRenderer
                        key={field.id}
                        field={field}
                        value={templateFieldValues[field.id] || ''}
                        onChange={handleTemplateFieldChange}
                        brandId={selectedBrand}
                        isGeneratingSuggestion={isGeneratingSuggestionFor === field.id}
                        onGenerateSuggestion={handleSuggestion}
                        productContext={productContext}
                      />
                    ))
                  )}
                </div>
                
                {/* Product Claims Section */}
                {productContext && productContext.styledClaims && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Product Claims Context</h3>
                      <ClaimsViewerSection
                        productName={productContext.productName}
                        styledClaims={productContext.styledClaims}
                      />
                    </div>
                  </>
                )}
                
                {/* Loading Product Context Indicator */}
                {isFetchingProductContext && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Loading product claims context...
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            {!selectedBrand && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 w-full">
                <Info className="h-4 w-4" />
                <p className="text-sm">
                  Please select a brand to generate content
                </p>
              </div>
            )}
            
            {selectedBrand && missingRequiredFields.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 w-full">
                <Info className="h-4 w-4" />
                <p className="text-sm">
                  Missing required fields: {missingRequiredFields.join(', ')}
                </p>
              </div>
            )}
            
            <Button
              onClick={handleGenerateContent}
              disabled={!canGenerate || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : isFetchingProductContext ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Product Claims...
                </>
              ) : hasGeneratedContent ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenerate All Content
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
            
            {associatedWorkflowDetails && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                <span>
                  This content will follow the &quot;{associatedWorkflowDetails.name}&quot; workflow
                </span>
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Generated Content Section - Separate Card */}
        {hasGeneratedContent && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                Review and edit the generated content before saving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Field */}
              <div className="space-y-2">
                <Label htmlFor="content-title">Title</Label>
                <div className="flex gap-2">
                  <Input
                    id="content-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isGeneratingTitle ? "Generating title..." : "Enter content title"}
                    disabled={isGeneratingTitle}
                    className="flex-1"
                  />
                  {!title && Object.keys(generatedOutputs).length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Get primary body content for title generation
                        let contentForTitle = '';
                        if (template?.outputFields && template.outputFields.length > 0) {
                          const richTextOutput = template.outputFields.find(f => f.type === 'richText' && generatedOutputs[f.id]);
                          if (richTextOutput) {
                            contentForTitle = generatedOutputs[richTextOutput.id];
                          } else {
                            const firstOutputField = template.outputFields[0];
                            if (firstOutputField && generatedOutputs[firstOutputField.id]) {
                              contentForTitle = generatedOutputs[firstOutputField.id];
                            }
                          }
                        }
                        if (contentForTitle) {
                          await generateTitle(contentForTitle);
                        }
                      }}
                      disabled={isGeneratingTitle}
                    >
                      {isGeneratingTitle ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Title
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {isGeneratingTitle && (
                  <p className="text-sm text-muted-foreground">Using AI to create an engaging title...</p>
                )}
              </div>
              
              <Separator />
              
              <GeneratedContentPreview
                generatedOutputs={generatedOutputs}
                outputFields={template?.outputFields || []}
                onOutputChange={(fieldId, value) => 
                  setGeneratedOutputs(prev => ({ ...prev, [fieldId]: value }))
                }
                onRetry={handleRetryField}
                retryingFieldId={retryingFieldId}
                aiError={aiError}
              />
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Continue'
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
    </div>
  );
}
