'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TemplateForm } from '@/components/template/template-form';
import { ArrowLeft, Loader2, ShieldAlert, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

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
      } catch (err) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        toast.error('Error fetching user data: ' + (err as Error).message);
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
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Content Templates", href: "/dashboard/templates" }, 
        { label: "Create New Template" }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/dashboard/templates'}
                aria-label="Back to Templates"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
                <p className="text-muted-foreground mt-1">Design a new content template with custom fields.</p>
            </div>
        </div>
        <Link 
          href="/dashboard/help#templates" 
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need help?
        </Link>
      </div>

      <TemplateForm />
    </div>
  );
} 