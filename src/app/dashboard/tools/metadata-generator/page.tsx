'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Loader2, ClipboardCopy, Globe, FileText } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  country?: string;
  language?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

interface Content {
  id: string;
  title: string;
  brand_id: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

export default function MetadataGeneratorPage() {
  const [url, setUrl] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [contentItems, setContentItems] = useState<Content[]>([]);
  const [results, setResults] = useState<{ metaTitle: string; metaDescription: string; keywords?: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState('url');

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.brands)) {
          setBrands(data.brands);
        } else {
          console.error('Failed to fetch brands:', data);
          toast({
            title: 'Error',
            description: 'Failed to fetch brands. Please try again later.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch brands. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingBrands(false);
      }
    };
    
    fetchBrands();
  }, []);

  // Fetch content when a brand is selected
  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedBrandId) return;
      
      setIsFetchingContent(true);
      
      try {
        const response = await fetch(`/api/content?brandId=${selectedBrandId}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.content)) {
          setContentItems(data.content);
        } else {
          console.error('Failed to fetch content:', data);
          toast({
            title: 'Warning',
            description: 'Failed to fetch content items. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch content items. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingContent(false);
      }
    };
    
    if (activeTab === 'content') {
      fetchContent();
    }
  }, [selectedBrandId, activeTab]);

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);
  const selectedContent = contentItems.find(content => content.id === selectedContentId);

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({
        title: 'URL required',
        description: 'Please enter a URL to generate metadata',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedBrandId) {
      toast({
        title: 'Brand required',
        description: 'Please select a brand',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/tools/metadata-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          brandId: selectedBrandId,
          brandLanguage: selectedBrand?.language || 'en',
          brandCountry: selectedBrand?.country || 'US',
          brandIdentity: selectedBrand?.brand_identity || '',
          toneOfVoice: selectedBrand?.tone_of_voice || '',
          guardrails: selectedBrand?.guardrails || '',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate metadata');
      }
      
      if (data.success) {
        setResults({
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
        });
        
        toast({
          title: 'Metadata generated',
          description: 'SEO-optimised metadata has been generated successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to generate metadata');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContentId) {
      toast({
        title: 'Content required',
        description: 'Please select a content item to generate metadata',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedBrandId) {
      toast({
        title: 'Brand required',
        description: 'Please select a brand',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/tools/metadata-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: selectedContentId,
          brandId: selectedBrandId,
          brandLanguage: selectedBrand?.language || 'en',
          brandCountry: selectedBrand?.country || 'US',
          brandIdentity: selectedBrand?.brand_identity || '',
          toneOfVoice: selectedBrand?.tone_of_voice || '',
          guardrails: selectedBrand?.guardrails || '',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate metadata');
      }
      
      if (data.success) {
        setResults({
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
        });
        
        toast({
          title: 'Metadata generated and saved',
          description: 'SEO-optimised metadata has been generated and saved to the content item',
        });
        
        // Reset content items to refresh the list with updated metadata
        if (selectedBrandId) {
          const response = await fetch(`/api/content?brandId=${selectedBrandId}`);
          const refreshedData = await response.json();
          if (refreshedData.success && Array.isArray(refreshedData.content)) {
            setContentItems(refreshedData.content);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to generate metadata');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTitle = () => {
    if (results?.metaTitle) {
      copyToClipboard(results.metaTitle);
      toast({
        title: 'Copied to clipboard',
        description: 'Meta title has been copied to clipboard',
      });
    }
  };

  const handleCopyDescription = () => {
    if (results?.metaDescription) {
      copyToClipboard(results.metaDescription);
      toast({
        title: 'Copied to clipboard',
        description: 'Meta description has been copied to clipboard',
      });
    }
  };
  
  const handleCopyKeywords = () => {
    if (results?.keywords && results.keywords.length > 0) {
      copyToClipboard(results.keywords.join(', '));
      toast({
        title: 'Copied to clipboard',
        description: 'Keywords have been copied to clipboard',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Metadata Generator</h1>
      <p className="text-muted-foreground mb-8">
        Generate SEO-optimised meta titles, descriptions, and keywords using your brand's voice and style.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Metadata</CardTitle>
            <CardDescription>
              Select a brand and either enter a URL or select content to generate SEO-optimised metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={selectedBrandId}
                  onValueChange={(value) => {
                    setSelectedBrandId(value);
                    setSelectedContentId(''); // Reset content selection when brand changes
                  }}
                  disabled={isLoading || isFetchingBrands}
                >
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedBrand && (
                <div className="text-xs text-muted-foreground rounded-md bg-muted p-3">
                  <p><strong>Country:</strong> {selectedBrand.country || 'Not specified'}</p>
                  <p><strong>Language:</strong> {selectedBrand.language || 'Not specified'}</p>
                </div>
              )}
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">From URL</TabsTrigger>
                  <TabsTrigger value="content">From Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="space-y-4 pt-2">
                  <form onSubmit={handleSubmitUrl} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url">Web Page URL</Label>
                      <Input
                        id="url"
                        placeholder="https://example.com/page"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading || !selectedBrandId}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-4 w-4" />
                          Generate from URL
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4 pt-2">
                  <form onSubmit={handleSubmitContent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="content">Content Item</Label>
                      <Select
                        value={selectedContentId}
                        onValueChange={setSelectedContentId}
                        disabled={isLoading || isFetchingContent || !selectedBrandId}
                      >
                        <SelectTrigger id="content">
                          <SelectValue placeholder="Select content" />
                        </SelectTrigger>
                        <SelectContent>
                          {contentItems.map((content) => (
                            <SelectItem key={content.id} value={content.id}>
                              {content.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {isFetchingContent && (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading content...</span>
                        </div>
                      )}
                      
                      {!isFetchingContent && selectedBrandId && contentItems.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">
                          No content found for this brand. Create content first to generate metadata.
                        </p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading || !selectedBrandId || !selectedContentId}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate from Content
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generated Metadata</CardTitle>
            <CardDescription>
              SEO-optimised metadata that can be copied and used directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Meta Title</Label>
              <div className="flex">
                <Textarea
                  id="meta-title"
                  placeholder="Generated meta title will appear here"
                  value={results?.metaTitle || ''}
                  readOnly
                  className="flex-1 resize-none"
                  rows={2}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyTitle}
                  disabled={!results?.metaTitle}
                  title="Copy to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.metaTitle?.length || 0}/60 characters
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meta-description">Meta Description</Label>
              <div className="flex">
                <Textarea
                  id="meta-description"
                  placeholder="Generated meta description will appear here"
                  value={results?.metaDescription || ''}
                  readOnly
                  className="flex-1 resize-none"
                  rows={4}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyDescription}
                  disabled={!results?.metaDescription}
                  title="Copy to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.metaDescription?.length || 0}/160 characters
              </p>
            </div>
            
            {results?.keywords && results.keywords.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex">
                  <Textarea
                    id="keywords"
                    placeholder="Generated keywords will appear here"
                    value={results.keywords.join(', ')}
                    readOnly
                    className="flex-1 resize-none"
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="ml-2"
                    onClick={handleCopyKeywords}
                    title="Copy to clipboard"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {results.keywords.length} keywords generated
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Best practices: Meta titles should be 50-60 characters, and meta descriptions should be 150-160 characters.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 