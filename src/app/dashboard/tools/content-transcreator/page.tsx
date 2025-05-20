'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Loader2, ClipboardCopy, Globe, ArrowLeft, AlertTriangle, Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from "@/components/skeleton";
import { BrandIcon } from '@/components/brand-icon';

// export const metadata: Metadata = {
//   title: 'Content Trans-Creator | MixerAI 2.0',
//   description: 'Adapt your content for different languages and cultural contexts with AI-powered trans-creation.',
// };

// Language options - can be kept for source language or if no brand is selected (though API requires brand)
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

// Country options - will be determined by selected brand's settings
// const countryOptions = [ ... ]; // This might become redundant if brand drives the target country

// Placeholder Breadcrumbs component
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string; 
  }>;
}

interface Brand {
  id: string;
  name: string;
  language: string; // Expecting language from brand data
  country: string;  // Expecting country from brand data
  color?: string;
}

/**
 * ContentTransCreatorPage provides a tool for trans-creating content.
 * Users input original content, select a source language, and choose a target brand.
 * The trans-creation will target the selected brand's configured language and country.
 */
export default function ContentTransCreatorPage() {
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  // Target language and country will be derived from the selected brand
  // const [targetLanguage, setTargetLanguage] = useState('es'); 
  // const [targetCountry, setTargetCountry] = useState('ES');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ transCreatedContent: string, targetLanguage: string, targetCountry: string } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  useEffect(() => {
    const fetchCurrentUserAndBrands = async () => {
      setIsLoadingUser(true);
      setIsLoadingBrands(true);
      setUserError(null);
      try {
        const userResponse = await fetch('/api/me');
        if (!userResponse.ok) {
          const errorData = await userResponse.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        if (userData.success && userData.user) {
          setCurrentUser(userData.user);
          
          // User is fetched, now fetch brands
          const brandsResponse = await fetch('/api/brands');
          if (!brandsResponse.ok) {
            throw new Error('Failed to fetch brands');
          }
          const brandsData = await brandsResponse.json();
          if (brandsData.success && Array.isArray(brandsData.data)) {
            // Filter brands to only include those with language and country
            const validBrands = brandsData.data.filter((b: Brand) => b.language && b.country);
            setBrands(validBrands);
            if (validBrands.length > 0) {
              setSelectedBrandId(validBrands[0].id); // Default to first valid brand
            } else {
               toast.info("No brands with required language/country settings found. Please configure a brand first.");
            }
          } else {
            setBrands([]);
            toast.error(brandsData.error || 'Could not load brands.');
          }

        } else {
          setCurrentUser(null);
          setUserError(userData.error || 'User data not found in session.');
        }
      } catch (error: any) {
        console.error('[ContentTransCreatorPage] Error fetching initial data:', error);
        setUserError(error.message || 'An unexpected error occurred while fetching data.');
        toast.error(error.message || 'Failed to load required data.');
      } finally {
        setIsLoadingUser(false);
        setIsLoadingBrands(false);
      }
    };
    fetchCurrentUserAndBrands();
  }, []);

  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      setIsCheckingPermissions(true);
      const userRole = currentUser.user_metadata?.role;
      const canAccess = userRole === 'admin' || userRole === 'editor';
      setIsAllowedToAccess(canAccess);
      if (!canAccess) {
        toast.error("You don't have permission to access this tool.");
      }
      setIsCheckingPermissions(false);
    } else if (!isLoadingUser && !currentUser) {
      setIsAllowedToAccess(false);
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isLoadingUser]);


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const selectedBrandDetails = brands.find(b => b.id === selectedBrandId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAllowedToAccess) {
      toast.error("You do not have permission to use this tool.");
      return;
    }
    if (!content) {
      toast.error('Please enter content to trans-create.');
      return;
    }
    if (!selectedBrandId) {
      toast.error('Please select a target brand. The brand must have language and country configured.');
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
          brand_id: selectedBrandId, // Pass selected brand_id
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trans-create content.');
      }
      
      if (data.success) {
        setResults({
          transCreatedContent: data.transCreatedContent,
          targetLanguage: data.targetLanguage, // Get target lang/country from response
          targetCountry: data.targetCountry,
        });
        
        toast.success('Content has been successfully trans-created.');
      } else {
        throw new Error(data.error || 'Failed to trans-create content.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = () => {
    if (results?.transCreatedContent) {
      copyToClipboard(results.transCreatedContent);
      toast.success('Trans-created content copied to clipboard!');
    }
  };
  
  if (isLoadingUser || isCheckingPermissions || isLoadingBrands) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading tool...</p>
      </div>
    );
  }

  if (!isAllowedToAccess && !userError) { // If no specific user error, but not allowed
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You do not have the necessary permissions (Admin or Editor role required) to use this tool.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading User</h2>
        <p className="text-muted-foreground mb-4">{userError}</p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Tools", href: "/dashboard/tools" },
        { label: "Content Trans-Creator" }
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
           <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/tools')} aria-label="Back to Tools">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Trans-Creator</h1>
            <p className="text-muted-foreground mt-1">
              Adapt your content for different languages and cultural contexts. 
              The target language and country are determined by the selected brand's settings.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Input Content</CardTitle>
            <CardDescription>Enter the original content you want to trans-create.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content">Original Content (Max 5000 characters)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Paste or type your content here..."
                  rows={10}
                  maxLength={5000}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {characterCount} / 5000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceLanguage">Source Language</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger id="sourceLanguage">
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selectedBrand">Target Brand</Label>
                  {isLoadingBrands ? (
                     <Skeleton className="h-10 w-full" />
                  ) : brands.length > 0 ? (
                    <Select value={selectedBrandId || ''} onValueChange={setSelectedBrandId}>
                      <SelectTrigger id="selectedBrand">
                        <SelectValue placeholder="Select target brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            <div className="flex items-center">
                              <BrandIcon name={brand.name} color={brand.color} className="mr-2 h-4 w-4"/>
                              {brand.name} ({brand.language.toUpperCase()} - {brand.country.toUpperCase()})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2.5"> 
                        <AlertTriangle className="h-4 w-4 text-orange-500"/> 
                        No brands configured for trans-creation.
                    </div>
                  )}
                   <p className="text-xs text-muted-foreground">
                    Target language/country set by brand. <Link href="/dashboard/brands" className="underline">Manage Brands</Link>
                  </p>
                </div>
              </div>
              
              {/* Target Language and Country are now derived from brand, so these are commented out or removed
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetLanguage">Target Language</Label>
                  <Select value={targetLanguage} onValueChange={handleTargetLanguageChange}>
                    <SelectTrigger id="targetLanguage">
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCountry">Target Country/Locale</Label>
                  <Select value={targetCountry} onValueChange={setTargetCountry} disabled={filteredCountryOptions.length === 0}>
                    <SelectTrigger id="targetCountry">
                      <SelectValue placeholder={filteredCountryOptions.length === 0 ? "Select language first" : "Select target country/locale"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCountryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {filteredCountryOptions.length === 0 && targetLanguage && (
                        <div className="p-2 text-sm text-muted-foreground">No countries for selected language.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              */}

              <Button type="submit" disabled={isLoading || !selectedBrandId || brands.length === 0} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Trans-create Content
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Trans-created Content</CardTitle>
            <CardDescription>
              AI-powered adaptation of your content. 
              {results && selectedBrandDetails && (
                <span className="block text-xs mt-1">
                  Targeted for: {selectedBrandDetails.name} ({results.targetLanguage.toUpperCase()} - {results.targetCountry.toUpperCase()})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-1/4" /> 
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-8 w-1/3 mt-2" />
              </div>
            )}
            {!isLoading && results && (
              <div className="space-y-4">
                <div className="space-y-1">
                   <div className="flex justify-between items-center">
                    <h3 className="font-medium">Result:</h3>
                    <Button variant="ghost" size="sm" onClick={handleCopyContent}>
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={results.transCreatedContent}
                    readOnly
                    rows={12}
                    className="min-h-[200px] bg-muted/30"
                    aria-label="Trans-created content"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Source Language:</strong> {languageOptions.find(l => l.value === sourceLanguage)?.label || sourceLanguage}</p>
                  <p><strong>Target Language:</strong> {languageOptions.find(l => l.value === results.targetLanguage)?.label || results.targetLanguage.toUpperCase()}</p>
                  <p><strong>Target Country:</strong> {selectedBrandDetails?.country ? selectedBrandDetails.country.toUpperCase() : results.targetCountry.toUpperCase()}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Review the trans-created content carefully. AI output may require adjustments for nuance and accuracy.
                </p>
              </div>
            )}
            {!isLoading && !results && (
              <div className="text-center py-10 text-muted-foreground">
                <Globe className="mx-auto h-10 w-10 mb-2" />
                Your trans-created content will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 