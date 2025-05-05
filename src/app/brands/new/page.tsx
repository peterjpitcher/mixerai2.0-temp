'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { useToast } from "@/components/toast-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { COUNTRIES, LANGUAGES } from "@/lib/constants";
import { AlertCircle, Loader2, Info, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { VETTING_AGENCIES_BY_COUNTRY } from '@/lib/azure/openai';
import { Badge } from "@/components/badge";
import { cn } from "@/lib/utils";

interface BrandFormData {
  name: string;
  website_url: string;
  country: string;
  language: string;
  brand_identity: string;
  tone_of_voice: string;
  guardrails: string;
  content_vetting_agencies: string;
  brand_color: string;
  approved_content_types: string[];
}

interface ContentType {
  id: string;
  name: string;
  description?: string;
}

export default function NewBrandPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic-details");
  const [urlsInput, setUrlsInput] = useState("");
  const [urlsError, setUrlsError] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: '',
    brand_color: '#3498db', // Default blue color
    approved_content_types: []
  });

  // Get vetting agencies based on selected country
  const [vettingAgencies, setVettingAgencies] = useState<any[]>([]);
  
  // Fetch content types on page load
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
          toast({
            title: 'Warning',
            description: 'Failed to load content types. Some features may be limited.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching content types:', error);
      } finally {
        setLoadingContentTypes(false);
      }
    };
    
    fetchContentTypes();
  }, [toast]);
  
  // Handle approved content types selection
  const handleContentTypeChange = (contentTypeId: string) => {
    setFormData(prev => {
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
    if (formData.country) {
      const agencies = VETTING_AGENCIES_BY_COUNTRY[formData.country] || [];
      setVettingAgencies(agencies);
    } else {
      setVettingAgencies([]);
    }
  }, [formData.country]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle select field changes
  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
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
      
      setFormData(prev => ({
        ...prev,
        content_vetting_agencies: updatedAgencies.join(', ')
      }));
    }, 0);
  };

  // Handle agency priority change
  const handleAgencyPriorityChange = (agency: any, priority: string) => {
    const updatedAgencies = vettingAgencies.map(a => 
      a.name === agency.name ? { ...a, priority } : a
    );
    setVettingAgencies(updatedAgencies);
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
      formData.brand_identity.trim() !== '' || 
      formData.tone_of_voice.trim() !== '' || 
      formData.guardrails.trim() !== '' || 
      formData.content_vetting_agencies.trim() !== ''
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
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    const urls = urlsInput.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    
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
    setSelectedAgencies([]);

    try {
      console.log('==== Executing Brand Identity Generation ====');
      console.log('Brand name:', formData.name);
      console.log('URLs:', urls);
      console.log('Country:', formData.country);
      console.log('Language:', formData.language);
      
      // Important: Use the exact parameter names expected by the API
      const requestBody = {
        name: formData.name,
        urls: urls,
        country: formData.country || 'GB',
        language: formData.language || 'en-GB'
      };
      
      console.log('Calling API with parameters:', requestBody);
      
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        // Prevent caching
        cache: 'no-store',
        // Add next.js specific cache options
        next: { revalidate: 0 }
      });

      console.log('Response status:', response.status, response.ok ? 'OK' : 'Failed');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to generate brand identity');
        } catch (parseError) {
          throw new Error(`Failed to generate brand identity: ${response.status} ${response.statusText}`);
        }
      }
      
      // Try to get the response as text first to help with debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 100) + '...');
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response success:', data.success);
        console.log('Used fallback generation:', data.data?.usedFallback);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Invalid response format from API');
      }
      
      if (data.success && data.data) {
        console.log('Brand identity generated successfully');
        
        // Get current time for toast notification
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        // Ensure vettingAgencies exists or use fallback
        const vettingAgenciesData = data.data.suggestedAgencies || data.data.vettingAgencies || [];
        console.log('Vetting agencies data:', vettingAgenciesData);
        
        // Debug the full data object
        console.log('Full API response data:', JSON.stringify(data.data, null, 2));
        
        // Process the guardrails - handle both array and string formats
        let guardrailsContent = '';
        if (Array.isArray(data.data.guardrails)) {
          // Convert array to bulleted list format
          guardrailsContent = data.data.guardrails.map(item => `- ${item}`).join('\n');
        } else if (typeof data.data.guardrails === 'string') {
          guardrailsContent = data.data.guardrails;
        } else {
          guardrailsContent = '- No guardrails provided';
        }
        
        // Set brand with generated content
        const updatedFormData = {
          ...formData,
          brand_identity: data.data.brandIdentity || '',
          tone_of_voice: data.data.toneOfVoice || '',
          guardrails: guardrailsContent,
          content_vetting_agencies: vettingAgenciesData.length > 0 ? vettingAgenciesData.map(a => a.name).join(', ') : '',
          brand_color: data.data.brandColor || '#3498db'
        };
        
        // Debug the updated brand object before setting state
        console.log('About to update brand with:', {
          brandIdentityLength: updatedFormData.brand_identity.length,
          toneOfVoiceLength: updatedFormData.tone_of_voice.length,
          guardrailsLength: updatedFormData.guardrails.length,
          agencies: updatedFormData.content_vetting_agencies,
          color: updatedFormData.brand_color
        });
        
        // Update the state
        setFormData(updatedFormData);
        
        // Additional debugging - Ensure we handle guardrails correctly whether it's an array or string
        console.log('Setting brand state with:', {
          brandIdentity: data.data.brandIdentity ? data.data.brandIdentity.substring(0, 30) + '...' : 'undefined',
          toneOfVoice: data.data.toneOfVoice ? data.data.toneOfVoice.substring(0, 30) + '...' : 'undefined',
          guardrails: Array.isArray(data.data.guardrails) 
            ? `${data.data.guardrails.length} rules` 
            : (typeof data.data.guardrails === 'string' ? data.data.guardrails.substring(0, 30) + '...' : 'undefined'),
          agencies: vettingAgenciesData.length > 0 ? `${vettingAgenciesData.length} agencies` : 'none',
          color: data.data.brandColor || '#3498db'
        });
        
        // Update selected agencies
        if (vettingAgenciesData.length > 0) {
          const agencyNames = vettingAgenciesData.map(a => a.name);
          console.log('Setting selected agencies:', agencyNames);
          setSelectedAgencies(agencyNames);
          
          // Important: Update the vettingAgencies state with the agencies from the API
          console.log('Updating vetting agencies from API response');
          setVettingAgencies(vettingAgenciesData);
        }
        
        // Update usedFallback state
        setUsedFallback(data.data.usedFallback || false);
        
        // Show toast based on whether fallback was used
        if (data.data.usedFallback) {
          toast({
            title: 'Brand Identity Generated (Fallback)',
            description: `Generated at ${timeString} using template-based fallback.`,
            variant: 'default'
          });
        } else {
          toast({
            title: 'Brand Identity Generated',
            description: `Generated at ${timeString} using Azure OpenAI.`,
            variant: 'default'
          });
        }
        
        // Switch to the "Brand Identity" tab
        console.log('Switching to brand-identity tab');
        setCurrentTab("brand-identity");
      } else {
        console.error('API returned error or missing data:', data);
        throw new Error(data.error || 'Failed to generate brand identity');
      }
    } catch (error) {
      console.error('Error generating brand identity:', error);
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate brand identity',
        variant: 'destructive'
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Make a copy of the form data to ensure proper format for submission
      const submissionData = { ...formData };
      
      // Ensure guardrails are properly formatted if they're in array format
      if (submissionData.guardrails) {
        // If it looks like a JSON array string
        if (submissionData.guardrails.startsWith('[') && submissionData.guardrails.endsWith(']')) {
          try {
            const guardrailsArray = JSON.parse(submissionData.guardrails);
            if (Array.isArray(guardrailsArray)) {
              submissionData.guardrails = guardrailsArray.map(item => `- ${item}`).join('\n');
              console.log("Converted guardrails from JSON array to bulleted list before submission");
            }
          } catch (e) {
            // If parsing fails, keep as is
            console.log("Failed to parse guardrails as JSON array in form submission");
          }
        }
      }
      
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Brand created successfully",
        });
        router.push('/brands');
      } else {
        throw new Error(data.error || 'Failed to create brand');
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if form has required fields filled
  const isFormValid = formData.name.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Add New Brand</h1>
        <Button variant="outline" asChild>
          <Link href="/brands">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Link>
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
          <TabsTrigger value="brand-identity">Brand Identity</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-details" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>
                Enter the basic information about the brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>
                  </div>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter brand name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleSelectChange('country', value)}
                    >
                      <SelectTrigger id="country">
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
                      <SelectTrigger id="language">
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
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" disabled>
                Back
              </Button>
              <Button type="button" onClick={() => setCurrentTab("brand-identity")}>
                Next: Brand Identity
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Approved Content Types</CardTitle>
                <Badge variant="outline" className="text-xs font-normal">
                  AI Taskforce Managed
                </Badge>
              </div>
              <CardDescription>
                Select which types of content can be created for this brand. Any changes to these content types must be approved by the AI taskforce. Please work with Peter Pitcher if changes are needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contentTypes.map((contentType) => (
                    <div 
                      key={contentType.id}
                      className={cn(
                        "relative flex flex-col h-full rounded-md border p-4 hover:shadow-sm transition-shadow cursor-pointer",
                        formData.approved_content_types.includes(contentType.id) 
                          ? "bg-primary/10 border-primary/50" 
                          : "bg-card"
                      )}
                      onClick={() => handleContentTypeChange(contentType.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{contentType.name}</h4>
                        <Checkbox 
                          checked={formData.approved_content_types.includes(contentType.id)}
                          onCheckedChange={() => handleContentTypeChange(contentType.id)}
                          className="h-4 w-4"
                        />
                      </div>
                      {contentType.description && (
                        <p className="text-xs text-muted-foreground">
                          {contentType.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button 
                form="brand-form" 
                type="button" 
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Brand'}
              </Button>
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
                    <p className="text-xs text-muted-foreground mb-2">
                      These URLs will be used to analyse your brand's online presence and generate appropriate brand identity content.
                      The URLs you enter will be saved for future reference.
                    </p>
                    <Textarea
                      id="urls-input"
                      placeholder="https://example.com&#10;https://blog.example.com"
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
                  
                  {(formData.country || formData.language) && (
                    <div className="text-sm text-muted-foreground flex items-center mt-2">
                      <Info className="h-4 w-4 mr-1" />
                      <span>
                        {formData.country && formData.language ? (
                          <>Generation will be optimized for {COUNTRIES.find(c => c.value === formData.country)?.label || formData.country} and content will be generated in {LANGUAGES.find(l => l.value === formData.language)?.label || formData.language}</>
                        ) : formData.country ? (
                          <>Generation will be optimized for {COUNTRIES.find(c => c.value === formData.country)?.label || formData.country}</>
                        ) : (
                          <>Content will be generated in {LANGUAGES.find(l => l.value === formData.language)?.label || formData.language}</>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {usedFallback && (
                    <div className="flex items-start text-sm text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-200 my-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <div>
                        <p className="font-medium">Generated using industry templates</p>
                        <p className="mt-1">We've used our industry templates for this brand identity. The information is based on your brand name, country, and industry type. You can edit any field to customize it further.</p>
                        <button 
                          onClick={() => executeGenerateBrandIdentity()}
                          disabled={isGenerating}
                          className="mt-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-1 px-2 rounded transition-colors inline-flex items-center"
                        >
                          {isGenerating ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating...
                            </>
                          ) : (
                            <>Try again</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Brand Identity, TOV, Guardrails */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="brand_identity">Brand Identity</Label>
                        <div className="flex items-center gap-2 border rounded-md p-1 hover:bg-muted/50 cursor-pointer">
                          <div className="text-xs mr-1">Brand Color:</div>
                          <Input
                            type="color"
                            id="brand_color"
                            name="brand_color"
                            value={formData.brand_color || '#3498db'}
                            onChange={handleChange}
                            className="w-8 h-8 p-1 rounded cursor-pointer"
                            title="Click to change brand colour"
                          />
                          <span className="text-xs font-mono">{formData.brand_color}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Describes who the brand is, what it stands for, why it exists, and its consumer purpose. 
                        This is used to ensure all generated content aligns with the brand's core identity.
                      </p>
                      <Textarea
                        id="brand_identity"
                        name="brand_identity"
                        placeholder="Describe the brand's identity, values, and mission"
                        rows={4}
                        value={formData.brand_identity}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Defines how the brand sounds, speaks, and the kind of language it uses. 
                        This guides the style and tone of all generated content to maintain a consistent brand voice.
                      </p>
                      <Textarea
                        id="tone_of_voice"
                        name="tone_of_voice"
                        placeholder="Describe the brand's tone of voice (formal, casual, friendly, professional, etc.)"
                        rows={4}
                        value={formData.tone_of_voice}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guardrails">Content Guardrails</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Defines what the brand should NOT do. These protect the brand from creating content that 
                        may damage consumer perception or brand reputation.
                      </p>
                      <div className="relative">
                        <Textarea
                          id="guardrails"
                          name="guardrails"
                          placeholder="Specify any content restrictions or guidelines as a bulleted list (- Item 1&#10;- Item 2)"
                          rows={5}
                          value={formData.guardrails}
                          onChange={handleChange}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                          Enter as bulleted list
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column: Agencies/Bodies */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center">
                        <Label>Content Vetting Agencies</Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        These are official bodies that generated content should be vetted against to ensure it's true, accurate, 
                        and safe. Agencies are specific to the brand's country of operation and are prioritised by importance.
                      </p>
                      
                      {vettingAgencies.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 border rounded-md">
                          {formData.country ? (
                            <>No suggested agencies available for {COUNTRIES.find(c => c.value === formData.country)?.label}. Please select a different country.</>
                          ) : (
                            <>Select a country to see suggested vetting agencies.</>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High Priority</Badge>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Medium Priority</Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Low Priority</Badge>
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {vettingAgencies.map((agency, index) => (
                              <div 
                                key={index} 
                                className="flex items-start space-x-2 p-2 rounded-md border hover:bg-muted/50"
                              >
                                <Checkbox 
                                  id={`agency-${index}`}
                                  checked={selectedAgencies.includes(agency.name)}
                                  onCheckedChange={(checked) => 
                                    handleAgencyCheckboxChange(!!checked, agency)
                                  }
                                />
                                <div className="flex-1">
                                  <Label 
                                    htmlFor={`agency-${index}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      {agency.name}
                                      {agency.priority === 'high' ? (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High</Badge>
                                      ) : agency.priority === 'medium' ? (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Low</Badge>
                                      )}
                                    </div>
                                  </Label>
                                  {agency.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {agency.description}
                                    </p>
                                  )}
                                </div>
                                <Select 
                                  defaultValue={agency.priority}
                                  onValueChange={(value) => handleAgencyPriorityChange(agency, value)}
                                >
                                  <SelectTrigger className="h-7 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
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
                form="brand-form" 
                type="button" 
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Brand'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 