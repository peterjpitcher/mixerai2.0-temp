'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, Globe, ArrowLeft, AlertTriangle, ExternalLink, Languages, History } from 'lucide-react';
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
import { Progress } from "@/components/ui/progress";
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

// export const metadata: Metadata = {
//   title: 'Metadata Generator | MixerAI 2.0',
//   description: 'Generate SEO-optimised meta titles, descriptions, and keywords for your web pages.',
// };

interface MetadataResultItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}

// Define UserSessionData interface
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; 
  }>;
}

// Define ToolRunHistoryItem interface
interface ToolRunHistoryItem {
  id: string;
  user_id: string;
  tool_name: string;
  brand_id?: string | null;
  inputs: Record<string, unknown>; 
  outputs: Record<string, unknown>; 
  run_at: string; 
  status: 'success' | 'failure';
  error_message?: string | null;
}

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
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const router = useRouter();

  // RBAC State
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // For user session loading
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  // History State
  const [runHistory, setRunHistory] = useState<ToolRunHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      setUserError(null);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          setUserError(data.error || 'User data not found in session.');
        }
      } catch (error) {
        console.error('[MetadataGeneratorPage] Error fetching current user:', error);
        setCurrentUser(null);
        setUserError((error as Error).message || 'An unexpected error occurred while fetching user data.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Check permissions
  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      setIsCheckingPermissions(true);
      const userRole = currentUser.user_metadata?.role;
      if (userRole === 'admin' || userRole === 'editor') {
        setIsAllowedToAccess(true);
      } else {
        setIsAllowedToAccess(false);
      }
      setIsCheckingPermissions(false);
    } else if (!isLoadingUser && !currentUser) {
      setIsAllowedToAccess(false);
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isLoadingUser]);

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
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser || !isAllowedToAccess) return;

      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await fetch('/api/me/tool-run-history?tool_name=metadata_generator');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch history' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.history) {
          setRunHistory(data.history);
        } else {
          setRunHistory([]);
          setHistoryError(data.error || 'History data not found.');
        }
      } catch (error) {
        console.error('[MetadataGeneratorPage] Error fetching run history:', error);
        setRunHistory([]);
        setHistoryError((error as Error).message || 'An unexpected error occurred while fetching history.');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [currentUser, isAllowedToAccess]);

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
            language: selectedLanguage, // Pass selected language
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.error || 'API request failed for this URL.';
          setResults(prevResults => [...prevResults, { url: currentUrl, error: errorMsg }]);
          overallErrorCount++;
        } else if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          const resultItem = data.results[0]; 
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

    // After successful or failed run, refetch history
    if (currentUser && isAllowedToAccess) {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            setHistoryError(null);
            try {
                const response = await fetch('/api/me/tool-run-history?tool_name=metadata_generator');
                if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to fetch history' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success && data.history) {
                setRunHistory(data.history);
                } else {
                setRunHistory([]);
                setHistoryError(data.error || 'History data not found.');
                }
            } catch (error) {
                console.error('[MetadataGeneratorPage] Error fetching run history post-submit:', error);
                setRunHistory([]);
                setHistoryError((error as Error).message || 'An unexpected error occurred while fetching history.');
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
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

  // --- Loading and Access Denied States ---
  if (isLoadingUser || isCheckingPermissions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" /> {/* Breadcrumbs skeleton */}
        <Skeleton className="h-12 w-1/2 mb-2" /> {/* Page title skeleton */}
        <Skeleton className="h-6 w-3/4 mb-6" /> {/* Page description skeleton */}
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

  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive-foreground">Error loading user data: {userError}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  if (!isAllowedToAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to access the Metadata Generator.</p>
        <Link href="/dashboard/tools" passHref>
          <Button variant="outline">Back to Tools</Button>
        </Link>
      </div>
    );
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
                    <CardTitle>Generated Results</CardTitle>
                    <CardDescription>
                        Review the generated metadata or errors for each URL.
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
            {!isLoadingHistory && !historyError && runHistory.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">No history available for this tool.</p>
            )}
            {!isLoadingHistory && !historyError && runHistory.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Run Date</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runHistory.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{format(new Date(run.run_at), 'MMMM d, yyyy, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>
                          {run.status}
                        </Badge>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 