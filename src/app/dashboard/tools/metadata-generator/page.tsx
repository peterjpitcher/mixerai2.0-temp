'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from "@/components/textarea";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe, ArrowLeft, Info, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
//   title: 'Metadata Generator | MixerAI 2.0',
//   description: 'Generate SEO-optimised meta titles, descriptions, and keywords for your web pages.',
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

interface MetadataResultItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}

/**
 * MetadataGeneratorPage provides a tool for users to generate SEO metadata
 * (meta title, meta description, keywords) for a given URL, tailored to a selected brand.
 * It fetches available brands, allows URL input, and calls an API to get metadata suggestions.
 * Results can be copied to the clipboard.
 */
export default function MetadataGeneratorPage() {
  const [urlsInput, setUrlsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MetadataResultItem[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();

  const handleSubmitUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urls = urlsInput.split(/\r?\n/).map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
      toast.error('Please enter at least one URL.');
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
      toast.error(`Please correct the following invalid URLs: ${invalidUrls.join(', ')}`);
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
        const response = await fetch('/api/tools/metadata-generator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            urls: [currentUrl], // Send one URL at a time
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error || 'API request failed for this URL.';
          setResults(prevResults => [...prevResults, { url: currentUrl, error: errorMsg }]);
          overallErrorCount++;
        } else if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          const resultItem = data.results[0]; // Assuming API returns array with one item for single URL request
          setResults(prevResults => [...prevResults, resultItem]);
          if (!resultItem.error && (resultItem.metaTitle || resultItem.metaDescription)) {
            overallSuccessCount++;
          } else {
            // If there's an error field in the result item, or no data, count as error
            overallErrorCount++;
          }
        } else {
          setResults(prevResults => [...prevResults, { url: currentUrl, error: data.error || 'Unexpected server response for this URL.' }]);
          overallErrorCount++;
        }
      } catch (error) {
        setResults(prevResults => [...prevResults, { url: currentUrl, error: error instanceof Error ? error.message : 'Client-side error processing this URL.' }]);
        overallErrorCount++;
      } finally {
        setProcessedCount(prevCount => prevCount + 1);
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      }
    }

    setIsLoading(false);
    if (overallSuccessCount > 0) {
        toast.success(`Metadata generation complete. ${overallSuccessCount} URL(s) processed successfully.`);
    }
    if (overallErrorCount > 0) {
        toast.warning(`${overallErrorCount} URL(s) could not be processed or resulted in an error.`);
    }
     if (overallSuccessCount === 0 && overallErrorCount === 0 && urls.length > 0) {
        toast.info("Processing completed, but no metadata was generated and no errors were reported.");
    }
  };

  const handleCopyToClipboard = (text: string, type: string, url: string) => {
    if (text) {
      copyToClipboard(text);
      toast.success(`${type} for ${url.length > 30 ? url.substring(0,27) + '...' : url} copied!`);
    }
  };

  const successfulResults = results.filter(r => !r.error && (r.metaTitle || r.metaDescription));
  const errorResults = results.filter(r => r.error);

  const downloadCSV = () => {
    if (successfulResults.length === 0) {
      toast.error("No successful results to download.");
      return;
    }
    const headers = ["URL", "Meta Title", "Meta Description", "Keywords"];
    const rows = successfulResults.map(res => [
      `"${res.url?.replace(/"/g, '""') || ''}"`, 
      `"${res.metaTitle?.replace(/"/g, '""') || ''}"`, 
      `"${res.metaDescription?.replace(/"/g, '""') || ''}"`, 
      `"${(res.keywords || []).join(', ').replace(/"/g, '""')}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\\n"
      + rows.map(e => e.join(",")).join("\\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "metadata_results.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
    toast.success("Metadata CSV downloaded.");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Tools", href: "/dashboard/tools" }, 
        { label: "Metadata Generator" }
      ]} />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/tools')} aria-label="Back to Tools">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metadata Generator</h1>
            <p className="text-muted-foreground mt-1">
              Generate SEO-optimised meta titles and descriptions for a list of URLs.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Enter URLs</CardTitle>
            <CardDescription>
              Enter one URL per line to generate SEO-optimised metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitUrls} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs <span className="text-destructive">*</span></Label>
                <Textarea
                  id="urls"
                  placeholder="https://example.com/page1\\nhttps://another.com/article"
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  rows={5}
                  required
                  disabled={isLoading}
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
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                  {isLoading ? `Generating...` : `Generate Metadata`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {(results.length > 0 || isLoading && totalCount > 0) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Generated Metadata</CardTitle>
                    <CardDescription>
                        Review the generated metadata below. Successful results can be downloaded.
                    </CardDescription>
                </div>
                {successfulResults.length > 0 && !isLoading && (
                    <Button onClick={downloadCSV} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                )}
            </CardHeader>
            <CardContent>
              {successfulResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Successful Results</h3>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[25%] min-w-[200px] whitespace-nowrap">URL</TableHead>
                          <TableHead className="w-[25%] min-w-[200px]">Meta Title</TableHead>
                          <TableHead className="w-[40%] min-w-[300px]">Meta Description</TableHead>
                          {/* Keywords are not displayed in table, but included in CSV */}
                          <TableHead className="w-[10%] min-w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {successfulResults.map((item, index) => (
                          <TableRow key={`success-${index}-${item.url}`}>
                            <TableCell className="py-2 align-top">
                               <div className="flex items-center">
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:underline truncate"
                                    title={item.url}
                                    style={{ maxWidth: '250px', display: 'inline-block' }}
                                >
                                    {item.url}
                                </a>
                                <ExternalLink className="ml-1 h-3 w-3 text-muted-foreground flex-shrink-0" />
                               </div>
                            </TableCell>
                            <TableCell className="py-2 align-top whitespace-pre-wrap">
                              {item.metaTitle}
                              {item.metaTitle && 
                                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(item.metaTitle!, 'Meta Title', item.url)} title="Copy Meta Title" className="ml-1 p-1 h-auto">
                                  <ClipboardCopy className="h-3.5 w-3.5" />
                                </Button>
                              }
                            </TableCell>
                            <TableCell className="py-2 align-top whitespace-pre-wrap">
                              {item.metaDescription}
                              {item.metaDescription &&
                                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(item.metaDescription!, 'Meta Description', item.url)} title="Copy Meta Description" className="ml-1 p-1 h-auto">
                                  <ClipboardCopy className="h-3.5 w-3.5" />
                                </Button>
                              }
                            </TableCell>
                            <TableCell className="py-2 align-top text-right">
                                {item.keywords && item.keywords.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(item.keywords!.join(', '), 'Keywords', item.url)} title="Copy Keywords">
                                        <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Keywords
                                    </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {errorResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-destructive flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" /> 
                    Processing Errors
                  </h3>
                  <ul className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-4">
                    {errorResults.map((item, index) => (
                      <li key={`error-${index}-${item.url}`} className="text-sm">
                        <p className="font-semibold truncate" title={item.url}>URL: {item.url}</p>
                        <p className="text-destructive-foreground/80">Error: {item.error}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.length === 0 && !isLoading && (
                 <div className="text-center text-muted-foreground py-8">
                    <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No results to display yet.</p>
                    <p>Enter URLs above and click "Generate Metadata" to see results here.</p>
                </div>
              )}
               {isLoading && totalCount > 0 && processedCount < totalCount && results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Processing your request...</p>
                  <p>Please wait while we generate metadata for your URLs.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 