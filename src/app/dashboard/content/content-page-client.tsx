'use client';

// Paste the entire content of the original src/app/dashboard/content/page.tsx here
// (Starting from the imports down to the closing brace of the component)

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Input } from '@/components/input';
import { toast as sonnerToast } from "sonner";
import { format as formatDateFns } from 'date-fns';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useSearchParams } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion";

// --- Interfaces remain the same ---
interface ContentItem {
  id: string;
  title: string;
  brand_id: string;
  brand_name: string | null;
  status: string;
  created_at: string;
  created_by_name: string | null;
  template_name?: string | null;
  template_icon?: string | null;
  current_step?: number | null;
  workflow_id?: string | null;
}

interface Assignee {
  id: string; // User ID
  email?: string; // User email
}

interface WorkflowStep {
  id: number; // Step number or ID
  name: string;
  assignees?: Assignee[];
}

interface Workflow {
  id: string;
  steps: WorkflowStep[];
}

// --- Component Logic Starts Here ---
export default function ContentPageClient() { // Renamed component
  const [content, setContent] = useState<ContentItem[]>([]);
  const [assigneeDetails, setAssigneeDetails] = useState<Record<string, { name: string, stepName: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const searchParams = useSearchParams();
  const brandId = searchParams?.get('brandId');

  // --- Effects and Helper Functions remain the same ---
  useEffect(() => {
    async function fetchContentData() {
      setIsLoading(true);
      setAssigneeDetails({});
      try {
        const apiUrl = debouncedSearchQuery 
          ? `/api/content?query=${encodeURIComponent(debouncedSearchQuery)}${brandId ? `&brandId=${brandId}` : ''}` 
          : `/api/content${brandId ? `?brandId=${brandId}` : ''}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch content');
        const data = await response.json();
        if (data.success) {
          setContent(data.data || []);
        } else {
          setContent([]);
          throw new Error(data.error || 'Failed to fetch content');
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        setError((err as Error).message || 'Failed to load content');
        setContent([]);
        sonnerToast.error("Failed to load content", { description: "Please try again." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchContentData();
  }, [debouncedSearchQuery, brandId]);

  useEffect(() => {
    const fetchWorkflowAndAssigneeInfo = async () => {
      if (content.length === 0) return;

      const newAssigneeDetailsUpdates: Record<string, { name: string, stepName: string }> = {};

      for (const item of content) {
        if (item.workflow_id && item.current_step !== null && item.current_step !== undefined) {
          try {
            const workflowRes = await fetch(`/api/workflows/${item.workflow_id}`);
            if (!workflowRes.ok) {
              console.warn(`Failed to fetch workflow ${item.workflow_id} for content ${item.id}`);
              newAssigneeDetailsUpdates[item.id] = { name: 'N/A (Workflow Error)', stepName: 'N/A (Workflow Error)' };
              continue;
            }
            const workflowData = await workflowRes.json();

            if (workflowData.success && workflowData.workflow) {
              const workflow: Workflow = workflowData.workflow;
              const currentStepDetails = workflow.steps?.find(step => step.id === item.current_step);

              if (currentStepDetails) {
                let assignedNames = 'N/A';
                if (currentStepDetails.assignees && currentStepDetails.assignees.length > 0) {
                  const userNamesToFetch = currentStepDetails.assignees.map(assignee => assignee.id).filter(id => !!id);
                  
                  if (userNamesToFetch.length > 0) {
                    const userPromises = userNamesToFetch.map(userId =>
                      fetch(`/api/users/${userId}`).then(res => res.ok ? res.json() : null)
                    );
                    const userResults = await Promise.all(userPromises);
                    assignedNames = userResults
                      .filter(ud => ud?.success && ud.user)
                      .map(ud => ud.user.full_name || ud.user.email || 'Unknown')
                      .join(', ') || 'N/A (No user name)'; // Provide fallback if names are empty after map
                  }
                }
                newAssigneeDetailsUpdates[item.id] = {
                  name: assignedNames,
                  stepName: currentStepDetails.name || `Step ${item.current_step}`
                };
              } else {
                newAssigneeDetailsUpdates[item.id] = { name: 'N/A', stepName: `Step ${item.current_step} not found` };
              }
            } else {
              newAssigneeDetailsUpdates[item.id] = { name: 'N/A (Workflow Invalid)', stepName: 'N/A (Workflow Invalid)' };
            }
          } catch (err) {
            console.error(`Failed to fetch workflow/assignee details for content ${item.id}:`, err);
            newAssigneeDetailsUpdates[item.id] = { name: 'N/A (Fetch Error)', stepName: 'N/A (Fetch Error)' };
          }
        } else {
          // Explicitly set N/A for items without a workflow_id or valid current_step
          newAssigneeDetailsUpdates[item.id] = { name: 'N/A', stepName: 'N/A (No Workflow Active)' };
        }
      }
      // Only update state if there are actual changes to avoid unnecessary re-renders
      if (Object.keys(newAssigneeDetailsUpdates).length > 0) {
        setAssigneeDetails(prev => ({ ...prev, ...newAssigneeDetailsUpdates }));
      }
    };

    if (!isLoading && content.length > 0) {
      fetchWorkflowAndAssigneeInfo();
    }
  }, [content, isLoading]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try { return formatDateFns(new Date(dateString), 'dd MMM yyyy'); }
    catch (e) { console.error('Error formatting date:', dateString, e); return 'Invalid Date'; }
  };

  const groupedContent = useMemo(() => {
    if (!content) return {};
    return content.reduce((acc, item) => {
      const brandName = item.brand_name || 'Unassigned Brand';
      if (!acc[brandName]) acc[brandName] = [];
      acc[brandName].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
  }, [content]);

  const EmptyState = () => ( /* ... Existing EmptyState JSX ... */ 
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">No content found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">You haven't created any content yet. Create your first piece of content by selecting a template.</p>
        <Button size="lg" asChild><Link href="/dashboard/templates"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Go to Templates</Link></Button>
      </div>
  );
  const ErrorState = () => ( /* ... Existing ErrorState JSX ... */ 
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12" y2="17" /></svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Failed to load content</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error || "An error occurred while loading your content. Please try again."}</p>
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7l3-3.3" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7l-3 3.3" /></svg>Retry</Button>
      </div>
  );

  // --- Return JSX remains the same, using the state and functions defined above ---
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
      </div>
      <div className="flex items-center justify-between">
        <div className="max-w-sm w-full"><Input placeholder="Search content by title or body..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="8" height="4" x="4" y="8" rx="1" /><path d="M4 16v1a2 2 0 0 0 2 2h2" /><path d="M16 4h1a2 2 0 0 1 2 2v2" /><path d="M16 20h1a2 2 0 0 0 2-2v-2" /><path d="M8 4H7a2 2 0 0 0-2 2v2" /><rect width="8" height="4" x="12" y="12" rx="1" /></svg>Export</Button>
          <Button variant="outline" size="sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Import</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]"><div className="flex flex-col items-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-muted-foreground">Loading content...</p></div></div>
      ) : error ? (
        <ErrorState />
      ) : Object.keys(groupedContent).length === 0 ? (
        <EmptyState />
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(groupedContent)} className="w-full space-y-4">
          {Object.entries(groupedContent).map(([brandName, items]) => (
            <AccordionItem value={brandName} key={brandName} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="bg-muted hover:bg-muted/90 px-4 py-3"><span className="font-semibold text-lg">{brandName} ({items.length})</span></AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr className="border-b"><th className="text-left p-3 font-medium">Title</th><th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Workflow Step</th><th className="text-left p-3 font-medium">Assigned To</th><th className="text-left p-3 font-medium">Actions</th></tr></thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="p-3">{item.title}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                              ${item.status === 'published' ? 'bg-green-100 text-green-800' : 
                                item.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                                item.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 
                                item.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                'bg-blue-100 text-blue-800'}`}>
                              {item.status ? item.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">{assigneeDetails[item.id]?.stepName || (item.workflow_id ? 'Loading...' : 'N/A')}</td> 
                          <td className="p-3">{assigneeDetails[item.id]?.name || (item.workflow_id ? 'Loading...' : 'N/A')}</td>
                          <td className="p-3">
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/content/${item.id}/edit`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>Edit</Link></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
} 