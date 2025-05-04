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
import { VETTING_AGENCIES_BY_COUNTRY } from "@/lib/azure/openai";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { ConfirmDialog } from '@/components/confirm-dialog';

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
    content_vetting_agencies: '',
    brand_color: '#3498db', // Default blue color
    approved_content_types: [] as string[]
  });
  
  // Add contentTypes state
  const [contentTypes, setContentTypes] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);
  
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
          // Convert approved_content_types from JSON to array if needed
          let approvedTypes: string[] = [];
          if (data.brand.approved_content_types) {
            if (typeof data.brand.approved_content_types === 'string') {
              try {
                approvedTypes = JSON.parse(data.brand.approved_content_types);
              } catch (e) {
                console.error('Failed to parse approved_content_types:', e);
              }
            } else if (Array.isArray(data.brand.approved_content_types)) {
              approvedTypes = data.brand.approved_content_types;
            }
          }
          
          setBrand({
            ...data.brand,
            approved_content_types: approvedTypes
          });
          
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
  
  // Fetch content types
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        setLoadingContentTypes(true);
        const response = await fetch('/api/content-types');
        const data = await response.json();
        
        if (data.success) {
          setContentTypes(data.data || []);
        } else {
          console.error('Failed to fetch content types:', data.error);
        }
      } catch (error) {
        console.error('Error fetching content types:', error);
      } finally {
        setLoadingContentTypes(false);
      }
    };
    
    fetchContentTypes();
  }, []);
  
  // Handle approved content types selection
  const handleContentTypeChange = (contentTypeId: string) => {
    setBrand(prev => {
      const currentTypes = [...prev.approved_content_types];
      const index = currentTypes.indexOf(contentTypeId);
      
      if (index >= 0) {
        // Remove if already selected
        currentTypes.splice(index, 1);
      } else {
        // Add if not selected
        currentTypes.push(contentTypeId);
      }
      
      return {
        ...prev,
        approved_content_types: currentTypes
      };
    });
  };
  
  // Update vetting agencies when country changes
  useEffect(() => {
    if (brand.country) {
      try {
        const agencies = VETTING_AGENCIES_BY_COUNTRY[brand.country] || [];
        setVettingAgencies(agencies);
      } catch (error) {
        console.error("Error loading vetting agencies:", error);
        setVettingAgencies([]);
      }
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
      
      const apiUrl = "/api/brands/identity";
      console.log("POST request to", apiUrl, "with data:", {
        brandName: brand.name,
        urls,
        countryCode: brand.country,
        languageCode: brand.language,
      });
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brandName: brand.name,
          urls,
          countryCode: brand.country,
          languageCode: brand.language,
        }),
      });
      
      console.log("Response status:", response.status);
      // Log response headers more safely 
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log("Response headers:", responseHeaders);
      
      const result = await response.json();
      console.log("Response data:", result);
      
      if (result.success && result.data) {
        const newBrandIdentity = result.data.brandIdentity;
        setBrand(prev => ({
          ...prev,
          brand_identity: newBrandIdentity,
        }));
        
        // If vetting agencies were provided, update them
        if (result.data.vettingAgencies && result.data.vettingAgencies.length > 0) {
          const agencies = result.data.vettingAgencies
            .map((agency: {name: string, description: string}) => `${agency.name}: ${agency.description}`)
            .join('\n');
          setBrand(prev => ({
            ...prev,
            content_vetting_agencies: agencies,
          }));
        }
        
        // Show success notification
        toast({
          title: "Success",
          description: "Brand identity generated successfully",
        });
      } else {
        throw new Error(result.error || "Failed to generate brand identity");
      }
    } catch (error) {
      console.error("Error generating brand identity:", error);
      
      // Set fallback brand identity based on available information
      if (brand.country && brand.country in VETTING_AGENCIES_BY_COUNTRY) {
        const agencies = VETTING_AGENCIES_BY_COUNTRY[brand.country]
          .map(agency => `${agency.name}: ${agency.description}`)
          .join('\n');
        setBrand(prev => ({
          ...prev,
          content_vetting_agencies: agencies,
        }));
        setUsedFallback(true);
      }
      
      toast({
        title: "Error",
        description: "Failed to generate brand identity. Using fallback data.",
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
      
      // Make a copy of the brand data to ensure proper format for submission
      const brandData = { ...brand };
      
      // Ensure guardrails are properly formatted if they're in array format
      if (brandData.guardrails) {
        // If it looks like a JSON array string
        if (brandData.guardrails.startsWith('[') && brandData.guardrails.endsWith(']')) {
          try {
            const guardrailsArray = JSON.parse(brandData.guardrails);
            if (Array.isArray(guardrailsArray)) {
              brandData.guardrails = guardrailsArray.map(item => `- ${item}`).join('\n');
              console.log("Converted guardrails from JSON array to bulleted list before submission");
            }
          } catch (e) {
            // If parsing fails, keep as is
            console.log("Failed to parse guardrails as JSON array in form submission");
          }
        }
      }
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
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
              
              <div className="space-y-4">
                <div>
                  <Label>Approved Content Types</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select which types of content can be created for this brand
                  </p>
                  {loadingContentTypes ? (
                    <div className="flex items-center space-x-2 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading content types...</span>
                    </div>
                  ) : contentTypes.length === 0 ? (
                    <div className="flex items-center space-x-2 py-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">No content types found</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contentTypes.map((contentType) => (
                        <div key={contentType.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`content-type-${contentType.id}`}
                            checked={brand.approved_content_types.includes(contentType.id)}
                            onCheckedChange={(checked) => 
                              handleContentTypeChange(contentType.id)
                            }
                          />
                          <Label 
                            htmlFor={`content-type-${contentType.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {contentType.name}
                            {contentType.description && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {contentType.description}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
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
                  
                  {(brand.country || brand.language) && (
                    <div className="text-sm text-muted-foreground flex items-center mt-2">
                      <Info className="h-4 w-4 mr-1" />
                      <span>
                        {brand.country && brand.language ? (
                          <>Generation will be optimized for {COUNTRIES.find(c => c.value === brand.country)?.label || brand.country} and content will be generated in {LANGUAGES.find(l => l.value === brand.language)?.label || brand.language}</>
                        ) : brand.country ? (
                          <>Generation will be optimized for {COUNTRIES.find(c => c.value === brand.country)?.label || brand.country}</>
                        ) : (
                          <>Content will be generated in {LANGUAGES.find(l => l.value === brand.language)?.label || brand.language}</>
                        )}
                      </span>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="brand_identity">Brand Identity</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          id="brand_color"
                          name="brand_color"
                          value={brand.brand_color || '#3498db'}
                          onChange={handleInputChange}
                          className="w-8 h-8 p-1 rounded cursor-pointer"
                          title="Click to change brand color"
                        />
                        <span className="text-xs text-muted-foreground">{brand.brand_color || '#3498db'}</span>
                      </div>
                    </div>
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
                    <div className="relative">
                      <Textarea
                        id="guardrails"
                        name="guardrails"
                        placeholder="Specify any content restrictions or guidelines as a bulleted list (- Item 1&#10;- Item 2)"
                        rows={5}
                        value={brand.guardrails}
                        onChange={handleInputChange}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        Enter as bulleted list
                      </div>
                    </div>
                    {brand.guardrails && !brand.guardrails.includes('-') && (
                      <div className="text-xs text-amber-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        <span>For better readability, use bullet points (e.g., "- Guideline 1" on each line)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      {/* Add hidden input to maintain the value */}
                      <input 
                        type="hidden"
                        name="content_vetting_agencies"
                        value={brand.content_vetting_agencies}
                      />
                      
                      {/* Default suggested agencies based on country */}
                      {brand.country && vettingAgencies.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Suggested Agencies for {COUNTRIES.find(c => c.value === brand.country)?.label || brand.country}</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {selectedAgencies.length > 0 
                              ? `Selected: ${selectedAgencies.length} ${selectedAgencies.length === 1 ? 'agency' : 'agencies'}`
                              : 'Select agencies to include in content generation'}
                          </p>
                          <div className="space-y-3 max-h-80 overflow-y-auto border rounded-md p-3">
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