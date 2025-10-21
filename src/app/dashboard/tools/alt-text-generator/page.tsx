'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Image as ImageIcon, ArrowLeft, AlertTriangle, ExternalLink, Languages, History, ShieldAlert } from 'lucide-react';
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
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { apiFetch } from '@/lib/api-client';
import { useToolAccess } from '../use-tool-access';
import { useToolHistory } from '../use-tool-history';

interface AltTextResultItem {
  imageUrl: string;
  altText?: string;
  error?: string;
}

// Define UserSessionData interface
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
  } catch {
    return 'en'; 
  }
};

// Define ToolRunHistoryItem interface
interface ToolRunHistoryItem {
  id: string;
  user_id: string;
  tool_name: string;
  brand_id?: string | null;
  inputs: Record<string, unknown>; // Consider defining a more specific type if inputs structure is consistent
  outputs: Record<string, unknown>; // Consider defining a more specific type if outputs structure is consistent
  run_at: string; // Assuming TIMESTAMPTZ comes as string
  status: 'success' | 'failure';
  error_message?: string | null;
  batch_id?: string | null;
  batch_sequence?: number | null;
}

interface EnhancedHistoryItem extends ToolRunHistoryItem {
  imageCount?: number;
  successCount?: number;
  failureCount?: number;
  domain?: string;
}

const HISTORY_PAGE_SIZE = 20;

const SessionErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
    <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
    <h3 className="text-xl font-bold mb-2">Unable to verify your access</h3>
    <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

const AccessDeniedState = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
    <ShieldAlert className="mb-4 h-16 w-16 text-destructive" />
    <h3 className="text-xl font-bold mb-2">Access Denied</h3>
    <p className="text-muted-foreground mb-4 max-w-md">
      {message || 'You do not have permission to use this tool.'}
    </p>
    <Button variant="outline" onClick={() => window.location.href = '/dashboard/tools'}>
      Return to Tools
    </Button>
  </div>
);

const getDomainFromUrl = (url: string): string => {
  try {
    if (url.startsWith('data:')) return 'data:image';
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'invalid';
  }
};

