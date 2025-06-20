'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw, Mail } from 'lucide-react';
import Link from 'next/link';
import { trackError, getUserFriendlyErrorMessage } from '@/lib/error-tracking';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Enhanced error tracking
    trackError(error, {
      errorId: error.digest,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
    });
  }, [error]);
  
  const userFriendlyMessage = getUserFriendlyErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="mt-2">
            {userFriendlyMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {error.digest && (
                <span className="font-mono text-xs">
                  Error ID: {error.digest}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p className="mb-3">If this problem persists, please contact support</p>
            <Button variant="link" size="sm" asChild>
              <a href={`mailto:support@mixerai.com?subject=Error%20Report&body=Error%20ID:%20${error.digest || 'Unknown'}`}>
                <Mail className="mr-2 h-4 w-4" />
                support@mixerai.com
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}