'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page redirects to the new brand creation page
 */
export default function BrandCreateRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/brands/new');
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p>Redirecting to new brand creation page...</p>
      </div>
    </div>
  );
} 