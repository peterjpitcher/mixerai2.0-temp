'use client';

// DEPRECATION NOTICE: The claims dashboard section is slated for removal; avoid referencing or extending it.
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

import { ProductClaimsAnnouncement } from '@/components/dashboard/claims/product-claims-announcement';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { useBrands } from '@/contexts/brand-context';
import { deriveRoleFlags } from '@/components/layout/unified-navigation-v2';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ClaimsLayout({ children }: { children: ReactNode }) {
  const { user, isLoading: isLoadingUser } = useAuth();
  const { brands, isLoading: isLoadingBrands } = useBrands();
  const { isGlobalAdmin, hasBrandPermission } = usePermissions();

  const roleFlags = useMemo(
    () =>
      deriveRoleFlags({
        user,
        isGlobalAdmin,
        brands,
        hasBrandPermission,
      }),
    [user, isGlobalAdmin, brands, hasBrandPermission],
  );

  const hasClaimsBrandAccess = useMemo(() => {
    const permissions = user?.brand_permissions ?? [];
    return permissions.some((permission) => permission.brand?.master_claim_brand_id);
  }, [user]);

  const canAccessClaims = roleFlags.isPlatformAdmin || roleFlags.isScopedAdmin || hasClaimsBrandAccess;

  if (isLoadingUser || isLoadingBrands) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessClaims) {
    return (
      <Alert variant="destructive" className="mb-6">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access restricted</AlertTitle>
        <AlertDescription>
          Claims management requires brand admin access for a brand with claims enabled. Please contact an administrator
          if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-6">
        <ProductClaimsAnnouncement />
      </div>
      {children}
    </>
  );
}
