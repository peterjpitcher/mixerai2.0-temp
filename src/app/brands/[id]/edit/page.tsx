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
import { AlertCircle, Loader2, Info, Check, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { ConfirmDialog } from '@/components/confirm-dialog';
import TwoColumnLayout from "@/components/layout/two-column-layout";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/badge";
import { cn } from "@/lib/utils";

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
  
  // State for custom agency dialog
  const [showAddAgencyDialog, setShowAddAgencyDialog] = useState(false);
  const [customAgencyName, setCustomAgencyName] = useState('');
  const [customAgencyDescription, setCustomAgencyDescription] = useState('');
  const [customAgencyPriority, setCustomAgencyPriority] = useState('medium');
  const [userAddedAgencies, setUserAddedAgencies] = useState<any[]>([]);
  
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
          
          // Initialize user-added agencies if available
          if (data.brand.user_added_agencies) {
            try {
              const userAgencies = typeof data.brand.user_added_agencies === 'string'
                ? JSON.parse(data.brand.user_added_agencies)
                : data.brand.user_added_agencies;
              
              if (Array.isArray(userAgencies)) {
                setUserAddedAgencies(userAgencies);
              }
            } catch (e) {
              console.error('Failed to parse user_added_agencies:', e);
            }
          }
          
          // Initialize urlsInput from website_urls or fall back to website_url
          if (data.brand.website_urls) {
            setUrlsInput(data.brand.website_urls);
          } else if (data.brand.website_url) {
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
    try {
      setIsGenerating(true);
      
      console.log('==== Executing Brand Identity Generation ====');
      console.log('Brand name:', brand.name);
      console.log('URLs:', urlsInput.split('\n').filter(url => url.trim()));
      console.log('Country:', brand.country);
      console.log('Language:', brand.language);
      
      // Validate URLs
      const urls = urlsInput.split('\n').map(url => url.trim()).filter(url => url.length > 0);
      
      if (urls.length === 0) {
        console.error('No valid URLs provided');
        toast({
          title: 'Missing Website URLs',
          description: 'Please provide at least one website URL to generate a brand identity.',
          variant: 'destructive'
        });
        setIsGenerating(false);
        return;
      }
      
      // Important: Use the exact parameter names expected by the API
      const requestBody = {
        name: brand.name, // Use 'name' instead of 'brandName'
        urls: urls,
        country: brand.country || 'GB',
        language: brand.language || 'en-GB'
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
        const updatedBrand = {
          ...brand,
          brand_identity: data.data.brandIdentity || '',
          tone_of_voice: data.data.toneOfVoice || '',
          guardrails: guardrailsContent,
          website_urls: urlsInput.trim(), // Store the URLs used for generation
          content_vetting_agencies: vettingAgenciesData.length > 0 ? vettingAgenciesData.map(a => a.name).join(', ') : '',
          brand_color: data.data.brandColor || '#3498db'
        };
        
        // Debug the updated brand object before setting state
        console.log('About to update brand with:', {
          brandIdentityLength: updatedBrand.brand_identity.length,
          toneOfVoiceLength: updatedBrand.tone_of_voice.length,
          guardrailsLength: updatedBrand.guardrails.length,
          agencies: updatedBrand.content_vetting_agencies,
          color: updatedBrand.brand_color
        });
        
        // Update the state
        setBrand(updatedBrand);
        
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
        
          // Update user-added agencies with any new agencies from the API
          const existingAgencyNames = [...vettingAgencies.map(a => a.name), ...userAddedAgencies.map(a => a.name)];
          const newAgencies = vettingAgenciesData.filter(a => !existingAgencyNames.includes(a.name));
          
          if (newAgencies.length > 0) {
            console.log('Adding new agencies:', newAgencies.map(a => a.name));
            // Add new agencies to user-added agencies with their priorities
            setUserAddedAgencies(prev => [
              ...prev,
              ...newAgencies.map(a => ({
                name: a.name,
                description: a.description || '',
                priority: a.priority || 'medium'
              }))
            ]);
          }
          
          // Map the agencies to include priority if available
          const updatedAgencies = vettingAgencies.map(agency => {
            const matchingAgency = vettingAgenciesData.find((a: { name: string; priority?: string; }) => 
              a.name === agency.name
            );
            
            if (matchingAgency && matchingAgency.priority) {
              return {
                ...agency,
                priority: matchingAgency.priority
              };
            }
            
            return agency;
          });
          
          console.log('Setting vetting agencies with priorities');
          setVettingAgencies(updatedAgencies);
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
        console.log('Switching to brand-identity tab', currentTab, ' -> brand-identity');
        setCurrentTab("brand-identity");
        
        // Force a re-render after changing tabs
        setTimeout(() => {
          // Add a little delay to allow the tab change to complete
          console.log('Forcing UI update after tab change');
          setBrand({...updatedBrand}); // Create a new object reference to trigger re-render
          
          // Add a delayed check to verify the form field values after state update
          setTimeout(() => {
            console.log('VERIFICATION - Form fields after state update:', {
              brandIdentity: (document.getElementById('brand_identity') as HTMLTextAreaElement)?.value || 'Not found',
              toneOfVoice: (document.getElementById('tone_of_voice') as HTMLTextAreaElement)?.value || 'Not found',
              guardrails: (document.getElementById('guardrails') as HTMLTextAreaElement)?.value || 'Not found',
              agencies: selectedAgencies,
              color: (document.getElementById('brand_color') as HTMLInputElement)?.value || 'Not found'
            });
          }, 300);
        }, 100);
        
        // Save generated data to localStorage to prevent loss on refresh
        try {
          localStorage.setItem(`brand_generation_${id}`, JSON.stringify({
            brandIdentity: data.data.brandIdentity || '',
            toneOfVoice: data.data.toneOfVoice || '',
            guardrails: guardrailsContent, // Store the processed guardrails string
            agencies: vettingAgenciesData.length > 0 ? vettingAgenciesData.map(a => a.name).join(', ') : '',
            agencyNames: vettingAgenciesData.length > 0 ? vettingAgenciesData.map(a => a.name) : [],
            brandColor: data.data.brandColor || '#3498db',
            usedFallback: data.data.usedFallback || false,
            timestamp: new Date().getTime()
          }));
          console.log('Saved generated brand identity to localStorage');
        } catch (e) {
          console.error('Failed to save generation data to localStorage:', e);
        }
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
    
    if (!brand.name) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the updated brand data
      const updatedBrand = {
        ...brand,
        website_urls: urlsInput.trim(), // Store the URLs used for generation
        // Convert approved_content_types to JSON string if it's an array
        approved_content_types: Array.isArray(brand.approved_content_types) 
          ? JSON.stringify(brand.approved_content_types) 
          : brand.approved_content_types,
        // Store user-added agencies as JSON if we have any
        user_added_agencies: userAddedAgencies.length > 0 
          ? JSON.stringify(userAddedAgencies) 
          : undefined
      };
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBrand),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update brand');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Clear any saved generation data since we've now saved to the database
        localStorage.removeItem(`brand_generation_${id}`);
        
        toast({
          title: "Brand Updated",
          description: "Brand information has been updated successfully",
          variant: "default",
        });
        
        // Navigate back to the brand page
        router.push(`/brands/${id}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: "Update Failed",
        description: (error as Error).message || "An error occurred while updating the brand",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle agency priority change
  const handleAgencyPriorityChange = (agency: any, priority: string) => {
    const isCustomAgency = userAddedAgencies.some(a => a.name === agency.name);
    
    if (isCustomAgency) {
      // Update priority in user-added agencies
      setUserAddedAgencies(prev => 
        prev.map(a => a.name === agency.name ? { ...a, priority } : a)
      );
    } else {
      // Update priority in vetting agencies
      const updatedAgencies = vettingAgencies.map(a => 
        a.name === agency.name ? { ...a, priority } : a
      );
      setVettingAgencies(updatedAgencies);
    }
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
    setSelectedAgencies(prev => [...prev, newAgency.name]);
    
    // Update content_vetting_agencies field
    setBrand(prev => ({
      ...prev,
      content_vetting_agencies: [...selectedAgencies, newAgency.name].join(', ')
    }));
    
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
    setSelectedAgencies(prev => prev.filter(name => name !== agencyToRemove.name));
    
    // Update content_vetting_agencies field
    setBrand(prev => {
      const updatedAgencies = selectedAgencies.filter(name => name !== agencyToRemove.name);
      return {
        ...prev,
        content_vetting_agencies: updatedAgencies.join(', ')
      };
    });
  };
  
  // Add effect to preserve data in localStorage to prevent data loss on refresh
  useEffect(() => {
    // Check if there's saved data from a previous generation
    const savedData = localStorage.getItem(`brand_generation_${id}`);
    
    if (savedData && isLoading === false) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Only use saved data if current brand data is empty
        const currentBrandEmpty = !brand.brand_identity && !brand.tone_of_voice && !brand.guardrails;
        
        if (currentBrandEmpty && parsedData) {
          console.log('Restoring saved brand identity data from localStorage');
          
          setBrand(prev => ({
            ...prev,
            brand_identity: parsedData.brandIdentity || prev.brand_identity,
            tone_of_voice: parsedData.toneOfVoice || prev.tone_of_voice,
            guardrails: parsedData.guardrails || prev.guardrails,
            content_vetting_agencies: parsedData.agencies || prev.content_vetting_agencies,
            brand_color: parsedData.brandColor || prev.brand_color
          }));
          
          if (parsedData.agencyNames && parsedData.agencyNames.length > 0) {
            setSelectedAgencies(parsedData.agencyNames);
          }
          
          setUsedFallback(parsedData.usedFallback || false);
          
          // Show restoration message
          toast({
            title: 'Restored Content',
            description: 'Previously generated content has been restored.',
            variant: 'default'
          });
        }
      } catch (e) {
        console.error('Failed to parse saved generation data:', e);
        // Clear invalid data
        localStorage.removeItem(`brand_generation_${id}`);
      }
    }
  }, [id, isLoading, brand, toast]);
  
  // Add debugging to the tab change handler
  useEffect(() => {
    console.log(`Tab changed from ${currentTab === 'brand-identity' ? 'basic-details' : 'brand-identity'} to ${currentTab}`);
    
    if (currentTab === 'brand-identity') {
      // Check if brand identity data is present when tab changes
      console.log('Brand identity tab selected with data:', {
        brandIdentityLength: brand.brand_identity?.length || 0,
        toneOfVoiceLength: brand.tone_of_voice?.length || 0,
        guardrailsLength: brand.guardrails?.length || 0,
        agencies: brand.content_vetting_agencies || 'None',
        color: brand.brand_color || 'None'
      });
    }
  }, [currentTab, brand]);
  
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
        <Button variant="outline" asChild>
          <Link href={`/brands/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brand
          </Link>
        </Button>
      </div>

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
                    <Label htmlFor="name">Brand Name</Label>
                  </div>
                  <Input
                    id="name"
                    name="name"
                    value={brand.name}
                    onChange={handleInputChange}
                    placeholder="Enter brand name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    value={brand.website_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={brand.country}
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
                      value={brand.language}
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
                        brand.approved_content_types.includes(contentType.id) 
                          ? "bg-primary/10 border-primary/50" 
                          : "bg-card"
                      )}
                      onClick={() => handleContentTypeChange(contentType.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{contentType.name}</h4>
                        <Checkbox 
                          checked={brand.approved_content_types.includes(contentType.id)}
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
              <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
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
                            value={brand.brand_color || '#3498db'}
                            onChange={handleInputChange}
                            className="w-8 h-8 p-1 rounded cursor-pointer"
                            title="Click to change brand colour"
                          />
                          <span className="text-xs font-mono">{brand.brand_color}</span>
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
                        value={brand.brand_identity}
                        onChange={handleInputChange}
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
                        value={brand.tone_of_voice}
                        onChange={handleInputChange}
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
                          value={brand.guardrails}
                          onChange={handleInputChange}
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
                        <button 
                          type="button"
                          onClick={() => setShowAddAgencyDialog(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          + Add custom agency
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        These are official bodies that generated content should be vetted against to ensure it's true, accurate, 
                        and safe. Agencies are specific to the brand's country of operation and are prioritised by importance.
                      </p>
                      
                      {vettingAgencies.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 border rounded-md">
                          {brand.country ? (
                            <>No suggested agencies available for {COUNTRIES.find(c => c.value === brand.country)?.label}. Please select a different country or add custom agencies.</>
                          ) : (
                            <>Select a country to see suggested vetting agencies or add custom agencies manually.</>
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

                    {/* Custom agency section */}
                    {userAddedAgencies.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h3 className="text-sm font-medium">Custom Agencies</h3>
                        <div className="space-y-2">
                          {userAddedAgencies.map((agency, index) => (
                            <div 
                              key={`custom-${index}`} 
                              className="flex items-start space-x-2 p-2 rounded-md border hover:bg-muted/50"
                            >
                              <Checkbox 
                                id={`custom-agency-${index}`}
                                checked={selectedAgencies.includes(agency.name)}
                                onCheckedChange={(checked) => 
                                  handleAgencyCheckboxChange(!!checked, agency)
                                }
                              />
                              <div className="flex-1">
                                <Label 
                                  htmlFor={`custom-agency-${index}`}
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
                              <div className="flex items-center gap-1">
                                <Select 
                                  value={agency.priority}
                                  onValueChange={(value) => handleAgencyPriorityChange(agency, value)}
                                >
                                  <SelectTrigger className="h-7 w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 rounded-full"
                                  onClick={() => handleRemoveCustomAgency(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="sr-only">Remove</span>
                                </Button>
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
              <Button type="button" variant="outline" onClick={() => setCurrentTab("basic-details")}>
                Back to Basic Details
              </Button>
              <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog components */}
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite existing content?</DialogTitle>
            <DialogDescription>
              This will replace your existing brand identity, tone of voice, guardrails, and vetting agencies with newly generated content. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmOverwriteBrandIdentity}>
              Yes, Generate New Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Agency Dialog */}
      <Dialog open={showAddAgencyDialog} onOpenChange={setShowAddAgencyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Custom Vetting Agency</DialogTitle>
            <DialogDescription>
              Add a custom agency or regulatory body specific to your brand's needs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-agency-name">Agency Name</Label>
              <Input 
                id="custom-agency-name" 
                value={customAgencyName} 
                onChange={(e) => setCustomAgencyName(e.target.value)} 
                placeholder="e.g. Financial Conduct Authority"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-agency-description">Description (Optional)</Label>
              <Textarea 
                id="custom-agency-description" 
                value={customAgencyDescription} 
                onChange={(e) => setCustomAgencyDescription(e.target.value)} 
                placeholder="Describe what this agency regulates"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-agency-priority">Priority</Label>
              <Select 
                value={customAgencyPriority} 
                onValueChange={setCustomAgencyPriority}
              >
                <SelectTrigger id="custom-agency-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAgencyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCustomAgency} 
              disabled={!customAgencyName.trim()}
            >
              Add Agency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 