'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe, AlertTriangle, Briefcase, History, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandIcon } from '@/components/brand-icon';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api-client';
import { useToolAccess } from '../use-tool-access';
import { useToolHistory, type ToolRunHistoryRecord } from '../use-tool-history';


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

interface Brand {
  id: string;
  name: string;
  language: string; // Expecting language from brand data
  country: string;  // Expecting country from brand data
  color?: string;
  logo_url?: string | null;
}

// Define ToolRunHistoryItem interface
type ToolRunHistoryItem = ToolRunHistoryRecord;

interface BatchGroup {
  batch_id: string;
  items: ToolRunHistoryItem[];
  timestamp: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  brands: { id: string; name: string }[];
}

/**
 * ContentTransCreatorPage provides a tool for trans-creating content.
 * Users input original content, select a source language, and choose a target brand.
 * The trans-creation will target the selected brand's configured language and country.
 */
export default function ContentTransCreatorPage() {
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ transCreatedContent: string, targetLanguage: string, targetCountry: string } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  // Batch mode states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchContent, setBatchContent] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ content: string; transCreatedContent?: string; error?: string }>>([]);
  const [brandsError, setBrandsError] = useState<string | null>(null);

  const {
    isLoading: isLoadingSession,
    isFetching: isFetchingSession,
    error: sessionError,
    status: sessionStatus,
    hasAccess,
    refetch: refetchSession,
  } = useToolAccess();

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Group history items by batch_id
  const groupHistoryByBatch = useCallback((items: ToolRunHistoryItem[]): BatchGroup[] => {
    const batchMap = new Map<string, ToolRunHistoryItem[]>();
    const singleRuns: ToolRunHistoryItem[] = [];
    
    // Group items by batch_id
    items.forEach(item => {
      if (item.batch_id) {
        const existing = batchMap.get(item.batch_id) || [];
        existing.push(item);
        batchMap.set(item.batch_id, existing);
      } else {
        singleRuns.push(item);
      }
    });
    
    // Create BatchGroup objects
    const groups: BatchGroup[] = [];
    
    // Process batch groups
    batchMap.forEach((items, batch_id) => {
      // Sort items by batch_sequence
      const sortedItems = items.sort((a, b) => (a.batch_sequence || 0) - (b.batch_sequence || 0));
      
      const group: BatchGroup = {
        batch_id,
        items: sortedItems,
        timestamp: sortedItems[0].run_at,
        total_count: sortedItems.length,
        success_count: sortedItems.filter(item => item.status === 'success').length,
        failure_count: sortedItems.filter(item => item.status === 'failure').length,
        brands: []
      };
      
      // Extract unique brands
      const brandSet = new Map<string, string>();
      sortedItems.forEach(item => {
        if (item.brand_id && brands.length > 0) {
          const brand = brands.find(b => b.id === item.brand_id);
          if (brand && !brandSet.has(brand.id)) {
            brandSet.set(brand.id, brand.name);
          }
        }
      });
      
      group.brands = Array.from(brandSet.entries()).map(([id, name]) => ({ id, name }));
      groups.push(group);
    });
    
    // Add single runs as individual batch groups
    singleRuns.forEach(item => {
      const group: BatchGroup = {
        batch_id: item.id, // Use the run ID as a pseudo batch ID
        items: [item],
        timestamp: item.run_at,
        total_count: 1,
        success_count: item.status === 'success' ? 1 : 0,
        failure_count: item.status === 'failure' ? 1 : 0,
        brands: []
      };
      
      if (item.brand_id && brands.length > 0) {
        const brand = brands.find(b => b.id === item.brand_id);
        if (brand) {
          group.brands = [{ id: brand.id, name: brand.name }];
        }
      }
      
      groups.push(group);
    });
    
    // Sort groups by timestamp (most recent first)
    return groups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [brands]);

  const historyTransform = useCallback(
    (records: ToolRunHistoryRecord[]) => groupHistoryByBatch(records),
    [groupHistoryByBatch]
  );

  const {
    items: groupedHistory,
    isLoading: isLoadingHistory,
    error: historyError,
    hasMore: hasMoreHistory,
    loadMore: loadMoreHistory,
    refresh: refreshHistory,
  } = useToolHistory<BatchGroup>('content_transcreator', {
    enabled: hasAccess,
    pageSize: HISTORY_PAGE_SIZE,
    transform: historyTransform,
  });

  useEffect(() => {
    if (isLoadingSession || isFetchingSession) {
      return;
    }

    if (!hasAccess) {
      setBrands([]);
      setSelectedBrandId(null);
      setBrandsError(null);
      setIsLoadingBrands(false);
      return;
    }

    const fetchBrands = async () => {
      setIsLoadingBrands(true);
      setBrandsError(null);
      try {
        const response = await apiFetch('/api/brands');
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.data)) {
          throw new Error(data.error || 'Failed to load brands.');
        }

        const validBrands = data.data.filter((b: Brand) => b.language && b.country);
        setBrands(validBrands);

        if (validBrands.length > 0) {
          setSelectedBrandId(prev => {
            if (prev && validBrands.some(brand => brand.id === prev)) {
              return prev;
            }
            return validBrands[0].id;
          });
        } else {
          setSelectedBrandId(null);
          toast.info('No brands with required language/country settings found. Please configure a brand first.');
        }
      } catch (error) {
        console.error('[ContentTransCreatorPage] Error fetching brands:', error);
        setBrands([]);
        setSelectedBrandId(null);
        const message = error instanceof Error ? error.message : 'Failed to load brands.';
        setBrandsError(message);
        toast.error(message);
      } finally {
        setIsLoadingBrands(false);
      }
    };

    void fetchBrands();
  }, [hasAccess, isLoadingSession, isFetchingSession]);
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const selectedBrandDetails = brands.find(b => b.id === selectedBrandId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAccess) {
      toast.error("You do not have permission to use this tool.");
      return;
    }
    
    if (isBatchMode) {
      // Batch mode processing
      if (!batchContent.trim()) {
        toast.error('Please enter content items (one per line) to trans-create.');
        return;
      }
      if (!selectedBrandId) {
        toast.error('Please select a target brand. The brand must have language and country configured.');
        return;
      }
      
      setIsLoading(true);
      setBatchResults([]);
      
      try {
        // Split content by lines and filter out empty lines
        const contentItems = batchContent.split('\n').filter(line => line.trim());
        const batchId = crypto.randomUUID();
        const results: typeof batchResults = [];
        
        // Process each item
        for (let i = 0; i < contentItems.length; i++) {
          const contentItem = contentItems[i];
          try {
            const response = await apiFetch('/api/tools/content-transcreator', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: contentItem,
                sourceLanguage,
                brand_id: selectedBrandId,
                batch_id: batchId,
                batch_sequence: i + 1
              }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              results.push({
                content: contentItem,
                error: data.error || 'Failed to trans-create'
              });
            } else if (data.success) {
              results.push({
                content: contentItem,
                transCreatedContent: data.transCreatedContent
              });
            }
          } catch (error) {
            results.push({
              content: contentItem,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        setBatchResults(results);
        const successCount = results.filter(r => r.transCreatedContent).length;
        const failureCount = results.filter(r => r.error).length;
        
        if (successCount > 0) {
          toast.success(`Batch processing complete: ${successCount} succeeded, ${failureCount} failed`);
        } else {
          toast.error('Batch processing failed for all items');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
        // Refetch history
        refreshHistory();
      }
    } else {
      // Single mode processing
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
        const response = await apiFetch('/api/tools/content-transcreator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            sourceLanguage,
            brand_id: selectedBrandId,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to trans-create content.');
        }
        
        if (data.success) {
          setResults({
            transCreatedContent: data.transCreatedContent,
            targetLanguage: data.targetLanguage,
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
        // Refetch history
        refreshHistory();
      }
    }
  };
  
  const handleCopyContent = () => {
    if (results?.transCreatedContent) {
      copyToClipboard(results.transCreatedContent);
      toast.success('Trans-created content copied to clipboard!');
    }
  };

  const isSessionLoading = isLoadingSession || isFetchingSession;

  if (isSessionLoading || isLoadingBrands) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading tool...</p>
      </div>
    );
  }

  if (sessionError && sessionStatus !== 403) {
    return <SessionErrorState message={sessionError} onRetry={() => refetchSession()} />;
  }

  if (!hasAccess) {
    return <AccessDeniedState message={sessionStatus === 403 ? sessionError ?? undefined : undefined} />;
  }

  return (
    <div className="space-y-6">
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
                                <BrandIcon name={brand.name} color={brand.color} logoUrl={brand.logo_url} className="mr-2 h-4 w-4" />
                                {brand.name} ({brand.language?.toUpperCase()}-{brand.country?.toUpperCase()})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {brandsError && !isLoadingBrands && (
                      <p className="mt-2 text-sm text-destructive">{brandsError}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="batch-mode"
                    checked={isBatchMode}
                    onCheckedChange={(checked) => setIsBatchMode(checked as boolean)}
                  />
                  <Label htmlFor="batch-mode" className="font-normal cursor-pointer">
                    Batch Mode - Process multiple items (one per line)
                  </Label>
                </div>

                <div>
                  <Label htmlFor="content">
                    {isBatchMode ? 'Content Items (one per line)' : 'Content to Trans-create (Max 5000 characters)'} 
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    placeholder={isBatchMode 
                      ? "Enter content items, one per line...\n\nExample:\nFirst item to translate\nSecond item to translate\nThird item to translate"
                      : "Enter your original content here..."
                    }
                    value={isBatchMode ? batchContent : content}
                    onChange={(e) => {
                      if (isBatchMode) {
                        setBatchContent(e.target.value);
                      } else {
                        handleContentChange(e);
                      }
                    }}
                    rows={10}
                    maxLength={isBatchMode ? undefined : 5000}
                    className="min-h-[200px]"
                    disabled={isLoading || !selectedBrandId}
                  />
                  {!isBatchMode && (
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {characterCount} / 5000 characters
                    </p>
                  )}
                  {isBatchMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {batchContent.split('\n').filter(line => line.trim()).length} items to process
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading || (isBatchMode ? !batchContent.trim() : !content) || !selectedBrandId || (brands.length === 0 && !isLoadingBrands)} 
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

          {/* Batch Results Display */}
          {isBatchMode && batchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Trans-creation Results</CardTitle>
                <CardDescription>
                  Processed {batchResults.length} items for {selectedBrandDetails?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {batchResults.map((result, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">Item {idx + 1}</span>
                        {result.error ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="default">Success</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Original:</p>
                          <p className="text-sm">{result.content}</p>
                        </div>
                        {result.transCreatedContent && (
                          <div>
                            <p className="text-xs text-muted-foreground">Trans-created:</p>
                            <p className="text-sm">{result.transCreatedContent}</p>
                          </div>
                        )}
                        {result.error && (
                          <p className="text-sm text-destructive">{result.error}</p>
                        )}
                      </div>
                      {result.transCreatedContent && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            copyToClipboard(result.transCreatedContent!);
                            toast.success('Copied to clipboard!');
                          }}
                        >
                          <ClipboardCopy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Single Result Display */}
          {!isBatchMode && results && (
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
              {!isLoadingHistory && !historyError && groupedHistory.length === 0 && (
                <p className="text-muted-foreground py-4 text-center">No history available for this tool.</p>
              )}
              {!isLoadingHistory && !historyError && groupedHistory.length > 0 && (
                <div className="space-y-4">
                  {groupedHistory.map((group) => (
                    <div key={group.batch_id} className="border rounded-lg overflow-hidden">
                      <div
                        className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          const newExpanded = new Set(expandedBatches);
                          if (newExpanded.has(group.batch_id)) {
                            newExpanded.delete(group.batch_id);
                          } else {
                            newExpanded.add(group.batch_id);
                          }
                          setExpandedBatches(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {format(new Date(group.timestamp), 'MMM d, yyyy HH:mm')}
                              </span>
                              {group.total_count > 1 && (
                                <Badge variant="secondary">{group.total_count} items</Badge>
                              )}
                            </div>
                            {group.brands.length > 0 && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {group.brands.map(b => b.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {group.success_count > 0 && (
                              <Badge variant="default">{group.success_count} success</Badge>
                            )}
                            {group.failure_count > 0 && (
                              <Badge variant="destructive">{group.failure_count} failed</Badge>
                            )}
                            <Button variant="ghost" size="sm">
                              {expandedBatches.has(group.batch_id) ? '▼' : '▶'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {expandedBatches.has(group.batch_id) && (
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Content Preview</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((run, idx) => (
                                <TableRow key={run.id}>
                                  <TableCell className="w-12">
                                    {run.batch_sequence || idx + 1}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {(run.inputs as any)?.content?.substring(0, 50) || 'N/A'}...
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={run.status === 'success' ? 'default' : 'destructive'}>
                                      {run.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Link href={`/dashboard/tools/history/${run.id}`} passHref>
                                      <Button variant="outline" size="sm">
                                        View <ExternalLink className="ml-1 h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
    </div>
  );
}
