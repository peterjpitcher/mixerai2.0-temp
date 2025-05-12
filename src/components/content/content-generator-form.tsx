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
  templateId?: string | null;
}

export function ContentGeneratorForm({ templateId }: ContentGeneratorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
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
        toast.error(data.error || "Failed to load content generator");
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error("Failed to load template");
    } finally {
      setIsLoadingTemplate(false);
    }
  };
  
  useEffect(() => {
    // Fetch brands
    const fetchData = async () => {
      try {
        // Fetch brands
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success) {
          setBrands(Array.isArray(brandsData.data) ? brandsData.data : []);
          if (Array.isArray(brandsData.data) && brandsData.data.length === 1) {
            setSelectedBrand(brandsData.data[0].id);
          }
        } else {
          console.error('Failed to fetch brands:', brandsData.error);
          setBrands([]);
        }
      } catch (error) {
        console.error('Error fetching brand data:', error);
        setBrands([]);
      }
    };
    
    fetchData();
    
    if (templateId) {
      fetchTemplate(templateId);
    } else {
      console.warn('ContentGeneratorForm: No template ID provided. Form will not function correctly.');
      toast.error("Cannot generate content without a template. Please select a template first.");
    }
  }, [templateId]);
  
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
    console.log('Brand state:', selectedBrand);

    if (!selectedBrand) {
      toast.error("Please select a brand before generating content");
      return;
    }
    
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
        
        toast.error(`Please fill in: ${missingNames}`);
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
      toast.error("Content generation requires a template. Please select one.");
      return;
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
          brand_id: selectedBrand,
          template_id: template.id,
          input_fields: updatedInputFields,
          additional_instructions: additionalInstructions
        };
      } else {
        throw new Error('Template not found');
      }
      
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Content generated successfully:', data);
        setGeneratedContent(data.content);
        setResponseData(data);
        toast('Content generated successfully.');
      } else {
        console.error('Failed to generate content:', data.error);
        toast.error(data.error || 'Failed to generate content. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!generatedContent) {
      toast.error('No content to save. Please generate content first.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brand_id: selectedBrand,
          template_id: template?.id,
          title,
          topic,
          keywords,
          meta_title: metaTitle,
          meta_description: metaDescription,
          content: generatedContent,
          additional_instructions: additionalInstructions
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Content saved successfully:', data);
        toast('Content saved successfully.');
        router.push(`/dashboard/content/${data.content.id}`);
      } else {
        console.error('Failed to save content:', data.error);
        toast.error(data.error || 'Failed to save content. Please try again.');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate content using AI-powered templates.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate New Content</CardTitle>
          <CardDescription>Fill in the details below to generate content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="brand" className="text-right">
                Brand
              </Label>
              <Select
                value={selectedBrand}
                onValueChange={setSelectedBrand}
                required
              >
                <SelectTrigger id="brand">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="topic" className="text-right">
                Topic
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. AI in Marketing"
              />
            </div>
            
            <div>
              <Label htmlFor="keywords" className="text-right">
                Keywords
              </Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. AI, marketing, technology"
              />
            </div>
            
            <div>
              <Label htmlFor="additionalInstructions" className="text-right">
                Additional Instructions
              </Label>
              <Textarea
                id="additionalInstructions"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Any additional instructions for the content generator"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isLoading} className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Generating...' : 'Generate Content'}
          </Button>
        </CardFooter>
      </Card>
      
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Review and edit the generated content below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MarkdownDisplay markdown={generatedContent} />
            <div className="space-y-4">
              <div>
                <Label htmlFor="metaTitle" className="text-right">
                  Meta Title
                </Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO-friendly title for the content"
                />
              </div>
              
              <div>
                <Label htmlFor="metaDescription" className="text-right">
                  Meta Description
                </Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO-friendly description for the content"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Content'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 