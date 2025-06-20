'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw, Mail } from 'lucide-react';
import Link from 'next/link';
import { trackError, getUserFriendlyErrorMessage } from '@/lib/error-tracking';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Enhanced error tracking for dashboard
    trackError(error, {
      errorId: error.digest,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
    });
  }, [error]);

  const isPermissionError = error.message?.toLowerCase().includes('permission') || 
                          error.message?.toLowerCase().includes('unauthorized');
  const userFriendlyMessage = getUserFriendlyErrorMessage(error);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {isPermissionError ? 'Access Denied' : 'Dashboard Error'}
          </CardTitle>
          <CardDescription className="mt-2">
            {userFriendlyMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                Error ID: {error.digest}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please include this ID if you contact support
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2">
            {!isPermissionError && (
              <Button onClick={reset} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant={isPermissionError ? "default" : "outline"} 
              asChild 
              className="flex-1"
            >
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Need help? Contact your administrator or support team.
            </p>
            <Button variant="link" size="sm" asChild>
              <a href={`mailto:support@mixerai.com?subject=Dashboard%20Error&body=Error%20ID:%20${error.digest || 'Unknown'}`}>
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}