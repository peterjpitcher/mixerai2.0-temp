'use client';

import * as React from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';

interface ArticleDetailsSidebarProps {
  selectedTitle: string;
  setSelectedTitle: (title: string) => void;
  focusKeyword: string;
  setFocusKeyword: (keyword: string) => void;
  metaTitle: string;
  setMetaTitle: (title: string) => void;
  metaDescription: string;
  setMetaDescription: (desc: string) => void;
  urlSlug: string;
  setUrlSlug: (slug: string) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  handleGenerateContent: () => Promise<void>; // For Regenerate button
  isGeneratingContent: boolean;
  setActiveTab: (tab: string) => void; // For Edit Generation Settings button
}

export function ArticleDetailsSidebar({
  selectedTitle,
  setSelectedTitle,
  focusKeyword,
  setFocusKeyword,
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  urlSlug,
  setUrlSlug,
  handleSave,
  isSaving,
  handleGenerateContent,
  isGeneratingContent,
  setActiveTab,
}: ArticleDetailsSidebarProps) {
  return (
    <div className="lg:col-span-3 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Article Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="article-title-sidebar">Title</Label>
            <Input
              id="article-title-sidebar"
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="focus-keyword-sidebar">Focus Keyword</Label>
            <Input
              id="focus-keyword-sidebar"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              className="border-orange-300" // Retain specific styling if any
            />
            <p className="text-xs text-muted-foreground mt-1">
              This keyword should appear in title, headings, and throughout content.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meta-title-sidebar">Meta Title</Label>
            <Input
              id="meta-title-sidebar"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <div className="text-xs flex justify-between mt-1">
              <span className="text-muted-foreground">Should include focus keyword</span>
              <span className={metaTitle.length > 60 ? 'text-red-500' : 'text-green-500'}>
                {metaTitle.length}/60
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meta-description-sidebar">Meta Description</Label>
            <Textarea
              id="meta-description-sidebar"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
            />
            <div className="text-xs flex justify-between mt-1">
              <span className="text-muted-foreground">Should include focus keyword</span>
              <span className={metaDescription.length > 160 ? 'text-red-500' : 'text-green-500'}>
                {metaDescription.length}/160
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url-slug-sidebar">URL Slug</Label>
            <Input
              id="url-slug-sidebar"
              value={urlSlug}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9\-]/g, '')
                  .replace(/\-+/g, '-')
                  .toLowerCase();
                setUrlSlug(value);
              }}
              className="w-full"
              placeholder="keyword-based-slug"
            />
            <div className="text-xs flex justify-between mt-1">
              <span className="text-muted-foreground">Should include focus keyword with hyphens</span>
              <span className={urlSlug.length > 75 ? 'text-red-500' : 'text-green-500'}>
                {urlSlug.length}/75
              </span>
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Save Article'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Article Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={handleGenerateContent} 
            disabled={isGeneratingContent}
            className="w-full"
          >
            {isGeneratingContent ? 'Regenerating...' : 'Regenerate Article'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setActiveTab('generate')}
            className="w-full"
          >
            Edit Generation Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 