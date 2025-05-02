'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { useToast } from '@/components/toast-provider';

interface Workflow {
  id: string;
  name: string;
  brand_name: string;
  content_type_name: string;
  steps_count: number;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/workflows');
        
        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setWorkflows(data.workflows);
        } else {
          throw new Error(data.error || 'Failed to fetch workflows');
        }
      } catch (error) {
        console.error('Error fetching workflows:', error);
        setError((error as Error).message || 'Failed to load workflows');
        toast({
          title: 'Error',
          description: 'Failed to load workflows. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflows();
  }, [toast]);
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
        <Button asChild>
          <Link href="/workflows/new">Create Workflow</Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="max-w-sm">
          <Input placeholder="Search workflows..." />
        </div>
      </div>
      
      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Failed to load workflows</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {error}
          </p>
          <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7l3-3.3" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7l-3 3.3" />
            </svg>
            Retry
          </Button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect width="8" height="8" x="2" y="2" rx="2" />
              <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
              <polyline points="7 21 10 18 7 15" />
              <rect width="8" height="8" x="14" y="14" rx="2" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No workflows found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't created any content approval workflows yet. Create your first workflow to streamline content creation.
          </p>
          <Button size="lg" asChild>
            <Link href="/workflows/new">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Create First Workflow
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{workflow.name}</CardTitle>
                <CardDescription>
                  {workflow.brand_name} - {workflow.content_type_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-3">
                  <span>Steps</span>
                  <span className="font-medium">{workflow.steps_count}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: workflow.steps_count }).map((_, i) => (
                    <div 
                      key={i} 
                      className="h-8 flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs px-3"
                    >
                      Step {i + 1}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/workflows/${workflow.id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/workflows/${workflow.id}/edit`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 