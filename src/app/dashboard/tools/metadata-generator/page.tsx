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
import { Loader2, ClipboardCopy, Globe } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  country?: string;
  language?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

export default function MetadataGeneratorPage() {
  const [url, setUrl] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [results, setResults] = useState<{ metaTitle: string; metaDescription: string; keywords?: string[] } | null>(null);

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

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);

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
                    <Label>Meta Title</Label>
                    <Button variant="outline" size="sm" onClick={handleCopyTitle}>
                      <ClipboardCopy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <Textarea 
                    readOnly 
                    value={results.metaTitle}
                    className="font-medium text-base h-16"
                  />
                  <p className="text-xs text-muted-foreground">
                    {results.metaTitle.length} characters
                    {results.metaTitle.length < 50 && " (too short)"}
                    {results.metaTitle.length > 60 && " (too long)"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Meta Description</Label>
                    <Button variant="outline" size="sm" onClick={handleCopyDescription}>
                      <ClipboardCopy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <Textarea 
                    readOnly 
                    value={results.metaDescription}
                    className="h-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    {results.metaDescription.length} characters
                    {results.metaDescription.length < 150 && " (too short)"}
                    {results.metaDescription.length > 160 && " (too long)"}
                  </p>
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