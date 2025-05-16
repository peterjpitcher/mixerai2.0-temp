'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, Save, XCircle, ChevronRight } from 'lucide-react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import Link from 'next/link';

// ENUM types - should match other feedback files
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
type FeedbackStatus = typeof feedbackStatuses[number];

// Updated to include all editable fields from the feedback_items schema
interface FeedbackFormState {
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  url: string; 
  browser_info: string;
  os_info: string;
  affected_area: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  app_version: string;
  user_impact_details: string;
  resolution_details: string;
}

// Breadcrumb component structure (conceptual)
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

const initialFormState: FeedbackFormState = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'medium',
  status: 'open',
  url: '',
  browser_info: '',
  os_info: '',
  affected_area: '',
  steps_to_reproduce: '',
  expected_behavior: '',
  actual_behavior: '',
  app_version: '',
  user_impact_details: '',
  resolution_details: '',
};

export default function EditFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const feedbackId = params.id as string;

  const [supabase, setSupabase] = useState<SupabaseClient<any, "public", any> | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formState, setFormState] = useState<FeedbackFormState>(initialFormState);
  const [originalTitle, setOriginalTitle] = useState('Feedback Item'); // For page title
  const [isFetchingItem, setIsFetchingItem] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    setSupabase(supabaseClient);

    const fetchUserAndCheckAdmin = async () => {
      setIsLoadingUser(true);
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const userRole = user.user_metadata?.role || (user.app_metadata as any)?.role;
        if (userRole === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          toast.error('Access Denied: You do not have permission to edit feedback items.');
          router.push(`/dashboard/feedback/${feedbackId}`); 
        }
      } else {
        toast.error('Authentication Required.');
        router.push('/auth/login');
      }
      setIsLoadingUser(false);
    };

    fetchUserAndCheckAdmin();
  }, [router, feedbackId]);


  useEffect(() => {
    if (isAdmin && feedbackId) {
      const fetchFeedbackItem = async () => {
        setIsFetchingItem(true);
        try {
          const response = await fetch(`/api/feedback/${feedbackId}`);
          const result = await response.json();
          if (response.ok && result.success && result.data) {
            const item = result.data;
            setOriginalTitle(item.title || 'Feedback Item');
            setFormState({
              type: item.type || 'bug',
              title: item.title || '',
              description: item.description || '',
              priority: item.priority || 'medium',
              status: item.status || 'open',
              url: item.url || '',
              browser_info: item.browser_info || '',
              os_info: item.os_info || '',
              affected_area: item.affected_area || '',
              steps_to_reproduce: item.steps_to_reproduce || '',
              expected_behavior: item.expected_behavior || '',
              actual_behavior: item.actual_behavior || '',
              app_version: item.app_version || '',
              user_impact_details: item.user_impact_details || '',
              resolution_details: item.resolution_details || '',
            });
          } else {
            throw new Error(result.error || 'Failed to fetch feedback item data for editing');
          }
        } catch (error) {
          console.error('Error fetching feedback item for edit:', error);
          toast.error(error instanceof Error ? error.message : 'Could not load item for editing.');
          router.push(`/dashboard/feedback/${feedbackId}`); 
        } finally {
          setIsFetchingItem(false);
        }
      };
      fetchFeedbackItem();
    }
  }, [isAdmin, feedbackId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSelectChange = (name: keyof FeedbackFormState) => (value: string) => {
    if ((name === 'type' && feedbackTypes.includes(value as FeedbackType)) ||
        (name === 'priority' && feedbackPriorities.includes(value as FeedbackPriority)) ||
        (name === 'status' && feedbackStatuses.includes(value as FeedbackStatus)) ) {
      setFormState(prevState => ({ ...prevState, [name]: value as FeedbackType | FeedbackPriority | FeedbackStatus }));
    } else if (!['type', 'priority', 'status'].includes(name)) {
       setFormState(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !currentUser || !isAdmin) {
        toast.error('Permission denied or not authenticated.');
        return;
    }
    if (!formState.title.trim() || !formState.description.trim() || !formState.type || !formState.priority || !formState.status) {
        toast.error('Please ensure all required fields (marked with *) are filled.');
        return;
    }

    setIsSubmitting(true);
    try {
      // Construct payload with only fields present in FeedbackFormState
      const payload = { ...formState };
      // Ensure empty strings for optional fields are sent as undefined or null if API prefers
      (Object.keys(payload) as Array<keyof FeedbackFormState>).forEach(key => {
        if (typeof payload[key] === 'string' && (payload[key] as string).trim() === '' && !['title', 'description'].includes(key)) {
          // @ts-ignore Type assertion for dynamic keys, allowing undefined
          payload[key] = undefined; 
        }
      });

      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Feedback updated successfully!');
        router.push(`/dashboard/feedback/${feedbackId}`); 
      } else {
        throw new Error(result.error || result.details || 'Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setIsSubmitting(false);
  };

  if (isLoadingUser || (isAdmin && isFetchingItem)) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    // This case should ideally be handled by the useEffect redirect, but as a fallback:
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <BreadcrumbsComponent items={[{ name: 'Feedback', href: `/dashboard/feedback/${feedbackId}` }, { name: 'Access Denied' }]} />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] p-4 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You do not have permission to edit this feedback item.</p>
            <Button variant="outline" onClick={() => router.push(`/dashboard/feedback/${feedbackId}`)} title="View Feedback Item">
                <ArrowLeft className="mr-2 h-4 w-4" /> View Feedback Item
            </Button>
        </div>
      </div>
    );
  }
  
  const breadcrumbItems: BreadcrumbItemDef[] = [
    { name: 'Feedback', href: '/dashboard/admin/feedback-log' },
    { name: originalTitle && originalTitle.length > 40 ? `${originalTitle.substring(0, 40)}...` : (originalTitle || 'Item'), href: `/dashboard/feedback/${feedbackId}` },
    { name: 'Edit' }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbsComponent items={breadcrumbItems} />
      <header className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href={'/dashboard/admin/feedback-log'} passHref>
            <Button variant="outline" size="icon" aria-label="Go back to feedback log" title="Go back to feedback log">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
                Edit Feedback: <span className="truncate" title={originalTitle}>{originalTitle}</span>
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base md:pl-12">
          Modify the details of this feedback item. Ensure all required fields are accurately filled.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Details</CardTitle>
          <CardDescription>Update the information below. Fields marked with <span className="text-destructive">*</span> are required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                <p className="text-xs text-muted-foreground mt-1">Specify if this is a bug or an enhancement.</p>
              </div>
              <div>
                <Label htmlFor="priority">Priority <span className="text-destructive">*</span></Label>
                <Select name="priority" value={formState.priority} onValueChange={handleSelectChange('priority')} required aria-required="true">
                  <SelectTrigger id="priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {feedbackPriorities.map(priority => <SelectItem key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Set the urgency of this feedback.</p>
              </div>
            </div>

            <div>
                <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                <Select name="status" value={formState.status} onValueChange={handleSelectChange('status')} required aria-required="true">
                  <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {feedbackStatuses.map(status => <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Update the current status of this feedback item.</p>
            </div>

            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input type="text" name="title" id="title" value={formState.title} onChange={handleInputChange} placeholder="e.g., CSV Export Fails for Large Datasets" required aria-required="true" />
              <p className="text-xs text-muted-foreground mt-1">A brief, descriptive summary.</p>
            </div>

            <div>
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <Textarea name="description" id="description" value={formState.description} onChange={handleInputChange} placeholder="Provide a detailed description..." required aria-required="true" rows={5} />
              <p className="text-xs text-muted-foreground mt-1">Detailed explanation of the feedback.</p>
            </div>
            
            {formState.type === 'bug' && (
              <div className="space-y-6 p-4 border rounded-md bg-muted/20">
                <h3 className="text-md font-medium text-foreground">Bug Specific Details</h3>
                <div>
                  <Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label>
                  <Textarea name="steps_to_reproduce" id="steps_to_reproduce" value={formState.steps_to_reproduce} onChange={handleInputChange} placeholder="1. Go to...\n2. Click on...\n3. See error..." rows={4}/>
                  <p className="text-xs text-muted-foreground mt-1">Step-by-step guide to reproduce the bug.</p>
                </div>
                <div>
                  <Label htmlFor="expected_behavior">Expected Behavior</Label>
                  <Textarea name="expected_behavior" id="expected_behavior" value={formState.expected_behavior} onChange={handleInputChange} placeholder="What should have happened?" rows={3}/>
                  <p className="text-xs text-muted-foreground mt-1">Describe the correct or expected outcome.</p>
                </div>
                <div>
                  <Label htmlFor="actual_behavior">Actual Behavior</Label>
                  <Textarea name="actual_behavior" id="actual_behavior" value={formState.actual_behavior} onChange={handleInputChange} placeholder="What actually happened?" rows={3}/>
                  <p className="text-xs text-muted-foreground mt-1">Describe what was observed instead.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="url">URL (if applicable)</Label>
                <Input type="url" name="url" id="url" value={formState.url} onChange={handleInputChange} placeholder="https://app.mixerai.com/..." />
                <p className="text-xs text-muted-foreground mt-1">The specific page URL where the issue occurred.</p>
              </div>
              <div>
                <Label htmlFor="app_version">App Version (if applicable)</Label>
                <Input type="text" name="app_version" id="app_version" value={formState.app_version} onChange={handleInputChange} placeholder="e.g., 1.2.3" />
                <p className="text-xs text-muted-foreground mt-1">The application version when the issue occurred.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="affected_area">Feature/Area Affected (if applicable)</Label>
                <Input type="text" name="affected_area" id="affected_area" value={formState.affected_area} onChange={handleInputChange} placeholder="e.g., Content Generation, User Profile" />
                <p className="text-xs text-muted-foreground mt-1">Specific part of the application affected.</p>
              </div>
               <div>
                <Label htmlFor="user_impact_details">User Impact / Context</Label>
                <Textarea name="user_impact_details" id="user_impact_details" value={formState.user_impact_details} onChange={handleInputChange} placeholder="e.g., This blocks me from X, The team is unable to Y..." rows={3}/>
                <p className="text-xs text-muted-foreground mt-1">Describe the impact on users or business operations. Replaces/enhances general user context.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="browser_info">Browser (if applicable)</Label>
                <Input type="text" name="browser_info" id="browser_info" value={formState.browser_info} onChange={handleInputChange} placeholder="e.g., Chrome 123, Safari 17" />
                <p className="text-xs text-muted-foreground mt-1">Browser name and version.</p>
              </div>
              <div>
                <Label htmlFor="os_info">Operating System (if applicable)</Label>
                <Input type="text" name="os_info" id="os_info" value={formState.os_info} onChange={handleInputChange} placeholder="e.g., Windows 11, macOS Sonoma" />
                <p className="text-xs text-muted-foreground mt-1">OS name and version.</p>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2">
                <Label htmlFor="resolution_details">Resolution Details</Label>
                <Textarea
                id="resolution_details"
                name="resolution_details"
                value={formState.resolution_details}
                onChange={handleInputChange}
                rows={4}
                placeholder="Enter details about how this feedback item was resolved (if applicable)"
                />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Link href={'/dashboard/admin/feedback-log'} passHref>
                  <Button type="button" variant="outline" disabled={isSubmitting} title="Cancel editing and return to feedback log">
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                  </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || isFetchingItem} title="Save changes to this feedback item">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 