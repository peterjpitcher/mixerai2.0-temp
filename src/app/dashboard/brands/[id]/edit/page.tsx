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
import { Loader2, X, PlusCircle } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
import { v4 as uuidv4 } from 'uuid';

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
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form fields - Initialize with empty strings or appropriate defaults
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    additional_website_urls: [] as { id: string; value: string }[],
    country: '',
    language: '',
    brand_color: '#1982C4', // Default color, will be overwritten by fetched data
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: [] as string[] // Store as array
  });
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState(''); // For new URL input
  const [customAgencyInput, setCustomAgencyInput] = useState(''); // For new custom agency

  // Predefined agencies list (can be moved to constants if used elsewhere)
  const predefinedAgencies = [
    { id: 'internal-legal', label: 'Internal Legal Team' },
    { id: 'internal-brand', label: 'Internal Brand Team' },
    { id: 'external-fda', label: 'External FDA Specialist' },
    { id: 'external-asa', label: 'External Advertising Standards Authority (ASA)' },
  ];

  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch brand: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success || !data.brand) {
          throw new Error(data.error || 'Failed to fetch brand data');
        }
        
        setBrand(data.brand);
        
        // Set form data from brand
        setFormData({
          name: data.brand.name || '',
          website_url: data.brand.website_url || '',
          additional_website_urls: Array.isArray(data.brand.additional_website_urls)
                                      ? data.brand.additional_website_urls.map((urlItem: string | { id?: string, value: string }) =>
                                          typeof urlItem === 'string'
                                              ? { id: uuidv4(), value: urlItem }
                                              : { id: urlItem.id || uuidv4(), value: urlItem.value }
                                        )
                                      : [],
          country: data.brand.country || '',
          language: data.brand.language || '',
          brand_color: data.brand.brand_color || '#1982C4',
          brand_identity: data.brand.brand_identity || '',
          tone_of_voice: data.brand.tone_of_voice || '',
          guardrails: data.brand.guardrails || '',
          content_vetting_agencies: typeof data.brand.content_vetting_agencies === 'string' 
                                      ? data.brand.content_vetting_agencies.split(',').map(s => s.trim()).filter(Boolean) 
                                      : (Array.isArray(data.brand.content_vetting_agencies) ? data.brand.content_vetting_agencies : []),
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
  
  // --- Handlers for Additional Website URLs ---
  const handleAddAdditionalUrlField = () => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: [...prev.additional_website_urls, { id: uuidv4(), value: '' }]
    }));
  };

  const handleRemoveAdditionalUrl = (idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.filter(urlObj => urlObj.id !== idToRemove)
    }));
  };

  const handleAdditionalUrlChange = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.map(urlObj => 
        urlObj.id === id ? { ...urlObj, value } : urlObj
      )
    }));
  };
  // --- End Handlers for Additional Website URLs ---

  // --- Handlers for Content Vetting Agencies ---
  const handleAgencyCheckboxChange = (agencyName: string, checked: boolean) => {
    setFormData(prev => {
      const currentAgencies = Array.isArray(prev.content_vetting_agencies) ? prev.content_vetting_agencies : [];
      if (checked) {
        return { ...prev, content_vetting_agencies: [...currentAgencies, agencyName] };
      } else {
        return { ...prev, content_vetting_agencies: currentAgencies.filter(a => a !== agencyName) };
      }
    });
  };

  const handleAddCustomAgency = () => {
    if (customAgencyInput && customAgencyInput.trim() !== '') {
      const agencyToAdd = customAgencyInput.trim();
      if (!formData.content_vetting_agencies.includes(agencyToAdd)) {
        setFormData(prev => ({
          ...prev,
          content_vetting_agencies: [...prev.content_vetting_agencies, agencyToAdd]
        }));
      }
      setCustomAgencyInput('');
    } else {
      toast.error('Please enter a custom agency name.');
    }
  };

  const handleRemoveCustomAgency = (agencyName: string) => {
    setFormData(prev => ({
      ...prev,
      content_vetting_agencies: prev.content_vetting_agencies.filter(a => a !== agencyName)
    }));
  };
  // --- End Handlers for Content Vetting Agencies ---

  const handleGenerateBrandIdentity = async () => {
    if (!formData.name) {
      toast.error('Please enter a brand name before generating the brand identity.');
      return;
    }
    
    const validUrls = [formData.website_url, ...formData.additional_website_urls.map(u => u.value)].filter(url => url && url.trim() !== '');

    if (validUrls.length === 0) {
      toast.error('Please enter at least one valid website URL (main or additional).');
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
        content_vetting_agencies: Array.isArray(data.data.suggestedAgencies) 
                                    ? Array.from(new Set([...formData.content_vetting_agencies, ...data.data.suggestedAgencies.map((a:any) => a.name)])) 
                                    : formData.content_vetting_agencies,
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
        // Convert arrays to comma-separated strings for backend
        content_vetting_agencies: formData.content_vetting_agencies.join(', '),
        // additional_website_urls are not directly saved to the brand record, only used for generation
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
          <Button variant="outline" onClick={() => router.push(`/dashboard/brands`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isGenerating}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url">Main Website URL</Label>
                  <Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="https://example.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COUNTRIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(v) => handleSelectChange('language', v)}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {LANGUAGES.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Brand Identity</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Generate Brand Identity</h3>
                    <p className="text-sm text-muted-foreground">Add website URLs to auto-generate or enhance brand identity, tone, and guardrails. The main URL from Basic Details is included by default.</p>
                    <div className="space-y-2">
                      <Label>Additional Website URLs</Label>
                      {formData.additional_website_urls.map((urlObj) => (
                        <div key={urlObj.id} className="flex items-center gap-2">
                          <Input
                            value={urlObj.value}
                            onChange={(e) => handleAdditionalUrlChange(urlObj.id, e.target.value)}
                            placeholder="https://additional-example.com"
                            className="flex-grow"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlObj.id)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={handleAddAdditionalUrlField} size="sm" className="mt-2 w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add another URL
                      </Button>
                    </div>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground">Identity will be generated for {countryName} in {languageName} (if set).</p>
                      <Button onClick={handleGenerateBrandIdentity} disabled={isGenerating} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Brand Identity'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="brand_identity">Brand Identity</Label><Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} rows={6}/></div>
                    <div className="space-y-2"><Label htmlFor="tone_of_voice">Tone of Voice</Label><Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} rows={4}/></div>
                    <div className="space-y-2"><Label htmlFor="guardrails">Content Guardrails</Label><Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} rows={4}/></div>
                    
                    <div className="space-y-4">
                      <Label>Content Vetting Agencies</Label>
                      <div className="space-y-2">
                        {predefinedAgencies.map(agency => (
                          <div key={agency.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-${agency.id}`} 
                              checked={formData.content_vetting_agencies.includes(agency.label)}
                              onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.label, !!checked)}
                            />
                            <Label htmlFor={`edit-${agency.id}`} className="font-normal">{agency.label}</Label>
                          </div>
                        ))}
                      </div>
                      <div>
                        <Label htmlFor="edit_custom_agency_input">Add Custom Agency</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input id="edit_custom_agency_input" value={customAgencyInput} onChange={(e) => setCustomAgencyInput(e.target.value)} placeholder="Enter custom agency name" className="flex-grow" />
                          <Button type="button" variant="outline" onClick={handleAddCustomAgency} size="sm">Add</Button>
                        </div>
                      </div>
                      {formData.content_vetting_agencies.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Selected/Added Agencies:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.content_vetting_agencies.map((agency, index) => (
                              <Badge key={`${agency}-${index}`} variant="secondary" className="flex items-center">
                                {agency}
                                <Button type="button" variant="ghost" size="icon" className="ml-1 h-5 w-5 p-0.5 hover:bg-destructive/20 rounded-full" onClick={() => handleRemoveCustomAgency(agency)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Quick Preview</Label>
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                        <BrandIcon name={formData.name || 'Brand Name'} color={formData.brand_color || '#1982C4'} />
                        <span className="truncate">{formData.name || 'Your Brand Name'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand_color_identity_tab">Brand Colour</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" id="brand_color_identity_tab" name="brand_color" value={formData.brand_color || '#1982C4'} onChange={handleInputChange} className="w-10 h-10 rounded cursor-pointer" />
                        <Input value={formData.brand_color || '#1982C4'} onChange={handleInputChange} name="brand_color" placeholder="#HEX colour" className="w-32" />
                      </div>
                      <div className="w-full h-12 rounded-md mt-2" style={{ backgroundColor: formData.brand_color || '#1982C4' }} />
                      <p className="text-xs text-center text-muted-foreground">{formData.brand_color || '#1982C4'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <CardFooter className="flex justify-end pt-6">
        <Button onClick={handleSave} disabled={isSaving || isGenerating}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
      </CardFooter>
    </div>
  );
}
