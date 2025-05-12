'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { Icons } from '@/components/icons';

/**
 * This component displays a warning message if the application 
 * is not configured with the correct domain in development mode
 */
export function DomainVerification() {
  const [showWarning, setShowWarning] = useState(false);
  const productionDomain = 'mixerai.orangejely.co.uk';

  useEffect(() => {
    // Only show warning in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // Check if the APP_URL is set to the production domain
    if (!appUrl || !appUrl.includes(productionDomain)) {
      setShowWarning(true);
    }
  }, []);

  if (!showWarning) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-4">
      <Icons.warning className="h-4 w-4" />
      <AlertTitle>Domain Configuration Warning</AlertTitle>
      <AlertDescription>
        The application is not configured to use the production domain <strong>{productionDomain}</strong>.
        <br />
        Run <code className="bg-muted px-1 rounded">./scripts/update-domain-config.sh</code> to configure the application,
        or see <a href="/docs/domain-configuration" className="underline">Domain Configuration Documentation</a> for manual setup.
      </AlertDescription>
    </Alert>
  );
} 