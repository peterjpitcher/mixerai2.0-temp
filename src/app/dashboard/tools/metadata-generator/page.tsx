'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, Globe, ArrowLeft, AlertTriangle, ExternalLink, Languages, History, Download, ShieldAlert } from 'lucide-react';
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
import { useToolHistory, type ToolRunHistoryRecord } from '../use-tool-history';


interface MetadataResultItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}

// Define ToolRunHistoryItem interface
type ToolRunHistoryItem = ToolRunHistoryRecord;

interface EnhancedHistoryItem extends ToolRunHistoryItem {
  urlCount?: number;
  successCount?: number;
  failureCount?: number;
}

const enhanceHistory = (items: ToolRunHistoryItem[]): EnhancedHistoryItem[] => {
  return items.map(item => {
    const enhanced: EnhancedHistoryItem = { ...item };

    if (item.inputs && typeof item.inputs === 'object' && 'urls' in item.inputs) {
      const urls = item.inputs.urls as string[];
      enhanced.urlCount = Array.isArray(urls) ? urls.length : 0;
    }

    if (item.outputs && typeof item.outputs === 'object' && 'results' in item.outputs) {
      const results = item.outputs.results as MetadataResultItem[];
      if (Array.isArray(results)) {
        enhanced.successCount = results.filter(r => r.metaTitle && !r.error).length;
        enhanced.failureCount = results.filter(r => r.error).length;
      }
    }

    return enhanced;
  });
};

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

// Function to extract domain suffix and map to language code
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
    // Add more mappings as needed
  };

  try {
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
    return 'en'; // Default to 'en'
  } catch (error) {
    console.error('Error extracting domain suffix:', error);
    return 'en'; // Default to 'en' on error
  }
};

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

/**
 * MetadataGeneratorPage provides a tool for users to generate SEO metadata
 * (meta title, meta description, keywords) for a given URL, tailored to a selected brand and language.
 * It fetches available brands, allows URL input, and calls an API to get metadata suggestions.
 * Results can be copied to the clipboard.
 */
