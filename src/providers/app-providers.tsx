'use client';

import { QueryProvider } from './query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { BrandProvider } from '@/contexts/brand-context';
import { CSRFInitializer } from '@/components/csrf-initializer';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrandProvider>
          <CSRFInitializer />
          {children}
        </BrandProvider>
      </AuthProvider>
    </QueryProvider>
  );
}