'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bug, Image as ImageIcon, Terminal, Network, CheckCircle } from 'lucide-react';
import { captureScreenshot, compressImage, getScreenshotSize } from '@/lib/issue-reporter/screenshot-capture';
import { consoleCapture, ConsoleLog, NetworkLog } from '@/lib/issue-reporter/console-capture';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description must be less than 5000 characters'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
});

type FormData = z.infer<typeof formSchema>;

interface IssueReporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  preloadedScreenshot?: string | null;
}

export function IssueReporterModal({ isOpen, onClose, preloadedScreenshot }: IssueReporterModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ issueNumber: number; issueUrl: string } | null>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'P2',
    },
  });

  useEffect(() => {
    if (isOpen) {
      captureData();
    } else {
      // Reset form when closed
      form.reset();
      setScreenshot(null);
      setSuccess(null);
      setError(null);
    }
  }, [isOpen, form]);

  const captureData = async () => {
    setIsCapturing(true);
    
    try {
      // Capture console logs
      const logs = consoleCapture.getConsoleLogs();
      setConsoleLogs(logs);
      
      // Capture network logs
      const netLogs = consoleCapture.getNetworkLogs();
      setNetworkLogs(netLogs);
      
      // Use preloaded screenshot if available
      if (preloadedScreenshot) {
        // Check if compression is needed
        const size = getScreenshotSize(preloadedScreenshot);
        if (size > 500) {
          const compressed = await compressImage(preloadedScreenshot, 500);
          setScreenshot(compressed);
        } else {
          setScreenshot(preloadedScreenshot);
        }
      } else {
        // Fallback: capture screenshot now (though this will include the modal)
        const screenshotData = await captureScreenshot();
        if (screenshotData) {
          const size = getScreenshotSize(screenshotData);
          if (size > 500) {
            const compressed = await compressImage(screenshotData, 500);
            setScreenshot(compressed);
          } else {
            setScreenshot(screenshotData);
          }
        }
      }
    } catch (err) {
      console.error('Error capturing data:', err);
      toast.error('Failed to capture some diagnostic data');
    } finally {
      setIsCapturing(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get CSRF token from cookies
      const getCSRFToken = (): string | null => {
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
        return csrfMatch && csrfMatch[1] ? decodeURIComponent(csrfMatch[1]) : null;
      };

      const csrfToken = getCSRFToken();
      
      const environment = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/github/issues', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          screenshot,
          consoleLogs,
          networkLogs,
          environment,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Try again after ${new Date(result.resetTime).toLocaleTimeString()}`);
        }
        throw new Error(result.error || 'Failed to create issue');
      }

      setSuccess({
        issueNumber: result.data.issueNumber,
        issueUrl: result.data.issueUrl,
      });
      
      toast.success(`Issue #${result.data.issueNumber} has been created successfully`);

      // Close modal after a delay
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create issue';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Issue Created Successfully!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Issue #{success.issueNumber} has been created in GitHub.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button asChild>
                <a href={success.issueUrl} target="_blank" rel="noopener noreferrer">
                  View Issue
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Describe the issue you're experiencing. We'll automatically capture diagnostic information.
          </DialogDescription>
        </DialogHeader>

        {isCapturing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Capturing diagnostic data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error('Form validation errors:', errors);
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                toast.error(`Validation failed: ${firstError.message}`);
              }
            })} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto px-1">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of the issue" {...field} />
                        </FormControl>
                        <FormDescription>
                          Provide a clear, concise title for the issue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what happened, what you expected, and steps to reproduce..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include as much detail as possible
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="P0">P0: Critical - System is unusable</SelectItem>
                            <SelectItem value="P1">P1: High - Major functionality broken</SelectItem>
                            <SelectItem value="P2">P2: Medium - Minor functionality issue</SelectItem>
                            <SelectItem value="P3">P3: Low - Cosmetic or minor issue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Diagnostic Data</h4>
                    <Tabs defaultValue="screenshot" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="screenshot" className="text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Screenshot
                        </TabsTrigger>
                        <TabsTrigger value="console" className="text-xs">
                          <Terminal className="h-3 w-3 mr-1" />
                          Console ({consoleLogs.length})
                        </TabsTrigger>
                        <TabsTrigger value="network" className="text-xs">
                          <Network className="h-3 w-3 mr-1" />
                          Network ({networkLogs.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="screenshot" className="mt-2">
                        {screenshot ? (
                          <div className="relative">
                            <img
                              src={screenshot}
                              alt="Screenshot"
                              className="w-full rounded border max-h-[200px] object-cover"
                            />
                            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
                              {getScreenshotSize(screenshot)}KB
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No screenshot captured
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="console" className="mt-2">
                        <ScrollArea className="h-[200px] w-full rounded border p-2">
                          {consoleLogs.length > 0 ? (
                            <div className="space-y-1 font-mono text-xs">
                              {consoleLogs.map((log, i) => (
                                <div
                                  key={i}
                                  className={`flex gap-2 ${
                                    log.level === 'error' ? 'text-red-600' :
                                    log.level === 'warn' ? 'text-yellow-600' :
                                    'text-muted-foreground'
                                  }`}
                                >
                                  <span className="opacity-50">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                                  <span className="break-all">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No console logs captured
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="network" className="mt-2">
                        <ScrollArea className="h-[200px] w-full rounded border p-2">
                          {networkLogs.length > 0 ? (
                            <div className="space-y-1 font-mono text-xs">
                              {networkLogs.map((log, i) => (
                                <div key={i} className="flex gap-2 text-muted-foreground">
                                  <span className="opacity-50">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className="font-semibold">{log.method}</span>
                                  <span className="truncate flex-1">{log.url}</span>
                                  <span className={log.error ? 'text-red-600' : ''}>
                                    {log.status || log.error || 'pending'}
                                  </span>
                                  {log.duration && <span>{log.duration}ms</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No network requests captured
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Issue...
                    </>
                  ) : (
                    'Submit Issue'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}