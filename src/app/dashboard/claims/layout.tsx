import type { ReactNode } from 'react';
import { ProductClaimsAnnouncement } from '@/components/dashboard/claims/product-claims-announcement';

export default function ClaimsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mb-6">
        <ProductClaimsAnnouncement />
      </div>
      {children}
    </>
  );
}
