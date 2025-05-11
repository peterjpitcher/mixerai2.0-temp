'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';

// export const metadata: Metadata = {
//   title: 'Edit Brand | MixerAI 2.0',
//   description: 'Edit the details, brand identity, and settings for an existing brand.',
// };

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

/**
 * BrandEditPage allows users to modify the details of an existing brand.
 * It includes sections for basic information (name, website, country, language, brand colour)
 * and brand identity (AI-generated or manually entered brand identity, tone of voice, guardrails,
 * and content vetting agencies).
 * The page fetches brand data on load and allows saving changes or generating brand identity content.
 */
export default function BrandEditPage({ params }: BrandEditPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [brand, setBrand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [urlInput, setUrlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_color: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: ''
  });
  
  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch brand: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch brand data');
        }
        
        setBrand(data.brand);
        
        // Set form data from brand
        setFormData({
          name: data.brand.name || '',
          website_url: data.brand.website_url || '',
          country: data.brand.country || '',
          language: data.brand.language || '',
          brand_color: data.brand.brand_color || '',
          brand_identity: data.brand.brand_identity || '',
          tone_of_voice: data.brand.tone_of_voice || '',
          guardrails: data.brand.guardrails || '',
          content_vetting_agencies: data.brand.content_vetting_agencies || ''
        });
      } catch (error) {
        // console.error('Error loading brand data:', error);
        setError((error as Error).message);
        toast.error('Failed to load brand details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrandData();
  }, [id]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleGenerateBrandIdentity = async () => {
    if (!formData.name) {
      toast.error('Please enter a brand name before generating the brand identity.');
      return;
    }
    
    // Validate URLs - must have at least one
    if (!formData.website_url && !urlInput) {
      toast.error('Please enter at least one website URL.');
      return;
    }
    
    const urls = [formData.website_url];
    if (urlInput) {
      urls.push(urlInput);
    }
    
    // Validate URLs format
    const validUrls = urls.filter(url => url && url.trim() !== '');
    if (validUrls.length === 0) {
      toast.error('Please enter at least one valid website URL.');
      return;
    }
    
    for (const url of validUrls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('URLs must start with http:// or https://');
        return;
      }
    }
    
    try {
      setIsGenerating(true);
      toast.info('Generating brand identity content...');
      
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: formData.name,
          urls: validUrls,
          country: formData.country,
          language: formData.language
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate brand identity: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate brand identity');
      }
      
      // Update formData with the generated content
      setFormData({
        ...formData,
        brand_identity: data.data.brandIdentity || formData.brand_identity,
        tone_of_voice: data.data.toneOfVoice || formData.tone_of_voice,
        guardrails: data.data.guardrails || formData.guardrails,
        content_vetting_agencies: data.data.agencies || formData.content_vetting_agencies,
        brand_color: data.data.brandColor || formData.brand_color
      });
      
      toast.success('Brand identity generated successfully!');
      
      // Switch to brand identity tab
      setActiveTab('identity');
    } catch (error) {
      // console.error('Error generating brand identity:', error);
      toast.error('Failed to generate brand identity. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!formData.name) {
        toast.error('Brand name is required.');
        setIsSaving(false);
        return;
      }
      
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString()
      };
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update brand: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update brand');
      }
      
      toast.success('Brand updated successfully!');
      router.push(`/dashboard/brands/${id}`);
    } catch (error) {
      // console.error('Error saving brand:', error);
      toast.error('Failed to save brand. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading brand details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-destructive mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Brand</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  // Not found state
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-warning mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Brand Not Found</h3>
        <p className="text-muted-foreground mb-4 text-center max-w-md">The brand for which you are looking does not exist or has been deleted.</p>
        <Button onClick={() => router.push('/dashboard/brands')}>Back to Brands</Button>
      </div>
    );
  }
  
  // Find the country and language labels for the selected values
  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = LANGUAGES.find(l => l.value === formData.language)?.label || formData.language || 'Select language';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandIcon name={formData.name} color={formData.brand_color} size="lg" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit: {brand?.name || 'Brand'}</h1>
            <p className="text-muted-foreground">
              Update the name, identity, and other settings for this brand.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/brands/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="basic" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details for your brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter brand name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => handleSelectChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={formData.language} 
                    onValueChange={(value) => handleSelectChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand_color">Brand Colour</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    id="brand_color"
                    name="brand_color"
                    value={formData.brand_color || '#1982C4'}
                    onChange={handleInputChange}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.brand_color || '#1982C4'}
                    onChange={handleInputChange}
                    name="brand_color"
                    placeholder="#HEX colour"
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/dashboard/brands/${id}`)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Update or generate your brand identity profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Generate section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Generate Brand Identity</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate a comprehensive brand identity profile based on your website content.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="website_urls">Website URLs</Label>
                        <div className="text-xs text-muted-foreground mb-2">
                          Add one or more URLs to generate your brand identity. The main website URL from basic details is already included.
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            id="url_input"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://another-example.com"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Content will be generated for {countryName} in {languageName}.
                        </p>
                        <Button 
                          onClick={handleGenerateBrandIdentity} 
                          disabled={isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate Brand Identity'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Brand identity fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand_identity">Brand Identity</Label>
                      <Textarea
                        id="brand_identity"
                        name="brand_identity"
                        value={formData.brand_identity}
                        onChange={handleInputChange}
                        placeholder="Enter brand identity"
                        rows={8}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                      <Textarea
                        id="tone_of_voice"
                        name="tone_of_voice"
                        value={formData.tone_of_voice}
                        onChange={handleInputChange}
                        placeholder="Enter tone of voice"
                        rows={6}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guardrails">Content Guardrails</Label>
                      <Textarea
                        id="guardrails"
                        name="guardrails"
                        value={formData.guardrails}
                        onChange={handleInputChange}
                        placeholder="Enter guardrails"
                        rows={6}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content_vetting_agencies">Content Vetting Agencies</Label>
                      <Textarea
                        id="content_vetting_agencies"
                        name="content_vetting_agencies"
                        value={formData.content_vetting_agencies}
                        onChange={handleInputChange}
                        placeholder="Enter agency names, separated by commas."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Quick Preview</h4>
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                        <BrandIcon name={formData.name || 'Brand Name'} color={formData.brand_color || '#1982C4'} />
                        <span>{formData.name || 'Your Brand Name'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This is a preview of how your brand colour and icon might appear.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Brand Color</h4>
                      <div 
                        className="w-full h-12 rounded-md"
                        style={{ backgroundColor: formData.brand_color || '#1982C4' }}
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {formData.brand_color || '#1982C4'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Recommendations</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Add website URLs to generate accurate brand identity</li>
                        <li>• Provide your brand's country and language for localized content</li>
                        <li>• Review and edit the generated content before saving</li>
                        <li>• Add specific guardrails to guide content creation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('basic')}
              >
                Back to Basic Details
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 