'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Label } from '@/components/label';
import { Input } from '@/components/input';
import { Slider } from '@/components/slider';
import { Loader2, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/switch';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { cn } from '@/lib/utils';

interface QuickTestProps {
  className?: string;
}

export default function QuickTest({ className }: QuickTestProps) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('Explain how Azure OpenAI works in 3 sentences.');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setRequestTime(null);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/test-azure-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          temperature,
          max_tokens: maxTokens
        }),
      });
      
      const endTime = performance.now();
      setRequestTime(endTime - startTime);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
      setResponse(data.modelResponse || 'No response received');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      console.error('Error testing OpenAI:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Zap className="h-5 w-5 mr-2 text-blue-500" />
          Quick OpenAI Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="prompt" className="mb-1 block">Your prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt for the AI..."
            className="min-h-[100px]"
          />
        </div>
        
        <div className="flex items-center mb-4">
          <Switch 
            id="showAdvanced" 
            checked={showAdvanced} 
            onCheckedChange={setShowAdvanced} 
          />
          <Label htmlFor="showAdvanced" className="ml-2">Show advanced options</Label>
        </div>
        
        {showAdvanced && (
          <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="temperature">Temperature: {temperature}</Label>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={values => setTemperature(values[0])}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower values (0.0) make output more focused and deterministic.
                Higher values (1.0) make output more random and creative.
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="maxTokens">Max Tokens: {maxTokens}</Label>
              </div>
              <Slider
                id="maxTokens"
                min={10}
                max={500}
                step={10}
                value={[maxTokens]}
                onValueChange={values => setMaxTokens(values[0])}
              />
              <p className="text-xs text-gray-500 mt-1">
                Limits the length of the generated response.
              </p>
            </div>
          </div>
        )}
        
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Azure OpenAI...
            </>
          ) : (
            'Run Test'
          )}
        </Button>
        
        {requestTime !== null && (
          <div className="text-sm text-gray-500 mt-2">
            Request completed in {(requestTime / 1000).toFixed(2)} seconds
          </div>
        )}
      </CardContent>
      
      {(response || error) && (
        <CardFooter className="flex flex-col items-stretch border-t pt-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-1 flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" />
                Error
              </h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-700 mb-1 flex items-center">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Response
              </h3>
              <p className="text-sm">{response}</p>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
} 