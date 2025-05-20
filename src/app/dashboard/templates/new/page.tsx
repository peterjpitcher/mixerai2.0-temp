'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TemplateForm } from '@/components/template/template-form';
import { ChevronLeft, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// Define UserSessionData interface (copied for standalone use here)
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string;
  }>;
}

// export const metadata: Metadata = { // Metadata should be handled differently for client components if needed
//   title: 'Create Template | MixerAI',
//   description: 'Create a new content template.',
// };

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

export default function NewTemplatePage() {
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          toast.error(data.error || 'Could not verify your session.');
        }
      } catch (err: any) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + err.message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading user data...</p>
      </div>
    );
  }

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';

  if (!isGlobalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You do not have permission to create new Content Templates.</p>
        <Link href="/dashboard/templates">
          <Button variant="outline" className="mt-4">Back to Templates</Button>
        </Link>
      </div>
    );
  }

  // Original page content for Global Admins
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: "Create New Template" }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <Link href="/dashboard/templates" passHref>
                <Button variant="outline" size="icon" aria-label="Back to Templates">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
                <p className="text-muted-foreground mt-1">Design a new content template with custom fields.</p>
            </div>
        </div>
      </div>

      <TemplateForm />
    </div>
  );
} 