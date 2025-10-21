'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COUNTRIES, getLanguageLabel } from '@/lib/constants';
import { FileText as ContentIcon, GitFork as WorkflowIcon, Users, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Label } from "@/components/ui/label";
import RejectedContentList from '@/components/dashboard/brand/rejected-content-list';
import { PageHeader } from '@/components/dashboard/page-header';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

interface Brand {
  id: string;
  name: string;
  country?: string;
  language?: string;
  admins?: Array<{
    id: string;
    full_name?: string;
    email?: string;
  }>;
  company?: string;
  website_url?: string;
  brand_color?: string;
  master_claim_brand_name?: string;
  contentCount: number;
  workflowCount: number;
  brand_identity?: string;
  tone_of_voice?: string;
  guardrails?: string;
}

export function BrandDetailsClient({ brand, canEditBrand }: { brand: Brand, canEditBrand: boolean }) {
  const router = useRouter();
  const countryName = COUNTRIES.find(c => c.value === brand.country)?.label || brand.country || 'Not specified';
  const languageName = brand.language ? getLanguageLabel(brand.language) : 'Not specified';
  const brandAdmins = brand.admins || [];
  
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brands", href: "/dashboard/brands" },
    { label: brand?.name || brand.id },
  ];

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push('/dashboard/brands')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Brands
      </Button>
      
      <Breadcrumbs items={breadcrumbItems} />
      <PageHeader 
        title={brand.name}
        description={`Overview and details for ${brand.name}.`}
        actions={
          canEditBrand && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/brands/${brand.id}/edit`)}>
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
              <div><Label className="text-xs font-semibold text-muted-foreground">Name</Label><p>{brand.name}</p></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Company</Label><p>{brand.company || <span className="italic text-muted-foreground">Not specified</span>}</p></div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Website</Label>
                {brand.website_url ? (<Link href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{brand.website_url}</Link>) : (<p className="italic text-muted-foreground">Not specified</p>)}
              </div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Country</Label><p>{countryName}</p></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Language</Label><p>{languageName}</p></div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Brand Colour</Label>
                <div className="flex items-center gap-2">
                  {brand.brand_color ? <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: brand.brand_color }} /> : <div className="w-5 h-5 rounded-full border bg-muted" title="No colour set"/>}
                  <span className="text-sm">{brand.brand_color || 'Default'}</span>
                </div>
              </div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Master Claim Brand</Label><p>{brand.master_claim_brand_name || <span className="italic text-muted-foreground">Not associated</span>}</p></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Content Items</Label><p className="flex items-center"><ContentIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/> {brand.contentCount}</p></div>
              <div><Label className="text-xs font-semibold text-muted-foreground">Workflows</Label><p className="flex items-center"><WorkflowIcon className="mr-1.5 h-4 w-4 text-muted-foreground"/> {brand.workflowCount}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-muted-foreground" /> Brand Administrators</CardTitle>
            <CardDescription>Users with administrative roles for this brand. Manage assignments via the <Link href="/dashboard/users" className="text-primary hover:underline mx-1">Users</Link> page.</CardDescription>
          </CardHeader>
          <CardContent>
            {brandAdmins.length > 0 ? (
              <ul className="space-y-2">
                {brandAdmins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/60">
                    <div><span className="font-medium">{admin.full_name || 'N/A'}</span><span className="text-sm text-muted-foreground ml-2">({admin.email || 'No email'})</span></div>
                    <Button variant="outline" size="sm" asChild><Link href={`/dashboard/users/${admin.id}/edit`}>View User <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
                  </li>
                ))}
              </ul>
            ) : (<p className="text-sm text-muted-foreground">No administrators are currently assigned to this brand.</p>)}
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
            {(!brand.brand_identity && !brand.tone_of_voice && !brand.guardrails) && <p className="italic text-muted-foreground">No brand identity details have been specified.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>View content associated with {brand.name}. For full management, go to the main Content page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Displaying content list here is TBD. (Content Count: {brand.contentCount})</p>
            <Button asChild variant="link" className="px-0"><Link href={`/dashboard/content?brandId=${brand.id}`}>View All Content for this Brand</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>View workflows associated with {brand.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Displaying workflows list here is TBD. (Workflow Count: {brand.workflowCount})</p>
            <Button asChild variant="link" className="px-0"><Link href={`/dashboard/workflows?brandId=${brand.id}`}>View All Workflows for this Brand</Link></Button>
          </CardContent>
        </Card>

        {canEditBrand && (<RejectedContentList brandId={brand.id} />)}
      </div>
    </div>
  );
} 
