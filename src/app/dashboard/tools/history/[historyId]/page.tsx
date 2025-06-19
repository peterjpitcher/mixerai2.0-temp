'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ArrowLeft, Info, FileText, PlayCircle, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from "@/components/ui/table";
import { createSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';


// Define ToolRunHistoryItem interface (can be shared if not already)
interface ToolRunHistoryItem {
  id: string;
  user_id: string;
  tool_name: 'alt_text_generator' | 'metadata_generator' | 'content_transcreator' | string; // More specific for known tools
  brand_id?: string | null;
  inputs: Record<string, unknown>; 
  outputs: Record<string, unknown>; 
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

const JsonViewer = ({ jsonData }: { jsonData: unknown }) => {
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
  } catch {
    return <p className="text-red-500">Error displaying JSON data.</p>;
  }
};

// --- Tool Specific Display Components ---

// Alt Text Generator Types
interface AltTextInputs {
  imageUrls: string[];
  language?: string;
  error?: string; // For rate limit errors
}
interface AltTextOutputItem {
  imageUrl: string;
  altText?: string;
  error?: string;
}
interface AltTextOutputs {
  results: AltTextOutputItem[];
  error?: string; // For overall errors
}

const AltTextHistoryDisplay = ({ inputs, outputs }: { inputs: AltTextInputs, outputs: AltTextOutputs }) => {
  // Helper function to extract domain from URL
  const getDomainFromUrl = (url: string) => {
    try {
      if (url.startsWith('data:')) return 'Data URL (uploaded image)';
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return 'Invalid URL';
    }
  };

  // Helper to detect language from TLD (matching API logic)
  const getDetectedLanguageFromUrl = (url: string) => {
    try {
      if (url.startsWith('data:')) return 'en (default)';
      const hostname = new URL(url).hostname;
      
      // Common TLD to language mappings
      if (hostname.endsWith('.fr')) return 'fr (French)';
      if (hostname.endsWith('.de')) return 'de (German)';
      if (hostname.endsWith('.es')) return 'es (Spanish)';
      if (hostname.endsWith('.it')) return 'it (Italian)';
      if (hostname.endsWith('.nl')) return 'nl (Dutch)';
      if (hostname.endsWith('.co.uk')) return 'en (UK)';
      if (hostname.endsWith('.com.au')) return 'en (AU)';
      
      return 'en (default)';
    } catch {
      return 'en (default)';
    }
  };

  const successCount = outputs.results?.filter(r => r.altText && !r.error).length || 0;
  const errorCount = outputs.results?.filter(r => r.error).length || 0;
  const totalCount = inputs.imageUrls?.length || 0;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-base">Run Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Images:</span>
            <p className="font-semibold text-lg">{totalCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Successful:</span>
            <p className="font-semibold text-lg text-green-600">{successCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Failed:</span>
            <p className="font-semibold text-lg text-red-600">{errorCount}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-base">Input Details</h4>
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
                <TableCell>Number of Images</TableCell>
                <TableCell>{totalCount}</TableCell>
              </TableRow>
              {inputs.language && (
                <TableRow>
                  <TableCell>Requested Language</TableCell>
                  <TableCell className="font-medium">{inputs.language}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>Image Domains</TableCell>
                <TableCell>
                  {Array.from(new Set(inputs.imageUrls?.map(url => getDomainFromUrl(url)) || [])).map((domain, idx) => (
                    <Badge key={idx} variant="secondary" className="mr-1 mb-1">{domain}</Badge>
                  ))}
                </TableCell>
              </TableRow>
              {inputs.error && (
                <TableRow>
                  <TableCell>Input Error</TableCell>
                  <TableCell className="text-destructive">{inputs.error}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-base">Processing Results</h4>
        {outputs.results && outputs.results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[25%]">Image</TableHead>
                  <TableHead scope="col" className="w-[15%]">Detected Language</TableHead>
                  <TableHead scope="col" className="w-[35%]">Generated Alt Text</TableHead>
                  <TableHead scope="col" className="w-[10%]">Character Count</TableHead>
                  <TableHead scope="col" className="w-[15%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.results.map((item, idx) => (
                  <TableRow key={idx} className={item.error ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="truncate text-sm" title={item.imageUrl}>
                          {getDomainFromUrl(item.imageUrl)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={item.imageUrl}>
                          {item.imageUrl.length > 50 ? `${item.imageUrl.substring(0, 47)}...` : item.imageUrl}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {!inputs.language && getDetectedLanguageFromUrl(item.imageUrl)}
                      {inputs.language && <span className="text-muted-foreground">→ {inputs.language}</span>}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap text-sm">
                      {item.altText || (item.error ? '—' : 'N/A')}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.altText ? (
                        <Badge variant="secondary">{item.altText.length}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {item.error ? (
                        <div className="space-y-1">
                          <Badge variant="destructive" className="mb-1">Failed</Badge>
                          <p className="text-xs text-destructive">{item.error}</p>
                        </div>
                      ) : (
                        <Badge variant="default">Success</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No output results found.</p>}
        
        {outputs.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Overall Error: {outputs.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Metadata Generator Types
interface MetadataInputs {
  urls: string[];
  language?: string;
  error?: string; // For rate limit errors
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
  error?: string; // For overall errors
}

const MetadataHistoryDisplay = ({ inputs, outputs }: { inputs: MetadataInputs, outputs: MetadataOutputs }) => {
  // Helper function to extract domain from URL
  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return 'Invalid URL';
    }
  };

  const successCount = outputs.results?.filter(r => r.metaTitle && !r.error).length || 0;
  const errorCount = outputs.results?.filter(r => r.error).length || 0;
  const totalCount = inputs.urls?.length || 0;

  // Calculate character lengths for SEO insights
  const getCharacterLengthBadge = (text: string | undefined, type: 'title' | 'description') => {
    if (!text) return null;
    const length = text.length;
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    
    if (type === 'title') {
      if (length > 60) variant = "destructive"; // Too long
      else if (length < 30) variant = "outline"; // Too short
      else variant = "default"; // Optimal
    } else if (type === 'description') {
      if (length > 160) variant = "destructive"; // Too long
      else if (length < 70) variant = "outline"; // Too short
      else variant = "default"; // Optimal
    }
    
    return <Badge variant={variant}>{length} chars</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-base">Run Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total URLs:</span>
            <p className="font-semibold text-lg">{totalCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Successful:</span>
            <p className="font-semibold text-lg text-green-600">{successCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Failed:</span>
            <p className="font-semibold text-lg text-red-600">{errorCount}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-base">Input Details</h4>
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
                <TableCell>Number of URLs</TableCell>
                <TableCell>{totalCount}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Language</TableCell>
                <TableCell className="font-medium">{inputs.language || 'en (default)'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Domains Processed</TableCell>
                <TableCell>
                  {Array.from(new Set(inputs.urls?.map(url => getDomainFromUrl(url)) || [])).map((domain, idx) => (
                    <Badge key={idx} variant="secondary" className="mr-1 mb-1">{domain}</Badge>
                  ))}
                </TableCell>
              </TableRow>
              {inputs.error && (
                <TableRow>
                  <TableCell>Input Error</TableCell>
                  <TableCell className="text-destructive">{inputs.error}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-base">SEO Metadata Results</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Title: 30-60 chars optimal | Description: 70-160 chars optimal
        </p>
        {outputs.results && outputs.results.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[20%]">URL</TableHead>
                  <TableHead scope="col" className="w-[25%]">Meta Title</TableHead>
                  <TableHead scope="col" className="w-[30%]">Meta Description</TableHead>
                  <TableHead scope="col" className="w-[15%]">Keywords</TableHead>
                  <TableHead scope="col" className="w-[10%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.results.map((item, idx) => (
                  <TableRow key={idx} className={item.error ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="truncate text-sm" title={item.url}>
                          {getDomainFromUrl(item.url)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={item.url}>
                          {item.url.length > 40 ? `${item.url.substring(0, 37)}...` : item.url}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.metaTitle ? (
                        <div className="space-y-1">
                          <p className="text-sm">{item.metaTitle}</p>
                          {getCharacterLengthBadge(item.metaTitle, 'title')}
                        </div>
                      ) : (item.error ? '—' : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {item.metaDescription ? (
                        <div className="space-y-1">
                          <p className="text-sm line-clamp-3">{item.metaDescription}</p>
                          {getCharacterLengthBadge(item.metaDescription, 'description')}
                        </div>
                      ) : (item.error ? '—' : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {item.keywords && item.keywords.length > 0 ? (
                        <div className="space-y-1">
                          {item.keywords.slice(0, 3).map(kw => (
                            <Badge key={kw} variant="secondary" className="mr-1 mb-1 text-xs">{kw}</Badge>
                          ))}
                          {item.keywords.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{item.keywords.length - 3} more</span>
                          )}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.error ? (
                        <div className="space-y-1">
                          <Badge variant="destructive" className="mb-1">Failed</Badge>
                          <p className="text-xs text-destructive">{item.error}</p>
                        </div>
                      ) : (
                        <Badge variant="default">Success</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No output results found.</p>}
        
        {outputs.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Overall Error: {outputs.error}</p>
          </div>
        )}
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
  // Helper function to get language name from code
  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      'en': 'English',
      'fr': 'French',
      'es': 'Spanish',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'ru': 'Russian',
      'hi': 'Hindi'
    };
    return languages[code] || code.toUpperCase();
  };

  // Helper function to get country name from code
  const getCountryName = (code: string) => {
    const countries: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'ES': 'Spain',
      'IT': 'Italy',
      'PT': 'Portugal',
      'NL': 'Netherlands',
      'JP': 'Japan',
      'CN': 'China',
      'KR': 'South Korea',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'CA': 'Canada',
      'AU': 'Australia'
    };
    return countries[code] || code;
  };

  // Calculate content lengths
  const originalLength = inputs.content?.length || 0;
  const transCreatedLength = status === 'success' && outputs.transCreatedContent ? 
    (outputs as ContentTranscreatorSuccessOutputs).transCreatedContent.length : 0;
  const lengthChange = transCreatedLength - originalLength;
  const lengthChangePercent = originalLength > 0 ? Math.round((lengthChange / originalLength) * 100) : 0;

  // Count words for better content analysis
  const countWords = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const originalWords = inputs.content ? countWords(inputs.content) : 0;
  const transCreatedWords = status === 'success' && outputs.transCreatedContent ? 
    countWords((outputs as ContentTranscreatorSuccessOutputs).transCreatedContent) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      {status === 'success' && outputs.transCreatedContent && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-base">Trans-creation Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Source Language:</span>
              <p className="font-semibold">{getLanguageName(inputs.sourceLanguage || 'en')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Target Language:</span>
              <p className="font-semibold">{getLanguageName((outputs as ContentTranscreatorSuccessOutputs).targetLanguage)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Target Market:</span>
              <p className="font-semibold">{getCountryName((outputs as ContentTranscreatorSuccessOutputs).targetCountry)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="default" className="mt-1">Success</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
            <div>
              <span className="text-muted-foreground">Original Content:</span>
              <p className="font-semibold">{originalWords} words ({originalLength} chars)</p>
            </div>
            <div>
              <span className="text-muted-foreground">Trans-created Content:</span>
              <p className="font-semibold">
                {transCreatedWords} words ({transCreatedLength} chars)
                {lengthChangePercent !== 0 && (
                  <span className={`ml-2 text-xs ${lengthChangePercent > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    ({lengthChangePercent > 0 ? '+' : ''}{lengthChangePercent}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2 text-base">Input Details</h4>
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
                <TableCell>Source Language</TableCell>
                <TableCell className="font-medium">
                  {getLanguageName(inputs.sourceLanguage || 'en')} ({inputs.sourceLanguage || 'en'})
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Target Brand ID</TableCell>
                <TableCell className="font-mono text-sm">{inputs.brand_id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Content Statistics</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p>{originalWords} words</p>
                    <p className="text-sm text-muted-foreground">{originalLength} characters</p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Original Content Preview</TableCell>
                <TableCell>
                  <div className="max-h-32 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">
                      {inputs.content.length > 500 ? 
                        `${inputs.content.substring(0, 500)}...` : 
                        inputs.content}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-base">Output Results</h4>
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
                    <TableCell>Target Language</TableCell>
                    <TableCell className="font-medium">
                      {getLanguageName((outputs as ContentTranscreatorSuccessOutputs).targetLanguage)} 
                      ({(outputs as ContentTranscreatorSuccessOutputs).targetLanguage})
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Target Market</TableCell>
                    <TableCell className="font-medium">
                      {getCountryName((outputs as ContentTranscreatorSuccessOutputs).targetCountry)} 
                      ({(outputs as ContentTranscreatorSuccessOutputs).targetCountry})
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Trans-created Statistics</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{transCreatedWords} words</p>
                        <p className="text-sm text-muted-foreground">{transCreatedLength} characters</p>
                        {lengthChangePercent !== 0 && (
                          <Badge variant={lengthChangePercent > 20 || lengthChangePercent < -20 ? "outline" : "secondary"}>
                            {lengthChangePercent > 0 ? '+' : ''}{lengthChangePercent}% length change
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <div className="space-y-2">
                        <p className="font-medium">Trans-created Content:</p>
                        <div className="bg-muted/30 rounded-md p-4 max-h-64 overflow-y-auto">
                          <p className="whitespace-pre-wrap text-sm">
                            {(outputs as ContentTranscreatorSuccessOutputs).transCreatedContent}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              )}
              {status === 'failure' && outputs.error && (
                <TableRow>
                  <TableCell>Error</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="destructive">Failed</Badge>
                      <p className="text-sm text-destructive">{(outputs as ContentTranscreatorFailureOutputs).error}</p>
                    </div>
                  </TableCell>
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
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    const fetchInitialData = async () => {
      setIsLoading(true);
      setIsLoadingUser(true); // Explicitly set user loading
      setError(null);

      // Fetch user first (can be done in parallel or sequence)
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError) throw userError;
        if (user) {
          // setCurrentUser({
          //   id: user.id,
          //   email: user.email,
          //   user_metadata: user.user_metadata
          // });
        } else {
          // No active session, or user is null
          // setCurrentUser(null);
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
        // setCurrentUser(null);
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
      <div className="space-y-6 bg-gray-50 min-h-screen">
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
      <div className="space-y-6 bg-gray-50 min-h-screen">
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
    <div className="space-y-6">
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
            Run executed on {formatDateTime(historyItem.run_at)}
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
            <AltTextHistoryDisplay inputs={historyItem.inputs as unknown as AltTextInputs} outputs={historyItem.outputs as unknown as AltTextOutputs} />
          ) : historyItem.tool_name === 'metadata_generator' && historyItem.inputs && historyItem.outputs ? (
            <MetadataHistoryDisplay inputs={historyItem.inputs as unknown as MetadataInputs} outputs={historyItem.outputs as unknown as MetadataOutputs} />
          ) : historyItem.tool_name === 'content_transcreator' && historyItem.inputs && historyItem.outputs ? (
            <ContentTranscreatorHistoryDisplay inputs={historyItem.inputs as unknown as ContentTranscreatorInputs} outputs={historyItem.outputs as unknown as ContentTranscreatorOutputs} status={historyItem.status as 'success' | 'failure'}/>
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