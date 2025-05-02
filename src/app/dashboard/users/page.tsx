'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page redirects to the main /users page
 * The dashboard route group is no longer used for users management
 */
export default function DashboardUsersRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/users');
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p>Redirecting to users page...</p>
      </div>
    </div>
  );
} 