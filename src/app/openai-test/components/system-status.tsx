'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStatusProps {
  className?: string;
}

export default function SystemStatus({ className }: SystemStatusProps) {
  const [status, setStatus] = useState<{
    azureOpenAI: 'loading' | 'success' | 'error';
    templates: 'loading' | 'success' | 'error';
    supabase: 'loading' | 'success' | 'error';
  }>({
    azureOpenAI: 'loading',
    templates: 'loading',
    supabase: 'loading'
  });

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Check if API endpoints are available
        const response = await fetch('/api/env-check');
        const data = await response.json();
        
        setStatus({
          azureOpenAI: data.azureOpenAIEnabled ? 'success' : 'error',
          templates: data.localTemplatesAvailable ? 'success' : 'error',
          supabase: data.supabaseConnected ? 'success' : 'error'
        });
      } catch (error) {
        console.error('Failed to check system status:', error);
        setStatus({
          azureOpenAI: 'error',
          templates: 'error',
          supabase: 'error'
        });
      }
    };

    checkSystemStatus();
  }, []);

  const StatusIndicator = ({ status }: { status: 'loading' | 'success' | 'error' }) => {
    if (status === 'loading') {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    } else if (status === 'success') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-3">
        <ul className="space-y-2">
          <li className="flex items-center justify-between text-sm">
            <span>Azure OpenAI</span>
            <StatusIndicator status={status.azureOpenAI} />
          </li>
          <li className="flex items-center justify-between text-sm">
            <span>Local Templates</span>
            <StatusIndicator status={status.templates} />
          </li>
          <li className="flex items-center justify-between text-sm">
            <span>Supabase Connection</span>
            <StatusIndicator status={status.supabase} />
          </li>
        </ul>
      </CardContent>
    </Card>
  );
} 