const enhanceHistory = (items: ToolRunHistoryItem[]): EnhancedHistoryItem[] => {
  return items.map(item => {
    const enhanced: EnhancedHistoryItem = { ...item };

    if (item.inputs && typeof item.inputs === 'object' && 'imageUrls' in item.inputs) {
      const imageUrls = item.inputs.imageUrls as string[];
      enhanced.imageCount = Array.isArray(imageUrls) ? imageUrls.length : 0;

      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        enhanced.domain = getDomainFromUrl(imageUrls[0]);
      }
    }

    if (item.outputs && typeof item.outputs === 'object' && 'results' in item.outputs) {
      const results = item.outputs.results as AltTextResultItem[];
      if (Array.isArray(results)) {
        enhanced.successCount = results.filter(r => r.altText && !r.error).length;
        enhanced.failureCount = results.filter(r => r.error).length;
      }
    }

    return enhanced;
  });
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
  const [, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const router = useRouter();

  const {
    isLoading: isLoadingSession,
    isFetching: isFetchingSession,
    error: sessionError,
    status: sessionStatus,
    hasAccess,
    refetch: refetchSession,
  } = useToolAccess();

  const {
    items: enhancedHistory,
    isLoading: isLoadingHistory,
    error: historyError,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
    refresh: refreshHistory,
  } = useToolHistory<EnhancedHistoryItem>('alt_text_generator', {
    enabled: hasAccess,
    pageSize: HISTORY_PAGE_SIZE,
    transform: enhanceHistory,
  });

  useEffect(() => {
    const firstUrl = imageUrlsInput.split(/\s+/).map(u => u.trim()).find(u => {
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
    
    // Split by any whitespace (newlines, spaces, tabs etc.) to handle various input formats
    const urls = imageUrlsInput.split(/\s+/).map(u => u.trim()).filter(u => u);

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

    try {
      // Send all image URLs at once as a batch
      const response = await apiFetch('/api/tools/alt-text-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrls: urls, // Send all URLs at once
          language: selectedLanguage,
          processBatch: true, // Flag to indicate batch processing
        }), 
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error || 'API request failed.';
        toast.error(errorMsg);
        // Create error results for all URLs
        urls.forEach(url => {
          setResults(prevResults => [...prevResults, { imageUrl: url, error: errorMsg }]);
        });
        overallErrorCount = urls.length;
      } else if (data.success && Array.isArray(data.results)) {
        // Process all results at once
        setResults(data.results);
        data.results.forEach(result => {
          if (result.altText && !result.error) {
            overallSuccessCount++;
          } else {
            overallErrorCount++;
          }
        });
        setProcessedCount(urls.length);
      } else {
        const errorMsg = data.error || 'Unexpected server response.';
        urls.forEach(url => {
          setResults(prevResults => [...prevResults, { imageUrl: url, error: errorMsg }]);
        });
        overallErrorCount = urls.length;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Client-side error processing images.';
      urls.forEach(url => {
        setResults(prevResults => [...prevResults, { imageUrl: url, error: errorMsg }]);
      });
      overallErrorCount = urls.length;
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

    // After successful or failed run, refetch history
    if (hasAccess) {
      refreshHistory();
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


  const isSessionLoading = isLoadingSession || isFetchingSession;

  if (isSessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (sessionError && sessionStatus !== 403) {
    return <SessionErrorState message={sessionError} onRetry={() => refetchSession()} />;
  }

  if (!hasAccess) {
    return <AccessDeniedState message={sessionStatus === 403 ? sessionError ?? undefined : undefined} />;
  }
  // --- Main Page Content ---
  return (
    <div className="space-y-6">
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
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Processing {totalCount} {totalCount === 1 ? 'image' : 'images'} as a batch...
                      </p>
                    </div>
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
            </CardHeader>
            <CardContent>
              {results.length > 0 && !isLoading && (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <span className="text-muted-foreground">Total Processed</span>
                      <p className="font-semibold text-lg">{results.length}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-muted-foreground">Successful</span>
                      <p className="font-semibold text-lg text-green-600">
                        {results.filter(r => r.altText && !r.error).length}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-muted-foreground">Failed</span>
                      <p className="font-semibold text-lg text-red-600">
                        {results.filter(r => r.error).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="w-[25%]">Image URL</TableHead>
                      <TableHead scope="col" className="w-[50%]">Generated Alt Text / Error</TableHead>
                      <TableHead scope="col" className="w-[25%] text-center">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((item, index) => (
                      <TableRow key={`${index}-${item.imageUrl}`} className={item.error ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                        <TableCell className="py-2 align-top font-medium">
                            <div className="max-w-[300px]">
                                <div className="space-y-1">
                                    <span 
                                        className="text-xs text-muted-foreground block break-all cursor-help" 
                                        title={item.imageUrl}
                                    >
                                        {item.imageUrl}
                                    </span>
                                </div>
                                {!item.imageUrl.startsWith('data:') && (
                                    <button
                                        onClick={() => {
                                            // Open image directly in new tab (safer approach)
                                            window.open(item.imageUrl, '_blank', 'noopener,noreferrer');
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                                    >
                                        Open image ↗
                                    </button>
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
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs ${item.altText.length > 125 ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}`}>
                                                {item.altText.length}/125 characters
                                            </span>
                                            {item.altText.length > 125 && (
                                                <Badge variant="outline" className="text-xs bg-orange-50">
                                                    Exceeds limit
                                                </Badge>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopyText(item.altText, item.imageUrl)} className="w-fit h-auto p-1 text-xs">
                                            <ClipboardCopy className="h-3 w-3 mr-1" /> Copy Text
                                        </Button>
                                    </>
                                )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-top text-center">
                            {item.imageUrl && !item.error && (
                                <div className="flex flex-col justify-center items-center gap-2 h-full">
                                    {item.imageUrl.startsWith('data:') ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img 
                                            src={item.imageUrl} 
                                            alt=""
                                            className="max-w-full h-auto max-h-32 rounded-md border object-contain hover:object-scale-down transition-all duration-300 ease-in-out cursor-pointer"
                                            onClick={(e) => {
                                                const target = e.currentTarget as HTMLImageElement;
                                                if (target.classList.contains('max-h-24')) {
                                                    target.classList.remove('max-h-24');
                                                    target.classList.add('max-h-48', 'md:max-h-64'); // Slightly larger zoom
                                                } else {
                                                    target.classList.remove('max-h-48', 'md:max-h-64');
                                                    target.classList.add('max-h-24');
                                                }
                                            }}
                                        />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img 
                                            src={item.imageUrl} 
                                            alt=""
                                            className="max-w-full h-auto max-h-32 rounded-md border object-contain hover:object-scale-down transition-all duration-300 ease-in-out cursor-pointer" 
                                            onError={(e) => {
                                                const target = e.currentTarget as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parentCell = target.closest('td');
                                                if (parentCell && !parentCell.querySelector('.preview-error-text')) {
                                                    const errorSpan = document.createElement('span');
                                                    errorSpan.className = 'text-xs text-muted-foreground preview-error-text';
                                                    errorSpan.textContent = 'Preview N/A';
                                                    parentCell.appendChild(errorSpan);
                                                }
                                            }}
                                            onClick={() => {
                                                // Open image directly in new tab (safer approach)
                                                window.open(item.imageUrl, '_blank', 'noopener,noreferrer');
                                            }}
                                        />
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            window.open(item.imageUrl, '_blank');
                                        }}
                                        className="text-xs"
                                    >
                                        View Full Image
                                    </Button>
                                </div>
                            )}
                            {item.error && <span className="text-xs text-muted-foreground">Preview N/A</span>}
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
                  <p>Enter image URLs above and click &quot;Generate Alt Text&quot; to see results here.</p>
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

        {/* Run History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Run History
            </CardTitle>
            <CardDescription>
              Your recent alt text generation runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading history...</p>
              </div>
            )}
            {historyError && (
              <div className="text-red-500 py-4">
                <AlertTriangle className="inline mr-2 h-5 w-5" /> Error loading history: {historyError}
              </div>
            )}
            {!isLoadingHistory && !historyError && enhancedHistory.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">No history available for this tool.</p>
            )}
            {!isLoadingHistory && !historyError && enhancedHistory.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Domain</TableHead>
                    <TableHead scope="col">URLs</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col" className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedHistory.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <span className="text-sm font-medium truncate max-w-[200px] block" title={run.domain}>
                          {run.domain || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {run.imageCount !== undefined ? (
                            <span className="text-sm">{run.imageCount} {run.imageCount === 1 ? 'URL' : 'URLs'}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {run.batch_id && (
                            <Badge variant="outline" className="text-xs">
                              Batch
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{format(new Date(run.run_at), 'MMM d, yyyy, HH:mm')}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {run.successCount !== undefined && run.successCount > 0 && (
                            <Badge variant="default" className="text-xs">
                              {run.successCount} ✓
                            </Badge>
                          )}
                          {run.failureCount !== undefined && run.failureCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {run.failureCount} ✗
                            </Badge>
                          )}
                          <Link href={`/dashboard/tools/history/${run.id}`} passHref>
                            <Button variant="outline" size="sm">
                              View <ExternalLink className="ml-2 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {hasMoreHistory && !isLoadingHistory && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={loadMoreHistory}>
                  Load More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
