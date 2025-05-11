'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useToast } from "@/components/use-toast";
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe } from 'lucide-react';
import type { Metadata } from 'next';

// export const metadata: Metadata = {
//   title: 'Content Trans-Creator | MixerAI 2.0',
//   description: 'Adapt your content for different languages and cultural contexts with AI-powered trans-creation.',
// };

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
  { value: 'US', label: 'United States', language: 'en' },
  { value: 'GB', label: 'United Kingdom', language: 'en' },
  { value: 'AU', label: 'Australia', language: 'en' },
  { value: 'CA', label: 'Canada', language: 'en' },
  { value: 'ES', label: 'Spain', language: 'es' },
  { value: 'MX', label: 'Mexico', language: 'es' },
  { value: 'AR', label: 'Argentina', language: 'es' },
  { value: 'CO', label: 'Colombia', language: 'es' },
  { value: 'FR', label: 'France', language: 'fr' },
  { value: 'CA_FR', label: 'Canada (French)', language: 'fr' },
  { value: 'BE_FR', label: 'Belgium (French)', language: 'fr' },
  { value: 'CH_FR', label: 'Switzerland (French)', language: 'fr' },
  { value: 'DE', label: 'Germany', language: 'de' },
  { value: 'AT', label: 'Austria', language: 'de' },
  { value: 'CH_DE', label: 'Switzerland (German)', language: 'de' },
  { value: 'IT', label: 'Italy', language: 'it' },
  { value: 'CH_IT', label: 'Switzerland (Italian)', language: 'it' },
  { value: 'BR', label: 'Brazil', language: 'pt' },
  { value: 'PT', label: 'Portugal', language: 'pt' },
  { value: 'NL', label: 'Netherlands', language: 'nl' },
  { value: 'BE_NL', label: 'Belgium (Dutch)', language: 'nl' },
  { value: 'JP', label: 'Japan', language: 'ja' },
  { value: 'CN', label: 'China', language: 'zh' },
  { value: 'TW', label: 'Taiwan', language: 'zh' },
  { value: 'HK', label: 'Hong Kong', language: 'zh' },
  { value: 'SG', label: 'Singapore', language: 'zh' },
  { value: 'RU', label: 'Russia', language: 'ru' },
];

/**
 * ContentTransCreatorPage provides a tool for trans-creating content across different
 * languages and cultural contexts. Users can input original content, specify source
 * and target languages/locales, and receive an AI-generated trans-creation that aims
 * to preserve intent, emotion, and impact while adapting to cultural nuances.
 */
export default function ContentTransCreatorPage() {
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [targetCountry, setTargetCountry] = useState('ES');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ transCreatedContent: string } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const { toast } = useToast();

  // Filter country options based on selected target language
  const filteredCountryOptions = countryOptions.filter(
    country => country.language === targetLanguage
  );

  // Update target country when target language changes
  const handleTargetLanguageChange = (value: string) => {
    setTargetLanguage(value);
    
    // Find the first country that matches the new language
    const matchingCountry = countryOptions.find(country => country.language === value);
    if (matchingCountry) {
      setTargetCountry(matchingCountry.value);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content) {
      toast({
        title: 'Content required',
        description: 'Please enter content to trans-create.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!targetLanguage) {
      toast({
        title: 'Target language required',
        description: 'Please select a target language.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!targetCountry) {
      toast({
        title: 'Target country required',
        description: 'Please select a target country.',
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
        throw new Error(data.error || 'Failed to trans-create content.');
      }
      
      if (data.success) {
        setResults({
          transCreatedContent: data.transCreatedContent,
        });
        
        toast({
          title: 'Content Trans-Created',
          description: 'Content has been successfully trans-created.',
        });
      } else {
        throw new Error(data.error || 'Failed to trans-create content.');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
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
        title: 'Copied to Clipboard',
        description: 'The trans-created content has been copied to your clipboard.',
      });
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-bold mb-6">Content Trans-Creator</h1>
      <p className="text-muted-foreground mb-2">
        Transform content across languages and cultures with our AI-powered trans-creation tool.
      </p>
      <p className="text-muted-foreground mb-2">
        <strong>Why trans-creation matters:</strong> Unlike direct translation, trans-creation preserves 
        the intent, emotion, and impact of your original content while adapting it for cultural nuances.
      </p>
      <p className="text-muted-foreground mb-8">
        This ensures your message resonates authentically with native speakers, maintaining brand voice 
        while avoiding cultural missteps and translation awkwardness.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Original Content</CardTitle>
            <CardDescription>
              Select languages and enter content to trans-create.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Language Settings</Label>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[150px]">
                    <div className="border rounded-md p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">FROM</p>
                      <Select
                        value={sourceLanguage}
                        onValueChange={setSourceLanguage}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="sourceLanguage" className="border-0 p-0 h-8 shadow-none">
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
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <div className="border rounded-md p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">TO</p>
                      <Select
                        value={targetLanguage}
                        onValueChange={handleTargetLanguageChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="targetLanguage" className="border-0 p-0 h-8 shadow-none">
                          <SelectValue placeholder="Select language" />
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
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <div className="border rounded-md p-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">LOCALE</p>
                      <Select
                        value={targetCountry}
                        onValueChange={setTargetCountry}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="targetCountry" className="border-0 p-0 h-8 shadow-none">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCountryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
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