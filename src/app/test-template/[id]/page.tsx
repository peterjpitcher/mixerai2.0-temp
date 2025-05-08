'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function TestTemplatePage() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const id = params?.id;
        console.log('Test page - Template ID from params:', id);
        
        if (!id) {
          setError('No ID parameter found');
          return;
        }
        
        // First try our direct API route
        const response = await fetch(`/api/content-templates/${id}`);
        const data = await response.json();
        
        console.log('Test page - API response:', data);
        setResult(data);
      } catch (error) {
        console.error('Test page - Error:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [params]);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Template API Test Page</h1>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold">Route Parameters</h2>
        <pre className="bg-white p-2 mt-2 rounded">{JSON.stringify(params, null, 2)}</pre>
      </div>
      
      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          <h2 className="font-semibold">Error</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold">API Response</h2>
          <pre className="bg-white p-2 mt-2 rounded overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
} 