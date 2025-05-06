'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from './alert';

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
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
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