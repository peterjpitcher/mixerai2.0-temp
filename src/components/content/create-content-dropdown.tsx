'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Loader2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description?: string;
}

export function CreateContentDropdown() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/content-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load content templates');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (templates.length === 0) {
    return (
      <Button disabled>
        <AlertCircle className="mr-2 h-4 w-4" />
        No Templates Available
      </Button>
    );
  }

  // If only one template, go directly to it
  if (templates.length === 1) {
    return (
      <Button asChild>
        <Link href={`/dashboard/content/new?template=${templates[0].id}`}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Content
        </Link>
      </Button>
    );
  }

  // Multiple templates, show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Content
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Select a Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((template) => (
          <DropdownMenuItem key={template.id} asChild>
            <Link 
              href={`/dashboard/content/new?template=${template.id}`}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{template.name}</span>
                {template.description && (
                  <span className="text-xs text-muted-foreground">{template.description}</span>
                )}
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}