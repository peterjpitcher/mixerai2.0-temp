'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { PageHeader } from '@/components/dashboard/page-header';
import { Loader2, ArrowLeft, Building2, Package, Sprout, Globe, ShieldCheck, ShieldOff, ShieldAlert, ShieldQuestion, FileText, WorkflowIcon } from 'lucide-react';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ClaimDetailPageProps {
  params: {
    id: string;
  };
}

type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory' | 'conditional';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  master_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  workflow_id?: string | null;
  workflow_status?: string | null;
  current_workflow_step?: string | null;
}

interface RelatedEntity {
  id: string;
  name: string;
  type: 'brand' | 'product' | 'ingredient';
}

const claimTypeConfig: Record<ClaimTypeEnum, { icon: JSX.Element; label: string; color: string }> = {
  allowed: { icon: <ShieldCheck className="h-5 w-5" />, label: 'Allowed', color: 'text-green-600' },
  disallowed: { icon: <ShieldOff className="h-5 w-5" />, label: 'Disallowed', color: 'text-red-600' },
  mandatory: { icon: <ShieldAlert className="h-5 w-5" />, label: 'Mandatory', color: 'text-blue-600' },
  conditional: { icon: <ShieldQuestion className="h-5 w-5" />, label: 'Conditional', color: 'text-yellow-600' },
};

const levelConfig: Record<ClaimLevelEnum, { icon: JSX.Element; label: string }> = {
  brand: { icon: <Building2 className="h-5 w-5" />, label: 'Brand Level' },
  product: { icon: <Package className="h-5 w-5" />, label: 'Product Level' },
  ingredient: { icon: <Sprout className="h-5 w-5" />, label: 'Ingredient Level' },
};

export default function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const router = useRouter();
  const { id } = params;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [relatedEntity, setRelatedEntity] = useState<RelatedEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaimDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch claim details
        const claimResponse = await fetch(`/api/claims/${id}`);
        const claimData = await claimResponse.json();
        
        if (!claimResponse.ok || !claimData.success) {
          throw new Error(claimData.error || 'Failed to fetch claim details');
        }
        
        setClaim(claimData.data);
        
        // Fetch related entity details based on claim level
        if (claimData.data.level === 'brand' && claimData.data.master_brand_id) {
          const brandResponse = await fetch(`/api/master-claim-brands/${claimData.data.master_brand_id}`);
          const brandData = await brandResponse.json();
          if (brandData.success) {
            setRelatedEntity({ ...brandData.data, type: 'brand' });
          }
        } else if (claimData.data.level === 'product' && claimData.data.product_id) {
          const productResponse = await fetch(`/api/products/${claimData.data.product_id}`);
          const productData = await productResponse.json();
          if (productData.success) {
            setRelatedEntity({ ...productData.data, type: 'product' });
          }
        } else if (claimData.data.level === 'ingredient' && claimData.data.ingredient_id) {
          const ingredientResponse = await fetch(`/api/ingredients/${claimData.data.ingredient_id}`);
          const ingredientData = await ingredientResponse.json();
          if (ingredientData.success) {
            setRelatedEntity({ ...ingredientData.data, type: 'ingredient' });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load claim details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaimDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Claim not found'}</p>
          </CardContent>
          <CardContent className="pt-0">
            <Button onClick={() => router.push('/dashboard/claims')} variant="outline">
              Back to Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = claimTypeConfig[claim.claim_type];
  const levelInfo = levelConfig[claim.level];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "View Claim" }
      ]} />

      <PageHeader
        title="Claim Details"
        description="View detailed information about this claim"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/claims">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Claims
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Claim Information */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Information</CardTitle>
            <CardDescription>Core details about this claim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Claim Text</h4>
              <p className="text-lg font-medium">{claim.claim_text}</p>
            </div>

            {claim.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{claim.description}</p>
              </div>
            )}

            <div className="flex gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Type</h4>
                <div className={`flex items-center gap-2 ${typeConfig.color}`}>
                  {typeConfig.icon}
                  <span className="font-medium">{typeConfig.label}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Level</h4>
                <div className="flex items-center gap-2">
                  {levelInfo.icon}
                  <span className="font-medium">{levelInfo.label}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Country</h4>
              <Badge variant="secondary">
                <Globe className="mr-1 h-3 w-3" />
                {claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE ? 'Global' : claim.country_code}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Related Entity Information */}
        <Card>
          <CardHeader>
            <CardTitle>Related Entity</CardTitle>
            <CardDescription>The {claim.level} this claim applies to</CardDescription>
          </CardHeader>
          <CardContent>
            {relatedEntity ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {relatedEntity.type === 'brand' && <Building2 className="h-8 w-8 text-purple-500" />}
                  {relatedEntity.type === 'product' && <Package className="h-8 w-8 text-orange-500" />}
                  {relatedEntity.type === 'ingredient' && <Sprout className="h-8 w-8 text-teal-500" />}
                  <div>
                    <p className="font-medium text-lg">{relatedEntity.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{relatedEntity.type}</p>
                  </div>
                </div>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href={
                    relatedEntity.type === 'brand' 
                      ? `/dashboard/claims/brands/${relatedEntity.id}` 
                      : relatedEntity.type === 'product'
                      ? `/dashboard/claims/products/${relatedEntity.id}/edit`
                      : `/dashboard/claims/ingredients/${relatedEntity.id}/edit`
                  }>
                    {relatedEntity.type === 'brand' ? 'View' : 'Edit'} {relatedEntity.type.charAt(0).toUpperCase() + relatedEntity.type.slice(1)} Details
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No related entity found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Status */}
        {claim.workflow_id && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow Status</CardTitle>
              <CardDescription>Current approval workflow information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WorkflowIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Status:</span>
                </div>
                <Badge 
                  variant={
                    claim.workflow_status === 'approved' ? 'default' :
                    claim.workflow_status === 'rejected' ? 'destructive' :
                    claim.workflow_status === 'pending_review' ? 'secondary' :
                    'outline'
                  }
                >
                  {claim.workflow_status || 'Unknown'}
                </Badge>
              </div>

              {claim.current_workflow_step && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Step</h4>
                  <p className="text-sm">{claim.current_workflow_step}</p>
                </div>
              )}

              <Button variant="outline" asChild className="w-full">
                <Link href={`/dashboard/claims/workflows/${claim.workflow_id}`}>
                  View Workflow Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>System information about this claim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Claim ID</span>
              <span className="text-sm font-mono">{claim.id}</span>
            </div>
            
            {claim.created_at && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{format(new Date(claim.created_at), 'PPp')}</span>
              </div>
            )}
            
            {claim.updated_at && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm">{format(new Date(claim.updated_at), 'PPp')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
