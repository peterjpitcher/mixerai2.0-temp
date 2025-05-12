'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { RichTextEditor } from '@/components/content/rich-text-editor';
import { toast } from 'sonner';
import type { Metadata } from 'next';

// export const metadata: Metadata = {
//   title: 'Edit Content | MixerAI 2.0',
//   description: 'Modify the details, body, and SEO metadata for a piece of content.',
// };

interface ContentEditPageProps {
  params: {
    id: string;
  };
}

// Define a more specific type for the content state
interface ContentState {
  id: string;
  title: string;
  body: string;
  status: string;
  brand_name?: string; // From joined brands table
  template_name?: string; // From joined content_templates table
  template_id?: string;
  content_data?: Record<string, any>; // For template-driven fields
  // Add other fields from your actual content structure as needed
  // Add fields for actual template output fields if they need to be directly editable
  // For example, if an outputField from template is 'summary', you might add: summary?: string;
}

/**
 * ContentEditPage allows users to modify an existing piece of content.
 * It provides fields for editing the title, body (using Markdown with a live preview), 
 * and SEO metadata (meta title, meta description).
 * Note: This component currently uses mock data and simulated API calls.
 */
export default function ContentEditPage({ params }: ContentEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [content, setContent] = useState<ContentState>({
    id: '',
    title: '',
    body: '',
    status: 'draft',
    brand_name: '',
    template_name: '',
    template_id: '',
    content_data: {}
  });
  
  useEffect(() => {
    const fetchContentById = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/content/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
            return;
          }
          throw new Error(`Failed to fetch content: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
          setContent({
            id: result.data.id,
            title: result.data.title || '',
            body: result.data.body || (result.data.content_data?.contentBody || ''),
            status: result.data.status || 'draft',
            brand_name: result.data.brand_name || result.data.brands?.name || 'N/A',
            template_name: result.data.template_name || result.data.content_templates?.name || 'N/A',
            template_id: result.data.template_id || '',
            content_data: result.data.content_data || {}
          });
        } else {
          throw new Error(result.error || 'Failed to load content data.');
        }
      } catch (error: any) {
        console.error('Error fetching content:', error);
        toast.error(error.message || 'Failed to load content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchContentById();
    }
  }, [id]); // Removed notFound from dependencies as it's stable
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleContentBodyChange = (newBodyValue: string) => {
    setContent(prev => ({ ...prev, body: newBodyValue }));
  };

  // Handler for dynamic output field changes (if we make them editable)
  const handleOutputFieldChange = (fieldName: string, value: string) => {
    setContent(prev => ({
      ...prev,
      content_data: {
        ...prev.content_data,
        [fieldName]: value,
      },
    }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadToSave = {
        title: content.title,
        body: content.body,
        status: content.status,
        content_data: content.content_data 
      };
      
      console.log('Saving content with payload:', payloadToSave);
      const response = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to update content. Status: ${response.status}`);
      }
      toast.success('Content updated successfully!');
      if (result.data) {
        setContent(prev => ({ 
            ...prev, 
            ...result.data, 
        }));
      }
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast.error(error.message || 'Failed to update content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-6 w-6"></div>
      </div>
    );
  }
  
  // Logic to get output field definitions from template (needs template fetching if not already on content)
  // This is a placeholder - actual template fetching/structure would be needed.
  // For now, we assume content.content_data holds the output fields from generation.
  const outputFieldsToDisplay = content.template_id && content.content_data 
    ? Object.keys(content.content_data) // Simplistic: assumes all keys in content_data are output fields to display
        .filter(key => key !== 'templateInputValues' && key !== 'generatedOutput' && key !== 'contentBody') // Filter out known non-output data
        .map(key => ({ id: key, name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) , type: 'text' /* Default type, ideally from template */ }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit: {content.title || 'Content'}</h1>
          <p className="text-muted-foreground">
            Modify the title, body, and other generated fields for this piece of content.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Content Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" value={content.title} onChange={handleInputChange}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Content Template</Label><Input value={content.template_name || 'N/A'} disabled /></div>
            <div><Label>Brand</Label><Input value={content.brand_name || 'N/A'} disabled /></div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Content Body</CardTitle></CardHeader>
        <CardContent>
          <RichTextEditor value={content.body} onChange={handleContentBodyChange} placeholder="Enter your content here..." className="min-h-[300px] border rounded-md"/>
        </CardContent>
      </Card>

      {/* Card for Dynamic Output Fields from Template */}
      {outputFieldsToDisplay.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Generated Output Fields</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {outputFieldsToDisplay.map(field => (
              <div key={field.id}>
                <Label htmlFor={field.id}>{field.name}</Label>
                {/* Basic Textarea for all output fields for now. Could be enhanced based on field.type if available from template schema */}
                <Textarea 
                  id={field.id} 
                  name={field.id} 
                  value={content.content_data?.[field.id] || ''} 
                  onChange={(e) => handleOutputFieldChange(field.id, e.target.value)}
                  rows={3}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Add a Save Changes button at the bottom of the page for better UX if SEO card was the only one with it */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)}>
            Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
} 