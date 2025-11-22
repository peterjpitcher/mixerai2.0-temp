'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TemplateForm } from '@/components/features/templates/template-form';
import { ArrowLeft, Loader2, ShieldAlert, HelpCircle, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { useTemplateSession } from '../use-template-session';

const SessionErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
    <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
    <h3 className="text-xl font-bold mb-2">Unable to verify your access</h3>
    <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

export default function NewTemplatePage() {
  const {
    user: currentUser,
    isLoading: isLoadingUser,
    error: sessionError,
    status: sessionStatus,
    refetch: refetchSession,
  } = useTemplateSession();

  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Verifying permissions…</p>
      </div>
    );
  }

  if (sessionError && sessionStatus !== 403) {
    return <SessionErrorState message={sessionError} onRetry={() => void refetchSession()} />;
  }

  const isGlobalAdmin = currentUser?.user_metadata?.role === 'admin';
  const isForbidden = sessionStatus === 403 || !isGlobalAdmin;

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">
          {sessionStatus === 403
            ? sessionError || 'You do not have permission to create new Content Templates.'
            : 'You do not have permission to create new Content Templates.'}
        </p>
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
