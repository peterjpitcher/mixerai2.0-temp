'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function TestBrandIdentity() {
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('Test Brand');
  const [urls, setUrls] = useState('https://example.com');
  const [country, setCountry] = useState('GB');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const generateBrandIdentity = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRawResponse(null);

    try {
      // Prepare request data
      const requestData = {
        brandName,
        urls: urls.split('\n').filter(url => url.trim() !== ''),
        countryCode: country,
        languageCode: language
      };

      console.log('Making request with data:', requestData);

      // Call API
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      // Store raw response for debugging
      const text = await response.text();
      setRawResponse(text);
      
      // Parse JSON (doing it manually after storing raw text)
      const data = JSON.parse(text);

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
      console.error('Error generating brand identity:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Brand Identity Generation Test</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Input Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="brandName">Brand Name</Label>
            <Input 
              id="brandName" 
              value={brandName} 
              onChange={(e) => setBrandName(e.target.value)} 
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country" className="mt-1">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="mt-1">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <Label htmlFor="urls">URLs (one per line)</Label>
          <Textarea 
            id="urls" 
            value={urls} 
            onChange={(e) => setUrls(e.target.value)} 
            rows={3}
            className="mt-1"
          />
        </div>
        
        <Button 
          onClick={generateBrandIdentity} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Brand Identity'
          )}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generated Brand Identity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Brand Identity</h3>
              <div className="bg-gray-50 p-4 rounded border whitespace-pre-line">
                {result.brandIdentity || 'Not provided'}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Tone of Voice</h3>
              <div className="bg-gray-50 p-4 rounded border whitespace-pre-line">
                {result.toneOfVoice || 'Not provided'}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Guardrails</h3>
              <div className="bg-gray-50 p-4 rounded border whitespace-pre-line">
                {result.guardrails || 'Not provided'}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Vetting Agencies</h3>
              {result.vettingAgencies && result.vettingAgencies.length > 0 ? (
                <ul className="bg-gray-50 p-4 rounded border space-y-2">
                  {result.vettingAgencies.map((agency: any, index: number) => (
                    <li key={index} className="border-b pb-2 last:border-0 last:pb-0">
                      <span className="font-medium">{agency.name}</span> 
                      <span className="ml-2 text-xs inline-block px-2 py-0.5 rounded bg-gray-200">
                        {agency.priority}
                      </span>
                      <p className="text-sm text-gray-600">{agency.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-gray-50 p-4 rounded border">
                  No vetting agencies provided
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Brand Color</h3>
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-md border shadow-sm" 
                style={{ backgroundColor: result.brandColor || '#CCCCCC' }}
              />
              <span className="font-mono">{result.brandColor || 'Not provided'}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        
        <div className="mb-4">
          <h3 className="text-md font-medium mb-1">Environment</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {`USE_LOCAL_GENERATION: ${process.env.NEXT_PUBLIC_USE_LOCAL_GENERATION || 'not set in client'}`}
          </pre>
        </div>
        
        {rawResponse && (
          <div>
            <h3 className="text-md font-medium mb-1">Raw API Response</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-60">
              {rawResponse}
            </pre>
          </div>
        )}
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => console.log('Full result object:', result)}
            className="text-sm"
          >
            Log Full Result to Console
          </Button>
        </div>
      </div>
    </div>
  );
} 