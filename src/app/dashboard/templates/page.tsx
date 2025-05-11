'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Icons } from '@/components/icons';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/dropdown-menu';
import { useToast } from '@/components/toast-provider';

interface Template {
  id: string;
  name: string;
  description: string;
  fields: {
    inputFields: any[];
    outputFields: any[];
  };
  created_at?: string;
  created_by?: string;
}

/**
 * TemplatesPage component.
 * Displays a list of available content templates, allowing users to view, 
 * manage, and create new content based on these templates.
 */
export default function TemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        } else {
          setTemplates([]);
          if (!data.success) {
            toast({
              title: 'Error Loading Templates',
              description: data.error || 'An unknown error occurred while fetching templates.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load templates. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [toast]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <PageHeader
        title="Content Templates"
        description="Create and manage your content templates for AI-powered content generation"
        actions={
          <Link href="/dashboard/templates/new">
            <Button>
              <Icons.plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        }
      />
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">{template.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <Icons.moreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/templates/${template.id}`}>Edit template</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/content/new?template=${template.id}`}>Create content</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">
                    {template.fields.inputFields.length} input field{template.fields.inputFields.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline">
                    {template.fields.outputFields.length} output field{template.fields.outputFields.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
                <div className="w-full flex justify-between">
                  <span>{template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Custom Template'}</span>
                  <Link href={`/dashboard/templates/${template.id}`} className="text-primary hover:underline">
                    Edit Template
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {/* Empty state if no templates */}
          {templates.length === 0 && (
            <div className="col-span-3 text-center py-10">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Icons.file className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first template.</p>
              <Link href="/dashboard/templates/new">
                <Button>
                  <Icons.plus className="mr-2 h-4 w-4" />
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