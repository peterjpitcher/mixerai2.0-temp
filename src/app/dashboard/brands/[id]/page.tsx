'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 as Spinner } from 'lucide-react';
import { AlertCircle, HelpCircleIcon, FileText as ContentIcon, GitFork as WorkflowIcon, ArchiveX, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Label } from "@/components/ui/label";
import RejectedContentList from '@/components/dashboard/brand/rejected-content-list';
import { PageHeader } from '@/components/dashboard/page-header';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

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
    role: string; // e.g., 'admin', 'editor', 'viewer' for that brand
  }>;
}

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
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

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brands", href: "/dashboard/brands" },
    { label: brand?.name || id },
  ];

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
        <Spinner className="h-12 w-12 text-primary animate-spin" />
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
    p => p.brand_id === id && p.role === 'admin' // Assuming 'admin' is the role name
  );
  const isEditorAssignedToThisBrand = 
    currentUser?.user_metadata?.role === 'editor' && 
    currentUser?.brand_permissions?.some(p => p.brand_id === id);

  const countryName = COUNTRIES.find(c => c.value === brand.country)?.label || brand.country || 'Not specified';
  const languageName = LANGUAGES.find(l => l.value === brand.language)?.label || brand.language || 'Not specified';
  const brandAdmins: AdminUser[] = brand.admins || [];
  
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Breadcrumbs items={breadcrumbItems} />
      <PageHeader 
        title={brand.name}
        description={`Overview and details for ${brand.name}.`}
        actions={
          (isGlobalAdmin || isSpecificBrandAdmin) && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/brands/${id}/edit`)}>
              Edit Brand
            </Button>
          )
        }
      />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brand Overview</CardTitle>
            <CardDescription>Key information, statistics, and connections for {brand.name}.</CardDescription>
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
                  <span className="text-sm">{brand.brand_color || 'Default'}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Master Claim Brand</Label>
                <p>{brand.master_claim_brand_name || <span className="italic text-muted-foreground">Not associated</span>}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Content Items</Label>
                <p className="flex items-center"><ContentIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/> {contentCount}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Workflows</Label>
                <p className="flex items-center"><WorkflowIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/> {workflowCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" /> Brand Administrators</CardTitle>
            <CardDescription>
              Users with administrative roles for this brand. Manage assignments via the 
              <Link href="/dashboard/users" className="text-primary hover:underline mx-1">Users</Link> page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {brandAdmins.length > 0 ? (
              <ul className="space-y-2">
                {brandAdmins.map(admin => (
                  <li key={admin.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/60">
                    <div>
                      <span className="font-medium">{admin.full_name || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground ml-2">({admin.email || 'No email'})</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/users/${admin.id}/edit`}>
                        View User <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No administrators are currently assigned to this brand.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Identity</CardTitle>
            <CardDescription>Voice, style, and guardrails defined for {brand.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 prose prose-sm dark:prose-invert max-w-none">
            {brand.brand_identity && (<div><h4>Brand Identity</h4><p>{brand.brand_identity}</p></div>)}
            {brand.tone_of_voice && (<div><h4>Tone of Voice</h4><p>{brand.tone_of_voice}</p></div>)}
            {brand.guardrails && (<div><h4>Guardrails</h4><p>{brand.guardrails}</p></div>)}
            {(!brand.brand_identity && !brand.tone_of_voice && !brand.guardrails) && 
              <p className="italic text-muted-foreground">No brand identity details have been specified.</p>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>View content associated with {brand.name}. For full management, go to the main Content page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Displaying content list here is TBD. (Content Count: {contentCount})</p>
            <Button asChild variant="link" className="px-0">
              <Link href={`/dashboard/content?brandId=${id}`}>View All Content for this Brand</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>View workflows associated with {brand.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Displaying workflows list here is TBD. (Workflow Count: {workflowCount})</p>
            <Button asChild variant="link" className="px-0">
              <Link href={`/dashboard/workflows?brandId=${id}`}>View All Workflows for this Brand</Link>
            </Button>
          </CardContent>
        </Card>

        {(isGlobalAdmin || isSpecificBrandAdmin) && (
          <RejectedContentList brandId={id} />
        )}
      </div>
    </div>
  );
} 