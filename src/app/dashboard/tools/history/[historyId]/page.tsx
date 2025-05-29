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
import { createSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

// Define UserSessionData interface (can be shared if not already)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  error_message?: string | null;
  // Potentially add user_email or brand_name if fetched/joined by API in future
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[30%]">Parameter</TableHead>
                <TableHead scope="col">Value</TableHead>
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
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        {outputs.results && outputs.results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Image URL</TableHead>
                  <TableHead scope="col">Generated Alt Text</TableHead>
                  <TableHead scope="col">Error</TableHead>
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
          </div>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[30%]">Parameter</TableHead>
                <TableHead scope="col">Value</TableHead>
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
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        {outputs.results && outputs.results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">URL</TableHead>
                  <TableHead scope="col">Meta Title</TableHead>
                  <TableHead scope="col">Meta Description</TableHead>
                  <TableHead scope="col">Keywords</TableHead>
                  <TableHead scope="col">Error</TableHead>
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
          </div>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[30%]">Parameter</TableHead>
                <TableHead scope="col">Value</TableHead>
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
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-base">Outputs</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[30%]">Detail</TableHead>
                <TableHead scope="col">Value</TableHead>
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
    </div>
  );
};


// --- End Tool Specific Display Components ---

export default function ToolRunHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const historyId = params?.historyId as string | undefined;

  const [historyItem, setHistoryItem] = useState<ToolRunHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    const fetchInitialData = async () => {
      setIsLoading(true);
      setIsLoadingUser(true); // Explicitly set user loading
      setError(null);

      // Fetch user first (can be done in parallel or sequence)
      try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata
          });
        } else {
          // No active session, or user is null
          setCurrentUser(null);
          // Optionally redirect if user is required to view this page, or handle in UI
           setError("User not authenticated."); // Set error if user is required
           toast.error("User not authenticated. Please login.");
           setIsLoading(false); // Stop loading as we can't proceed
           setIsLoadingUser(false);
           // router.push('/auth/login'); // Example redirect
           return;
        }
      } catch (userError) {
        console.error("Error fetching user session:", userError);
        setError(userError instanceof Error ? userError.message : "Error fetching user data.");
        setCurrentUser(null);
        setIsLoading(false); // Stop general loading
        setIsLoadingUser(false);
        return;
      }
      setIsLoadingUser(false);

      if (!historyId) {
        setError('History ID is missing from the URL.');
        toast.error('History ID is missing.');
        setIsLoading(false); // Stop general loading
        return;
      }

      // Fetch history item
      try {
        const { data, error: dbError } = await supabaseClient
          .from('tool_run_history')
          .select('*')
          .eq('id', historyId)
          .maybeSingle(); // Use maybeSingle to handle null if not found

        if (dbError) throw dbError;
        
        if (data) {
          setHistoryItem(data as ToolRunHistoryItem);
        } else {
          setError('Tool run history item not found.');
          toast.error('History item not found.');
        }
      } catch (fetchError) {
        console.error('Failed to fetch history item:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'An unknown error occurred while fetching history.');
        toast.error('Failed to load history details.');
      } finally {
        setIsLoading(false); // General loading finished
      }
    };

    fetchInitialData();
  }, [historyId, router]); // Added router to deps if used for redirect

  // Order of checks: Missing ID, then overall loading, then specific error or no item
  if (!historyId && !isLoading) { // If ID was missing and we stopped loading early
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50">
        <Card className="w-full max-w-lg p-6 sm:p-8 text-center shadow-xl">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-xl font-semibold">Error Loading History</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            {error || 'The History ID is missing. Unable to load the item.'}
          </CardDescription>
          <Button onClick={() => router.push('/dashboard/tools/history')} className="mt-6 w-full">
            Return to Tool History Log
          </Button>
        </Card>
      </div>
    );
  }
  
  if (isLoading || isLoadingUser) { // Combined loading state
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">
          {isLoadingUser ? 'Loading user data...' : (isLoading ? 'Loading history item...' : 'Loading...')}
        </p>
      </div>
    );
  }

  if (error && !historyItem) { // If there was an error and no item was loaded
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
        <Breadcrumbs items={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Tool History', href: '/dashboard/tools/history'}, {label: 'Error'}]} />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading History Item</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/tools/history')} title="Return to Tool History Log">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Log
            </Button>
        </div>
      </div>
    );
  }

  if (!historyItem) { // If no error but item is still null (e.g., not found but no specific error thrown to UI)
     return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
        <Breadcrumbs items={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Tool History', href: '/dashboard/tools/history'}, {label: 'Not Found'}]} />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
            <h1 className="text-2xl font-bold text-orange-600 mb-2">History Item Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested tool run history could not be found.</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/tools/history')} title="Return to Tool History Log">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Log
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
    <div className="px-4 sm:px-6 lg:px-8 py-6">
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
            Run executed on {format(new Date(historyItem.run_at), 'dd MMMM yyyy, HH:mm')}
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