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
import { AlertCircle, Loader2, Info, ArrowLeft, Check, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { VETTING_AGENCIES_BY_COUNTRY } from '@/lib/azure/openai';
import { Badge } from "@/components/badge";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from '@/components/confirm-dialog';

interface BrandFormData {
  name: string;
  website_url: string;
  website_urls?: string;
  country: string;
  language: string;
  brand_identity: string;
  tone_of_voice: string;
  guardrails: string;
  content_vetting_agencies: string;
  brand_color: string;
  approved_content_types: string[];
  user_added_agencies?: string;
}

interface ContentType {
  id: string;
  name: string;
  description?: string;
}

interface VettingAgency {
  name: string;
  description?: string;
  priority: string;
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

  // Update this to store vetting agencies as objects
  const [vettingAgencies, setVettingAgencies] = useState<VettingAgency[]>([]);
  // Add state for selected agencies
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  
  // State for custom agency dialog
  const [showAddAgencyDialog, setShowAddAgencyDialog] = useState(false);
  const [customAgencyName, setCustomAgencyName] = useState('');
  const [customAgencyDescription, setCustomAgencyDescription] = useState('');
  const [customAgencyPriority, setCustomAgencyPriority] = useState('medium');
  const [userAddedAgencies, setUserAddedAgencies] = useState<any[]>([]);
  
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
  };

  // Handle adding custom agency
  const handleAddCustomAgency = () => {
    if (!customAgencyName.trim()) return;
    
    const newAgency = {
      name: customAgencyName.trim(),
      description: customAgencyDescription.trim(),
      priority: customAgencyPriority
    };
    
    setUserAddedAgencies(prev => [...prev, newAgency]);
    
    // Update content_vetting_agencies field
    setFormData(prev => {
      // Split the existing agencies string into array, or use empty array if nothing exists
      const existingAgencies = prev.content_vetting_agencies ? prev.content_vetting_agencies.split(', ') : [];
      
      // Add the new agency name to the list
      return {
        ...prev,
        content_vetting_agencies: [...existingAgencies, newAgency.name].join(', ')
      };
    });
    
    // Reset form
    setCustomAgencyName('');
    setCustomAgencyDescription('');
    setCustomAgencyPriority('medium');
    setShowAddAgencyDialog(false);
  };

  // Handle removing custom agency
  const handleRemoveCustomAgency = (index: number) => {
    const agencyToRemove = userAddedAgencies[index];
    
    setUserAddedAgencies(prev => prev.filter((_, i) => i !== index));
    
    // Update content_vetting_agencies field
    setFormData(prev => {
      // Split the existing agencies string into an array
      const agenciesArray = prev.content_vetting_agencies.split(', ');
      
      // Filter out the agency to remove
      const updatedAgencies = agenciesArray.filter(name => name !== agencyToRemove.name);
      
      return {
        ...prev,
        content_vetting_agencies: updatedAgencies.join(', ')
      };
    });
  };

  // Handle vetting agency selection
  const handleAgencySelection = (agencyName: string) => {
    setSelectedAgencies(prev => {
      const isSelected = prev.includes(agencyName);
      
      // Remove if already selected, add if not
      const updated = isSelected 
        ? prev.filter(name => name !== agencyName)
        : [...prev, agencyName];
      
      // Update the content_vetting_agencies field
      setFormData(prevForm => ({
        ...prevForm,
        content_vetting_agencies: updated.join(', ')
      }));
      
      return updated;
    });
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
        
        // Process vetting agencies
        const vettingAgenciesData = data.data.suggestedAgencies || data.data.vettingAgencies || [];
        console.log('Vetting agencies data:', vettingAgenciesData);
        
        // Format agencies as objects with name, description, and priority
        const formattedAgencies = vettingAgenciesData.map((agency: any) => ({
          name: agency.name || '',
          description: agency.description || '',
          priority: agency.priority || 'medium'
        }));
        
        // Set vetting agencies
        setVettingAgencies(formattedAgencies);
        
        // Select all agencies by default
        const agencyNames = formattedAgencies.map((a: VettingAgency) => a.name);
        setSelectedAgencies(agencyNames);
        
        // Update the brand data
        const updatedFormData = {
          ...formData,
          brand_identity: data.data.brandIdentity || '',
          tone_of_voice: data.data.toneOfVoice || '',
          guardrails: guardrailsContent,
          content_vetting_agencies: agencyNames.join(', '),
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
      
      // Add website URLs and user-added agencies
      submissionData.website_urls = urlsInput.trim();
      
      // Store user-added agencies as JSON if we have any
      if (userAddedAgencies.length > 0) {
        submissionData.user_added_agencies = JSON.stringify(userAddedAgencies);
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic-details">Basic Details</TabsTrigger>
          <TabsTrigger value="brand-identity">Brand Identity</TabsTrigger>
          <TabsTrigger value="content-types">Content Types</TabsTrigger>
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
                      <SelectContent className="max-h-[300px] overflow-y-auto">
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
                      <SelectContent className="max-h-[300px] overflow-y-auto">
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
        </TabsContent>

        <TabsContent value="brand-identity" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Generate brand identity details from website URLs or manually enter them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="urls-input">Website URLs</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="urls-input"
                        placeholder="Enter one or more URLs, separated by commas"
                        value={urlsInput}
                        onChange={(e) => {
                          setUrlsInput(e.target.value);
                          setUrlsError("");
                        }}
                      />
                      <Button 
                        onClick={generateBrandIdentity} 
                        disabled={isGenerating}
                        className="whitespace-nowrap"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>Generate</>
                        )}
                      </Button>
                    </div>
                    {urlsError && (
                      <p className="text-destructive text-sm mt-1">{urlsError}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      Enter the website URLs to automatically generate brand identity and tone of voice
                    </p>
                  </div>
                </div>
              </div>
              
              {usedFallback && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm flex items-start gap-2 border border-amber-200">
                  <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Using fallback content generation</p>
                    <p>We couldn't connect to our AI service or extract useful information from the URLs. 
                    We've generated generic content which you should review and customize.</p>
                  </div>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column: Main Inputs */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="brand_identity">Brand Identity</Label>
                    <Textarea
                      id="brand_identity"
                      value={formData.brand_identity}
                      onChange={handleChange}
                      placeholder="Enter a description of the brand's identity, values, and mission..."
                      className="min-h-[200px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                    <Textarea
                      id="tone_of_voice"
                      value={formData.tone_of_voice}
                      onChange={handleChange}
                      placeholder="Describe the tone and voice used in brand communications..."
                      className="min-h-[150px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guardrails">Content Guardrails</Label>
                    <Textarea
                      id="guardrails"
                      value={formData.guardrails}
                      onChange={handleChange}
                      placeholder="List any topics, phrases, or content to avoid..."
                      className="min-h-[150px]"
                    />
                  </div>
                </div>
                
                {/* Right Column: Color and AI-generated Agencies */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="brand_color">Brand Color</Label>
                    <div className="flex gap-3">
                      <div 
                        className="h-10 w-10 rounded-md border" 
                        style={{ backgroundColor: formData.brand_color }}
                      />
                      <Input
                        type="color"
                        id="brand_color"
                        value={formData.brand_color}
                        onChange={handleChange}
                        className="w-full h-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Select a primary brand color</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content Vetting Agencies</Label>
                    <div className="border rounded-md p-2">
                      {vettingAgencies.length > 0 ? (
                        <div className="space-y-2">
                          {vettingAgencies.map((agency, index) => (
                            <div 
                              key={index}
                              className="flex items-start space-x-3 p-2 border rounded-md hover:bg-accent/50 transition-colors"
                            >
                              <Checkbox 
                                id={`agency-${index}`}
                                checked={selectedAgencies.includes(agency.name)}
                                onCheckedChange={() => handleAgencySelection(agency.name)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <label 
                                    htmlFor={`agency-${index}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {agency.name}
                                  </label>
                                  <Badge variant={
                                    agency.priority === 'high' ? 'destructive' : 
                                    agency.priority === 'medium' ? 'default' : 
                                    'outline'
                                  }>
                                    {agency.priority.charAt(0).toUpperCase() + agency.priority.slice(1)}
                                  </Badge>
                                </div>
                                {agency.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {agency.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>No vetting agencies added yet</p>
                          <p className="text-xs mt-1">Use the Generate button to auto-suggest agencies</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These are regulatory bodies and agencies that content should comply with.
                    </p>
                    
                    {/* Hidden textarea to maintain form data */}
                    <textarea
                      id="content_vetting_agencies"
                      name="content_vetting_agencies"
                      value={formData.content_vetting_agencies}
                      onChange={handleChange}
                      className="hidden"
                    />
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
                Back
              </Button>
              <Button 
                type="button" 
                onClick={() => setCurrentTab("content-types")}
              >
                Next: Content Types
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* New Content Types Tab - Moved from the Brand Identity tab */}
        <TabsContent value="content-types" className="space-y-4 mt-6">
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
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setCurrentTab("brand-identity")}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
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