'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Eye, AlertCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface RejectedContentItem {
  id: string;
  title: string;
  updated_at: string;
  template?: { name?: string };
  workflow?: { name?: string };
  // Add any other fields returned by the API /api/brands/[id]/rejected-content
}

interface RejectedContentListProps {
  brandId: string;
}

export default function RejectedContentList({ brandId }: RejectedContentListProps) {
  const [rejectedContent, setRejectedContent] = useState<RejectedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    async function fetchRejectedContent() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/brands/${brandId}/rejected-content`);
        if (!response.ok) {
          if (response.status === 403) {
            // This can happen if the user is not the brand admin, though the tab shouldn't show.
            // Or if the API endpoint itself has an auth issue.
            throw new Error('You are not authorized to view this content, or an error occurred.');
          }
          throw new Error('Failed to fetch rejected content.');
        }
        const data = await response.json();
        if (data.success) {
          setRejectedContent(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to process rejected content data.');
        }
      } catch (err: any) {
        console.error('Error fetching rejected content:', err);
        setError(err.message || 'Failed to load rejected content.');
        toast.error(err.message || 'Failed to load rejected content.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRejectedContent();
  }, [brandId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-semibold mb-1">Error</h3>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejected Content Queue</CardTitle>
        <CardDescription>
          These content items for the current brand have been rejected and require your attention as Brand Admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rejectedContent.length === 0 ? (
          <div className="text-center py-10">
            <Inbox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No Rejected Content</h3>
            <p className="text-muted-foreground mt-1">There are currently no rejected content items for this brand.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Content Title</th>
                  <th className="text-left p-3 font-medium">Template</th>
                  <th className="text-left p-3 font-medium">Last Updated</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rejectedContent.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{item.title}</td>
                    <td className="p-3">{item.template?.name || 'N/A'}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(item.updated_at)}</td>
                    <td className="p-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/content/${item.id}`}>
                          <Eye className="h-4 w-4 mr-1.5" /> View & Restart
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 