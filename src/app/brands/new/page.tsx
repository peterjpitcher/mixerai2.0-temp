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
import { AlertCircle, Loader2, Info } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { VETTING_AGENCIES_BY_COUNTRY } from '@/lib/azure/openai';

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
      console.log("Using country:", formData.country, "and language:", formData.language);
      
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: formData.name,
          urls,
          countryCode: formData.country,
          languageCode: formData.language
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      if (result.success) {
        // Update the form data with the generated identity
        setFormData(prev => ({
          ...prev,
          brand_identity: result.data.brandIdentity,
          tone_of_voice: result.data.toneOfVoice,
          guardrails: typeof result.data.guardrails === 'string' 
            ? result.data.guardrails 
            : Array.isArray(result.data.guardrails)
              ? result.data.guardrails.map((item: string) => `- ${item}`).join('\n')
              : String(result.data.guardrails),
          content_vetting_agencies: typeof result.data.contentVettingAgencies === 'string'
            ? result.data.contentVettingAgencies
            : String(result.data.contentVettingAgencies),
          brand_color: typeof result.data.brandColor === 'string' && result.data.brandColor.startsWith('#') 
            ? result.data.brandColor 
            : '#3498db' // Default to blue if no valid color is provided
        }));

        // Process the AI-generated vetting agencies
        if (result.data.contentVettingAgencies) {
          let agencyNames: string[] = [];
          
          // Parse generated agency information
          let generatedAgencies: { name: string; description: string }[] = [];
          
          if (Array.isArray(result.data.contentVettingAgencies)) {
            result.data.contentVettingAgencies.forEach((agency: any) => {
              if (typeof agency === 'object' && agency.name) {
                // Extract name and description from object
                generatedAgencies.push({
                  name: agency.name.trim(),
                  description: agency.description || ''
                });
              } else if (typeof agency === 'string') {
                // If it's just a string, use it as the name
                generatedAgencies.push({
                  name: agency.trim(),
                  description: ''
                });
              }
            });
          } else if (typeof result.data.contentVettingAgencies === 'string') {
            // If it's a comma-separated string, split it
            const agencyStrings = result.data.contentVettingAgencies.split(',');
            agencyStrings.forEach(agencyStr => {
              generatedAgencies.push({
                name: agencyStr.trim(),
                description: ''
              });
            });
          } else if (typeof result.data.contentVettingAgencies === 'object' && result.data.contentVettingAgencies !== null) {
            // If it's an object but not an array
            try {
              Object.entries(result.data.contentVettingAgencies).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null && 'name' in value) {
                  generatedAgencies.push({
                    name: (value as any).name.trim(),
                    description: (value as any).description || ''
                  });
                } else {
                  generatedAgencies.push({
                    name: key.trim(),
                    description: typeof value === 'string' ? value : ''
                  });
                }
              });
            } catch (e) {
              console.log("Failed to parse complex agency object:", e);
            }
          }
          
          // Update default suggested agencies with the AI-generated ones if we have any
          if (generatedAgencies.length > 0) {
            // Replace predefined country agencies with the AI-generated ones
            setVettingAgencies(generatedAgencies);
          }
          
          // Extract just the names for selection
          agencyNames = generatedAgencies.map(agency => agency.name);
          
          // Set all new agencies as selected by default
          setSelectedAgencies(agencyNames);
          
          // Update the form data with the comma-separated string of agencies
          setFormData(prev => ({
            ...prev,
            content_vetting_agencies: agencyNames.join(', ')
          }));
        } else {
          setSelectedAgencies([]);
          setFormData(prev => ({
            ...prev,
            content_vetting_agencies: ''
          }));
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
      
      // Don't use fallback content; instead clearly inform the user of the error
      setUsedFallback(false);
      setUrlsError(error.message || "Failed to generate brand identity. Please try again later.");
      
      toast({
        title: "AI Service Error",
        description: error.message || "The AI service is currently unavailable. Please try again later.",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Brand</h1>
          <p className="text-muted-foreground">
            Create a new brand to generate content for
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/brands">Cancel</Link>
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
                Enter the basic details about the brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" id="brand-form">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="name" 
                      placeholder="Enter brand name" 
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input 
                      id="website_url" 
                      type="url" 
                      placeholder="https://example.com" 
                      value={formData.website_url}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select 
                        value={formData.country} 
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
                        value={formData.language} 
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
                                checked={formData.approved_content_types.includes(contentType.id)}
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
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="outline" asChild>
                <Link href="/brands">Cancel</Link>
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
                  form="brand-form" 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Brand'}
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
                Generate brand identity using AI from website URLs or enter manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4 pb-6 border-b">
                  <div className="space-y-2">
                    <Label htmlFor="urls-input">Website URLs (one per line)</Label>
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
                </div>

                {usedFallback && (
                  <div className="p-4 mb-4 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-700 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">AI service unavailable</p>
                      <p className="text-sm">Our AI service couldn't generate brand identity content. Please try again later or enter content manually.</p>
                    </div>
                  </div>
                )}
                
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
                          value={formData.brand_color}
                          onChange={handleChange}
                          className="w-8 h-8 p-1 rounded cursor-pointer"
                          title="Click to change brand color"
                        />
                        <span className="text-xs text-muted-foreground">{formData.brand_color}</span>
                      </div>
                    </div>
                    <Textarea
                      id="brand_identity"
                      placeholder="Describe the brand's identity, values, and mission"
                      rows={3}
                      value={formData.brand_identity}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                    <Textarea
                      id="tone_of_voice"
                      placeholder="Describe the brand's tone of voice (formal, casual, friendly, professional, etc.)"
                      rows={3}
                      value={formData.tone_of_voice}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guardrails">Content Guardrails</Label>
                    <div className="relative">
                      <Textarea
                        id="guardrails"
                        placeholder="Specify any content restrictions or guidelines as a bulleted list (- Item 1&#10;- Item 2)"
                        rows={5}
                        value={formData.guardrails}
                        onChange={handleChange}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        Enter as bulleted list
                      </div>
                    </div>
                    {formData.guardrails && !formData.guardrails.includes('-') && (
                      <div className="text-xs text-amber-600 flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        <span>For better readability, use bullet points (e.g., "- Guideline 1" on each line)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      {/* Hidden input to store selected agencies */}
                      <input 
                        type="hidden" 
                        id="content_vetting_agencies"
                        name="content_vetting_agencies"
                        value={formData.content_vetting_agencies}
                      />
                      
                      {/* Suggested agencies based on country */}
                      {formData.country && vettingAgencies.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Suggested Agencies for {COUNTRIES.find(c => c.value === formData.country)?.label || formData.country}</p>
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