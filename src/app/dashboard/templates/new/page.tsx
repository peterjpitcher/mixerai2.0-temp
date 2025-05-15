import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Template | MixerAI',
  description: 'Create a new content template.',
};

// Placeholder Breadcrumbs component - replace with actual implementation later
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

/**
 * NewTemplatePage provides a user interface for creating new content templates.
 * It utilizes the `TemplateForm` component for the actual form fields and logic.
 * A `PageHeader` provides context and navigation back to the templates list.
 */
export default function NewTemplatePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: "Create New Template" }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <Link href="/dashboard/templates" passHref>
                <Button variant="outline" size="icon" aria-label="Back to Templates">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
                <p className="text-muted-foreground mt-1">Design a new content template with custom fields.</p>
            </div>
        </div>
      </div>

      <TemplateForm />
    </div>
  );
} 