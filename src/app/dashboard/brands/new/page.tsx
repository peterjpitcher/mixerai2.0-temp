'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';

// Metadata for a redirecting page might be minimal or not strictly necessary
// as user shouldn't spend time here.
// export const metadata: Metadata = {
//   title: 'Creating New Brand | MixerAI 2.0',
//   description: 'Redirecting to the brand creation page.',
// };

/**
 * BrandCreateRedirect component.
 * This page component currently redirects the user from '/dashboard/brands/new' 
 * to '/brands/new'. The target path '/brands/new' is likely subject to further
 * global redirects (e.g., to an actual form page under '/dashboard/brands/...').
 * Displays a loading spinner during the client-side redirect.
 */
export default function BrandCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // TODO: Review and update redirect target. 
    // Should ideally point directly to the actual new brand form page, 
    // e.g., '/dashboard/brands/create-form' or similar, to avoid multiple hops.
    router.replace('/brands/new'); 
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,theme(spacing.16)))]"> {/* Adjusted height considering header */}
      <div className="flex flex-col items-center space-y-4 p-8 bg-card text-card-foreground rounded-lg shadow-md">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">Redirecting to the brand creation page...</p>
      </div>
    </div>
  );
} 