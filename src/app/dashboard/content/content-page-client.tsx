'use client';

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
import { createBrowserClient } from '@supabase/ssr';

// Added imports for PageHeader and lucide-react icons
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandIcon, BrandIconProps } from '@/components/brand-icon'; 
import { FileText, AlertTriangle, PlusCircle, FileUp, FileDown, Edit3, RefreshCw } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  brand_id: string;
  brand_name: string | null;
  brand_color?: string | null;
  brand_avatar_url?: string | null; // Retain for data structure, though BrandIcon doesn't use it yet
  status: string;
  created_at: string;
  created_by_name: string | null;
  creator_avatar_url?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  template_icon?: string | null;
  workflow_id?: string | null;
  current_step_id?: string | null;
  current_step_name?: string | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
}

interface User {
  id: string;
  email?: string;
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

export default function ContentPageClient() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const searchParams = useSearchParams();
  const brandId = searchParams?.get('brandId');
  const [activeBrandData, setActiveBrandData] = useState<any>(null); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        sonnerToast.error("Could not verify user session.");
        return;
      }
      if (session?.user) {
        setCurrentUser({ id: session.user.id, email: session.user.email });
      }
    };
    fetchCurrentUser();
  }, [supabase]);

  useEffect(() => {
    async function fetchContentData() {
      setIsLoading(true);
      try {
        const apiUrl = debouncedSearchQuery 
          ? `/api/content?query=${encodeURIComponent(debouncedSearchQuery)}${brandId ? `&brandId=${brandId}` : ''}` 
          : `/api/content${brandId ? `?brandId=${brandId}` : ''}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch content data from API');
        const data = await response.json();
        if (data.success) {
          setContent(data.data || []);
        } else {
          setContent([]);
          throw new Error(data.error || 'API returned error fetching content');
        }
      } catch (err) {
        console.error('Error in fetchContentData:', err);
        setError((err as Error).message || 'Failed to load content data');
        setContent([]);
        sonnerToast.error("Failed to load content", { description: (err as Error).message || "Please try again." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchContentData();
  }, [debouncedSearchQuery, brandId]);

  useEffect(() => {
    const fetchActiveBrand = async () => {
      if (brandId) {
        try {
          const res = await fetch(`/api/brands/${brandId}`);
          const data = await res.json();
          if (data.success && data.brand) {
            setActiveBrandData(data.brand);
          } else {
            setActiveBrandData(null); 
            console.warn("Could not fetch active brand data for header");
          }
        } catch (err) {
          setActiveBrandData(null);
          console.warn("Error fetching active brand data:", err);
        }
      } else {
        setActiveBrandData(null); 
      }
    };
    fetchActiveBrand();
  }, [brandId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try { 
      return formatDateFns(new Date(dateString), 'dd MMMM yyyy'); 
    }
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

  const isUserAssigned = (item: ContentItem, userId: string | undefined): boolean => {
    if (!userId) return false;
    return item.assigned_to_id === userId;
  };

  const EmptyState = () => ( 
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <FileText size={40} className="text-primary" strokeWidth={1.5}/>
        </div>
        <h3 className="text-xl font-semibold mb-2">No content found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">You haven't created any content yet. Create your first piece of content by selecting a template.</p>
        <Button size="lg" asChild><Link href="/dashboard/templates">
          <PlusCircle size={16} className="mr-2" />Go to Templates</Link></Button>
      </div>
  );
  const ErrorState = () => ( 
      <div className="text-center py-12 px-4">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-destructive" strokeWidth={1.5}/>
        </div>
        <h3 className="text-xl font-semibold mb-2">Failed to load content</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error || "An error occurred while loading your content. Please try again."}</p>
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
          <RefreshCw size={16} className="mr-2" /> Retry
        </Button>
      </div>
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        ...(brandId && activeBrandData ? 
          [
            { label: "Brands", href: "/dashboard/brands" }, 
            { label: activeBrandData.name || "Brand", href: `/dashboard/brands/${brandId}` },
            { label: "Content" }
          ] : 
          [{ label: "Content" }])
      ]} />

      <PageHeader
        title={brandId && activeBrandData ? `Content for ${activeBrandData.name}` : "All Content"}
        description="View, manage, and track all content items across your brands."
        actions={
          <Button asChild>
            <Link href="/dashboard/templates">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Content
            </Link>
          </Button>
        }
      />
      
      <div className="flex items-center justify-between">
        <div className="max-w-sm w-full"><Input placeholder="Search content by title or body..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><FileUp className="mr-2 h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" />Import</Button>
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
              <AccordionTrigger className="bg-muted hover:bg-muted/90 px-4 py-3">
                <div className="flex items-center">
                  {items.length > 0 && 
                    <BrandIcon 
                      name={brandName} 
                      color={items[0].brand_color ?? undefined} 
                      size="sm" 
                      className="mr-2" 
                    />}
                  <span className="font-semibold text-lg">{brandName} ({items.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr className="border-b">
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Content Template</th>
                      <th className="text-left p-3 font-medium">Workflow Step</th>
                      <th className="text-left p-3 font-medium">Assigned To</th>
                      <th className="text-left p-3 font-medium">Actions</th></tr></thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="p-3">
                            <Link href={`/dashboard/content/${item.id}`} className="hover:underline">
                              {item.title}
                            </Link>
                          </td>
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
                          <td className="p-3">{item.template_name || 'N/A'}</td>
                          <td className="p-3">{item.current_step_name || 'N/A'}</td> 
                          <td className="p-3">{item.assigned_to_name || 'N/A'}</td>
                          <td className="p-3">
                            <div className="flex space-x-1">
                              {currentUser && isUserAssigned(item, currentUser.id) && (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/dashboard/content/${item.id}/edit`} className="flex items-center">
                                    <Edit3 className="mr-1 h-4 w-4" />
                                    Edit
                                  </Link>
                                </Button>
                              )}
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