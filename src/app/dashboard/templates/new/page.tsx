import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Template | MixerAI 2.0',
  description: 'Create a new content template.',
};

/**
 * NewTemplatePage provides a user interface for creating new content templates.
 * It utilizes the `TemplateForm` component for the actual form fields and logic.
 * A `PageHeader` provides context and navigation back to the templates list.
 */
export default function NewTemplatePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Create Template"
        description="Design a new content template with custom fields."
        actions={
          <Link href="/dashboard/templates">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </Link>
        }
      />
      
      <TemplateForm />
    </div>
  );
} 