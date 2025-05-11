'use client';

import { ContentGeneratorForm } from '@/components/content/content-generator-form';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

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
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Content from Template
          </h1>
          <p className="text-muted-foreground">
            Generate high-quality content with AI assistance using a template.
          </p>
        </div>
      </div>
      
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