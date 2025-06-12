import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ContentGeneratorForm } from '@/components/content/content-generator-form';
import { AccessDenied } from '@/components/access-denied';

// This is now the main server component for the page route
export default async function NewContentPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userRole = user?.user_metadata?.role;
  const isAllowed = userRole === 'admin' || userRole === 'editor';

  if (!isAllowed) {
    return <AccessDenied message="You do not have permission to create new content." />;
  }

  const templateId = typeof searchParams.template === 'string' ? searchParams.template : undefined;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
       <Suspense fallback={<div>Loading form...</div>}>
         <ContentGeneratorForm key={templateId || 'no-template'} templateId={templateId} />
       </Suspense>
    </div>
  );
} 