export default function MetadataGeneratorPage() {
  const [urlsInput, setUrlsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MetadataResultItem[]>([]);
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
  } = useToolHistory<EnhancedHistoryItem>('metadata_generator', {
    enabled: hasAccess,
    pageSize: HISTORY_PAGE_SIZE,
    transform: enhanceHistory,
  });

  useEffect(() => {
    // Split by any whitespace to correctly find the first URL for language detection
    const firstUrl = urlsInput.split(/\s+/).map(u => u.trim()).find(u => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });
    if (firstUrl) {
      const detectedLang = getLanguageFromDomain(firstUrl);
      setSelectedLanguage(detectedLang);
    } else if (!urlsInput.trim()) { // Reset to 'en' if input is cleared
        setSelectedLanguage('en');
    }
  }, [urlsInput]);

  // Fetch Run History
  const handleSubmitUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split by any whitespace (newlines, spaces, tabs etc.) to handle various input formats
    const urls = urlsInput.split(/\s+/).map(u => u.trim()).filter(u => u);

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

    try {
      // Send all URLs at once as a batch
      const response = await apiFetch('/api/tools/metadata-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urls, // Send all URLs at once
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
          setResults(prevResults => [...prevResults, { url, error: errorMsg }]);
        });
        overallErrorCount = urls.length;
      } else if (data.success && Array.isArray(data.results)) {
        // Process all results at once
        setResults(data.results);
        data.results.forEach(result => {
          if (!result.error && (result.metaTitle || result.metaDescription)) {
            overallSuccessCount++;
          } else {
            overallErrorCount++;
          }
        });
        setProcessedCount(urls.length);
      } else {
        const errorMsg = data.error || 'Unexpected server response.';
        urls.forEach(url => {
          setResults(prevResults => [...prevResults, { url, error: errorMsg }]);
        });
        overallErrorCount = urls.length;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Client-side error processing URLs.';
      urls.forEach(url => {
        setResults(prevResults => [...prevResults, { url, error: errorMsg }]);
      });
      overallErrorCount = urls.length;
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

    // After successful or failed run, refetch history
    if (hasAccess) {
      refreshHistory();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCopyToClipboard = (text: string, type: string, url: string) => {
    if (text) {
      copyToClipboard(text);
      toast.success(`${type} for ${url.length > 30 ? url.substring(0,27) + '...' : url} copied!`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const errorResults = results.filter(r => r.error);

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }

    const csvContent = [
      // Headers
      ['URL', 'Meta Title', 'Meta Description', 'Keywords', 'Status'],
      // Data rows
      ...results.map(result => [
        result.url,
        result.metaTitle || '',
        result.metaDescription || '',
        result.keywords?.join('; ') || '',
        result.error ? 'Error' : 'Success'
      ])
    ]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `metadata-generator-results-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success('Results exported successfully');
  };

  const isSessionLoading = isLoadingSession || isFetchingSession;

  if (isSessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-6" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
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
            <CardTitle>Enter URLs & Select Language</CardTitle>
            <CardDescription>
              Enter one URL per line. Language for generation will be detected from the first valid URL, or you can select it manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitUrls} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs <span className="text-destructive">*</span></Label>
                <Textarea
                  id="urls"
                  placeholder="https://example.com/page1\\nhttps://example.fr/article-francais"
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  rows={5}
                  required
                  disabled={isLoading}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language-select">Output Language</Label>
                <Select 
                  value={selectedLanguage} 
                  onValueChange={setSelectedLanguage}
                  disabled={isLoading}
                >
                  <SelectTrigger id="language-select" className="w-full md:w-[280px]">
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
                  Language is auto-detected from the first URL. You can override it here.
                </p>
              </div>

              <div className="flex flex-col items-end">
                {isLoading && totalCount > 0 && (
                    <div className="w-full mb-2">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">
                                Processing {totalCount} {totalCount === 1 ? 'URL' : 'URLs'} as a batch...
                            </p>
                        </div>
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
                    <CardTitle>Generated Results</CardTitle>
                    <CardDescription>
                        Review the generated metadata or errors for each URL.
                    </CardDescription>
                </div>
                {results.length > 0 && !isLoading && (
                    <Button onClick={handleExportCSV} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                )}
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
                        {results.filter(r => r.metaTitle && !r.error).length}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-muted-foreground">Failed</span>
                      <p className="font-semibold text-lg text-red-600">
                        {results.filter(r => r.error).length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    <span className="font-medium">SEO Guidelines:</span> Title: 30-60 chars | Description: 70-160 chars
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="w-[30%]">URL</TableHead>
                      <TableHead scope="col" className="w-[35%]">Meta Title / Error</TableHead>
                      <TableHead scope="col" className="w-[35%]">Meta Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((item, index) => (
                      <TableRow key={`${index}-${item.url}`} className={item.error ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                        <TableCell className="py-2 align-top font-medium break-all">
                          {item.url}
                        </TableCell>
                        <TableCell className="py-2 align-top whitespace-pre-wrap">
                          {item.error ? (
                            <div className="text-destructive flex items-start">
                              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{item.error}</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-sm">{item.metaTitle || "N/A"}</span>
                              {item.metaTitle && (
                                <Badge 
                                  variant={
                                    item.metaTitle.length > 60 ? "destructive" : 
                                    item.metaTitle.length < 30 ? "outline" : 
                                    "secondary"
                                  } 
                                  className="text-xs"
                                >
                                  {item.metaTitle.length} chars
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-top whitespace-pre-wrap">
                          {item.error ? (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-sm">{item.metaDescription || "N/A"}</span>
                              {item.metaDescription && (
                                <Badge 
                                  variant={
                                    item.metaDescription.length > 160 ? "destructive" : 
                                    item.metaDescription.length < 70 ? "outline" : 
                                    "secondary"
                                  } 
                                  className="text-xs"
                                >
                                  {item.metaDescription.length} chars
                                </Badge>
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
                  <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No results to display yet.</p>
                  <p>Enter URLs above and click &quot;Generate Metadata&quot; to see results here.</p>
                </div>
              )}
               {isLoading && totalCount > 0 && results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium">Processing your request...</p>
                  <p>Please wait while we generate metadata for your URLs.</p>
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
              Your recent metadata generation runs.
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
                    <TableHead scope="col">Run Date</TableHead>
                    <TableHead scope="col">URLs</TableHead>
                    <TableHead scope="col">Results</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedHistory.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{format(new Date(run.run_at), 'MMMM d, yyyy, HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {run.urlCount !== undefined ? (
                            <span className="text-sm">{run.urlCount} {run.urlCount === 1 ? 'URL' : 'URLs'}</span>
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
                        <div className="flex items-center gap-2">
                          {run.successCount !== undefined && run.successCount > 0 && (
                            <Badge variant="default" className="text-xs">
                              {run.successCount} success
                            </Badge>
                          )}
                          {run.failureCount !== undefined && run.failureCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {run.failureCount} failed
                            </Badge>
                          )}
                          {(run.successCount === undefined && run.failureCount === undefined) && (
                            <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>
                              {run.status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/tools/history/${run.id}`} passHref>
                          <Button variant="outline" size="sm">
                            View Details <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </Link>
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
