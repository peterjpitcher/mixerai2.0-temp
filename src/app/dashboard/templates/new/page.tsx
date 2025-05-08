import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { Icons } from '@/components/icons';
import { DebugComponent } from './debug';

export const metadata: Metadata = {
  title: 'Create Template | MixerAI',
  description: 'Create a new content template',
};

export default function NewTemplatePage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <DebugComponent />
      <PageHeader
        title="Create Template"
        description="Design a new content template with custom fields"
        actions={
          <Link href="/dashboard/templates">
            <Button variant="outline">
              <Icons.chevronLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </Link>
        }
      />
      
      <TemplateForm />
    </div>
  );
} 