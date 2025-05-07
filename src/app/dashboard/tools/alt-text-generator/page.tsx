'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Image } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  country?: string;
  language?: string;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
}

export default function AltTextGeneratorPage() {
  const [imageUrl, setImageUrl] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [results, setResults] = useState<{ altText: string } | null>(null);
  const [previewError, setPreviewError] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl) {
      toast({
        title: 'Image URL required',
        description: 'Please enter an image URL to generate alt text',
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
      new URL(imageUrl);
    } catch (error) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com/image.jpg)',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/tools/alt-text-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
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
        throw new Error(data.error || 'Failed to generate alt text');
      }
      
      if (data.success) {
        setResults({
          altText: data.altText,
        });
        
        toast({
          title: 'Alt text generated',
          description: 'Accessible alt text has been generated successfully',
        });
      } else {
        throw new Error(data.error || 'Failed to generate alt text');
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

  const handleCopyAltText = () => {
    if (results?.altText) {
      copyToClipboard(results.altText);
      toast({
        title: 'Copied to clipboard',
        description: 'Alt text has been copied to clipboard',
      });
    }
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const handleImageLoad = () => {
    setPreviewError(false);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Alt Text Generator</h1>
      <p className="text-muted-foreground mb-8">
        Generate accessible alt text for images to improve accessibility and SEO using your brand's voice and style.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Alt Text</CardTitle>
            <CardDescription>
              Select a brand and enter an image URL to generate accessible alt text.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={selectedBrandId}
                  onValueChange={setSelectedBrandId}
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
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
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
                    <Image className="mr-2 h-4 w-4" />
                    Generate Alt Text
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generated Alt Text</CardTitle>
            <CardDescription>
              Accessible alt text for your image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {imageUrl && (
              <div className="mb-4 overflow-hidden rounded-md border border-border">
                {previewError ? (
                  <div className="flex h-48 items-center justify-center bg-muted text-muted-foreground">
                    <p>Image preview not available</p>
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt="Preview of the image for alt text generation"
                    className="aspect-video w-full object-cover"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                  />
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="alt-text">Alt Text</Label>
              <div className="flex">
                <Textarea
                  id="alt-text"
                  placeholder="Generated alt text will appear here"
                  value={results?.altText || ''}
                  readOnly
                  className="flex-1 resize-none"
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyAltText}
                  disabled={!results?.altText}
                  title="Copy to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {results?.altText?.length || 0}/125 characters recommended
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Good alt text should be concise but descriptive, focusing on key information conveyed by the image.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 