'use client';

import { ContentGeneratorForm } from '@/components/content/content-generator-form';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/skeleton';

// Define UserSessionData interface (mirroring what /api/me is expected to return)
// This should ideally be in a shared types file, e.g., src/types/auth.ts or src/types/models.ts
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
    avatar_url?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; 
  }>;
  avatar_url?: string; 
  full_name?: string; 
}

// Component to handle search params - this is a client component that uses useSearchParams()
function ContentFormWithParams() {
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('template');
  
  useEffect(() => {
    // console.log('ContentFormWithParams: Search params received');
    // console.log('- Template ID:', templateId);
    
    // Log all search params for debugging
    // const allParams: Record<string, string> = {};
    // searchParams?.forEach((value, key) => {
    //   allParams[key] = value;
    // });
    // console.log('- All URL params:', allParams);
  }, [templateId, searchParams]);
  
  return (
    <ContentGeneratorForm 
      templateId={templateId || undefined}
    />
  );
}

// PageContent component that handles the page content structure
function PageContent() {
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      setIsCheckingPermissions(true);
      setUserError(null);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          const userRole = data.user.user_metadata?.role;
          if (userRole === 'admin' || userRole === 'editor') {
            setIsAllowed(true);
          } else {
            setIsAllowed(false);
          }
        } else {
          setCurrentUser(null);
          setIsAllowed(false);
          setUserError(data.error || 'User data not found in session.');
        }
      } catch (error: any) {
        console.error('Error fetching current user:', error);
        setCurrentUser(null);
        setIsAllowed(false);
        setUserError(error.message || 'An unexpected error occurred.');
      } finally {
        setIsLoadingUser(false);
        setIsCheckingPermissions(false);
      }
    };
    fetchCurrentUser();
  }, []);

  if (isLoadingUser || isCheckingPermissions) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-12 w-1/4 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAllowed) {
    // Inline AccessDenied message
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        {/* Consider adding an icon like ShieldAlert from lucide-react if available/desired */}
        <h3 className="text-xl font-semibold mb-2 text-destructive">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to create new content.</p>
        {/* Optionally, add a button to go back or to dashboard */}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ContentFormWithParams />
    </div>
  );
}

// Main page component that uses Suspense properly
export default function NewContentPage() {
  return (
    <Suspense fallback={
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <span className="ml-3">Loading content tools...</span>
        </div>
      </div>
    }>
      <PageContent />
    </Suspense>
  );
} 