'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  
  // Initial state with default values
  const [content, setContent] = useState({
    id: '',
    title: '',
    body: '',
    metaTitle: '',
    metaDescription: '',
    status: 'Draft',
    type: '',
    brand: '',
  });
  
  useEffect(() => {
    // Mock API call - in a real implementation, we would fetch from Supabase
    const fetchContent = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const contentData = {
          id: '1',
          title: 'How to Increase Your Social Media Engagement',
          type: 'Article',
          brand: 'Demo Brand',
          createdAt: '2023-10-15T10:30:00Z',
          status: 'Draft',
          body: `# How to Increase Your Social Media Engagement

Social media engagement is crucial for building brand awareness and fostering customer relationships. Here are some effective strategies to boost your engagement rates:

## Create Valuable Content

The foundation of good engagement is content that provides value to your audience. This can be:

* Educational posts that teach something new
* Entertaining content that makes people smile
* Inspirational stories that motivate action
* Problem-solving tips relevant to your audience

## Post Consistently

Consistency is key to maintaining visibility in your followers' feeds. Develop a posting schedule that works for your brand and stick to it.

## Encourage Interaction

Ask questions, create polls, and invite followers to share their thoughts. The more you can get people to interact with your posts, the higher your engagement rates will be.

## Respond to Comments

Make a habit of responding to comments on your posts. This shows that you value your followers' input and can turn casual followers into loyal fans.

## Use Visual Content

Posts with images, videos, or infographics typically receive higher engagement than text-only posts. Invest in creating high-quality visual content for your social media channels.`,
          metaTitle: 'How to Increase Your Social Media Engagement: 5 Proven Strategies',
          metaDescription: 'Learn effective strategies to boost your social media engagement, including content creation tips, posting consistency, and interaction techniques.',
        };
        
        setContent(contentData);
      } catch (error) {
        // console.error('Error fetching content:', error);
        toast.error('Failed to load content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, [id]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // In a real implementation, we would send this to an API endpoint
      // that updates it in Supabase
      // console.log('Content to save:', content);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Content updated successfully!');
      router.push(`/dashboard/content/${id}`);
    } catch (error) {
      // console.error('Error updating content:', error);
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
              <Label>Content Type</Label>
              <Input value={content.type} disabled />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={content.brand} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
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