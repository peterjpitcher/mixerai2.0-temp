import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/server';

export const metadata = {
  title: 'Issues & Feedback | MixerAI',
  description: 'Access the MixerAI issue tracker or learn how to report feedback.',
};

const ISSUE_TRACKER_URL =
  process.env.NEXT_PUBLIC_ISSUE_TRACKER_URL?.trim() ||
  process.env.ISSUE_TRACKER_URL?.trim() ||
  '';

export default async function IssuesPage() {
  await requireAuth();

  if (ISSUE_TRACKER_URL) {
    redirect(ISSUE_TRACKER_URL);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Issues & Feedback' },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Issues & Feedback
        </h1>
        <p className="text-muted-foreground">
          Use the in-app issue reporter or contact support to flag problems and request enhancements.
        </p>
      </header>

      <Alert>
        <AlertTitle>Issue tracker not configured</AlertTitle>
        <AlertDescription>
          Set <code className="font-mono text-xs">NEXT_PUBLIC_ISSUE_TRACKER_URL</code> to route directly to the central
          issue tracker. Until then, use the options below to share feedback.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Report a problem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Admin users can open the Issue Reporter from the floating bug button in the dashboard. It captures screenshots,
            console logs, and environment details automatically.
          </p>
          <p className="text-xs text-muted-foreground">
            Don’t see the button? Ask an administrator to enable <code className="font-mono">NEXT_PUBLIC_ENABLE_ISSUE_REPORTER</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Prefer email or chat? Reach the MixerAI team using the channels below.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="mailto:support@mixerai.com?subject=MixerAI%20Issue%20or%20Feedback">
                Email support
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://teams.microsoft.com/l/chat/0/0?users=peter.pitcher@genmills.com" target="_blank" rel="noopener noreferrer">
                Chat on Teams
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
