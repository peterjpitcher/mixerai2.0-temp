'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { useToast } from '@/components/toast-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { COUNTRIES, LANGUAGES } from "@/lib/constants";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { getVettingAgenciesForCountry } from '@/lib/azure/openai';

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic-details");
  const [urlsInput, setUrlsInput] = useState("");
  const [urlsError, setUrlsError] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [vettingAgencies, setVettingAgencies] = useState<any[]>([]);
  const [brand, setBrand] = useState({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: ''
  });
  
  // Fetch brand data
  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/brands/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch brand data');
        }
        
        if (data.success && data.brand) {
          setBrand(data.brand);
          
          // Initialize selected agencies from content_vetting_agencies
          if (data.brand.content_vetting_agencies) {
            setSelectedAgencies(data.brand.content_vetting_agencies.split(',').map(a => a.trim()));
          }
          
          // Default urlsInput to the brand's website URL if available
          if (data.brand.website_url) {
            setUrlsInput(data.brand.website_url);
          }
        } else {
          throw new Error('Invalid response format');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching brand:', error);
        toast({
          title: 'Error',
          description: 'Failed to load brand details',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };
    
    fetchBrand();
  }, [id, toast]);
  
  // Update vetting agencies when country changes
  useEffect(() => {
    if (brand.country) {
      const agencies = getVettingAgenciesForCountry(brand.country);
      setVettingAgencies(agencies);
    } else {
      setVettingAgencies([]);
    }
  }, [brand.country]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrand(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select field changes
  const handleSelectChange = (field: string, value: string) => {
    setBrand(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear selected agencies when country changes
    if (field === 'country') {
      setSelectedAgencies([]);
    }
  };
  
  // Handle vetting agency checkbox change
  const handleAgencyCheckboxChange = (checked: boolean, agency: any) => {
    if (checked) {
      setSelectedAgencies(prev => [...prev, agency.name]);
    } else {
      setSelectedAgencies(prev => prev.filter(name => name !== agency.name));
    }
    
    // Update content_vetting_agencies field
    setTimeout(() => {
      const updatedAgencies = [...selectedAgencies];
      if (checked && !updatedAgencies.includes(agency.name)) {
        updatedAgencies.push(agency.name);
      } else if (!checked) {
        const index = updatedAgencies.indexOf(agency.name);
        if (index !== -1) {
          updatedAgencies.splice(index, 1);
        }
      }
      
      setBrand(prev => ({
        ...prev,
        content_vetting_agencies: updatedAgencies.join(', ')
      }));
    }, 0);
  };
  
  // Validate URLs
  const validateUrls = (urls: string[]): boolean => {
    let isValid = true;
    const invalidUrls: string[] = [];

    urls.forEach(url => {
      try {
        new URL(url);
      } catch (e) {
        isValid = false;
        invalidUrls.push(url);
      }
    });

    if (!isValid) {
      setUrlsError(`Invalid URLs: ${invalidUrls.join(', ')}`);
    } else {
      setUrlsError("");
    }

    return isValid;
  };
  
  // Check if we need to show the overwrite confirmation dialog
  const checkOverwriteBrandIdentity = () => {
    // If any of the identity fields are filled, show confirmation dialog
    if (
      brand.brand_identity.trim() !== '' || 
      brand.tone_of_voice.trim() !== '' || 
      brand.guardrails.trim() !== '' || 
      brand.content_vetting_agencies.trim() !== ''
    ) {
      setShowOverwriteDialog(true);
      return true;
    }
    
    // Otherwise, generate immediately
    executeGenerateBrandIdentity();
    return false;
  };

  // Confirmed overwrite of brand identity
  const confirmOverwriteBrandIdentity = () => {
    setShowOverwriteDialog(false);
    executeGenerateBrandIdentity();
  };

  // Execute brand identity generation API call
  const executeGenerateBrandIdentity = async () => {
    if (!brand.name) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    const urls = urlsInput.split('\n').filter(url => url.trim() !== '');
    
    if (urls.length === 0) {
      setUrlsError("Please enter at least one URL");
      return;
    }

    if (!validateUrls(urls)) {
      return;
    }

    setIsGenerating(true);
    setUrlsError("");
    setUsedFallback(false);

    try {
      console.log("Attempting to generate brand identity from:", urls);
      console.log("Using country:", brand.country, "and language:", brand.language);
      
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: brand.name,
          urls,
          countryCode: brand.country,
          languageCode: brand.language
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      if (result.success) {
        // Update the brand data with the generated identity
        setBrand(prev => ({
          ...prev,
          brand_identity: result.data.brandIdentity,
          tone_of_voice: result.data.toneOfVoice,
          guardrails: result.data.guardrails,
          content_vetting_agencies: result.data.contentVettingAgencies
        }));

        // Reset selected agencies and update them based on new content_vetting_agencies
        if (result.data.contentVettingAgencies) {
          const newAgencies = result.data.contentVettingAgencies.split(',').map((agency: string) => agency.trim());
          setSelectedAgencies(newAgencies);
        } else {
          setSelectedAgencies([]);
        }

        toast({
          title: "Success",
          description: "Brand identity generated successfully",
        });
      } else {
        throw new Error(result.error || "Failed to generate brand identity");
      }
    } catch (error: any) {
      console.error('Error generating brand identity:', error);
      
      // Clear error message about AI service being unavailable
      setUsedFallback(false);
      
      // Format user-friendly error message
      let errorMessage = error.message || "An unknown error occurred";
      
      // Look for specific API errors to provide better guidance
      if (errorMessage.includes('not found') || errorMessage.includes('deployment')) {
        errorMessage = "The AI model deployment was not found. Please check your Azure OpenAI configuration.";
      } else if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
        errorMessage = "Authentication with the AI service failed. Please check your Azure OpenAI API key.";
      } else if (errorMessage.includes('forbidden') || errorMessage.includes('permissions')) {
        errorMessage = "The request to the AI service was forbidden. Please check your API permissions.";
      } else if (errorMessage.includes('connect') || errorMessage.includes('endpoint')) {
        errorMessage = "Could not connect to the AI service. Please check your Azure OpenAI endpoint configuration.";
      }
      
      setUrlsError(errorMessage);
      
      toast({
        title: "AI Service Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate brand identity - entry point that checks for overwrite
  const generateBrandIdentity = async () => {
    // This will either show the dialog or execute the generation
    checkOverwriteBrandIdentity();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Brand updated successfully',
        });
        router.push(`/brands/${id}`);
      } else {
        throw new Error(data.error || 'Failed to update brand');
      }
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update brand',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading brand details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
        <Button variant="outline" asChild>
          <Link href={`/brands/${id}`}>Cancel</Link>
        </Button>
      </div>
      
      {/* Overwrite Confirmation Dialog */}
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Brand Identity?</DialogTitle>
            <DialogDescription>
              You already have brand identity information. Generating new content will overwrite your existing data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmOverwriteBrandIdentity}>
              Overwrite and Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Tabs 
        defaultValue="basic-details" 
        className="w-full"
        value={currentTab}
        onValueChange={setCurrentTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic-details">Basic Details</TabsTrigger>
          <TabsTrigger value="brand-identity">Brand Identity AI</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-details" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>
                Update your brand's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={brand.name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input 
                    id="website_url" 
                    name="website_url" 
                    type="url"
                    value={brand.website_url} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={brand.country} 
                    onValueChange={(value) => handleSelectChange('country', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
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
                    value={brand.language} 
                    onValueChange={(value) => handleSelectChange('language', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.push(`/brands/${id}`)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setCurrentTab("brand-identity")}
                >
                  Next: Brand Identity
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="brand-identity" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity Generation</CardTitle>
              <CardDescription>
                Generate brand identity using AI from website URLs or edit manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4 pb-6 border-b">
                  <div className="space-y-2">
                    <Label htmlFor="urls-input">Website URLs (one per line)</Label>
                    <Textarea
                      id="urls-input"
                      placeholder={`${brand.website_url || 'https://example.com'}\nhttps://blog.example.com`}
                      rows={5}
                      value={urlsInput}
                      onChange={(e) => setUrlsInput(e.target.value)}
                    />
                    {urlsError && (
                      <div className="flex items-center text-sm text-destructive mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{urlsError}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="button" 
                    onClick={generateBrandIdentity}
                    disabled={isGenerating || !urlsInput.trim()}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Brand Identity...
                      </>
                    ) : (
                      'Generate Brand Identity'
                    )}
                  </Button>
                  
                  {brand.country && (
                    <div className="text-sm text-muted-foreground flex items-center mt-2">
                      <Info className="h-4 w-4 mr-1" />
                      <span>Generation will be optimized for {COUNTRIES.find(c => c.value === brand.country)?.label || brand.country}</span>
                    </div>
                  )}
                </div>

                {/* Error messages will be shown in the urlsError section */}
                
                {urlsError && (
                  <div className="p-4 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm">{urlsError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand_identity">Brand Identity</Label>
                    <Textarea
                      id="brand_identity"
                      name="brand_identity"
                      placeholder="Describe the brand's identity, values, and mission"
                      rows={3}
                      value={brand.brand_identity}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                    <Textarea
                      id="tone_of_voice"
                      name="tone_of_voice"
                      placeholder="Describe the brand's tone of voice (formal, casual, friendly, professional, etc.)"
                      rows={3}
                      value={brand.tone_of_voice}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guardrails">Content Guardrails</Label>
                    <Textarea
                      id="guardrails"
                      name="guardrails"
                      placeholder="Specify any content restrictions or guidelines to follow"
                      rows={3}
                      value={brand.guardrails}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="content_vetting_agencies">Content Vetting Agencies</Label>
                      <Input
                        id="content_vetting_agencies"
                        name="content_vetting_agencies"
                        placeholder="List any applicable content vetting agencies"
                        value={brand.content_vetting_agencies}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    {brand.country && vettingAgencies.length > 0 && (
                      <div className="pt-2 border-t">
                        <Label className="mb-3 block">
                          Suggested Agencies for {COUNTRIES.find(c => c.value === brand.country)?.label || brand.country}
                        </Label>
                        <div className="space-y-3">
                          {vettingAgencies.map((agency) => (
                            <div key={agency.name} className="flex items-start space-x-2">
                              <Checkbox 
                                id={`agency-${agency.name}`}
                                checked={selectedAgencies.includes(agency.name)}
                                onCheckedChange={(checked) => {
                                  handleAgencyCheckboxChange(checked as boolean, agency);
                                }}
                                className="mt-1"
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor={`agency-${agency.name}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {agency.name}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {agency.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setCurrentTab("basic-details")}
              >
                Back to Basic Details
              </Button>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 