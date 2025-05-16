'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

// Matches ENUMs in DB
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
// const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const; // Not used for submission form

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
// type FeedbackStatus = typeof feedbackStatuses[number]; // Not used for submission form

// Simplified FeedbackItem for this page (table display)
interface FeedbackItemForTable {
  id: string;
  created_at: string;
  type: FeedbackType;
  title?: string | null;
  priority: FeedbackPriority;
  status: string; // Keep as string for status from API for table display
}

interface FeedbackFormState {
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  url: string; 
  browser_info: string;
  os_info: string;
  user_impact_details: string;
  steps_to_reproduce: string;
}

const initialFormState: FeedbackFormState = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'medium',
  url: '',
  browser_info: '',
  os_info: '',
  user_impact_details: '',
  steps_to_reproduce: '',
};

// Helper Breadcrumb component structure (conceptual)
interface BreadcrumbItemDef { name: string; href?: string; }

const BreadcrumbsComponent = ({ items }: { items: BreadcrumbItemDef[] }) => (
  <nav aria-label="Breadcrumb" className="mb-6">
    <ol role="list" className="flex items-center space-x-1 text-sm text-muted-foreground">
      <li>
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
      </li>
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
            {item.href ? (
              <Link href={item.href} className="ml-1 hover:text-foreground">{item.name}</Link>
            ) : (
              <span className="ml-1 text-foreground">{item.name}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  </nav>
);

// Helper function to format date for table
const formatDateForTable = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 21 May 2023
};

export default function SubmitFeedbackPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient<any, "public", any> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [formState, setFormState] = useState<FeedbackFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItemForTable[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    setSupabase(supabaseClient);

    const fetchSession = async () => {
      const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
      setSession(currentSession);
      setIsLoadingUser(false);
    };

    fetchSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingUser) {
      if (session) {
        fetchFeedbackItems();
      } else {
        toast.error('Authentication Required: Please log in to submit feedback.');
        router.push('/auth/login');
      }
    }
  }, [session, isLoadingUser, router]);

  const fetchFeedbackItems = async () => {
    if (!supabase || !session) return;
    setIsLoadingItems(true);
    try {
      const response = await fetch('/api/feedback');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch feedback items');
      }
      const data = await response.json();
      if (data.success) {
        setFeedbackItems(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to parse feedback items');
      }
    } catch (error) {
      console.error('Error fetching feedback items:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setIsLoadingItems(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSelectChange = (name: keyof FeedbackFormState) => (value: string) => {
    if ((name === 'type' && feedbackTypes.includes(value as FeedbackType)) || 
        (name === 'priority' && feedbackPriorities.includes(value as FeedbackPriority))) {
      setFormState(prevState => ({ ...prevState, [name]: value as FeedbackType | FeedbackPriority }));
    } else if (name !== 'type' && name !== 'priority') {
         setFormState(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !session) {
        toast.error('Authentication required to submit feedback.');
        return;
    }
    if (!formState.type || !formState.priority) {
        toast.error('Please select a type and priority.');
        return;
    }
    if (!formState.title.trim()) {
        toast.error('Please provide a title for the feedback.');
        return;
    }
    if (!formState.description.trim()) {
      toast.error('Please provide a description for the feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Construct payload with only fields present in FeedbackFormState and matching DB schema
      const payload: Partial<FeedbackFormState> = {
        type: formState.type,
        title: formState.title,
        description: formState.description,
        priority: formState.priority,
        url: formState.url.trim() === '' ? undefined : formState.url,
        browser_info: formState.browser_info.trim() === '' ? undefined : formState.browser_info,
        os_info: formState.os_info.trim() === '' ? undefined : formState.os_info,
        user_impact_details: formState.user_impact_details.trim() === '' ? undefined : formState.user_impact_details,
      };
      if (formState.type === 'bug') {
        payload.steps_to_reproduce = formState.steps_to_reproduce.trim() === '' ? undefined : formState.steps_to_reproduce;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Feedback submitted successfully!');
        setFormState(initialFormState); // Reset to initial which now includes new fields
        fetchFeedbackItems();
      } else {
        throw new Error(result.error || result.details || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setIsSubmitting(false);
  };

  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!session) {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <BreadcrumbsComponent items={[{ name: 'Submit Feedback' }, { name: 'Authentication Required'}]} />
            <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] p-4 text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
                <p className="text-muted-foreground mb-4">You need to be logged in to submit feedback.</p>
                <Button onClick={() => router.push('/auth/login')} title="Go to Login page">Go to Login</Button>
            </div>
        </div>
    );
  }

  const breadcrumbItems: BreadcrumbItemDef[] = [
    { name: 'Submit Feedback' }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <BreadcrumbsComponent items={breadcrumbItems} />
        <header className="space-y-1">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back" title="Go back to previous page">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-semibold sm:text-3xl">Feedback Log &amp; Submission</h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base md:pl-12">
                Use this page to submit new feedback items such as bug reports or enhancement requests. You can also view recently logged items below.
            </p>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Logged Feedback Items</CardTitle>
                <CardDescription>View recently logged feedback items. Click on a title to see details.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingItems ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : feedbackItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No feedback items found.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Created At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedbackItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/feedback/${item.id}`} className="hover:underline text-primary break-all">
                                            {item.title || 'N/A'}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="capitalize">{item.type}</TableCell>
                                    <TableCell className="capitalize">{item.priority}</TableCell>
                                    <TableCell className="capitalize">{item.status.replace('_', ' ')}</TableCell>
                                    <TableCell className="text-right">{formatDateForTable(item.created_at)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Submit New Feedback</CardTitle>
                <CardDescription>Please provide as much detail as possible to help us understand and address your feedback.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                            <Select name="type" value={formState.type} onValueChange={handleSelectChange('type')} required aria-required="true">
                                <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {feedbackTypes.map(type => <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="priority">Priority <span className="text-destructive">*</span></Label>
                            <Select name="priority" value={formState.priority} onValueChange={handleSelectChange('priority')} required aria-required="true">
                                <SelectTrigger id="priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                                <SelectContent>
                                    {feedbackPriorities.map(priority => <SelectItem key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                        <Input type="text" name="title" id="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., CSV Export Fails for Large Datasets" required aria-required="true" />
                        <p className="text-xs text-muted-foreground mt-1">A brief, descriptive summary of the issue or enhancement.</p>
                    </div>

                    <div>
                        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                        <Textarea name="description" id="description" value={formState.description} onChange={handleInputChange} placeholder="Provide a detailed description..." required aria-required="true" rows={5} />
                        <p className="text-xs text-muted-foreground mt-1">Detailed explanation of the feedback. For bugs, include observed behavior.</p>
                    </div>
                    
                    {formState.type === 'bug' && (
                        <div>
                            <Label htmlFor="steps_to_reproduce">Steps to Reproduce (for bugs)</Label>
                            <Textarea name="steps_to_reproduce" id="steps_to_reproduce" value={formState.steps_to_reproduce} onChange={handleInputChange} placeholder="1. Go to...\n2. Click on...\n3. See error..." rows={4}/>
                            <p className="text-xs text-muted-foreground mt-1">Provide a step-by-step guide to reproduce the bug.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="url">URL (if applicable)</Label>
                            <Input type="url" name="url" id="url" value={formState.url} onChange={handleInputChange} placeholder="e.g., https://app.mixerai.com/dashboard/content" />
                            <p className="text-xs text-muted-foreground mt-1">The specific page URL where the issue occurred, if relevant.</p>
                        </div>
                        <div>
                            <Label htmlFor="user_impact_details">User Impact / Context</Label>
                            <Textarea name="user_impact_details" id="user_impact_details" value={formState.user_impact_details} onChange={handleInputChange} placeholder="e.g., I was trying to achieve X, this impacts my workflow by Y..." rows={3}/>
                            <p className="text-xs text-muted-foreground mt-1">Any other relevant information, business impact, or context.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="browser_info">Browser (if applicable)</Label>
                            <Input type="text" name="browser_info" id="browser_info" value={formState.browser_info} onChange={handleInputChange} placeholder="e.g., Chrome 123.0.6312.122, Safari 17.4.1" />
                            <p className="text-xs text-muted-foreground mt-1">Your browser name and version, if relevant to a bug.</p>
                        </div>
                        <div>
                            <Label htmlFor="os_info">Operating System (if applicable)</Label>
                            <Input type="text" name="os_info" id="os_info" value={formState.os_info} onChange={handleInputChange} placeholder="e.g., Windows 11, macOS Sonoma 14.4.1" />
                            <p className="text-xs text-muted-foreground mt-1">Your OS name and version, if relevant to a bug.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
} 