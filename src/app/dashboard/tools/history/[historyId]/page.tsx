'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ArrowLeft, Info, FileText, PlayCircle, CheckCircle2, XCircle, UserCircle, Tag, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/skeleton';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from "@/components/ui/table";

// Define UserSessionData interface (can be shared if not already)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
}

// Define ToolRunHistoryItem interface (can be shared if not already)
interface ToolRunHistoryItem {
  id: string;
  user_id: string;
  tool_name: 'alt_text_generator' | 'metadata_generator' | 'content_transcreator' | string; // More specific for known tools
  brand_id?: string | null;
  inputs: any; 
  outputs: any; 
  run_at: string; 
  status: 'success' | 'failure';
  error_message?: string | null;
  // Potentially add user_email or brand_name if fetched/joined by API in future
}

const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
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

// Helper to format tool name for display
const formatToolName = (toolName: string) => {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const JsonViewer = ({ jsonData }: { jsonData: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  try {
    const formattedJson = JSON.stringify(jsonData, null, 2);
    const lineCount = formattedJson.split('\n').length;
    // Display raw JSON directly if it's short, or provide toggle for longer JSON
    const isShort = lineCount <= 10 && formattedJson.length < 500;


    if (isShort && !Array.isArray(jsonData) && typeof jsonData !== 'object') {
       return <p className="text-sm p-1">{formattedJson}</p>;
    }
    
    if (isShort) {
        return (
          <div className="rounded-md bg-muted/50 p-4 text-sm">
            <pre className="overflow-x-auto">
              <code>{formattedJson}</code>
            </pre>
          </div>
        );
    }

    return (
      <div className="rounded-md bg-muted/50 p-4 text-sm relative">
        <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)} 
            className="absolute top-2 right-2 h-6 w-6"
            aria-label={isExpanded ? "Collapse JSON" : "Expand JSON"}
        >
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <pre className={`overflow-x-auto ${!isExpanded ? 'max-h-48' : ''}`}>
          <code>{formattedJson}</code>
        </pre>
      </div>
    );
  } catch (e) {
    return <p className="text-red-500">Error displaying JSON data.</p>;
  }
};

// --- Tool Specific Display Components ---

// Alt Text Generator Types
interface AltTextInputs {
  imageUrls: string[];
  language?: string;
}
interface AltTextOutputItem {
  imageUrl: string;
  altText?: string;
  error?: string;
}
interface AltTextOutputs {
  results: AltTextOutputItem[];
}

