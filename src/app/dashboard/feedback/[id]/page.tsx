'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Loader2, AlertTriangle, UserCircle, Tag, List, MessageSquare, 
  CheckSquare, AlertCircle, /*Calendar, Hash, UserCheck, UserCog, Paperclip,*/ // Removed unused icons for cleaner imports
  ClipboardEdit, CheckCircle2, LinkIcon, Globe, Monitor, FileText, LayoutGrid, Bug, Puzzle, Edit3,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent /*CardHeader, CardTitle*/ } from '@/components/ui/card'; // Removed unused Card parts
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/client';
// Tooltip import removed as component might not exist
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ENUM types - should match other feedback files
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
type FeedbackStatus = typeof feedbackStatuses[number];

interface FeedbackItem {
  title?: string | null;
  description?: string | null;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  
  url?: string | null;
  browser_info?: string | null;
  os_info?: string | null;
  affected_area?: string | null;
  steps_to_reproduce?: string | null;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  app_version?: string | null;
  user_impact_details?: string | null;
  
  resolution_details?: string | null;
}

// Helper to render a detail item
const DetailItem = ({ label, value, icon, fullWidth = false }: { label: string; value?: string | null | React.ReactNode; icon?: React.ReactNode; fullWidth?: boolean }) => {
  const displayValue = value === null || value === undefined || (typeof value === 'string' && value.trim() === '') 
    ? <span className="italic text-muted-foreground">N/A</span> 
    : value;
  
  return (
    <div className={`py-3 sm:py-4 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <dt className="text-sm font-medium text-muted-foreground flex items-center">
        {icon && <span className="mr-2 h-4 w-4 shrink-0">{icon}</span>}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground break-words whitespace-pre-wrap sm:ml-6">{displayValue}</dd>
    </div>
  );
};

const SectionTitle = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="sm:col-span-2 mt-6 mb-2 pb-2 border-b border-border first:mt-0">
    <h3 className="text-lg font-semibold text-foreground flex items-center">
      {icon && <span className="mr-2 h-5 w-5 shrink-0">{icon}</span>}
      {title}
    </h3>
  </div>
);

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

export default function FeedbackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const feedbackId = params.id as string;

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const supabaseClient = createSupabaseClient();
    const fetchUserAndCheckAdmin = async () => {
      setIsLoadingUser(true);
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const userRole = (user.app_metadata as any)?.role || user.user_metadata?.role;
        if (userRole === 'admin') {
          setIsAdmin(true);
        }
      }
      setIsLoadingUser(false);
    };

    fetchUserAndCheckAdmin();
  }, []);

  useEffect(() => {
    if (feedbackId) {
      const fetchFeedbackItem = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/feedback/${feedbackId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
          }
          const result = await response.json();
          if (result.success && result.data) {
            const {
              id, created_at, created_by, created_by_profile, updated_at, 
              assigned_to, assigned_to_profile, attachments_metadata, 
              user_context,
              ...displayData
            } = result.data;
            const finalDisplayData = {
                ...displayData,
                steps_to_reproduce: result.data.steps_to_reproduce || result.data.reproduction_steps,
                affected_area: result.data.affected_area,
                app_version: result.data.app_version,
                user_impact_details: result.data.user_impact_details || result.data.user_context,
            };
            setFeedbackItem(finalDisplayData as FeedbackItem);
          } else {
            throw new Error(result.error || 'Failed to parse feedback item data');
          }
        } catch (err) {
          console.error('Failed to fetch feedback item:', err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          if ((err instanceof Error && err.message.includes('not found')) || (err instanceof Error && err.message.includes('Error 404'))){
            toast.error('Feedback item not found.');
          } else {
            toast.error('Failed to load feedback details.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchFeedbackItem();
    }
  }, [feedbackId]);

  if (isLoading || isLoadingUser) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error || !feedbackItem) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6"> 
         <BreadcrumbsComponent items={[{ name: 'Feedback', href: '/dashboard/admin/feedback-log' }, { name: 'Error' }]} />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Feedback</h1>
            <p className="text-muted-foreground mb-6">{error || 'The feedback item could not be found or loaded.'}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/admin/feedback-log')} title="Return to feedback log">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </div>
      </div>
    );
  }
  
  const getBadgeVariant = (status: FeedbackStatus) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      case 'wont_fix': return 'destructive';
      default: return 'default';
    }
  };

  const getPriorityIconColor = (priority: FeedbackPriority) => {
    switch (priority) {
        case 'critical': return "text-red-500";
        case 'high': return "text-orange-500";
        case 'medium': return "text-yellow-500";
        case 'low': return "text-blue-500";
        default: return "text-gray-500";
    }
  };
  
  const breadcrumbItems: BreadcrumbItemDef[] = [
    { name: 'Feedback', href: '/dashboard/admin/feedback-log' },
    { name: feedbackItem.title && feedbackItem.title.length > 50 ? `${feedbackItem.title.substring(0, 50)}...` : (feedbackItem.title || 'Detail') }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbsComponent items={breadcrumbItems} />
      <header className="space-y-1">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/admin/feedback-log')} aria-label="Go back to feedback log" title="Go back to feedback log">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-semibold sm:text-3xl truncate" title={feedbackItem.title || 'Feedback Detail'}>
                    {feedbackItem.title || 'Feedback Detail'}
                </h1>
            </div>
            {isAdmin && (
                <Link href={`/dashboard/feedback/${feedbackId}/edit`}>
                    <Button variant="default" title="Edit this feedback item">
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                </Link>
            )}
        </div>
        <p className="text-muted-foreground text-sm sm:text-base md:pl-12">
          Detailed view of the feedback item. Administrators can edit this item.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            
            <SectionTitle title="Overview" icon={<LayoutGrid />} />
            <DetailItem label="Title" value={feedbackItem.title} icon={<Tag />} fullWidth />
            <DetailItem label="Description" value={feedbackItem.description} icon={<MessageSquare />} fullWidth />
            <DetailItem label="Type" value={<span className="capitalize">{feedbackItem.type}</span>} icon={feedbackItem.type === 'bug' ? <Bug /> : <Puzzle />} />
            <DetailItem label="Priority" value={
                <span className={`capitalize flex items-center ${getPriorityIconColor(feedbackItem.priority)}`}>
                    <AlertCircle className="mr-1.5 h-4 w-4" /> {feedbackItem.priority}
                </span>} 
                icon={<AlertCircle className="invisible stroke-transparent fill-transparent" />}
            />
             <DetailItem label="Status" value={
                <Badge variant={getBadgeVariant(feedbackItem.status)} className="capitalize">
                    {feedbackItem.status.replace('_', ' ')}
                </Badge>} 
                icon={<CheckSquare />} 
            />
            {/* Placeholder to balance grid if only one of type/priority/status is shown - not common but for robustness */}
            {/* This might not be necessary with current layout but keeping as a thought if items become conditional */} 
            {/* <div className="md:col-span-1"></div>  */}

            <SectionTitle title="Web & System Context" icon={<Globe />} />
            <DetailItem label="URL" value={feedbackItem.url ? <Link href={feedbackItem.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{feedbackItem.url}</Link> : 'N/A'} icon={<LinkIcon />} fullWidth />
            <DetailItem label="Affected Area" value={feedbackItem.affected_area} icon={<Puzzle />} fullWidth/>
            <DetailItem label="Application Version" value={feedbackItem.app_version} icon={<Tag />} />
            {/* Ensure grid balance if app_version is shown alone */}
            {!feedbackItem.browser_info && !feedbackItem.os_info && <div className="md:col-span-1"></div>}

            <DetailItem label="User Impact / Context" value={feedbackItem.user_impact_details} icon={<UserCircle />} fullWidth />
           
            {feedbackItem.type === 'bug' && (
              <>
                {/* This will make browser_info and os_info appear under Web & System Context if they exist */}
                {feedbackItem.browser_info && <DetailItem label="Browser Info" value={feedbackItem.browser_info} icon={<Monitor />} />}
                {feedbackItem.os_info && <DetailItem label="Operating System" value={feedbackItem.os_info} icon={<Monitor />} />}
              </>
            )}
            {/* Ensure grid balances if only one of browser/os info shown for bug type*/}
            {feedbackItem.type === 'bug' && feedbackItem.browser_info && !feedbackItem.os_info && <div className="md:col-span-1"></div>}
            {feedbackItem.type === 'bug' && !feedbackItem.browser_info && feedbackItem.os_info && <div className="md:col-span-1"></div>}

            {feedbackItem.type === 'bug' && (
              <>
                <SectionTitle title="Bug Specifics" icon={<Bug />} />
                <DetailItem label="Steps to Reproduce" value={feedbackItem.steps_to_reproduce} icon={<List />} fullWidth />
                <DetailItem label="Expected Behavior" value={feedbackItem.expected_behavior} icon={<CheckCircle2 />} fullWidth />
                <DetailItem label="Actual Behavior" value={feedbackItem.actual_behavior} icon={<AlertCircle />} fullWidth />
              </>
            )}
            
            <SectionTitle title="Resolution" icon={<ClipboardEdit />} />
            <DetailItem label="Resolution Details" value={feedbackItem.resolution_details} icon={<FileText />} fullWidth />

          </dl>
        </CardContent>
      </Card>
    </div>
  );
} 