'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Badge } from '@/components/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import or create accordion components
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/accordion';

interface EnvironmentCheckProps {
  className?: string;
}

export default function EnvironmentCheck({ className }: EnvironmentCheckProps) {
  const [envData, setEnvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnvironmentData = async () => {
      try {
        const response = await fetch('/api/env-check');
        const data = await response.json();
        
        if (data.success) {
          setEnvData(data);
        } else {
          setError(data.error || 'Failed to fetch environment data');
        }
      } catch (err: any) {
        setError(`Request failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironmentData();
  }, []);

  if (loading) {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Environment Check</CardTitle>
        </CardHeader>
        <CardContent className="py-2 flex justify-center">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Environment Check</CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-red-500 text-sm">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">Environment Configuration</CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-3">
        <Accordion type="single" collapsible>
          <AccordionItem value="azure">
            <AccordionTrigger className="text-sm py-2">
              <div className="flex items-center">
                <span>Azure OpenAI</span>
                {envData?.azureOpenAIEnabled ? (
                  <Badge className="ml-2 bg-green-100 text-green-800">Enabled</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">Disabled</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span className="text-gray-500">API Version:</span>
                  <span className="font-mono">{envData?.azureApiVersion || 'Not set'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Endpoint:</span>
                  <span className="font-mono truncate max-w-[180px]" title={envData?.azureEndpoint}>
                    {envData?.azureEndpoint ? '✓ Set' : '✗ Not set'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Deployment:</span>
                  <span className="font-mono">{envData?.azureDeployment || 'Not set'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">API Key:</span>
                  <span className="font-mono">{envData?.azureApiKey ? '✓ Set' : '✗ Not set'}</span>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="feature-flags">
            <AccordionTrigger className="text-sm py-2">Feature Flags</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span className="text-gray-500">Use Local Generation:</span>
                  <span>{envData?.useLocalGeneration ? 'Yes' : 'No'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Debug Mode:</span>
                  <span>{envData?.debugMode ? 'Enabled' : 'Disabled'}</span>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="database">
            <AccordionTrigger className="text-sm py-2">
              <div className="flex items-center">
                <span>Database</span>
                {envData?.supabaseConnected ? (
                  <Badge className="ml-2 bg-green-100 text-green-800">Connected</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">Disconnected</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span className="text-gray-500">Provider:</span>
                  <span>{envData?.databaseProvider || 'Unknown'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Supabase URL:</span>
                  <span className="font-mono">{envData?.supabaseUrl ? '✓ Set' : '✗ Not set'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Direct Connection:</span>
                  <span>{envData?.directDbConnected ? 'Available' : 'Not available'}</span>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
} 