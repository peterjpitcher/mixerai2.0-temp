'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { Plus, Search, Trash2, Eye, Edit3 } from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';

// export const metadata: Metadata = {
//   title: 'Manage Workflows | MixerAI 2.0',
//   description: 'View, search, and manage content approval workflows for your brands.',
// };

interface WorkflowFromAPI {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  template_id?: string | null;
  template_name?: string | null;
  steps: any[];
  steps_count: number;
  content_count: number;
  created_at: string;
  updated_at: string;
}

interface GroupedWorkflows {
  [key: string]: {
    brand_name: string;
    brand_color?: string;
    workflows: WorkflowFromAPI[];
  }
}

/**
 * WorkflowsPage displays a list of all content approval workflows, grouped by brand.
 * It allows users to search for workflows and provides navigation to create new ones,
 * or view/edit existing ones. Each workflow card shows its name, content type, 
 * step count, and usage by content items.
 */
export default function WorkflowsPage() {
  const [allWorkflows, setAllWorkflows] = useState<WorkflowFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchWorkflows = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/workflows');
        const apiResponse = await response.json();
        
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'Failed to fetch workflows');
        }
        
        setAllWorkflows(apiResponse.data || []);
      } catch (err) {
        // console.error('Error loading workflows:', err);
        const errorMessage = (err instanceof Error) ? err.message : 'Failed to load workflows. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflows();
  }, []);
  
  const filteredWorkflowsList = allWorkflows.filter(workflow => 
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workflow.template_name && workflow.template_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupWorkflowsByBrand = (workflowsToGroup: WorkflowFromAPI[]) => {
    const grouped: GroupedWorkflows = {};
    workflowsToGroup.forEach(workflow => {
      const brandKey = workflow.brand_name || 'Unknown Brand';
      if (!grouped[brandKey]) {
        grouped[brandKey] = {
          brand_name: brandKey,
          brand_color: workflow.brand_color,
          workflows: []
        };
      }
      grouped[brandKey].workflows.push(workflow);
    });
    return Object.entries(grouped)
      .sort((a, b) => a[1].brand_name.localeCompare(b[1].brand_name));
  };

  const displayedGroupedWorkflows = groupWorkflowsByBrand(filteredWorkflowsList);

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-destructive">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to Load Workflows</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-muted-foreground">
         <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="8" x="2" y="2" rx="2" /><path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" /><path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" /><path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" /><polyline points="7 21 10 18 7 15" /><rect width="8" height="8" x="14" y="14" rx="2" /></svg>
      </div>
      <h3 className="text-xl font-bold mb-2">No Workflows Yet</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        Get started by creating your first content approval workflow.
      </p>
      <Button asChild>
        <Link href="/dashboard/workflows/new">Add Your First Workflow</Link>
      </Button>
    </div>
  );
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage and create content approval workflows for your brands.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workflows/new">
            <Plus className="mr-2 h-4 w-4" /> Create Workflow
          </Link>
        </Button>
      </div>
      
      {(allWorkflows.length > 0 || isLoading || error) && (
         <div className="flex items-center justify-between">
          <div className="max-w-sm w-full">
            <Input 
              placeholder="Search workflows by name, brand, or content type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : allWorkflows.length === 0 ? (
        <EmptyState />
      ) : filteredWorkflowsList.length === 0 && searchTerm ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
          <h3 className="text-xl font-bold mb-2">No Workflows Found</h3>
          <p className="text-muted-foreground mb-4">No workflows match your search criteria.</p>
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {displayedGroupedWorkflows.map(([brandKey, group]) => (
            <div key={brandKey} className="space-y-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold">{group.brand_name}</h2>
                <div className="ml-3 px-2 py-1 bg-muted rounded-full text-xs font-medium">
                  {group.workflows.length} workflow{group.workflows.length !== 1 ? 's' : ''}
                </div>
                <div className="h-px flex-1 bg-border ml-4"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.workflows.map((workflow) => (
                  <Card key={workflow.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{workflow.name}</CardTitle>
                          <CardDescription>
                            {workflow.template_name 
                              ? `For Template: ${workflow.template_name}` 
                              : (workflow as any).content_type_name 
                                ? `For Content Type: ${(workflow as any).content_type_name}`
                                : 'Generic Workflow'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {workflow.steps_count} step{workflow.steps_count !== 1 ? 's' : ''}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {workflow.content_count > 0 ? 
                          `${workflow.content_count} content item${workflow.content_count !== 1 ? 's' : ''} using this` :
                          'No content items using this workflow yet'
                        }
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-between">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/workflows/${workflow.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/workflows/${workflow.id}/edit`}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 