'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Textarea } from "@/components/textarea";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Image as ImageIcon, ArrowLeft, Info, AlertTriangle, Download, ExternalLink, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// export const metadata: Metadata = {
//   title: 'Alt Text Generator | MixerAI 2.0',
//   description: 'Generate accessible alt text for images using your brand guidelines.',
// };

// Placeholder Breadcrumbs component
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

interface AltTextResultItem {
  imageUrl: string;
  altText?: string;
  error?: string;
}

// Re-usable definitions (could be moved to a shared utils file)
const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  // Add more languages as needed
];

const getLanguageFromDomain = (url: string): string => {
  const domainSuffixToLanguage: Record<string, string> = {
    'co.uk': 'en',
    'com.au': 'en',
    'fr': 'fr',
    'de': 'de',
    'es': 'es',
    'it': 'it',
    'nl': 'nl',
    'pt': 'pt',
  };
  try {
    // Check if it's a data URL, if so, can't get domain
    if (url.startsWith('data:')) return 'en'; 
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const twoPartTld = parts.slice(-2).join('.');
      if (domainSuffixToLanguage[twoPartTld]) {
        return domainSuffixToLanguage[twoPartTld];
      }
      const singlePartTld = parts.slice(-1)[0];
      if (domainSuffixToLanguage[singlePartTld]) {
        return domainSuffixToLanguage[singlePartTld];
      }
    }
    return 'en';
  } catch (error) {
    return 'en'; 
  }
};

/**
 * AltTextGeneratorPage provides a tool for generating accessible alt text for images.
 * Users can provide a list of image URLs, and the tool will generate alt text
 * for each based on image content and selected language.
 * It includes an image preview and options to copy the generated alt text.
 */
