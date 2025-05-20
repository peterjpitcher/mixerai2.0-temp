'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Separator } from '@/components/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { toast } from 'sonner';
import { Spinner } from '@/components/spinner';
import { AlertCircle, HelpCircleIcon, FileText as ContentIcon, GitFork as WorkflowIcon, ArchiveX } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Label } from "@/components/label";
import { createBrowserClient } from '@supabase/ssr';
import RejectedContentList from '@/components/dashboard/brand/rejected-content-list';

// export const metadata: Metadata = {
//   title: 'Brand Details | MixerAI 2.0', // Dynamic title would be set server-side ideally
//   description: 'View detailed information about a specific brand.',
// };

interface BrandDetailsProps {
  params: {
    id: string;
  };
}

// Define UserSessionData interface (if not already defined or imported)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; // Global role e.g., 'admin', 'editor'
    full_name?: string;
  };
  brand_permissions?: Array<{ // Brand-specific permissions
    brand_id: string;
    role: string; // e.g., 'brand_admin', 'editor', 'viewer' for that brand
  }>;
}

/**
 * BrandDetails page component.
 * Displays detailed information about a specific brand, including overview, brand identity,
 * associated content, and workflows, presented in a tabbed interface.
 */
export default function BrandDetails({ params }: BrandDetailsProps) {
  const router = useRouter();
  const { id } = params;
  
  const [brand, setBrand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null); // New state for full user object
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Added loading state for user

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          throw new Error('Failed to fetch user session');
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          // Optionally, handle error like redirecting to login if no user found
          toast.error(data.error || 'Could not verify your session.');
        }
      } catch (err: any) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + err.message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []); // Empty dependency array, runs once on mount
  
  useEffect(() => {
    const fetchBrandData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          let errorMsg = `Failed to fetch brand: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) errorMsg = errorData.error;
          } catch (e) { /* Ignore parsing error */ }
          throw new Error(errorMsg);
        }
        
        const data = await response.json();
        if (!data.success || !data.brand) {
          throw new Error(data.error || 'Brand data not found in API response');
        }
        
        setBrand(data.brand);
        setContentCount(data.contentCount || 0);
        setWorkflowCount(data.workflowCount || 0);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred while loading brand data.');
        toast.error('Failed to load brand details', { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchBrandData();
    } else {
      setError("Brand ID is missing from the URL.");
      setIsLoading(false);
    }
  }, [id]);
  
  if (isLoading || isLoadingUser) { // Check both brand and user loading
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))] p-4">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="text-muted-foreground mt-4">Loading brand details...</p>
      </div>
    );
  }
  
  if (error && !brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))] p-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Brand</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))] p-4 text-center">
        <HelpCircleIcon className="h-16 w-16 text-warning mb-4" />
        <h3 className="text-xl font-semibold mb-2">Brand Not Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          The brand you are looking for (ID: {id}) could not be found or may have been deleted.
        </p>
        <Button variant="outline" onClick={() => router.push('/dashboard/brands')}>Back to Brands List</Button>
      </div>
    );
  }
  
  // Define role booleans after currentUser and brand are loaded and not null
  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const isSpecificBrandAdmin = currentUser?.brand_permissions?.some(
    p => p.brand_id === id && p.role === 'brand_admin' // Assuming 'brand_admin' is the role name
  );
  const isEditorAssignedToThisBrand = 
    currentUser?.user_metadata?.role === 'editor' && 
    currentUser?.brand_permissions?.some(p => p.brand_id === id);

  const countryName = COUNTRIES.find(c => c.value === brand.country)?.label || brand.country || 'Not specified';
  const languageName = LANGUAGES.find(l => l.value === brand.language)?.label || brand.language || 'Not specified';
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 mb-6">
        <div className="flex items-center gap-4">
          <BrandIcon name={brand.name} color={brand.brand_color} size="lg" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{brand.name}</h1>
            <p className="text-muted-foreground">
              {countryName} &bull; {languageName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-auto">
          {(isGlobalAdmin || isSpecificBrandAdmin) && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/brands/${id}/edit`)}>
              Edit Brand
            </Button>
          )}
        </div>
      </header>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
          <TabsTrigger value="content">Content ({contentCount})</TabsTrigger>
          <TabsTrigger value="workflows">Workflows ({workflowCount})</TabsTrigger>
          {(isGlobalAdmin || isSpecificBrandAdmin) && (
            <TabsTrigger value="rejected">Rejected Content</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>Key information and statistics for {brand.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
                  <p>{brand.name}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Company</Label>
                  <p>{brand.company || <span className="italic text-muted-foreground">Not specified</span>}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Website</Label>
                  {brand.website_url ? (
                    <Link 
                      href={brand.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {brand.website_url}
                    </Link>
                  ) : (
                    <p className="italic text-muted-foreground">Not specified</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Country</Label>
                  <p>{countryName}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Language</Label>
                  <p>{languageName}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Brand Colour</Label>
                  <div className="flex items-center gap-2">
                    {brand.brand_color ? 
                      <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.brand_color }} /> 
                      : <div className="w-5 h-5 rounded-full border bg-muted" title="No colour set"/>
                    }
                    <p>{brand.brand_color || <span className="italic text-muted-foreground">Not specified</span>}</p>
                  </div>
                </div>
              </div>
              <Separator className="my-6" /> 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-semibold mb-1">Content Items</h3>
                  <p className="text-3xl font-bold text-primary">{contentCount}</p>
                  {contentCount > 0 && (
                    <Button variant="outline" className="mt-2" size="sm" onClick={() => router.push(`/dashboard/content?brandId=${id}`)}>
                      View All Content
                    </Button>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Associated Workflows</h3>
                  <p className="text-3xl font-bold text-primary">{workflowCount}</p>
                  {workflowCount > 0 && (
                    <Button variant="outline" className="mt-2" size="sm" onClick={() => router.push(`/dashboard/workflows?brandId=${id}`)}>
                      View All Workflows
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity Details</CardTitle>
              <CardDescription>The core voice, tone, and guidelines that define {brand.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[ { title: "Brand Identity", value: brand.brand_identity, placeholder: "No brand identity has been defined yet." },
                { title: "Tone of Voice", value: brand.tone_of_voice, placeholder: "No tone of voice has been defined yet." },
                { title: "Content Guardrails", value: brand.guardrails, placeholder: "No content guardrails have been defined yet." },
              ].map(item => (
                <div key={item.title}>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">{item.title}</Label>
                  <div className="p-4 rounded-md bg-muted min-h-[60px]">
                    {item.value ? (
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-sans break-words">{item.value}</pre> 
                    ) : (
                      <p className="text-muted-foreground italic text-sm">{item.placeholder}</p>
                    )}
                  </div>
                </div>
              ))}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Content Vetting Agencies</Label>
                <div className="p-4 rounded-md bg-muted min-h-[60px]">
                  {brand.selected_vetting_agencies && brand.selected_vetting_agencies.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {brand.selected_vetting_agencies.map((agency: { id: string; name: string; priority: number }) => (
                        <li key={agency.id} className="text-sm">
                          {agency.name}
                          {agency.priority === 1 && <span className="ml-2 text-xs font-semibold text-red-600">(High Priority)</span>}
                          {agency.priority === 2 && <span className="ml-2 text-xs font-semibold text-orange-500">(Medium Priority)</span>}
                          {agency.priority === 3 && <span className="ml-2 text-xs font-semibold text-blue-600">(Low Priority)</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No content vetting agencies specified.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>View and manage all content items associated with {brand.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {contentCount > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">This brand has {contentCount} piece{contentCount === 1 ? '' : 's'} of content.</p>
                  <Button onClick={() => router.push(`/dashboard/content?brandId=${id}`)}>
                    View All Brand Content
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ContentIcon className="mx-auto h-12 w-12 text-muted-foreground/70" /> 
                  <h3 className="mt-2 text-lg font-medium">No Content Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground mb-4">Get started by creating content for {brand.name}.</p>
                  {(isGlobalAdmin || isEditorAssignedToThisBrand) && (
                    <Button onClick={() => router.push(`/dashboard/content/new?brandId=${id}`)}>
                      Create First Content Item
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Management</CardTitle>
              <CardDescription>View and manage approval workflows associated with {brand.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {workflowCount > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">This brand has {workflowCount} associated workflow{workflowCount === 1 ? '' : 's'}.</p>
                  <Button onClick={() => router.push(`/dashboard/workflows?brandId=${id}`)}>
                    View Associated Workflows
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/70" /> 
                  <h3 className="mt-2 text-lg font-medium">No Workflows Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground mb-4">Create workflows to manage content approval for {brand.name}.</p>
                  {(isGlobalAdmin || isSpecificBrandAdmin) && (
                    <Button onClick={() => router.push(`/dashboard/workflows/new?brandId=${id}`)}>
                      Create First Workflow
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(isGlobalAdmin || isSpecificBrandAdmin) && (
          <TabsContent value="rejected">
            <RejectedContentList brandId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 