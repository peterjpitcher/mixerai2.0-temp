'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BrandEditRedirectProps {
  params: {
    id: string;
  };
}

/**
 * This page redirects to the dashboard brand edit page
 */
export default function BrandEditRedirect({ params }: BrandEditRedirectProps) {
  const router = useRouter();
  const { id } = params;
  
  useEffect(() => {
    router.replace(`/dashboard/brands/${id}/edit`);
  }, [router, id]);
  
  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p>Redirecting to brand edit page...</p>
      </div>
    </div>
  );
} 