import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BrandDetailsClient } from '@/components/dashboard/brand/brand-details-client';
import { AccessDenied } from '@/components/access-denied';
import { notFound } from 'next/navigation';

interface BrandDetailsPageProps {
  params: {
    id: string;
  };
}

interface BrandFromRPC {
  id: string;
  name: string;
  admins: { id: string }[];
  editors?: { id: string }[];
  [key: string]: any;
}

export default async function BrandDetailsPage({ params }: BrandDetailsPageProps) {
  const supabase = createSupabaseServerClient();
  const { id: brandId } = params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This case should ideally be handled by middleware, but as a safeguard:
    return <AccessDenied message="You must be logged in to view this page." />;
  }

  // Fetch brand details using the efficient RPC
  const { data, error: rpcError } = await supabase
    .rpc('get_brand_details_by_id', { p_brand_id: brandId })
    .single();

  if (rpcError || !data || typeof data !== 'object') {
    // Handle RPC error or brand not found
    notFound();
  }

  const brand = data as BrandFromRPC;

  // Authorization check
  const isGlobalAdmin = user.user_metadata?.role === 'admin';
  const hasBrandPermission = brand.admins?.some((admin: any) => admin.id === user.id) || 
                             brand.editors?.some((editor: any) => editor.id === user.id); // Assuming editors might exist

  if (!isGlobalAdmin && !hasBrandPermission) {
    return <AccessDenied message="You do not have permission to view this brand." />;
  }

  const canEditBrand = isGlobalAdmin || brand.admins?.some((admin: any) => admin.id === user.id);

  return <BrandDetailsClient brand={brand} canEditBrand={canEditBrand} />;
} 