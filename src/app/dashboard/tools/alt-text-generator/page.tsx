'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from "@/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Image } from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';

// export const metadata: Metadata = {
//   title: 'Alt Text Generator | MixerAI 2.0',
//   description: 'Generate accessible alt text for images using your brand guidelines.',
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
 * AltTextGeneratorPage provides a tool for generating accessible alt text for images.
 * Users can select a brand, provide an image URL, and the tool will generate alt text
 * based on the image content and the selected brand's voice and style.
 * It includes an image preview and options to copy the generated alt text.
 */
export default function AltTextGeneratorPage() {
  const [imageUrl, setImageUrl] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [results, setResults] = useState<{ altText: string } | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          toast.error('Failed to fetch brands. Please try again later.');
        }
      } catch (error) {
        // console.error('Error fetching brands:', error);
        toast.error('Failed to fetch brands. Please try again later.');
      } finally {
        setIsFetchingBrands(false);
      }
    };
    
    fetchBrands();
  }, []);

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset any previous error state
    setError(null);
    
    if (!imageUrl) {
      toast.error('Please enter an image URL for which to generate alt text.');
      return;
    }
    
    if (!selectedBrandId) {
      toast.error('Please select a brand.');
      return;
    }
    
    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (error) {
      toast.error('Please enter a valid URL (e.g., https://example.com/image.jpg).');
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
        // Get detailed error information
        let errorMessage = data.error || 'Failed to generate alt text.';
        
        // Customize message based on status code
        if (response.status === 503) {
          errorMessage = 'Azure OpenAI service is temporarily unavailable. Please try again later.';
        } else if (response.status === 400 && errorMessage.includes('image')) {
          errorMessage = 'The image could not be processed. Please try a different image URL or format.';
        }
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      if (data.success) {
        setResults({
          altText: data.altText,
        });
        
        toast('Accessible alt text has been generated successfully.');
      } else {
        throw new Error(data.error || 'Failed to generate alt text.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred whilst generating alt text.';
        
      setError(errorMessage);
      
      toast.error(errorMessage);
      
      // console.error('Alt text generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAltText = () => {
    if (results?.altText) {
      copyToClipboard(results.altText);
      toast('The alt text has been copied to your clipboard.');
    }
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const handleImageLoad = () => {
    setPreviewError(false);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                    <p>Image preview not available.</p>
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
            
            {error && (
              <div className="p-4 mb-4 border border-destructive/50 bg-destructive/10 rounded-md">
                <p className="text-destructive font-medium">Error</p>
                <p className="text-destructive">{error}</p>
                {error.includes('OpenAI') || error.includes('service') ? (
                  <p className="text-destructive mt-2 text-sm">The AI service is currently unavailable. Please try again later.</p>
                ) : error.includes('image') ? (
                  <p className="text-destructive mt-2 text-sm">The image may be inaccessible or in an unsupported format. Try using a different image URL.</p>
                ) : null}
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
                {results?.altText?.length || 0}/125 characters recommended.
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