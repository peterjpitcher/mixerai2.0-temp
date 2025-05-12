import { Suspense } from 'react';
import ContentPageClient from './content-page-client';

// Simple loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="py-10 flex justify-center items-center min-h-[300px]">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading content page...</p>
      </div>
    </div>
  );
}

// This is now the main server component for the page route
export default function ContentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ContentPageClient />
    </Suspense>
  );
} 