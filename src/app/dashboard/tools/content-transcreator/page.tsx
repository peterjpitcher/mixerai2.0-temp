'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe, ArrowLeft, AlertTriangle, Briefcase, History, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandIcon } from '@/components/brand-icon';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

// export const metadata: Metadata = {
//   title: 'Content Trans-Creator | MixerAI 2.0',
//   description: 'Adapt your content for different languages and cultural contexts with AI-powered trans-creation.',
// };

// Language options - can be kept for source language or if no brand is selected (though API requires brand)
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
];

// Country options - will be determined by selected brand's settings
// const countryOptions = [ ... ]; // This might become redundant if brand drives the target country

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

interface Brand {
  id: string;
  name: string;
  language: string; // Expecting language from brand data
  country: string;  // Expecting country from brand data
  color?: string;
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

/**
 * ContentTransCreatorPage provides a tool for trans-creating content.
 * Users input original content, select a source language, and choose a target brand.
 * The trans-creation will target the selected brand's configured language and country.
 */
export default function ContentTransCreatorPage() {
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  // Target language and country will be derived from the selected brand
  // const [targetLanguage, setTargetLanguage] = useState('es'); 
  // const [targetCountry, setTargetCountry] = useState('ES');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ transCreatedContent: string, targetLanguage: string, targetCountry: string } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  // History State
  const [runHistory, setRunHistory] = useState<ToolRunHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUserAndBrands = async () => {
      setIsLoadingUser(true);
      setIsLoadingBrands(true);
      setUserError(null);
      try {
        const userResponse = await fetch('/api/me');
        if (!userResponse.ok) {
          const errorData = await userResponse.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        if (userData.success && userData.user) {
          setCurrentUser(userData.user);
          
          // User is fetched, now fetch brands
          const brandsResponse = await fetch('/api/brands');
          if (!brandsResponse.ok) {
            throw new Error('Failed to fetch brands');
          }
          const brandsData = await brandsResponse.json();
          if (brandsData.success && Array.isArray(brandsData.data)) {
            // Filter brands to only include those with language and country
            const validBrands = brandsData.data.filter((b: Brand) => b.language && b.country);
            setBrands(validBrands);
            if (validBrands.length > 0) {
              setSelectedBrandId(validBrands[0].id); // Default to first valid brand
            } else {
               toast.info("No brands with required language/country settings found. Please configure a brand first.");
            }
          } else {
            setBrands([]);
            toast.error(brandsData.error || 'Could not load brands.');
          }

        } else {
          setCurrentUser(null);
          setUserError(userData.error || 'User data not found in session.');
        }
      } catch (error) {
        console.error('[ContentTransCreatorPage] Error fetching initial data:', error);
        setUserError((error as Error).message || 'An unexpected error occurred while fetching data.');
        toast.error((error as Error).message || 'Failed to load required data.');
      } finally {
        setIsLoadingUser(false);
        setIsLoadingBrands(false);
      }
    };
    fetchCurrentUserAndBrands();
  }, []);

  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      setIsCheckingPermissions(true);
      const userRole = currentUser.user_metadata?.role;
      const canAccess = userRole === 'admin' || userRole === 'editor';
      setIsAllowedToAccess(canAccess);
      if (!canAccess) {
        toast.error("You don&apos;t have permission to access this tool.");
      }
      setIsCheckingPermissions(false);
    } else if (!isLoadingUser && !currentUser) {
      setIsAllowedToAccess(false);
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isLoadingUser]);

  // Fetch Run History
  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser || !isAllowedToAccess) return;

      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const response = await fetch('/api/me/tool-run-history?tool_name=content_transcreator');
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
        console.error('[ContentTransCreatorPage] Error fetching run history:', error);
        setRunHistory([]);
        setHistoryError((error as Error).message || 'An unexpected error occurred while fetching history.');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (currentUser && isAllowedToAccess) { // Fetch only if user is loaded and allowed
      fetchHistory();
    }
  }, [currentUser, isAllowedToAccess]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const selectedBrandDetails = brands.find(b => b.id === selectedBrandId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAllowedToAccess) {
      toast.error("You do not have permission to use this tool.");
      return;
    }
    if (!content) {
      toast.error('Please enter content to trans-create.');
      return;
    }
    if (!selectedBrandId) {
      toast.error('Please select a target brand. The brand must have language and country configured.');
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/tools/content-transcreator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sourceLanguage,
          brand_id: selectedBrandId, // Pass selected brand_id
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trans-create content.');
      }
      
      if (data.success) {
        setResults({
          transCreatedContent: data.transCreatedContent,
          targetLanguage: data.targetLanguage, // Get target lang/country from response
          targetCountry: data.targetCountry,
        });
        
        toast.success('Content has been successfully trans-created.');
      } else {
        throw new Error(data.error || 'Failed to trans-create content.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      // After successful or failed run, refetch history
      if (currentUser && isAllowedToAccess) {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            setHistoryError(null);
            try {
                const response = await fetch('/api/me/tool-run-history?tool_name=content_transcreator');
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
                console.error('[ContentTransCreatorPage] Error fetching run history post-submit:', error);
                setRunHistory([]);
                setHistoryError((error as Error).message || 'An unexpected error occurred while fetching history.');
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }
    }
  };

  const handleCopyContent = () => {
    if (results?.transCreatedContent) {
      copyToClipboard(results.transCreatedContent);
      toast.success('Trans-created content copied to clipboard!');
    }
  };
  
  if (isLoadingUser || isCheckingPermissions || isLoadingBrands) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading tool...</p>
      </div>
    );
  }

  if (!isAllowedToAccess && !userError) { // If no specific user error, but not allowed
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You do not have the necessary permissions (Admin or Editor role required) to use this tool.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading User</h2>
        <p className="text-muted-foreground mb-4">{userError}</p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tools', href: '/dashboard/tools' },
          { label: 'Content Trans-Creator' }
        ]}
      />
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <Globe className="mr-3 h-8 w-8 text-primary" />
          Content Trans-Creator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Adapt your content for different languages and cultural contexts using AI.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Content</CardTitle>
              <CardDescription>Enter the content you want to trans-create and select the source language and target brand.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="source-language">Source Language</Label>
                    <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                      <SelectTrigger id="source-language">
                        <SelectValue placeholder="Select source language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target-brand" className="flex items-center">
                      <Briefcase className="mr-2 h-4 w-4 text-muted-foreground"/> Target Brand <span className="text-destructive ml-1">*</span>
                    </Label>
                    {isLoadingBrands ? (
                      <Skeleton className="h-10 w-full" />
                    ) : brands.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">
                        No brands with language/country configured. <Link href="/dashboard/brands/new" className="text-primary hover:underline">Create one?</Link>
                      </p>
                    ) : (
                      <Select value={selectedBrandId || ''} onValueChange={setSelectedBrandId} disabled={brands.length === 0}>
                        <SelectTrigger id="target-brand" disabled={brands.length === 0}>
                          <SelectValue placeholder="Select target brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>
                              <div className="flex items-center">
                                <BrandIcon name={brand.name} color={brand.color} className="mr-2 h-4 w-4" />
                                {brand.name} ({brand.language?.toUpperCase()}-{brand.country?.toUpperCase()})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Content to Trans-create (Max 5000 characters) <span className="text-destructive ml-1">*</span></Label>
                  <Textarea
                    id="content"
                    placeholder="Enter your original content here..."
                    value={content}
                    onChange={handleContentChange}
                    rows={10}
                    maxLength={5000}
                    className="min-h-[200px]"
                    disabled={isLoading || !selectedBrandId}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {characterCount} / 5000 characters
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading || !content || !selectedBrandId || (brands.length === 0 && !isLoadingBrands)} 
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Trans-creating...
                    </>
                  ) : (
                    'Trans-create Content'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Trans-created Content</CardTitle>
                <CardDescription>
                  Content successfully trans-created for {selectedBrandDetails?.name} ({results.targetLanguage.toUpperCase()}-{results.targetCountry.toUpperCase()}).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Statistics */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <p className="font-semibold">{sourceLanguage.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target:</span>
                      <p className="font-semibold">{results.targetLanguage.toUpperCase()}-{results.targetCountry.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Original:</span>
                      <p className="font-semibold">{content.trim().split(/\s+/).length} words</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trans-created:</span>
                      <p className="font-semibold">{results.transCreatedContent.trim().split(/\s+/).length} words</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Length Change:</span>
                      <Badge variant={
                        Math.abs(((results.transCreatedContent.length - content.length) / content.length) * 100) > 20 
                          ? "outline" 
                          : "secondary"
                      }>
                        {results.transCreatedContent.length > content.length ? '+' : ''}
                        {Math.round(((results.transCreatedContent.length - content.length) / content.length) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Textarea value={results.transCreatedContent} readOnly rows={10} className="min-h-[200px]" />
              </CardContent>
              <CardFooter>
                <Button onClick={handleCopyContent} variant="outline">
                  <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Trans-created Content
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Run History Section - now in the second column for lg screens */} 
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                Run History
              </CardTitle>
              <CardDescription>
                Your recent content trans-creation runs.
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
                        <TableCell>{format(new Date(run.run_at), 'dd MMMM yyyy, HH:mm')}</TableCell>
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
    </div>
  );
}