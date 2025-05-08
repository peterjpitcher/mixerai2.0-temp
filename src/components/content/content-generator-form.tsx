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
import { useToast } from '@/components/toast-provider';
import { BrandIcon } from '@/components/brand-icon';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

interface ContentType {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: any[];
    outputFields: any[];
  };
}

interface ContentGeneratorFormProps {
  preselectedContentType?: string | null;
  templateId?: string | null;
}

export function ContentGeneratorForm({ preselectedContentType, templateId }: ContentGeneratorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  const [responseData, setResponseData] = useState<Record<string, string>>({});
  
  // Function to fetch template data
  const fetchTemplate = async (id: string) => {
    setIsLoadingTemplate(true);
    try {
      console.log('Fetching template with ID:', id);
      const response = await fetch(`/api/content-templates/${id}`);
      const data = await response.json();
      
      if (data.success && data.template) {
        console.log('Template loaded:', data.template);
        setTemplate(data.template);
        // Set the title to the template name
        setTitle(`New ${data.template.name}`);
      } else {
        console.error('Failed to load template:', data.error);
        toast({
          title: "Error loading content tool",
          description: data.error || "Failed to load content generator",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };
  
  useEffect(() => {
    // Fetch brands and content types
    const fetchData = async () => {
      try {
        // Fetch brands
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success && Array.isArray(brandsData.brands)) {
          setBrands(brandsData.brands);
          // If there's only one brand, select it automatically
          if (brandsData.brands.length === 1) {
            setSelectedBrand(brandsData.brands[0].id);
          }
        } else {
          setBrands([]);
        }
        
        // Fetch content types
        const contentTypesResponse = await fetch('/api/content-types');
        const contentTypesData = await contentTypesResponse.json();
        
        if (contentTypesData.success && Array.isArray(contentTypesData.contentTypes)) {
          setContentTypes(contentTypesData.contentTypes);
          
          // Set preselected content type if provided and valid
          if (preselectedContentType) {
            console.log('Preselected content type provided:', preselectedContentType);
            console.log('Available content types:', contentTypesData.contentTypes.map(ct => ct.name));
            
            // Try to match by exact name or lowercase comparison
            let matchedType = contentTypesData.contentTypes.find(
              ct => ct.name === preselectedContentType
            );
            
            if (!matchedType) {
              // Try case-insensitive match
              matchedType = contentTypesData.contentTypes.find(
                ct => ct.name.toLowerCase() === preselectedContentType.toLowerCase()
              );
            }
            
            if (matchedType) {
              console.log('Content type matched:', matchedType.name);
              setSelectedContentType(matchedType.name);
            } else {
              console.warn('Could not match preselected content type:', preselectedContentType);
              
              // If no match but we have content types available, select the first one
              if (contentTypesData.contentTypes.length > 0) {
                console.log('Defaulting to first available content type:', contentTypesData.contentTypes[0].name);
                setSelectedContentType(contentTypesData.contentTypes[0].name);
              }
            }
          } else if (contentTypesData.contentTypes.length > 0) {
            // If no preselected type but we have content types, select the first one
            console.log('No preselected content type, defaulting to first available:', contentTypesData.contentTypes[0].name);
            setSelectedContentType(contentTypesData.contentTypes[0].name);
          }
        } else {
          console.error('No content types returned from API or response format incorrect');
          setContentTypes([]);
          // Set a hard-coded default content type
          setSelectedContentType('Article');
          console.log('Set hard-coded default content type: Article');
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        setBrands([]);
        setContentTypes([]);
        // Set a hard-coded default content type in case of API error
        setSelectedContentType('Article');
        console.log('Set hard-coded default content type after API error: Article');
      }
    };
    
    fetchData();
    
    // If templateId is provided, fetch the template
    if (templateId) {
      console.log('ContentGeneratorForm: Template ID provided:', templateId);
      fetchTemplate(templateId);
    } else {
      console.log('ContentGeneratorForm: No template ID provided');
    }
  }, [preselectedContentType, templateId, toast]);
  
  useEffect(() => {
    // Use the topic as the initial title when content is generated
    if (generatedContent && !title) {
      setTitle(topic);
    }
  }, [generatedContent, topic, title]);
  
  // Debug template data when it changes
  useEffect(() => {
    if (template) {
      console.log('Template data loaded:', template.name);
      console.log('Template input fields:', template.fields.inputFields);
    }
  }, [template]);
  
  // Update template field values when template changes
  useEffect(() => {
    if (template) {
      // Initialize template field values with defaults from the template
      const initialValues: Record<string, string> = {};
      template.fields.inputFields.forEach(field => {
        // Use default value from field if available
        initialValues[field.id] = field.value || '';
      });
      setTemplateFieldValues(initialValues);
      
      // If template has a title field, set the title using that
      const titleField = template.fields.inputFields.find(
        field => field.id === 'title' || field.name.toLowerCase() === 'title'
      );
      if (titleField) {
        console.log('Template has a title field, will use for topic');
        setTitle(`New ${template.name}`);
      }
    }
  }, [template]);
  
  const handleGenerate = async () => {
    console.log('Generate button clicked');
    console.log('Content type state:', selectedContentType);
    console.log('Brand state:', selectedBrand);

    if (!selectedBrand) {
      toast({
        title: "Brand required",
        description: "Please select a brand before generating content",
        variant: "destructive"
      });
      return;
    }
    
    // Check for content type
    if (!selectedContentType) {
      console.warn('No content type selected, using default Article type');
      setSelectedContentType('Article');
      toast({
        title: "Using default content type",
        description: "Generating content with Article type"
      });
    }
    
    // Different validation based on whether we're using a template
    if (template) {
      console.log('Using template validation');
      console.log('Template field values:', templateFieldValues);
      console.log('Template output fields:', template.fields.outputFields);
      
      // Check if required template fields are filled
      const requiredFields = template.fields.inputFields.filter(field => field.required);
      console.log('Required fields:', requiredFields);
      
      const missingFields = requiredFields.filter(field => !templateFieldValues[field.id]);
      
      if (missingFields.length > 0) {
        const missingNames = missingFields.map(field => field.name).join(', ');
        console.log('Missing required fields:', missingNames);
        
        toast({
          title: "Missing required information",
          description: `Please fill in: ${missingNames}`,
          variant: "destructive"
        });
        return;
      }
      
      // Use the template's title field as topic if available
      const titleField = template.fields.inputFields.find(
        field => field.id === 'title' || field.name.toLowerCase() === 'title'
      );
      if (titleField && templateFieldValues[titleField.id]) {
        console.log('Using template title field as topic:', templateFieldValues[titleField.id]);
        setTopic(templateFieldValues[titleField.id]);
      } else {
        // If no title field, use a generic topic based on template name
        const topicFromTemplate = `${template.name} content`;
        console.log('No title field in template, using generic topic:', topicFromTemplate);
        setTopic(topicFromTemplate);
      }
      
      // If there's a keywords field, use it
      const keywordsField = template.fields.inputFields.find(
        field => field.id === 'keywords' || field.name.toLowerCase() === 'keywords'
      );
      if (keywordsField && templateFieldValues[keywordsField.id]) {
        console.log('Using template keywords field:', templateFieldValues[keywordsField.id]);
        setKeywords(templateFieldValues[keywordsField.id]);
      }
    } else {
      // Standard validation for non-template content
      if (!topic) {
        toast({
          title: "Topic required",
          description: "Please enter a topic for your content",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const selectedBrandObj = brands.find(b => b.id === selectedBrand);
      
      if (!selectedBrandObj) {
        throw new Error('Selected brand not found');
      }
      
      let requestBody;
      
      if (template) {
        // Update template input fields with current values
        const updatedInputFields = template.fields.inputFields.map(field => ({
          ...field,
          value: templateFieldValues[field.id] || ''
        }));
        
        // Create properly formatted request with template information
        requestBody = {
          contentType: selectedContentType,
          brand: {
            name: selectedBrandObj.name,
            brand_identity: selectedBrandObj.brand_identity,
            tone_of_voice: selectedBrandObj.tone_of_voice,
            guardrails: selectedBrandObj.guardrails
          },
          template: {
            id: template.id,
            name: template.name,
            inputFields: updatedInputFields,
            outputFields: template.fields.outputFields
          },
          input: {
            templateId: template.id,
            templateFields: templateFieldValues,
            additionalInstructions
          }
        };
      } else {
        // Standard non-template request
        requestBody = {
          contentType: selectedContentType,
          brand: {
            name: selectedBrandObj.name,
            brand_identity: selectedBrandObj.brand_identity,
            tone_of_voice: selectedBrandObj.tone_of_voice,
            guardrails: selectedBrandObj.guardrails
          },
          input: {
            topic,
            keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
            additionalInstructions,
          }
        };
      }
      
      console.log('Sending generation request:', requestBody);
      
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Store the full response data
      setResponseData(data);
      
      // Process the response differently based on whether we're using a template
      if (template && template.fields.outputFields.length > 0) {
        console.log('Processing template-based response with output fields:', template.fields.outputFields);
        
        // For template-based content, find a suitable field to display in the main content area
        // Look for fields in this priority: content field, first field with longText, or first field
        const contentFieldId = findMainContentFieldId(template.fields.outputFields, data);
        
        if (contentFieldId && data[contentFieldId]) {
          console.log(`Using template output field ${contentFieldId} for main content display`);
          setGeneratedContent(data[contentFieldId]);
        } else {
          console.warn('No suitable content field found in response');
          setGeneratedContent('');
        }
        
        // Set a title for database saving purposes (not displayed if not in template)
        if (topic) {
          setTitle(topic);
        } else {
          setTitle(`New ${template.name}`);
        }
        
        // Only set meta fields if they're explicitly in the template
        const metaTitleField = template.fields.outputFields.find(
          field => field.id === 'metaTitle' || field.name.toLowerCase().includes('meta title')
        );
        
        if (metaTitleField && data[metaTitleField.id]) {
          setMetaTitle(data[metaTitleField.id]);
        } else {
          setMetaTitle('');
        }
        
        const metaDescField = template.fields.outputFields.find(
          field => field.id === 'metaDescription' || field.name.toLowerCase().includes('meta description')
        );
        
        if (metaDescField && data[metaDescField.id]) {
          setMetaDescription(data[metaDescField.id]);
        } else {
          setMetaDescription('');
        }
      } else {
        // Standard content fields for non-template content
        setGeneratedContent(data.content || '');
        setMetaTitle(data.metaTitle || '');
        setMetaDescription(data.metaDescription || '');
        
        // Set title for non-template content
        if (!title && topic) {
          setTitle(topic);
        }
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to find the best field to use as main content
  const findMainContentFieldId = (
    outputFields: Array<any>, 
    responseData: Record<string, string>
  ): string | null => {
    // First, look for a field named "content"
    const contentField = outputFields.find(field => 
      field.id === 'content' || field.name.toLowerCase() === 'content'
    );
    
    if (contentField && responseData[contentField.id]) {
      return contentField.id;
    }
    
    // Next, look for any longText field
    const longTextField = outputFields.find(field => 
      field.type === 'longText' && responseData[field.id]
    );
    
    if (longTextField) {
      return longTextField.id;
    }
    
    // Next, look for any field with "body" or "text" in the name
    const textField = outputFields.find(field => 
      (field.name.toLowerCase().includes('body') || 
       field.name.toLowerCase().includes('text')) && 
      responseData[field.id]
    );
    
    if (textField) {
      return textField.id;
    }
    
    // Finally, just use the first field that has data
    for (const field of outputFields) {
      if (responseData[field.id]) {
        return field.id;
      }
    }
    
    // If nothing found, return null
    return null;
  };
  
  const handleSave = async () => {
    if (!selectedBrand || !title || !generatedContent) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields and generate content first",
        variant: "destructive"
      });
      return;
    }
    
    // Check and handle missing content type
    let contentTypeForRequest = selectedContentType;
    if (!contentTypeForRequest) {
      console.warn('No content type selected for save, using default Article type');
      contentTypeForRequest = 'Article';
      // Update state for future use
      setSelectedContentType(contentTypeForRequest);
    }
    
    setIsSaving(true);
    
    try {
      // Get content type ID based on the name
      let contentTypeObj = contentTypes.find(ct => ct.name === contentTypeForRequest);
      
      // If no content type found, create a fallback object
      if (!contentTypeObj && contentTypes.length > 0) {
        contentTypeObj = contentTypes[0];
        console.log('Using first available content type for save:', contentTypeObj.name);
      } else if (!contentTypeObj) {
        console.error('Cannot save without a valid content type');
        toast({
          title: "Save failed",
          description: "Could not determine content type. Please refresh and try again.",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      console.log('Saving content with content type:', contentTypeObj.name);
      
      // Create content in the database
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: selectedBrand,
          content_type_id: contentTypeObj.id,
          template_id: template?.id, // Include template ID if available
          title: title,
          body: generatedContent,
          meta_title: metaTitle,
          meta_description: metaDescription,
          status: 'draft'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save content');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save content');
      }
      
      toast({
        title: "Content saved",
        description: "Your content has been saved successfully",
      });
      
      // Redirect to content list
      router.push('/dashboard/content');
      router.refresh();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Save failed",
        description: "Failed to save content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {template ? `Create ${template.name}` : "Generate New Content"}
          </CardTitle>
          <CardDescription>
            {template ? template.description : "Use AI to generate high-quality marketing content"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingTemplate ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading content tools...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select
                    value={selectedBrand}
                    onValueChange={setSelectedBrand}
                  >
                    <SelectTrigger id="brand">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(brands) && brands.map(brand => (
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
              </div>
              
              {/* Template input fields */}
              {template && template.fields.inputFields.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Content Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {template.fields.inputFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>{field.name}{field.required && <span className="text-red-500 ml-1">*</span>}</Label>
                        {field.type === 'shortText' && (
                          <Input 
                            id={field.id} 
                            placeholder={field.options?.placeholder || `Enter ${field.name.toLowerCase()}`}
                            required={field.required}
                            value={templateFieldValues[field.id] || ''}
                            onChange={(e) => setTemplateFieldValues({
                              ...templateFieldValues,
                              [field.id]: e.target.value
                            })}
                          />
                        )}
                        {field.type === 'longText' && (
                          <Textarea 
                            id={field.id} 
                            placeholder={field.options?.placeholder || `Enter ${field.name.toLowerCase()}`}
                            required={field.required}
                            rows={4}
                            value={templateFieldValues[field.id] || ''}
                            onChange={(e) => setTemplateFieldValues({
                              ...templateFieldValues,
                              [field.id]: e.target.value
                            })}
                          />
                        )}
                        {field.type === 'tags' && (
                          <Input 
                            id={field.id} 
                            placeholder="Enter tags separated by commas"
                            required={field.required}
                            value={templateFieldValues[field.id] || ''}
                            onChange={(e) => setTemplateFieldValues({
                              ...templateFieldValues,
                              [field.id]: e.target.value
                            })}
                          />
                        )}
                        {field.type === 'select' && (
                          <Select
                            value={templateFieldValues[field.id] || ''}
                            onValueChange={(value) => setTemplateFieldValues({
                              ...templateFieldValues,
                              [field.id]: value
                            })}
                          >
                            <SelectTrigger id={field.id}>
                              <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.isArray(field.options?.choices) && field.options.choices.map((choice: string) => (
                                <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Default fields when no template is selected */}
              {(!template || template.fields.inputFields.length === 0) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g. Benefits of Solar Energy"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                    <Input
                      id="keywords"
                      placeholder="e.g. solar panels, renewable energy, green living"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="additionalInstructions">Additional Instructions (optional)</Label>
                    <Textarea
                      id="additionalInstructions"
                      placeholder="Include specific points or instructions for the AI"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || isLoadingTemplate || !selectedBrand}
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⟳</span>
                Generating...
              </span>
            ) : "Generate Content"}
          </Button>
        </CardFooter>
      </Card>
      
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>
              Review and edit your content before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hidden title field for saving functionality */}
            {template && 
              !template.fields.outputFields.some(field => 
                field.id === 'title' || field.name.toLowerCase().includes('title')
              ) && (
              <input 
                type="hidden" 
                id="hidden-title" 
                value={title} 
              />
            )}
            
            {/* Non-template fields or explicit template fields */}
            {/* Title field */}
            {(!template || template.fields.outputFields.some(field => 
              field.id === 'title' || field.name.toLowerCase().includes('title'))
            ) && (
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter content title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}
            
            {/* Meta Title field */}
            {(!template || template.fields.outputFields.some(field => 
              field.id === 'metaTitle' || field.name.toLowerCase().includes('meta title'))
            ) && (
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title (for SEO)</Label>
                <Input
                  id="metaTitle"
                  placeholder="Enter meta title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </div>
            )}
            
            {/* Meta Description field */}
            {(!template || template.fields.outputFields.some(field => 
              field.id === 'metaDescription' || field.name.toLowerCase().includes('meta description'))
            ) && (
              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description (for SEO)</Label>
                <Textarea
                  id="metaDescription"
                  placeholder="Enter meta description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                />
              </div>
            )}
            
            <Separator />
            
            {/* Display all template output fields */}
            {template && template.fields.outputFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Generated Sections</h3>
                
                {template.fields.outputFields.map((field) => {
                  // Skip title and meta fields that are already shown above
                  if ((field.id === 'title' || field.name.toLowerCase().includes('title')) ||
                      (field.id === 'metaTitle' || field.name.toLowerCase().includes('meta title')) ||
                      (field.id === 'metaDescription' || field.name.toLowerCase().includes('meta description'))) {
                    return null;
                  }
                  
                  // Define if this is a content field that should be shown with markdown
                  const isContentField = field.id === 'content' || 
                    field.name.toLowerCase().includes('content') ||
                    field.type === 'longText' ||
                    field.name.toLowerCase().includes('body');
                  
                  // Only show fields that have data
                  if (!(field.id in responseData)) {
                    return null;
                  }
                  
                  return (
                    <div key={field.id} className="space-y-2 border rounded-md p-4">
                      <Label htmlFor={field.id}>{field.name}</Label>
                      
                      {isContentField ? (
                        <div className="mt-2 border rounded-md p-4 bg-background">
                          <MarkdownDisplay markdown={responseData[field.id] || ''} />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm whitespace-pre-wrap">{responseData[field.id] || ''}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Content Preview - only show if not using a template */}
            {!template && (
              <div className="space-y-2">
                <Label>Content Preview</Label>
                <div className="border rounded-md p-4 bg-background">
                  <MarkdownDisplay markdown={generatedContent} />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title || !generatedContent}
              className="w-full"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </span>
              ) : "Save Content"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 