export default function AltTextGeneratorPage() {
  const [imageUrlsInput, setImageUrlsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AltTextResultItem[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const router = useRouter();

  useEffect(() => {
    const firstUrl = imageUrlsInput.split(/\\r?\\n/).map(u => u.trim()).find(u => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });
    if (firstUrl && !firstUrl.startsWith('data:')) {
      const detectedLang = getLanguageFromDomain(firstUrl);
      setSelectedLanguage(detectedLang);
    } else if (!imageUrlsInput.trim()) {
        setSelectedLanguage('en');
    }
  }, [imageUrlsInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urls = imageUrlsInput.split(/\\r?\\n/).map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
      toast.error('Please enter at least one image URL.');
      return;
    }

    const invalidUrls = urls.filter(u => {
      // Basic check, data URLs are complex to validate fully here but are accepted by the backend
      if (u.startsWith('data:image/')) return false;
      try {
        new URL(u);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      toast.error(`Please correct the following invalid image URLs: ${invalidUrls.join(', ')}`);
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    setTotalCount(urls.length);
    setProcessedCount(0);
    let overallSuccessCount = 0;
    let overallErrorCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      try {
        const response = await fetch('/api/tools/alt-text-generator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            imageUrls: [currentUrl], // Send one URL at a time
            language: selectedLanguage, // Pass selected language
          }), 
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error || 'API request failed for this image.';
          setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: errorMsg }]);
          overallErrorCount++;
        } else if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          const resultItem = data.results[0];
          setResults(prevResults => [...prevResults, resultItem]);
          if (resultItem.altText && !resultItem.error) {
            overallSuccessCount++;
          } else {
            overallErrorCount++;
          }
        } else {
          setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: data.error || 'Unexpected server response for this image.' }]);
          overallErrorCount++;
        }
      } catch (error) {
        setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: error instanceof Error ? error.message : 'Client-side error processing this image.' }]);
        overallErrorCount++;
      } finally {
        setProcessedCount(prevCount => prevCount + 1);
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
      }
    }

    setIsLoading(false);
    if (overallSuccessCount > 0) {
        toast.success(`Alt text generation complete. ${overallSuccessCount} image(s) processed successfully.`);
    }
    if (overallErrorCount > 0) {
        toast.warning(`${overallErrorCount} image(s) could not be processed or resulted in an error.`);
    }
    if (overallSuccessCount === 0 && overallErrorCount === 0 && urls.length > 0) {
        toast.info("Processing completed, but no alt text was generated and no errors were reported.");
    }
  };

  const handleCopyText = (text: string | undefined, url: string) => {
    if (text) {
      copyToClipboard(text);
      let imageName = "image";
      if (!url.startsWith('data:')) {
        try {
          imageName = new URL(url).pathname.split('/').pop() || "image";
        } catch {
          // keep default "image"
        }
      } else {
        imageName = "uploaded image";
      }
      toast.success(`Alt text for ${imageName.length > 30 ? imageName.substring(0,27) + '...' : imageName} copied!`);
    }
  };

  const successfulResults = results.filter(r => !r.error && r.altText);
  // const errorResults = results.filter(r => r.error); // This variable is not used

  const downloadCSV = () => {
    if (successfulResults.length === 0) {
      toast.error("No successful alt text results to download.");
      return;
    }
    const headers = ["Image URL", "Alt Text"];
    const rows = successfulResults.map(res => [
      `"${res.imageUrl?.replace(/"/g, '""') || ''}"`, 
      `"${res.altText?.replace(/"/g, '""') || ''}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\\n"
      + rows.map(e => e.join(",")).join("\\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "alt_text_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Alt text CSV downloaded.");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Tools", href: "/dashboard/tools" }, 
        { label: "Alt Text Generator" }
      ]} />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/tools')} aria-label="Back to Tools">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alt Text Generator</h1>
            <p className="text-muted-foreground mt-1">
              Generate accessible alt text for a list of image URLs.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Enter Image URLs & Select Language</CardTitle>
            <CardDescription>
              Enter one image URL per line. Language for generation will be auto-detected from the first valid URL if possible, or you can select it manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrls">Image URLs <span className="text-destructive">*</span></Label>
                <Textarea
                  id="imageUrls"
                  value={imageUrlsInput}
                  onChange={(e) => setImageUrlsInput(e.target.value)}
                  placeholder="https://example.com/image1.jpg\\nhttps://example.fr/image2.png\\ndata:image/png;base64,iVBORw0KG..."
                  rows={5}
                  required
                  disabled={isLoading}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language-select-alt-text">Output Language</Label>
                <Select 
                  value={selectedLanguage} 
                  onValueChange={setSelectedLanguage}
                  disabled={isLoading}
                >
                  <SelectTrigger id="language-select-alt-text" className="w-full md:w-[280px]">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select language..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Language is auto-detected from the first URL (if not a data URL). You can override it here.
                </p>
              </div>

              <div className="flex flex-col items-end">
                {isLoading && totalCount > 0 && (
                  <div className="w-full mb-2">
                    <Progress value={(processedCount / totalCount) * 100} className="w-full h-2" />
                    <p className="text-sm text-muted-foreground mt-1 text-right">
                      Processing URL {processedCount} of {totalCount}...
                    </p>
                  </div>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  {isLoading ? `Processing...` : `Generate Alt Text`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {(results.length > 0 || isLoading && totalCount > 0) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Generated Alt Text</CardTitle>
                    <CardDescription>
                        Review the generated alt text or errors for each image URL.
                    </CardDescription>
                </div>
                {successfulResults.length > 0 && !isLoading && (
                    <Button variant="outline" onClick={downloadCSV} size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Image URL / Preview</TableHead>
                      <TableHead className="w-[60%]">Generated Alt Text / Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((item, index) => (
                      <TableRow key={`${index}-${item.imageUrl}`} className={item.error ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                        <TableCell className="py-2 align-top font-medium break-all">
                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-muted-foreground truncate" title={item.imageUrl}>{item.imageUrl}</span>
                                {item.imageUrl && !item.imageUrl.startsWith('data:') && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={item.imageUrl} 
                                        alt="Preview" 
                                        className="max-w-full h-auto max-h-32 rounded-md border object-contain hover:object-scale-down transition-all duration-300 ease-in-out cursor-pointer" 
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                        onClick={() => { const newWindow = window.open(); if(newWindow) newWindow.location.href = item.imageUrl; }}
                                    />
                                )}
                                {item.imageUrl && item.imageUrl.startsWith('data:') && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={item.imageUrl} 
                                        alt="Uploaded Preview" 
                                        className="max-w-full h-auto max-h-32 rounded-md border object-contain hover:object-scale-down transition-all duration-300 ease-in-out cursor-pointer" 
                                        onClick={(e) => {
                                            // Basic zoom effect or open in modal could be added here if needed
                                            const target = e.currentTarget as HTMLImageElement;
                                            if (target.classList.contains('max-h-32')) {
                                                target.classList.remove('max-h-32');
                                                target.classList.add('max-h-96');
                                            } else {
                                                target.classList.remove('max-h-96');
                                                target.classList.add('max-h-32');
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="py-2 align-top whitespace-pre-wrap">
                          {item.error ? (
                            <div className="text-destructive flex items-start">
                              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{item.error}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                                <span className="text-sm">{item.altText || "N/A"}</span>
                                {item.altText && (
                                    <Button variant="ghost" size="sm" onClick={() => handleCopyText(item.altText, item.imageUrl)} className="w-fit h-auto p-1 text-xs">
                                        <ClipboardCopy className="h-3 w-3 mr-1" /> Copy Text
                                    </Button>
                                )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {results.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No alt text generated yet.</p>
                  <p>Enter image URLs above and click "Generate Alt Text" to see results here.</p>
                </div>
              )}
              {isLoading && totalCount > 0 && results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Generating alt text...</p>
                  <p>Please wait while we process your image URLs.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 