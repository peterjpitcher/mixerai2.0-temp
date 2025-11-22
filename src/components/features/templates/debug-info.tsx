'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

export function TemplateDebugInfo() {
  const params = useParams();
  const pathname = usePathname();
  const [urlParams, setUrlParams] = useState<string>('');
  
  useEffect(() => {
    // Get URL params
    setUrlParams(window.location.search);
  }, []);
  
  return (
    <div className="fixed bottom-0 right-0 bg-red-100 p-4 border border-red-300 m-4 rounded-md z-50 text-xs font-mono">
      <h3 className="font-bold text-red-600 mb-2">Debug Information</h3>
      <div className="space-y-1">
        <p><strong>Pathname:</strong> {pathname}</p>
        <p><strong>Params:</strong> {JSON.stringify(params)}</p>
        <p><strong>URL Params:</strong> {urlParams}</p>
      </div>
    </div>
  );
} 