const AltTextHistoryDisplay = ({ inputs, outputs }: { inputs: AltTextInputs, outputs: AltTextOutputs }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2 text-base">Inputs</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Parameter</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Image URLs</TableCell>
              <TableCell>
                {inputs.imageUrls.map((url, idx) => (
                  <div key={idx} className="truncate" title={url}>{url}</div>
                ))}
              </TableCell>
            </TableRow>
            {inputs.language && (
              <TableRow>
                <TableCell>Language</TableCell>
                <TableCell>{inputs.language}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        {outputs.results && outputs.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image URL</TableHead>
                <TableHead>Generated Alt Text</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outputs.results.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="truncate" title={item.imageUrl}>{item.imageUrl}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{item.altText || 'N/A'}</TableCell>
                  <TableCell className="whitespace-pre-wrap text-destructive">{item.error || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">No output results found.</p>}
      </div>
    </div>
  );
};

// Metadata Generator Types
interface MetadataInputs {
  urls: string[];
  language?: string;
}
interface MetadataOutputItem {
  url: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  error?: string;
}
interface MetadataOutputs {
  results: MetadataOutputItem[];
}

const MetadataHistoryDisplay = ({ inputs, outputs }: { inputs: MetadataInputs, outputs: MetadataOutputs }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2 text-base">Inputs</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Parameter</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Page URLs</TableCell>
              <TableCell>
                {inputs.urls.map((url, idx) => (
                  <div key={idx} className="truncate" title={url}>{url}</div>
                ))}
              </TableCell>
            </TableRow>
            {inputs.language && (
              <TableRow>
                <TableCell>Language</TableCell>
                <TableCell>{inputs.language}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        {outputs.results && outputs.results.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Meta Title</TableHead>
              <TableHead>Meta Description</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outputs.results.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="truncate" title={item.url}>{item.url}</TableCell>
                <TableCell className="whitespace-pre-wrap">{item.metaTitle || 'N/A'}</TableCell>
                <TableCell className="whitespace-pre-wrap">{item.metaDescription || 'N/A'}</TableCell>
                <TableCell>
                  {item.keywords && item.keywords.length > 0 
                    ? item.keywords.map(kw => <Badge key={kw} variant="secondary" className="mr-1 mb-1">{kw}</Badge>) 
                    : 'N/A'}
                </TableCell>
                <TableCell className="whitespace-pre-wrap text-destructive">{item.error || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        ) : <p className="text-sm text-muted-foreground">No output results found.</p>}
      </div>
    </div>
  );
};

// Content Trans-creator Types
interface ContentTranscreatorInputs {
  content: string;
  sourceLanguage?: string;
  brand_id: string;
}
interface ContentTranscreatorSuccessOutputs {
  transCreatedContent: string;
  targetLanguage: string;
  targetCountry: string;
  error?: never; // Explicitly no error for success type
}
interface ContentTranscreatorFailureOutputs {
  error: string;
  transCreatedContent?: never; 
  targetLanguage?: string; // May or may not be present on failure
  targetCountry?: string; // May or may not be present on failure
}

type ContentTranscreatorOutputs = ContentTranscreatorSuccessOutputs | ContentTranscreatorFailureOutputs;


const ContentTranscreatorHistoryDisplay = ({ inputs, outputs, status }: { inputs: ContentTranscreatorInputs, outputs: ContentTranscreatorOutputs, status: 'success' | 'failure' }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2 text-base">Inputs</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Parameter</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Original Content</TableCell>
              <TableCell className="whitespace-pre-wrap">{inputs.content}</TableCell>
            </TableRow>
            {inputs.sourceLanguage && (
              <TableRow>
                <TableCell>Source Language</TableCell>
                <TableCell>{inputs.sourceLanguage}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell>Target Brand ID</TableCell>
              <TableCell>{inputs.brand_id}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Detail</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === 'success' && outputs.transCreatedContent && (
              <>
                <TableRow>
                  <TableCell>Trans-created Content</TableCell>
                  <TableCell className="whitespace-pre-wrap">{(outputs as ContentTranscreatorSuccessOutputs).transCreatedContent}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Target Language</TableCell>
                  <TableCell>{(outputs as ContentTranscreatorSuccessOutputs).targetLanguage}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Target Country</TableCell>
                  <TableCell>{(outputs as ContentTranscreatorSuccessOutputs).targetCountry}</TableCell>
                </TableRow>
              </>
            )}
            {status === 'failure' && outputs.error && (
              <TableRow>
                <TableCell>Error</TableCell>
                <TableCell className="whitespace-pre-wrap text-destructive">{(outputs as ContentTranscreatorFailureOutputs).error}</TableCell>
              </TableRow>
            )}
             {status === 'success' && !outputs.transCreatedContent && !outputs.error && (
                <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground text-center">No specific output details available for this successful run.</TableCell>
                </TableRow>
             )}
             {status === 'failure' && !outputs.error && (
                <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground text-center">No specific error details available for this failed run.</TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


// --- End Tool Specific Display Components ---

export default function ToolRunHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const historyId = params.historyId as string;

  const [historyItem, setHistoryItem] = useState<ToolRunHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false); // For the page in general

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          // Basic permission: any logged in user can try to view, API will enforce specific record access
          setIsAllowedToAccess(true); 
        } else {
          setUserError(data.error || 'User not authenticated.');
          setIsAllowedToAccess(false);
        }
      } catch (e: any) {
        setUserError(e.message || 'Error fetching user.');
        setIsAllowedToAccess(false);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!historyId || !isAllowedToAccess || isLoadingUser) return; // Wait for user and permission

    const fetchHistoryItem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/me/tool-run-history/${historyId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        if (data.success && data.historyItem) {
          setHistoryItem(data.historyItem);
        } else {
          setError(data.error || 'History item not found.');
        }
      } catch (e: any) {
        console.error('[HistoryDetailPage] Error fetching history item:', e);
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryItem();
  }, [historyId, isAllowedToAccess, isLoadingUser]);

  if (isLoadingUser || isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/2 mb-6" /> {/* Breadcrumbs skeleton */}
        <Skeleton className="h-10 w-1/3 mb-2" /> {/* Header skeleton */}
        <Skeleton className="h-6 w-2/3 mb-10" /> {/* Description skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full col-span-2" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userError || !isAllowedToAccess && !isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Access Error</h2>
        <p className="text-center text-muted-foreground mb-6">
          {userError || 'You must be logged in to view this page.'}
        </p>
        <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tools', href: '/dashboard/tools' }, {label: 'History'}]} />
        <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
            <h2 className="text-3xl font-semibold text-destructive mb-3">Error Loading History</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-md">
            {error === 'History item not found or access denied.'
                ? 'The history item you are looking for could not be found, or you do not have permission to view it.'
                : `An error occurred: ${error}`}
            </p>
            <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </div>
      </div>
    );
  }

  if (!historyItem) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
         <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tools', href: '/dashboard/tools' }, {label: 'History'}]} />
        <div className="flex flex-col items-center justify-center py-20">
            <FileText className="h-16 w-16 text-muted-foreground mb-6" />
            <h2 className="text-3xl font-semibold text-muted-foreground mb-3">History Item Not Found</h2>
             <p className="text-center text-muted-foreground mb-8 max-w-md">
                The requested tool run history could not be located.
            </p>
            <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </div>
      </div>
    );
  }
  
  const getToolPageLink = (toolName: string) => {
    const basePath = '/dashboard/tools/';
    switch (toolName) {
        case 'alt_text_generator': return basePath + 'alt-text-generator';
        case 'metadata_generator': return basePath + 'metadata-generator';
        case 'content_transcreator': return basePath + 'content-transcreator';
        default: return basePath;
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tools', href: '/dashboard/tools' },
          { label: formatToolName(historyItem.tool_name), href: getToolPageLink(historyItem.tool_name) },
          { label: 'Run Details' }
        ]}
      />

      <header className="mb-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <PlayCircle className="mr-3 h-8 w-8 text-primary" /> 
            Tool Run Details
            </h1>
            <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Previous Page
            </Button>
        </div>
        <p className="mt-2 text-muted-foreground">
          Detailed information for a single tool run instance.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {historyItem.status === 'success' ? 
                <CheckCircle2 className="mr-2 h-6 w-6 text-green-500" /> : 
                <XCircle className="mr-2 h-6 w-6 text-red-500" />}
            {formatToolName(historyItem.tool_name)} - Run Overview
          </CardTitle>
          <CardDescription>
            Run executed on {format(new Date(historyItem.run_at), 'PPPPpppp')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <strong className="text-muted-foreground block mb-1">Status:</strong> 
              <Badge variant={historyItem.status === 'success' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                {historyItem.status.toUpperCase()}
              </Badge>
            </div>
            <div><strong className="text-muted-foreground">Run ID:</strong> {historyItem.id}</div>
            <div><strong className="text-muted-foreground">User ID:</strong> {historyItem.user_id}</div>
            {historyItem.brand_id && <div><strong className="text-muted-foreground">Brand ID:</strong> {historyItem.brand_id}</div>}
          </div>

          {historyItem.status === 'failure' && historyItem.error_message && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" /> Error Details
              </h3>
              <p className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700">
                {historyItem.error_message}
              </p>
            </div>
          )}
          
          {historyItem.tool_name === 'alt_text_generator' && historyItem.inputs && historyItem.outputs ? (
            <AltTextHistoryDisplay inputs={historyItem.inputs as AltTextInputs} outputs={historyItem.outputs as AltTextOutputs} />
          ) : historyItem.tool_name === 'metadata_generator' && historyItem.inputs && historyItem.outputs ? (
            <MetadataHistoryDisplay inputs={historyItem.inputs as MetadataInputs} outputs={historyItem.outputs as MetadataOutputs} />
          ) : historyItem.tool_name === 'content_transcreator' && historyItem.inputs && historyItem.outputs ? (
            <ContentTranscreatorHistoryDisplay inputs={historyItem.inputs as ContentTranscreatorInputs} outputs={historyItem.outputs as ContentTranscreatorOutputs} status={historyItem.status as 'success' | 'failure'}/>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                    <Info className="mr-2 h-5 w-5" /> Inputs
                </h3>
                <JsonViewer jsonData={historyItem.inputs} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                    <FileText className="mr-2 h-5 w-5" /> Outputs
                </h3>
                <JsonViewer jsonData={historyItem.outputs} />
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
} 