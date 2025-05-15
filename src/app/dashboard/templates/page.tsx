'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/badge';
import { toast } from 'sonner';
import { Loader2, PlusCircle, LayoutTemplate, Edit3, FileTextIcon, MoreVertical, FileCog } from 'lucide-react';
import type { Metadata } from 'next';

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

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: any[];
    outputFields: any[];
  };
  usageCount?: number;
  created_at?: string;
  created_by?: string;
}

/**
 * TemplatesPage component.
 * Displays a list of available content templates, allowing users to view, 
 * manage, and create new content based on these templates.
 */
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        } else {
          setTemplates([]);
          if (!data.success) {
            toast.error('Error Loading Templates', {
              description: data.error || 'An unknown error occurred while fetching templates.',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load templates. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Content Templates" }]} />
      <PageHeader
        title="Content Templates"
        description="Create and manage your content templates for AI-powered content generation"
        actions={
          <Link href="/dashboard/templates/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        }
      />
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription className="mt-1 h-10 overflow-hidden text-ellipsis">
                    {template.description || 'No description provided.'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-2">
                <div className="space-y-2">
                  <Badge variant="outline" className="flex items-center w-fit">
                    <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                    {template.fields.inputFields.length} input field{template.fields.inputFields.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="flex items-center w-fit">
                    <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
                    {template.fields.outputFields.length} output field{template.fields.outputFields.length !== 1 ? 's' : ''}
                  </Badge>
                  <div className="text-sm text-muted-foreground pt-2">
                    Used: {template.usageCount !== undefined ? template.usageCount : '0'} time{template.usageCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-start gap-2">
                <Button variant="outline" size="sm" asChild title="Use this template to create content">
                  <Link href={`/dashboard/content/new?template=${template.id}`} className="flex items-center">
                    <PlusCircle className="mr-2 h-4 w-4" /> Use Template
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild title="Edit this template">
                  <Link href={`/dashboard/templates/${template.id}`} className="flex items-center">
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {/* Empty state if no templates */}
          {templates.length === 0 && (
            <div className="col-span-3 text-center py-10">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileTextIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first template.</p>
              <Link href="/dashboard/templates/new">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 