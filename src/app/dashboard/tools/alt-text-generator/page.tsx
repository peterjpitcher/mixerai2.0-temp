'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Textarea } from "@/components/textarea";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Image as ImageIcon, ArrowLeft, Info, AlertTriangle, Download, ExternalLink } from 'lucide-react';
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

/**
 * AltTextGeneratorPage provides a tool for generating accessible alt text for images.
 * Users can provide a list of image URLs, and the tool will generate alt text
 * for each based on image content.
 * It includes an image preview and options to copy the generated alt text.
 */
export default function AltTextGeneratorPage() {
  const [imageUrlsInput, setImageUrlsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AltTextResultItem[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urls = imageUrlsInput.split(/\r?\n/).map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
      toast.error('Please enter at least one image URL.');
      return;
    }

    const invalidUrls = urls.filter(u => {
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
          body: JSON.stringify({ imageUrls: [currentUrl] }), // Send one URL at a time
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error || 'API request failed for this image.';
          setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: errorMsg }]);
          overallErrorCount++;
        } else if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          // Assuming the backend returns an array with one result item
          const resultItem = data.results[0];
          setResults(prevResults => [...prevResults, resultItem]);
          if (resultItem.altText && !resultItem.error) {
            overallSuccessCount++;
          } else {
            overallErrorCount++;
          }
        } else {
          // Handle cases where the response is OK but data is not as expected
          setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: data.error || 'Unexpected server response for this image.' }]);
          overallErrorCount++;
        }
      } catch (error) {
        setResults(prevResults => [...prevResults, { imageUrl: currentUrl, error: error instanceof Error ? error.message : 'Client-side error processing this image.' }]);
        overallErrorCount++;
      } finally {
        setProcessedCount(prevCount => prevCount + 1);
        // Add a small delay between requests
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
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
      const imageName = url.substring(url.lastIndexOf('/') + 1) || "image";
      toast.success(`Alt text for ${imageName} copied!`);
    }
  };

  const successfulResults = results.filter(r => !r.error && r.altText);
  const errorResults = results.filter(r => r.error);

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
            <CardTitle>Enter Image URLs</CardTitle>
            <CardDescription>
              Enter one image URL per line to generate accessible alt text.
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
                  placeholder="https://example.com/image1.jpg\\nhttps://example.com/image2.png"
                  rows={5}
                  required
                  disabled={isLoading} // Disable textarea when loading
                  className="min-h-[100px]"
                />
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

        {(results.length > 0 || (isLoading && totalCount > 0)) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Results</CardTitle>
                <CardDescription>
                  Review the generated alt text or errors for each image URL.
                </CardDescription>
              </div>
              {results.some(r => !r.error && r.altText) && !isLoading && (
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
                      <TableHead className="w-[40%]">Image URL</TableHead>
                      <TableHead className="w-[35%]">Generated Alt Text / Error</TableHead>
                      <TableHead className="w-[25%] text-center">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((item, index) => (
                      <TableRow key={`${index}-${item.imageUrl}`} className={item.error ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                        <TableCell className="py-2 align-top font-medium break-all">
                          {item.imageUrl}
                        </TableCell>
                        <TableCell className="py-2 align-top whitespace-pre-wrap">
                          {item.error ? (
                            <div className="text-destructive flex items-start">
                              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{item.error}</span>
                            </div>
                          ) : (
                            <span className="text-sm">{item.altText}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-top text-center">
                          {!item.error && item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt="Preview"
                              className="h-16 w-16 object-contain mx-auto rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parentCell = target.closest('td');
                                if (parentCell) {
                                  let errorSpan = parentCell.querySelector('.preview-error-text') as HTMLSpanElement;
                                  if (!errorSpan) {
                                    errorSpan = document.createElement('span');
                                    errorSpan.className = 'text-xs text-muted-foreground preview-error-text';
                                    errorSpan.textContent = 'Preview N/A';
                                    parentCell.appendChild(errorSpan);
                                  }
                                }
                              }}
                            />
                          )}
                          {(item.error) && <span className="text-xs text-muted-foreground">Preview N/A</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {results.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No results to display yet.</p>
                  <p>Enter image URLs above and click "Generate Alt Text" to see results here.</p>
                </div>
              )}
              {isLoading && totalCount > 0 && results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Processing your request...</p>
                  <p>Please wait while we generate alt text for your images.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 