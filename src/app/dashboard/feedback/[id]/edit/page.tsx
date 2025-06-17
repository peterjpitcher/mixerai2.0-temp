'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Save, XCircle } from 'lucide-react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
// import Link from 'next/link';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface BreadcrumbItemDef { name: string; href?: string; }

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
  const feedbackId = params?.id as string | undefined;

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
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
        const userRole = user.user_metadata?.role || user.app_metadata?.role;
        if (userRole === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false); 
      }
      setIsLoadingUser(false);
    };

    fetchUserAndCheckAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin && feedbackId && supabase) { 
      const fetchFeedbackItem = async () => {
        setIsFetchingItem(true);
        try {
          const { data: item, error } = await supabase
            .from('feedback_items')
            .select('*')
            .eq('id', feedbackId)
            .single();

          if (error) throw error;
          
          if (item) {
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
            throw new Error('Feedback item not found.');
          }
        } catch (error) {
          console.error('Error fetching feedback item for edit:', error);
          toast.error(error instanceof Error ? error.message : 'Could not load item for editing.');
        } finally {
          setIsFetchingItem(false);
        }
      };
      fetchFeedbackItem();
    } else if (!isAdmin && !isLoadingUser && feedbackId) {
        setIsFetchingItem(false);
    }
  }, [isAdmin, feedbackId, supabase, isLoadingUser]);

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
      const { data, error } = await supabase
        .from('feedback_items')
        .update({
          type: formState.type,
          title: formState.title,
          description: formState.description,
          priority: formState.priority,
          status: formState.status,
          url: formState.url,
          browser_info: formState.browser_info,
          os_info: formState.os_info,
          affected_area: formState.affected_area,
          steps_to_reproduce: formState.steps_to_reproduce,
          expected_behavior: formState.expected_behavior,
          actual_behavior: formState.actual_behavior,
          app_version: formState.app_version,
          user_impact_details: formState.user_impact_details,
          resolution_details: formState.resolution_details,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.id,
        })
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        toast.success('Feedback item updated successfully!');
        setOriginalTitle(data.title);
        router.push(`/dashboard/feedback/${feedbackId}`);
      } else {
        throw new Error('Failed to update feedback item: No data returned.');
      }
    } catch (error) {
      console.error('Error updating feedback item:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!feedbackId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md p-6 sm:p-8 text-center shadow-xl">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-xl font-semibold">Error Loading Feedback</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            The feedback ID is missing from the URL. Unable to load the feedback item.
          </CardDescription>
          <Button onClick={() => router.push('/dashboard/admin/feedback-log')} className="mt-6 w-full">
            Return to Feedback Log
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading user information...</p>
      </div>
    );
  }

  if (!currentUser) {
    toast.error('Authentication Required. Redirecting to login...');
    router.push('/auth/login?redirect=/dashboard/feedback/' + feedbackId);
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  if (!isAdmin) {
    toast.error('Access Denied: You do not have permission to edit feedback items.');
    router.push(`/dashboard/feedback/${feedbackId}`);
     return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-4 text-lg text-muted-foreground">Access Denied. Redirecting...</p>
        </div>
    );
  }

  if (isFetchingItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading feedback item...</p>
      </div>
    );
  }

  const breadcrumbItemsForShared = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Feedback", href: "/dashboard/admin/feedback-log" },
    { label: `Edit: ${originalTitle.length > 30 ? originalTitle.substring(0, 27) + '...' : originalTitle}` }
  ];

  return (
    <div className="bg-gray-50 min-h-screen space-y-6">
      <Breadcrumbs items={breadcrumbItemsForShared} />
      
      <header className="my-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Edit Feedback: {originalTitle.length > 50 ? originalTitle.substring(0, 47) + '...' : originalTitle}
        </h1>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Edit Feedback Item</CardTitle>
                  <CardDescription>Update the details for feedback ID: {feedbackId}</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/feedback/${feedbackId}`)} title="Cancel and View Item" aria-label="Cancel and View Item">
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                  <Input id="title" name="title" value={formState.title} onChange={handleInputChange} required placeholder="e.g., Login button not working" />
                </div>
                <div>
                  <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                  <Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} required placeholder="Detailed description of the issue..." className="min-h-[120px]" />
                </div>
                <div>
                  <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                  <Select name="type" value={formState.type} onValueChange={handleSelectChange('type')}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {feedbackTypes.map(type => <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority <span className="text-destructive">*</span></Label>
                  <Select name="priority" value={formState.priority} onValueChange={handleSelectChange('priority')}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {feedbackPriorities.map(priority => <SelectItem key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                  <Select name="status" value={formState.status} onValueChange={handleSelectChange('status')}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {feedbackStatuses.map(status => <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="app_version">App Version</Label>
                  <Input id="app_version" name="app_version" value={formState.app_version} onChange={handleInputChange} placeholder="e.g., 1.2.3" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="url">URL / Affected Page</Label>
                  <Input id="url" name="url" type="url" value={formState.url} onChange={handleInputChange} placeholder="e.g., https://app.mixerai.com/dashboard/settings" />
                </div>
                <div>
                  <Label htmlFor="affected_area">Affected Area / Module</Label>
                  <Input id="affected_area" name="affected_area" value={formState.affected_area} onChange={handleInputChange} placeholder="e.g., User Authentication, Content Generation" />
                </div>
                <div>
                  <Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label>
                  <Textarea id="steps_to_reproduce" name="steps_to_reproduce" value={formState.steps_to_reproduce} onChange={handleInputChange} placeholder="1. Go to X...\n2. Click on Y...\n3. See error..." className="min-h-[100px]" />
                </div>
                 <div>
                  <Label htmlFor="expected_behavior">Expected Behavior</Label>
                  <Textarea id="expected_behavior" name="expected_behavior" value={formState.expected_behavior} onChange={handleInputChange} placeholder="What should have happened?" className="min-h-[60px]" />
                </div>
                <div>
                  <Label htmlFor="actual_behavior">Actual Behavior</Label>
                  <Textarea id="actual_behavior" name="actual_behavior" value={formState.actual_behavior} onChange={handleInputChange} placeholder="What actually happened?" className="min-h-[60px]" />
                </div>
                <div>
                  <Label htmlFor="user_impact_details">User Impact Details</Label>
                  <Textarea id="user_impact_details" name="user_impact_details" value={formState.user_impact_details} onChange={handleInputChange} placeholder="How does this affect users? e.g., Blocks critical workflow, minor inconvenience..." className="min-h-[80px]" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="resolution_details">Resolution Details / Admin Notes</Label>
                <Textarea 
                  id="resolution_details" 
                  name="resolution_details" 
                  value={formState.resolution_details} 
                  onChange={handleInputChange} 
                  placeholder="Details about how the issue was resolved, or any internal notes..." 
                  className="min-h-[120px]" 
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3 py-6">
              <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/feedback/${feedbackId}`)} disabled={isSubmitting}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>
    </div>
  );
} 