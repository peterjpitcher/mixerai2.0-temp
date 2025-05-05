'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';

export default function BrandIdentityTest() {
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('Test Brand');
  const [urls, setUrls] = useState('https://example.com');
  const [country, setCountry] = useState('GB');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);

  const generateBrandIdentity = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRawResponse(null);
    setRequestTime(null);
    
    const startTime = performance.now();

    try {
      // Prepare request data
      const requestData = {
        brandName,
        urls: urls.split('\n').filter(url => url.trim() !== ''),
        countryCode: country,
        languageCode: language,
        includeDebugInfo: true // Add debug flag
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

      // Calculate request time
      const endTime = performance.now();
      setRequestTime(endTime - startTime);

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

  const isAIGenerated = () => {
    if (!result) return false;
    
    // Heuristics to check if content appears to be AI-generated
    // 1. Check if content matches exactly the pattern of template content
    const isTemplate = result.brandIdentity?.includes("projects a professional, reliable, and customer-focused personality");
    
    // 2. Check for uniqueness in relation to brand name
    const hasBrandNameReferences = result.brandIdentity?.includes(brandName) 
      || result.toneOfVoice?.includes(brandName);
    
    // 3. Check content length is substantial
    const hasSubstantialContent = (result.brandIdentity?.length || 0) > 200;
    
    // 4. Check for varied guardrails (not just generic ones)
    const hasVariedGuardrails = !result.guardrails?.includes("Maintain transparency in all communications");
    
    return !isTemplate || (hasBrandNameReferences && hasSubstantialContent && hasVariedGuardrails);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Brand Identity Generation Test</h2>
      
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
        className="w-full mb-8"
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
      
      {result && (
        <>
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-semibold mr-3">AI Detection Results</h3>
              {isAIGenerated() ? (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Likely AI-generated
                </span>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Likely template content
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              This assessment is based on content uniqueness, references to brand name, and deviation from known templates.
            </p>
          </div>
          
          <Accordion type="single" collapsible defaultValue="content">
            <AccordionItem value="content">
              <AccordionTrigger>Content Preview</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="text-md font-medium mb-2">Brand Identity</h4>
                    <div className="bg-white p-3 rounded border whitespace-pre-line text-sm">
                      {result.brandIdentity || 'Not provided'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Tone of Voice</h4>
                    <div className="bg-white p-3 rounded border whitespace-pre-line text-sm">
                      {result.toneOfVoice || 'Not provided'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Guardrails</h4>
                    <div className="bg-white p-3 rounded border whitespace-pre-line text-sm">
                      {result.guardrails || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="text-md font-medium mb-2">Brand Color</h4>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-8 h-8 rounded-md border shadow-sm" 
                          style={{ backgroundColor: result.brandColor || '#CCCCCC' }}
                        />
                        <span className="font-mono text-sm">{result.brandColor || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="agencies">
              <AccordionTrigger>Vetting Agencies ({result.vettingAgencies?.length || 0})</AccordionTrigger>
              <AccordionContent>
                {result.vettingAgencies && result.vettingAgencies.length > 0 ? (
                  <ul className="space-y-2">
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
                  <p className="text-gray-500">No vetting agencies provided</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="rawResponse">
              <AccordionTrigger>Raw API Response</AccordionTrigger>
              <AccordionContent>
                <div className="bg-gray-100 p-4 rounded border overflow-x-auto">
                  <pre className="text-xs">{rawResponse || 'No response data'}</pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
} 