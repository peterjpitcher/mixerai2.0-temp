'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe } from 'lucide-react';

// Language options
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
];

// Country options
const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'ES', label: 'Spain' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'IT', label: 'Italy' },
  { value: 'BR', label: 'Brazil' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'RU', label: 'Russia' },
];

export default function ContentTransCreatorPage() {
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [targetCountry, setTargetCountry] = useState('ES');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ transCreatedContent: string } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content) {
      toast({
        title: 'Content required',
        description: 'Please enter content to trans-create',
        variant: 'destructive',
      });
      return;
    }
    
    if (!targetLanguage) {
      toast({
        title: 'Target language required',
        description: 'Please select a target language',
        variant: 'destructive',
      });
      return;
    }
    
    if (!targetCountry) {
      toast({
        title: 'Target country required',
        description: 'Please select a target country',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      const response = await fetch('/api/tools/content-transcreator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sourceLanguage,
          targetLanguage,
          targetCountry,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trans-create content');
      }
      
      if (data.success) {
        setResults({
          transCreatedContent: data.transCreatedContent,
        });
        
        toast({
          title: 'Content trans-created',
          description: 'Content has been successfully trans-created',
        });
      } else {
        throw new Error(data.error || 'Failed to trans-create content');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = () => {
    if (results?.transCreatedContent) {
      copyToClipboard(results.transCreatedContent);
      toast({
        title: 'Copied to clipboard',
        description: 'Trans-created content has been copied to clipboard',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Content Trans-Creator</h1>
      <p className="text-muted-foreground mb-8">
        Trans-create content (not just translate) for different languages and cultures.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Original Content</CardTitle>
            <CardDescription>
              Enter the content you want to trans-create.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your content here..."
                  value={content}
                  onChange={handleContentChange}
                  disabled={isLoading}
                  className="min-h-[200px]"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {characterCount} characters
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceLanguage">Source Language</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="sourceLanguage">
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetLanguage">Target Language</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="targetLanguage">
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetCountry">Target Country</Label>
                  <Select
                    value={targetCountry}
                    onValueChange={setTargetCountry}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="targetCountry">
                      <SelectValue placeholder="Select target country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <input type="hidden" name="sourceLanguage" value={sourceLanguage} />
              <input type="hidden" name="targetLanguage" value={targetLanguage} />
              <input type="hidden" name="targetCountry" value={targetCountry} />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Trans-creating...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Trans-Create Content
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Trans-Created Content</CardTitle>
            <CardDescription>
              Content adapted for {languageOptions.find(l => l.value === targetLanguage)?.label || 'target language'} in {countryOptions.find(c => c.value === targetCountry)?.label || 'target country'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trans-created-content">Result</Label>
              <div className="flex">
                <Textarea
                  id="trans-created-content"
                  placeholder="Trans-created content will appear here"
                  value={results?.transCreatedContent || ''}
                  readOnly
                  className="flex-1 min-h-[200px]"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyContent}
                  disabled={!results?.transCreatedContent}
                  title="Copy to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Trans-creation adapts content culturally rather than providing a direct translation, making it more relevant and natural for the target audience.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 