'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { Plus, Search, Trash2, Eye, Edit3, AlertTriangle, WorkflowIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon } from '@/components/brand-icon';

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
  description?: string;
}

interface GroupedWorkflows {
  [key: string]: {
    brand_name: string;
    brand_color?: string;
    workflows: WorkflowFromAPI[];
  }
}

// Placeholder Breadcrumbs component
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
        <AlertTriangle size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to Load Workflows</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-muted-foreground">
        <WorkflowIcon size={64} strokeWidth={1.5} />
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
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Workflows" }]} />
      <PageHeader
        title="Workflows"
        description="Manage and create content approval workflows for your brands."
        actions={
          <Button asChild>
            <Link href="/dashboard/workflows/new">
              <Plus className="mr-2 h-4 w-4" /> Create Workflow
            </Link>
          </Button>
        }
      />
      
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
                <BrandIcon name={group.brand_name} color={group.brand_color ?? undefined} size="md" className="mr-3" />
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
                          <CardDescription>{workflow.description || 'No description provided'}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {workflow.template_name && (
                        <div className="mb-2 text-sm text-muted-foreground">
                          Content Template: <span className="font-medium text-foreground">{workflow.template_name}</span>
                        </div>
                      )}
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
                        <Button variant="ghost" size="sm" asChild title="View Workflow">
                          <Link href={`/dashboard/workflows/${workflow.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Edit Workflow">
                          <Link href={`/dashboard/workflows/${workflow.id}/edit`} className="flex items-center">
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