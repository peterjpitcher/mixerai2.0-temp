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
  const { toast } = useToast();

  // This is a placeholder since we don't have a workflows API yet
  useEffect(() => {
    const loadDummyWorkflows = async () => {
      try {
        setIsLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock workflows data
        const mockWorkflows: Workflow[] = [
          {
            id: '1',
            name: 'Standard Article Workflow',
            brand_name: 'TechGadgets',
            content_type_name: 'Article',
            steps_count: 3
          },
          {
            id: '2',
            name: 'Premium Product Description',
            brand_name: 'WearTech',
            content_type_name: 'Owned PDP',
            steps_count: 4
          },
          {
            id: '3',
            name: 'Retailer Quick Approval',
            brand_name: 'NutriHealth',
            content_type_name: 'Retailer PDP',
            steps_count: 2
          }
        ];
        
        setWorkflows(mockWorkflows);
      } catch (error) {
        console.error('Error loading workflows:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workflows. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDummyWorkflows();
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
      
      <div className="text-center p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
        <p className="text-sm">
          <strong>Note:</strong> This page currently shows mock data. Workflow API endpoints will be implemented in a future update.
        </p>
      </div>
    </div>
  );
} 