'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Separator } from '@/components/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { toast } from 'sonner';

interface BrandDetailsProps {
  params: {
    id: string;
  };
}

export default function BrandDetails({ params }: BrandDetailsProps) {
  const router = useRouter();
  const { id } = params;
  
  const [brand, setBrand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  
  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        // Fetch brand data
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch brand: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch brand data');
        }
        
        setBrand(data.brand);
        setContentCount(data.contentCount || 0);
        setWorkflowCount(data.workflowCount || 0);
      } catch (error) {
        console.error('Error loading brand data:', error);
        setError((error as Error).message);
        toast.error('Failed to load brand details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrandData();
  }, [id]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading brand details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Brand</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  // Not found state
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-amber-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Brand Not Found</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">The brand you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push('/dashboard/brands')}>Back to Brands</Button>
      </div>
    );
  }
  
  const countryName = COUNTRIES.find(c => c.value === brand.country)?.label || brand.country || 'Unknown';
  const languageName = LANGUAGES.find(l => l.value === brand.language)?.label || brand.language || 'Unknown';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandIcon name={brand.name} color={brand.brand_color} size="lg" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
            <p className="text-muted-foreground">
              {countryName} • {languageName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/brands/${id}/edit`)}>
            Edit Brand
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/brands')}>
            Back to Brands
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Overview</CardTitle>
              <CardDescription>Key information about {brand.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                    <p className="text-base">{brand.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                    <p className="text-base">{brand.company || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                    {brand.website_url ? (
                      <a 
                        href={brand.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-base text-blue-600 hover:underline"
                      >
                        {brand.website_url}
                      </a>
                    ) : (
                      <p className="text-base text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Country</h3>
                    <p className="text-base">{countryName}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Language</h3>
                    <p className="text-base">{languageName}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Brand Color</h3>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full" 
                        style={{ backgroundColor: brand.brand_color || '#3498db' }} 
                      />
                      <p className="text-base">{brand.brand_color || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Content</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">{contentCount}</div>
                    <span className="text-muted-foreground">content items</span>
                  </div>
                  {contentCount > 0 && (
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      size="sm"
                      onClick={() => router.push(`/dashboard/content?brandId=${id}`)}
                    >
                      View Content
                    </Button>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Workflows</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-semibold">{workflowCount}</div>
                    <span className="text-muted-foreground">workflows</span>
                  </div>
                  {workflowCount > 0 && (
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      size="sm"
                      onClick={() => router.push(`/dashboard/workflows?brandId=${id}`)}
                    >
                      View Workflows
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Voice, tone, and brand guidelines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Brand Identity</h3>
                <div className="p-4 rounded-md bg-muted">
                  {brand.brand_identity ? (
                    <p className="whitespace-pre-line">{brand.brand_identity}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No brand identity defined</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Tone of Voice</h3>
                <div className="p-4 rounded-md bg-muted">
                  {brand.tone_of_voice ? (
                    <p className="whitespace-pre-line">{brand.tone_of_voice}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No tone of voice defined</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Content Guardrails</h3>
                <div className="p-4 rounded-md bg-muted">
                  {brand.guardrails ? (
                    <p className="whitespace-pre-line">{brand.guardrails}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No content guardrails defined</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Content Vetting Agencies</h3>
                <div className="p-4 rounded-md bg-muted">
                  {brand.content_vetting_agencies ? (
                    <p className="whitespace-pre-line">{brand.content_vetting_agencies}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No content vetting agencies defined</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Content items for this brand</CardDescription>
            </CardHeader>
            <CardContent>
              {contentCount > 0 ? (
                <div className="space-y-4">
                  <p>This brand has {contentCount} content items.</p>
                  <Button onClick={() => router.push(`/dashboard/content?brandId=${id}`)}>
                    View All Content
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No content has been created for this brand yet.</p>
                  <Button onClick={() => router.push(`/dashboard/content/new?brandId=${id}`)}>
                    Create Content
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
              <CardDescription>Approval workflows for this brand</CardDescription>
            </CardHeader>
            <CardContent>
              {workflowCount > 0 ? (
                <div className="space-y-4">
                  <p>This brand has {workflowCount} workflows.</p>
                  <Button onClick={() => router.push(`/dashboard/workflows?brandId=${id}`)}>
                    View All Workflows
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No workflows have been created for this brand yet.</p>
                  <Button onClick={() => router.push(`/dashboard/workflows/new?brandId=${id}`)}>
                    Create Workflow
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 