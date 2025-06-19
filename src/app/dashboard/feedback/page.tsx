'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui components are here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertTriangle, Search, ListFilter, Info, FilePlus2 } from 'lucide-react';
import type { Session, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { FeedbackSubmitForm } from '@/components/feedback/FeedbackSubmitForm'; // Import the new form
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog components
import { formatDate } from '@/lib/utils/date';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

// Matches ENUMs in DB (copied from admin page for consistency)
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
type FeedbackStatus = typeof feedbackStatuses[number];

interface FeedbackItem {
  id: string;
  created_at: string;
  created_by_profile?: { full_name?: string | null; avatar_url?: string | null };
  type: FeedbackType;
  title?: string | null;
  description?: string | null;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  affected_area?: string | null;
  // We might not show all bug-specific details on the public view page
}

interface Filters {
  type: FeedbackType | '';
  priority: FeedbackPriority | '';
  status: FeedbackStatus | '';
  searchTerm: string;
}

export default function ViewFeedbackPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true); // Start true
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({ type: '', priority: '', status: '', searchTerm: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [showSubmitFormModal, setShowSubmitFormModal] = useState(false);
  const [currentUserForForm, setCurrentUserForForm] = useState<SupabaseUser | null>(null); // To pass to the form

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    setSupabase(supabaseClient);

    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
      if (currentUser) {
        setSession({ user: currentUser } as any);
        setCurrentUserForForm(currentUser);
      }
      setIsLoadingUser(false);
    };
    fetchUser();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setCurrentUserForForm(currentSession.user);
      } else {
        setCurrentUserForForm(null);
      }
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchFeedbackItems = useCallback(async (page: number, currentFilters: Filters) => {
    if (!supabase) return;
    setIsLoadingItems(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (currentFilters.type) queryParams.append('type', currentFilters.type);
      if (currentFilters.priority) queryParams.append('priority', currentFilters.priority);
      if (currentFilters.status) queryParams.append('status', currentFilters.status);
      // Note: searchTerm would typically be handled server-side if using full-text search.
      // For client-side filtering after fetch, it's handled below (or could be passed as a generic query param).
      queryParams.append('page', page.toString());
      queryParams.append('limit', itemsPerPage.toString());
      queryParams.append('sortBy', 'created_at');
      queryParams.append('sortOrder', 'desc');

      const response = await fetch(`/api/feedback?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch feedback items');
      }
      const data = await response.json();
      if (data.success) {
        setFeedbackItems(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
      } else {
        throw new Error(data.error || 'Failed to parse feedback items');
      }
    } catch (err) {
      console.error('Error fetching feedback items:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoadingItems(false);
  }, [supabase, itemsPerPage]);

  useEffect(() => {
    if (!isLoadingUser && session) { // Fetch items once user is confirmed authenticated
        fetchFeedbackItems(currentPage, filters);
    }
     if (!isLoadingUser && !session) {
        toast.error('Access Denied: You are not authenticated to view this page.');
        setIsLoadingItems(false); // Stop loading if user not authenticated
        // router.push('/auth/login');
    }
  }, [session, isLoadingUser, currentPage, filters, fetchFeedbackItems]);

  const handleFilterChange = (filterName: keyof Omit<Filters, 'searchTerm'>, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
    // Client-side search will be applied via filteredItems, pagination might need adjustment for server-side search
  };

  const clearFilters = () => {
    setFilters({ type: '', priority: '', status: '', searchTerm: '' });
    setCurrentPage(1);
  };

  const filteredItems = feedbackItems.filter(item => {
    return item.title?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
           item.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
           item.affected_area?.toLowerCase().includes(filters.searchTerm.toLowerCase());
  });

  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!session) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to view feedback items.</p>
            <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Feedback" }
      ]} />
      
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Feedback & Known Issues</h1>
          </div>
        {/* Button to trigger the modal for submitting new feedback */} 
        {session && supabase && currentUserForForm && (
          <Dialog open={showSubmitFormModal} onOpenChange={setShowSubmitFormModal}>
            <DialogTrigger asChild>
              <Button variant="default">
                <FilePlus2 className="mr-2 h-4 w-4" /> Submit New Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit New Feedback</DialogTitle>
                <DialogDescription>
                  Report a bug or suggest an enhancement. Your input is valuable!
                </DialogDescription>
              </DialogHeader>
              <FeedbackSubmitForm 
                supabase={supabase} 
                currentUser={currentUserForForm} 
                onFeedbackSubmitted={() => {
                  fetchFeedbackItems(1, filters); // Refresh list on the first page
                  setShowSubmitFormModal(false); // Close modal
                }}
                cardMode={false} // Render form without its own card wrapper in modal
              />
            </DialogContent>
          </Dialog>
        )}
        </div>
        <p className="text-muted-foreground mt-2">
          Report bugs, suggest enhancements, and track the status of known issues in MixerAI.
        </p>
      </div>

        <Card>
            <CardHeader>
                <CardTitle>Filter & Search</CardTitle>
                <CardDescription>Refine the list of feedback items below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label htmlFor="searchTerm">Search</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input id="searchTerm" type="search" placeholder="Search title, description..." value={filters.searchTerm} onChange={handleSearchTermChange} className="pl-8" />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="filter-type">Type</Label>
                        <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                            <SelectTrigger id="filter-type"><SelectValue placeholder="All Types" /></SelectTrigger>
                            <SelectContent>
                                {/* <SelectItem value="">All Types</SelectItem> */}
                                {feedbackTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-priority">Priority</Label>
                        <Select value={filters.priority} onValueChange={(v) => handleFilterChange('priority', v)}>
                            <SelectTrigger id="filter-priority"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                            <SelectContent>
                                {/* <SelectItem value="">All Priorities</SelectItem> */}
                                {feedbackPriorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="filter-status">Status</Label>
                        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                            <SelectTrigger id="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                            <SelectContent>
                                {/* <SelectItem value="">All Statuses</SelectItem> */}
                                {feedbackStatuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="flex justify-end">
                    <Button variant="ghost" onClick={clearFilters} size="sm">
                        <ListFilter className="mr-2 h-4 w-4" /> Clear Filters
                    </Button>
                </div>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logged Items ({totalItems})</CardTitle>
          <CardDescription>List of submitted bug reports and enhancement requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingItems && (
            <div className="overflow-x-auto rounded-md border">
              <TableSkeleton rows={5} columns={6} />
            </div>
          )} 
          {!isLoadingItems && error && (
            <div className="text-center text-destructive py-8">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Error Loading Feedback</p>
              <p>{error}</p>
            </div>
          )}
          {!isLoadingItems && !error && filteredItems.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">No Feedback Items Found</p>
              <p>There are no items matching your current filters, or no items have been logged yet.</p>
            </div>
          )}
          {!isLoadingItems && !error && filteredItems.length > 0 && (
            <>
                <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30%]">Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Affected Area</TableHead>
                        <TableHead>Reported</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredItems.map(item => (
                        <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-xs truncate" title={item.title || undefined}>{item.title || 'N/A'}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.priority}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={item.affected_area || undefined}>{item.affected_area || 'N/A'}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            Next
                        </Button>
                    </div>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 