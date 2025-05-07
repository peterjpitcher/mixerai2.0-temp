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
}

interface ContentType {
  id: string;
  name: string;
}

interface ContentGeneratorFormProps {
  preselectedContentType?: string | null;
}

export function ContentGeneratorForm({ preselectedContentType }: ContentGeneratorFormProps) {
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
  
  useEffect(() => {
    // Fetch brands and content types
    const fetchData = async () => {
      try {
        // Fetch brands
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success && Array.isArray(brandsData.brands)) {
          setBrands(brandsData.brands);
        } else {
          setBrands([]);
        }
        
        // Fetch content types
        const contentTypesResponse = await fetch('/api/content-types');
        const contentTypesData = await contentTypesResponse.json();
        
        if (contentTypesData.success && Array.isArray(contentTypesData.contentTypes)) {
          setContentTypes(contentTypesData.contentTypes);
          
          // Set preselected content type if provided and valid
          if (preselectedContentType && Array.isArray(contentTypesData.contentTypes)) {
            const matchedType = contentTypesData.contentTypes.find(
              ct => ct.name.toLowerCase() === preselectedContentType.toLowerCase()
            );
            
            if (matchedType) {
              setSelectedContentType(matchedType.name);
            }
          }
        } else {
          setContentTypes([]);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        setBrands([]);
        setContentTypes([]);
      }
    };
    
    fetchData();
  }, [preselectedContentType]);
  
  useEffect(() => {
    // Use the topic as the initial title when content is generated
    if (generatedContent && !title) {
      setTitle(topic);
    }
  }, [generatedContent, topic, title]);
  
  const handleGenerate = async () => {
    if (!selectedBrand || !selectedContentType || !topic) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const selectedBrandObj = brands.find(b => b.id === selectedBrand);
      
      if (!selectedBrandObj) {
        throw new Error('Selected brand not found');
      }
      
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: selectedContentType,
          brand: {
            name: selectedBrandObj.name,
          },
          input: {
            topic,
            keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
            additionalInstructions,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate content');
      }
      
      const data = await response.json();
      
      setGeneratedContent(data.content);
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!selectedBrand || !selectedContentType || !title || !generatedContent) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields and generate content first",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get content type ID
      const contentTypeObj = contentTypes.find(ct => ct.name === selectedContentType);
      
      if (!contentTypeObj) {
        throw new Error('Selected content type not found');
      }
      
      // Create content in the database
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: selectedBrand,
          content_type_id: contentTypeObj.id,
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
      router.push('/content');
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
          <CardTitle>Generate New Content</CardTitle>
          <CardDescription>
            Use AI to generate high-quality marketing content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select
                value={selectedContentType}
                onValueChange={setSelectedContentType}
              >
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(contentTypes) && contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="topic">Topic or Product Name</Label>
            <Input
              id="topic"
              placeholder="Enter the main topic or product name"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="keywords">
              Keywords (comma separated)
            </Label>
            <Input
              id="keywords"
              placeholder="e.g. sustainable, eco-friendly, organic"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="instructions">
              Additional Instructions (optional)
            </Label>
            <Textarea
              id="instructions"
              placeholder="Any specific requirements or information to include"
              rows={3}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerate}
            disabled={isLoading || !selectedBrand || !selectedContentType || !topic}
          >
            {isLoading ? 'Generating...' : 'Generate Content'}
          </Button>
        </CardFooter>
      </Card>
      
      {generatedContent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                AI-generated content based on your inputs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Content title"
                  />
                </div>
                
                <MarkdownDisplay content={generatedContent} />
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Content'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
} 