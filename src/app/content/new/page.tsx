'use client';

import { ContentGeneratorForm } from '@/components/content/content-generator-form';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Component to handle search params
function ContentFormWithParams() {
  const searchParams = useSearchParams();
  const contentType = searchParams?.get('type');
  
  return (
    <ContentGeneratorForm preselectedContentType={contentType || undefined} />
  );
}

export default function NewContentPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Content</h1>
          <p className="text-muted-foreground">
            Generate high-quality marketing content with AI
          </p>
        </div>
      </div>
      
      <Suspense fallback={<div>Loading form...</div>}>
        <ContentFormWithParams />
      </Suspense>
    </div>
  );
} 