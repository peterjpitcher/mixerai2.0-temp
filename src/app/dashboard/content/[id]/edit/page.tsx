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
import { MarkdownDisplay } from '@/components/content/markdown-display';
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
  metaTitle: string;
  metaDescription: string;
  status: string;
  brand_name?: string; // From joined brands table
  template_name?: string; // From joined content_templates table
  template_id?: string;
  content_data?: Record<string, any>; // For template-driven fields
  // Add other fields from your actual content structure as needed
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
    metaTitle: '',
    metaDescription: '',
    status: 'Draft',
    brand_name: '',
    template_name: '', // Initialize template_name
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
          // Map API data to ContentState
          setContent({
            id: result.data.id,
            title: result.data.title || '',
            body: result.data.body || (result.data.content_data?.contentBody || ''), // Example fallback
            metaTitle: result.data.meta_title || (result.data.content_data?.metaTitle || ''),
            metaDescription: result.data.meta_description || (result.data.content_data?.metaDescription || ''),
            status: result.data.status || 'Draft',
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
        // Optionally redirect or show an error message
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchContentById();
    }
  }, [id]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement actual API call to PUT /api/content/${id}
      // The payload should include all editable fields, e.g., title, body, metaTitle, metaDescription, content_data etc.
      const payloadToSave = {
        title: content.title,
        body: content.body, // Or derive from content_data if structured differently
        meta_title: content.metaTitle,
        meta_description: content.metaDescription,
        // status: content.status, // Status might be updated via workflow actions typically
        template_id: content.template_id, // May not be editable here, but good to have
        content_data: content.content_data // If form edits structured data
      };
      console.log('Content to save (payload for PUT /api/content/[id]):', payloadToSave);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Content updated successfully! (Mocked)');
      router.push(`/dashboard/content/${id}`); // Redirect to view page
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content. Please try again.');
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit: {content.title || 'Content'}</h1>
          <p className="text-muted-foreground">
            Modify the title, body, SEO metadata, and other settings for this piece of content.
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
            <Input 
              id="title"
              name="title"
              value={content.title}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Content Template</Label>
              <Input value={content.template_name || 'N/A'} disabled />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={content.brand_name || 'N/A'} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Content Body</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <Textarea 
                name="body"
                value={content.body}
                onChange={handleInputChange}
                rows={15}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Use Markdown syntax for formatting.
              </p>
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded p-4 overflow-auto max-h-[500px]">
                <MarkdownDisplay markdown={content.body} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>SEO Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input 
              id="metaTitle"
              name="metaTitle"
              value={content.metaTitle}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea 
              id="metaDescription"
              name="metaDescription"
              value={content.metaDescription}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4 border-t pt-6">
          <Button variant="outline" onClick={() => router.push(`/dashboard/content/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 