'use client';

import { useEffect, useState } from 'react';

export function DebugComponent() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      originalConsoleError(...args);
      setError(args.join(' '));
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  if (!error) return null;

  return (
    <div className="p-4 mb-4 bg-red-100 text-red-800 rounded border border-red-200">
      <h3 className="font-bold">Debug Error:</h3>
      <pre className="text-xs mt-2 overflow-auto max-h-40">{error}</pre>
    </div>
  );
} 