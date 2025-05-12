'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from "@/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { useToast } from "@/components/use-toast";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe } from 'lucide-react';
import type { Metadata } from 'next';

// export const metadata: Metadata = {
//   title: 'Metadata Generator | MixerAI 2.0',
//   description: 'Generate SEO-optimised meta titles, descriptions, and keywords for your web pages.',
// };

interface Brand {
  id: string;
  name: string;
  country?: string;
  language?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

/**
 * MetadataGeneratorPage provides a tool for users to generate SEO metadata
 * (meta title, meta description, keywords) for a given URL, tailored to a selected brand.
 * It fetches available brands, allows URL input, and calls an API to get metadata suggestions.
 * Results can be copied to the clipboard.
 */
export default function MetadataGeneratorPage() {
  const [url, setUrl] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [results, setResults] = useState<{ metaTitle: string; metaDescription: string; keywords?: string[] } | null>(null);
  const { toast } = useToast();

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsFetchingBrands(true);
        const response = await fetch('/api/brands');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setBrands(data.data);
        } else {
          // console.error('Failed to fetch brands:', data);
          toast({
            title: 'Error',
            description: 'Failed to fetch brands. Please try again later.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        // console.error('Error fetching brands:', error);
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

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({
        title: 'URL required',
        description: 'Please enter a URL for which to generate metadata.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedBrandId) {
      toast({
        title: 'Brand required',
        description: 'Please select a brand.',
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
        description: 'Please enter a valid URL (e.g., https://example.com).',
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
        throw new Error(data.error || 'Failed to generate metadata.');
      }
      
      if (data.success) {
        setResults({
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
        });
        
        toast({
          title: 'Metadata Generated',
          description: 'SEO-optimised metadata has been generated successfully.',
        });
      } else {
        throw new Error(data.error || 'Failed to generate metadata.');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
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
        title: 'Copied to Clipboard',
        description: 'The meta title has been copied to your clipboard.',
      });
    }
  };

  const handleCopyDescription = () => {
    if (results?.metaDescription) {
      copyToClipboard(results.metaDescription);
      toast({
        title: 'Copied to Clipboard',
        description: 'The meta description has been copied to your clipboard.',
      });
    }
  };
  
  const handleCopyKeywords = () => {
    if (results?.keywords && results.keywords.length > 0) {
      copyToClipboard(results.keywords.join(', '));
      toast({
        title: 'Copied to Clipboard',
        description: 'The keywords have been copied to your clipboard.',
      });
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-bold mb-6">Metadata Generator</h1>
      <p className="text-muted-foreground mb-8">
        Generate SEO-optimised meta titles, descriptions, and keywords using your brand's voice and style.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Metadata</CardTitle>
            <CardDescription>
              Select a brand and enter a URL to generate SEO-optimised metadata.
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
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generated Metadata</CardTitle>
            <CardDescription>
              Copy the generated metadata to use in your content management system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Generating metadata...</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <span className={`text-xs ${results.metaTitle.length >= 45 && results.metaTitle.length <= 60 ? 'text-success' : 'text-destructive'}`}>
                      {results.metaTitle.length} characters
                    </span>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="metaTitle"
                      value={results.metaTitle}
                      readOnly
                      className="pr-10 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={handleCopyTitle}
                      title="Copy to clipboard"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: Most CMS systems will automatically append the brand name to the end of meta titles, 
                    which will increase the character count. A slightly shorter meta title (45-50 characters) 
                    allows room for this addition while staying within optimal SEO limits.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <span className={`text-xs ${results.metaDescription.length >= 150 && results.metaDescription.length <= 160 ? 'text-success' : 'text-destructive'}`}>
                      {results.metaDescription.length} characters
                    </span>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="metaDescription"
                      value={results.metaDescription}
                      readOnly
                      className="pr-10 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={handleCopyDescription}
                      title="Copy to clipboard"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {results.keywords && results.keywords.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Suggested Keywords</Label>
                      <Button variant="outline" size="sm" onClick={handleCopyKeywords}>
                        <ClipboardCopy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <Textarea 
                      readOnly 
                      value={results.keywords.join(', ')}
                      className="h-24"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 text-center">
                <div className="max-w-sm">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Select a brand and enter a URL to generate SEO-optimised metadata.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 