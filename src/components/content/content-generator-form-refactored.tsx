'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ShieldAlert, Info } from 'lucide-react';
import { toast } from 'sonner';

// Import our new components
import { ContentHeader } from './content-header';
import { BrandSelector } from './brand-selector';
import { TemplateFieldRenderer } from './template-field-renderer';
import { GeneratedContentPreview } from './generated-content-preview';
import { useContentGenerator } from '@/hooks/use-content-generator';

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
    currentBrand,
    productContext,
    missingRequiredFields,
    
    // Actions
    setSelectedBrand,
    setTitle,
    setGeneratedOutputs,
    handleTemplateFieldChange,
    generateContent,
    saveContent,
  } = useContentGenerator(templateId);

  const handleBack = () => {
    router.push('/dashboard/content');
  };

  const handleGenerateTitle = async () => {
    if (!selectedBrand || Object.keys(generatedOutputs).length === 0) {
      toast.error('Please generate content first');
      return;
    }
    
    // Implementation for title generation
    // This would call an API endpoint to generate a title based on the content
    toast.info('Title generation not yet implemented');
  };

  const handleSuggestion = async () => {
    // Implementation for AI suggestions
    toast.info('AI suggestions not yet implemented');
  };

  const handleRetryField = async () => {
    // Implementation for retrying individual fields
    toast.info('Field retry not yet implemented');
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

  const hasGeneratedContent = Object.keys(generatedOutputs).length > 0;
  const canGenerate = selectedBrand && missingRequiredFields.length === 0;

  if (!templateId) {
    return (
      <div className="container max-w-7xl mx-auto">
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
    <div className="container max-w-7xl mx-auto">
      <ContentHeader 
        templateName={template?.name} 
        onBack={handleBack} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Brand Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Selection</CardTitle>
              <CardDescription>
                Select the brand for this content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandSelector
                brands={displayableBrands}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                disabled={isLoading}
              />
              
              {currentBrand && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Brand Context</h4>
                  {currentBrand.brand_identity && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Identity:</strong> {currentBrand.brand_identity}
                    </p>
                  )}
                  {currentBrand.tone_of_voice && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Tone:</strong> {currentBrand.tone_of_voice}
                    </p>
                  )}
                  {currentBrand.guardrails && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Guardrails:</strong> {currentBrand.guardrails}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Fields */}
          {template && (
            <Card>
              <CardHeader>
                <CardTitle>Content Details</CardTitle>
                <CardDescription>
                  Fill in the required information for your {template.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
              
              {missingRequiredFields.length > 0 && (
                <CardFooter>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4" />
                    <p className="text-sm">
                      Missing required fields: {missingRequiredFields.join(', ')}
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={generateContent}
                disabled={!canGenerate || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
              
              {associatedWorkflowDetails && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    This content will follow the &quot;{associatedWorkflowDetails.name}&quot; workflow
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {hasGeneratedContent && (
            <>
              {/* Title Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Title</CardTitle>
                  <CardDescription>
                    Give your content a descriptive title
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a title for this content"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateTitle}
                          disabled={isGeneratingTitle}
                        >
                          {isGeneratingTitle ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Content */}
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

              {/* Save Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleSaveAndContinue}
                    disabled={!title.trim() || isSaving}
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
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}