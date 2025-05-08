'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Icons } from '@/components/icons';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/dropdown-menu';
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

// Mock templates for development environment
const mockTemplates = [
  {
    id: "mock-template-1",
    name: "Mock Blog Template",
    description: "A template for creating blog posts with introduction, body and conclusion",
    fields: {
      inputFields: [
        { id: "title", name: "Title", type: "shortText", required: true, options: {} },
        { id: "keywords", name: "Keywords", type: "tags", required: false, options: {} },
        { id: "topic", name: "Topic", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "content", 
          name: "Blog Content", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a blog post about {{topic}} using the keywords {{keywords}}"
        },
        { 
          id: "meta", 
          name: "Meta Description", 
          type: "plainText", 
          required: false, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a meta description for a blog about {{topic}}"
        }
      ]
    },
    created_at: "2023-06-15T14:30:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  },
  {
    id: "mock-template-2",
    name: "Mock Email Template",
    description: "A template for marketing emails with subject line and body",
    fields: {
      inputFields: [
        { id: "campaign", name: "Campaign Name", type: "shortText", required: true, options: {} },
        { id: "audience", name: "Target Audience", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "subject", 
          name: "Email Subject", 
          type: "shortText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an attention-grabbing email subject line for a {{campaign}} campaign targeting {{audience}}"
        },
        { 
          id: "body", 
          name: "Email Body", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an engaging email body for a {{campaign}} campaign targeting {{audience}}"
        }
      ]
    },
    created_at: "2023-07-22T09:15:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  }
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        
        // In development mode, use the mock data directly
        if (process.env.NODE_ENV === 'development') {
          console.log('Templates page: Using mock templates in development mode');
          setCustomTemplates(mockTemplates);
          setIsLoading(false);
          return;
        }
        
        // In production, fetch from API
        console.log('Templates page: Fetching templates from API');
        const response = await fetch('/api/content-templates');
        const data = await response.json();
        
        console.log('Templates response:', data);
        
        if (data.success && Array.isArray(data.templates)) {
          setCustomTemplates(data.templates);
        } else {
          console.error('Failed to get templates:', data.error || 'Unknown error');
          setCustomTemplates([]);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
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
          {/* System Default Templates */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-medium">Article Template</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">Create blog posts, articles, and other long-form content with customizable sections</CardDescription>
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
                      <Link href="/dashboard/templates/article-template">Edit template</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/content/new?template=article-template">Create content</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">3 input fields</Badge>
                <Badge variant="outline">2 output fields</Badge>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
              <div className="w-full flex justify-between">
                <span>System Default</span>
                <Link href="/dashboard/templates/article-template" className="text-primary hover:underline">
                  Edit Template
                </Link>
              </div>
            </CardFooter>
          </Card>
          
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-medium">Product Template</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">Generate product descriptions with features, benefits and target audience</CardDescription>
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
                      <Link href="/dashboard/templates/product-template">Edit template</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/content/new?template=product-template">Create content</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">4 input fields</Badge>
                <Badge variant="outline">3 output fields</Badge>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
              <div className="w-full flex justify-between">
                <span>System Default</span>
                <Link href="/dashboard/templates/product-template" className="text-primary hover:underline">
                  Edit Template
                </Link>
              </div>
            </CardFooter>
          </Card>
          
          {/* Custom Templates */}
          {customTemplates.map(template => (
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          // Add delete functionality here
                        }}
                      >
                        Delete template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{template.fields.inputFields.length} input fields</Badge>
                  <Badge variant="outline">{template.fields.outputFields.length} output fields</Badge>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
                <div className="w-full flex justify-between">
                  <span>Custom Template</span>
                  <Link href={`/dashboard/templates/${template.id}`} className="text-primary hover:underline">
                    Edit Template
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {/* Create Template Card */}
          <Link href="/dashboard/templates/new" className="flex">
            <Card className="flex flex-col items-center justify-center w-full h-full min-h-[200px] border-dashed">
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-3">
                  <Icons.plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Create Custom Template</h3>
                <p className="text-sm text-muted-foreground">Design a custom template for your specific content needs</p>
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
} 