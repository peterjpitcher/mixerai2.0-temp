'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/accordion';

export default function ContentGenerationTest() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('New Blog Post');
  const [contentType, setContentType] = useState('blog');
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('Write a blog post about sustainable business practices.');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);

  // Fetch brands and content types on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandsResponse, contentTypesResponse] = await Promise.all([
          fetch('/api/brands'),
          fetch('/api/content-types')
        ]);

        const brandsData = await brandsResponse.json();
        const contentTypesData = await contentTypesResponse.json();

        if (brandsData.success && brandsData.data) {
          setBrands(brandsData.data);
          // Set default brand if available
          if (brandsData.data.length > 0) {
            setBrandId(brandsData.data[0].id);
          }
        }

        if (contentTypesData.success && contentTypesData.data) {
          setContentTypes(contentTypesData.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  const generateContent = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRawResponse(null);
    setRequestTime(null);
    
    const startTime = performance.now();

    try {
      // Prepare request data
      const requestData = {
        title,
        contentType,
        brandId,
        prompt,
        includeDebugInfo: true
      };

      console.log('Making request with data:', requestData);

      // Call API
      const response = await fetch('/api/content/generate', {
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
      console.error('Error generating content:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAIGenerated = () => {
    if (!result) return false;
    
    // Heuristics to check if content appears to be AI-generated
    // 1. Check if content matches exactly the pattern of template content
    const isTemplate = result.body?.includes("This is placeholder text");
    
    // 2. Check for uniqueness in relation to prompt
    const hasPromptReferences = result.body?.includes(prompt.substring(0, 10)); 
    
    // 3. Check content length is substantial
    const hasSubstantialContent = (result.body?.length || 0) > 200;
    
    return !isTemplate || (hasPromptReferences && hasSubstantialContent);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Content Generation Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="mt-1"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger id="contentType" className="mt-1">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.length > 0 ? (
                  contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="blog">Blog Post</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger id="brand" className="mt-1">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.length > 0 ? (
                  brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="default">Default Brand</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <Label htmlFor="prompt">Generation Prompt</Label>
        <Textarea 
          id="prompt" 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          rows={3}
          className="mt-1"
        />
      </div>
      
      <Button 
        onClick={generateContent} 
        disabled={loading}
        className="w-full mb-8"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Content'
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
              This assessment is based on content uniqueness, references to prompt terms, and deviation from known templates.
            </p>
          </div>
          
          <Accordion type="single" collapsible defaultValue="content">
            <AccordionItem value="content">
              <AccordionTrigger>Content Preview</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="text-md font-medium mb-2">Title</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      {result.title || title}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Meta Title</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      {result.metaTitle || 'Not provided'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Meta Description</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      {result.metaDescription || 'Not provided'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Content</h4>
                    <div className="bg-white p-3 rounded border whitespace-pre-line text-sm">
                      {result.body || 'Not provided'}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="rawResponse">
              <AccordionTrigger>Raw API Response</AccordionTrigger>
              <AccordionContent>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto max-h-[400px]">
                  {rawResponse ? JSON.stringify(JSON.parse(rawResponse), null, 2) : 'No response data'}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
} 