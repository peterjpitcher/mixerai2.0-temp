'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Label } from '@/components/label';
import { Input } from '@/components/input';
import { Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Switch } from '@/components/switch';

export default function DirectApiTest() {
  const [loading, setLoading] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('brands/identity');
  const [method, setMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    brandName: 'Test Brand',
    urls: ['https://example.com'],
    countryCode: 'GB',
    languageCode: 'en',
    includeDebugInfo: true
  }, null, 2));
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('https://api.openai.com/v1/chat/completions');
  const [customHeaders, setCustomHeaders] = useState(JSON.stringify({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY_HERE'
  }, null, 2));

  const availableEndpoints = [
    { value: 'brands/identity', label: 'Brand Identity Generation' },
    { value: 'content/generate', label: 'Content Generation' },
    { value: 'test-azure-openai', label: 'Azure OpenAI Test' },
    { value: 'env-check', label: 'Environment Info' },
  ];

  const runRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setRequestTime(null);
    
    const startTime = performance.now();

    try {
      let url = useCustomEndpoint ? customEndpoint : `/api/${apiEndpoint}`;
      let headers = useCustomEndpoint 
        ? JSON.parse(customHeaders)
        : { 'Content-Type': 'application/json' };
      
      // Parse request body if provided and method is not GET
      let parsedBody;
      try {
        parsedBody = method !== 'GET' ? JSON.parse(requestBody) : undefined;
      } catch (err) {
        throw new Error('Invalid JSON in request body');
      }

      console.log(`Making ${method} request to ${url}`);
      
      // Build request options
      const options: RequestInit = {
        method,
        headers
      };

      // Add body for non-GET requests
      if (method !== 'GET' && parsedBody) {
        options.body = JSON.stringify(parsedBody);
      }

      // Make the request
      const response = await fetch(url, options);
      
      // Calculate request time
      const endTime = performance.now();
      setRequestTime(endTime - startTime);

      // Get response text
      const text = await response.text();
      
      // Try to parse as JSON for pretty display
      try {
        const json = JSON.parse(text);
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        // If not valid JSON, just use the raw text
        setResponse(text);
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
      console.error('Error making request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Direct API Test</h2>
      
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="useCustomEndpoint" 
            checked={useCustomEndpoint} 
            onCheckedChange={setUseCustomEndpoint} 
          />
          <Label htmlFor="useCustomEndpoint">Use external API endpoint</Label>
        </div>
        
        {useCustomEndpoint ? (
          <>
            <div className="mb-4">
              <Label htmlFor="customEndpoint">API Endpoint URL</Label>
              <Input 
                id="customEndpoint" 
                value={customEndpoint} 
                onChange={(e) => setCustomEndpoint(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="customHeaders">
                Headers <span className="text-xs text-gray-500">(JSON format)</span>
              </Label>
              <Textarea 
                id="customHeaders" 
                value={customHeaders} 
                onChange={(e) => setCustomHeaders(e.target.value)}
                rows={4}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </>
        ) : (
          <div className="mb-4">
            <Label htmlFor="apiEndpoint">API Endpoint</Label>
            <Select value={apiEndpoint} onValueChange={setApiEndpoint}>
              <SelectTrigger id="apiEndpoint" className="mt-1">
                <SelectValue placeholder="Select API endpoint" />
              </SelectTrigger>
              <SelectContent>
                {availableEndpoints.map((endpoint) => (
                  <SelectItem key={endpoint.value} value={endpoint.value}>
                    {endpoint.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              Will call: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">/api/{apiEndpoint}</code>
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="method">HTTP Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method" className="mt-1">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <Label htmlFor="requestBody">
          Request Body <span className="text-xs text-gray-500">(JSON format)</span>
        </Label>
        <Textarea 
          id="requestBody" 
          value={requestBody} 
          onChange={(e) => setRequestBody(e.target.value)}
          rows={10}
          className="mt-1 font-mono text-sm"
          disabled={method === 'GET'}
        />
        {method === 'GET' && (
          <p className="mt-1 text-xs text-gray-500">Request body is not used with GET requests</p>
        )}
      </div>
      
      <Button 
        onClick={runRequest} 
        disabled={loading}
        className="w-full mb-6"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Request...
          </>
        ) : (
          'Send API Request'
        )}
      </Button>
      
      {requestTime !== null && (
        <div className="text-sm text-gray-500 mb-4">
          Request completed in {(requestTime / 1000).toFixed(2)} seconds
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Error
          </h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {response && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Response</h3>
            <div className="flex items-center space-x-2">
              <Switch 
                id="showRawResponse" 
                checked={showRawResponse} 
                onCheckedChange={setShowRawResponse} 
              />
              <Label htmlFor="showRawResponse" className="text-sm">Show raw response</Label>
            </div>
          </div>
          
          <pre className={`p-4 rounded text-xs overflow-auto max-h-[400px] ${
            showRawResponse ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 border text-gray-800'
          }`}>
            {response}
          </pre>
        </div>
      )}
    </div>
  );
} 