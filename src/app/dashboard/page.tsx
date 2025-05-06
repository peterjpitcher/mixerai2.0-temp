'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Domain verification component for dashboard
function DomainCheck() {
  useEffect(() => {
    const productionDomain = 'mixerai.orangejely.co.uk';
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      const container = document.getElementById('domain-verification-container');
      if (!container) return;
      
      const hostname = window.location.hostname;
      const isConfigured = hostname === productionDomain || 
                          process.env.NEXT_PUBLIC_APP_URL?.includes(productionDomain);
      
      if (!isConfigured) {
        container.innerHTML = `
          <div class="p-4 rounded-lg border border-yellow-500/50 text-yellow-700 bg-yellow-50 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-4 top-4">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div class="pl-7">
              <h5 class="mb-1 font-medium leading-none tracking-tight">Domain Configuration Warning</h5>
              <div class="text-sm">
                The application is not configured to use the production domain <strong>${productionDomain}</strong>.<br>
                Run <code class="bg-muted px-1 rounded">./scripts/update-domain-config.sh</code> to configure the application.
              </div>
            </div>
          </div>
        `;
      }
    }
  }, []);
  
  return null;
}

export default function DashboardRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to new dashboard location...</p>
      </div>
    </div>
  );
} 