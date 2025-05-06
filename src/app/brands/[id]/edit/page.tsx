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
import { AlertCircle, Loader2, Info, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/dialog";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/badge";
import { cn } from "@/lib/utils";

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

// Define a proper interface for the brand state
interface BrandState {
  id?: string;
  name: string;
  website_url: string;
  country: string;
  language: string;
  brand_identity: string;
  tone_of_voice: string;
  guardrails: string;
  content_vetting_agencies: string;
  brand_color: string;
  brand_summary?: string;
  approved_content_types: string[];
  brand_admin_ids: string[];
  brand_admin_id?: string; // Include for backward compatibility
  website_urls?: string;
  user_added_agencies?: string;
  [key: string]: any; // Allow other properties for flexibility
}

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic-details");
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [vettingAgencies, setVettingAgencies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [brand, setBrand] = useState<BrandState>({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: '',
    brand_color: '#3498db',
    approved_content_types: [],
    brand_admin_ids: []
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
  
  // Add states for admin search
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isValidEmail, setIsValidEmail] = useState(false);
  
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
          
          // Initialize brand_admin_ids from the API response
          // Check if there's a single brand_admin_id coming from the API
          const brandAdminIds: string[] = [];
          if (data.brand.brand_admin_id) {
            brandAdminIds.push(data.brand.brand_admin_id);
          }
          // Add any brand_admin_ids from the array if it exists
          if (data.brand.brand_admin_ids && Array.isArray(data.brand.brand_admin_ids)) {
            data.brand.brand_admin_ids.forEach((id: string) => {
              if (!brandAdminIds.includes(id)) {
                brandAdminIds.push(id);
              }
            });
          }
          
          setBrand({
            ...data.brand,
            approved_content_types: approvedTypes,
            brand_admin_ids: brandAdminIds
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
  
  // Fetch users for brand admin selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
          setUsers(data.users || []);
        } else {
          console.error('Failed to fetch users:', data.error);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Filter users for brand admin selection
  useEffect(() => {
    if (users.length) {
      // Check if the search term is a valid email that doesn't exist in users
      const isEmail = validateEmail(adminSearchTerm);
      const emailExists = isEmail && users.some(user => user.email?.toLowerCase() === adminSearchTerm.toLowerCase());
      setIsValidEmail(isEmail && !emailExists);
      
      const filtered = users
        .filter(user => user.role === 'Admin' || user.role === 'Editor')
        .filter(user => !brand.brand_admin_ids?.includes(user.id))
        .filter(user => {
          if (!adminSearchTerm) return true;
          const term = adminSearchTerm.toLowerCase();
          return (
            user.full_name.toLowerCase().includes(term) ||
            (user.email && user.email.toLowerCase().includes(term))
          );
        });
      setFilteredUsers(filtered);
    }
  }, [users, adminSearchTerm, brand.brand_admin_ids]);
  
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
    
    // Validate URL
    if (!brand.website_url.trim()) {
      toast({
        title: "Validation Error",
        description: "Website URL is required",
        variant: "destructive",
      });
      return;
    }
    
    // Check for valid URL format
    try {
      new URL(brand.website_url);
    } catch (e) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setUsedFallback(false);
    
    try {
      console.log('==== Executing Brand Identity Generation ====');
      console.log('Brand name:', brand.name);
      console.log('URL:', brand.website_url);
      console.log('Country:', brand.country);
      console.log('Language:', brand.language);
      
      // Important: Use the exact parameter names expected by the API
      const requestBody = {
        name: brand.name,
        urls: [brand.website_url],
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
          website_urls: brand.website_url.trim(), // Store the URLs used for generation
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
    
    // Validate URL if provided
    if (brand.website_url) {
      try {
        new URL(brand.website_url);
      } catch (e) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid website URL",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate at least one brand admin is selected
    if (!brand.brand_admin_ids || brand.brand_admin_ids.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one brand admin must be selected",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the updated brand data
      const updatedBrand = {
        ...brand,
        // Convert approved_content_types to JSON string if it's an array
        approved_content_types: Array.isArray(brand.approved_content_types) 
          ? JSON.stringify(brand.approved_content_types) 
          : brand.approved_content_types,
        // Include the brand_admin_ids array
        brand_admin_ids: brand.brand_admin_ids,
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
  
  // Helper function to generate benefits based on content type
  const getContentTypeBenefits = (contentTypeName: string): string[] => {
    const benefits: Record<string, string[]> = {
      "Blog Post": [
        "Improves SEO rankings",
        "Establishes thought leadership",
        "Drives organic traffic"
      ],
      "Social Media Post": [
        "Increases brand awareness",
        "Engages community directly",
        "Provides shareable content"
      ],
      "Email Newsletter": [
        "Nurtures existing customers",
        "Delivers personalized content",
        "Highest ROI for marketing channels"
      ],
      "Product Description": [
        "Drives purchase decisions",
        "Communicates value proposition",
        "Reduces return rates through clear expectations"
      ],
      "Press Release": [
        "Builds media relationships",
        "Creates brand credibility",
        "Ensures consistent messaging across outlets"
      ],
      "Landing Page": [
        "Optimizes conversion rates", 
        "Targets specific audience segments",
        "Supports campaign objectives"
      ],
      "White Paper": [
        "Demonstrates expertise",
        "Generates quality leads",
        "Supports complex purchase decisions"
      ],
      "Case Study": [
        "Provides social proof",
        "Illustrates real-world value",
        "Supports sales conversations"
      ],
      "Infographic": [
        "Simplifies complex information",
        "Highly shareable content format",
        "Appeals to visual learners"
      ],
      "Video Script": [
        "Engages audiences effectively",
        "Increases message retention",
        "Performs well on social platforms"
      ]
    };

    // Return specific benefits if we have them
    if (benefits[contentTypeName]) {
      return benefits[contentTypeName];
    }

    // Fallback generic benefits
    return [
      "Enhances brand communication",
      "Connects with target audience",
      "Supports marketing objectives"
    ];
  };
  
  // Function to validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Function to send invitation to new user
  const sendInvitation = async (email: string) => {
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: 'editor', // Default role for brand admins
          company: 'Added via brand admin',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }
      
      // Add the user with a temporary ID until they register
      const tempUserId = `temp-${Date.now()}`;
      setBrand(prev => ({
        ...prev,
        brand_admin_ids: [...(prev.brand_admin_ids || []), tempUserId]
      }));
      
      // Add a temporary user object to the users array
      setUsers(prev => [...prev, {
        id: tempUserId,
        full_name: email,
        email: email,
        role: 'Editor',
        pending: true
      }]);
      
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${email}. They will be added as a brand admin once they register.`,
      });
      
      // Clear the search term
      setAdminSearchTerm('');
      setIsValidEmail(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Invitation Failed',
        description: error instanceof Error ? error.message : 'Failed to invite user',
        variant: 'destructive',
      });
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
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={brand.name}
                      onChange={handleInputChange}
                      placeholder="Enter brand name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand_admin_ids">Brand Admins <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="admin-search"
                        placeholder="Search for users..."
                        value={adminSearchTerm}
                        onChange={(e) => setAdminSearchTerm(e.target.value)}
                        className="mb-1"
                      />
                      <div className="flex flex-wrap gap-1 mb-2">
                        {brand.brand_admin_ids?.map(adminId => {
                          const admin = users.find(u => u.id === adminId);
                          return admin ? (
                            <Badge key={adminId} variant="secondary" className="flex items-center gap-1">
                              {admin.full_name}
                              <button 
                                type="button" 
                                onClick={() => {
                                  setBrand(prev => ({
                                    ...prev,
                                    brand_admin_ids: prev.brand_admin_ids.filter(id => id !== adminId)
                                  }));
                                }}
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="sr-only">Remove</span>
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                      <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                        {loadingUsers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading users...</span>
                          </div>
                        ) : isValidEmail ? (
                          <div 
                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded-sm bg-primary/5"
                            onClick={() => sendInvitation(adminSearchTerm)}
                          >
                            <div>
                              <div className="font-medium">Invite new user</div>
                              <div className="text-xs text-muted-foreground">{adminSearchTerm}</div>
                            </div>
                            <Button variant="default" size="sm" type="button">Invite</Button>
                          </div>
                        ) : filteredUsers.length > 0 ? (
                          filteredUsers.map(user => (
                            <div 
                              key={user.id} 
                              className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded-sm"
                              onClick={() => {
                                setBrand(prev => ({
                                  ...prev,
                                  brand_admin_ids: [...(prev.brand_admin_ids || []), user.id]
                                }));
                                setAdminSearchTerm(''); // Clear search after selection
                              }}
                            >
                              <div>
                                <div className="font-medium">{user.full_name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                              <Button variant="ghost" size="sm" type="button">Add</Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-2 text-muted-foreground text-sm">
                            {adminSearchTerm ? 'No users found. Enter a valid email to invite.' : 'Type to search users or enter an email to invite'}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Brand admins are the primary points of contact who own this brand
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    placeholder="https://example.com"
                    value={brand.website_url}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the primary website URL for this brand
                  </p>
                </div>
                
                {/* Country and Language selection */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={brand.country}
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
                      value={brand.language}
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
                    <Label htmlFor="urls-input">Website URL</Label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        id="urls-input"
                        placeholder="Enter website URL"
                        value={brand.website_url}
                        onChange={(e) => handleInputChange({
                          target: {
                            name: 'website_url',
                            value: e.target.value
                          }
                        } as React.ChangeEvent<HTMLInputElement>)}
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
                          <>Generate Identity</>
                        )}
                      </Button>
                    </div>
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
                      name="brand_identity"
                      value={brand.brand_identity}
                      onChange={handleInputChange}
                      placeholder="Enter a description of the brand's identity, values, and mission..."
                      className="min-h-[200px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                    <Textarea
                      id="tone_of_voice"
                      name="tone_of_voice"
                      value={brand.tone_of_voice}
                      onChange={handleInputChange}
                      placeholder="Describe the tone and voice used in brand communications..."
                      className="min-h-[150px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guardrails">Content Guardrails</Label>
                    <Textarea
                      id="guardrails"
                      name="guardrails"
                      value={brand.guardrails}
                      onChange={handleInputChange}
                      placeholder="List any topics, phrases, or content to avoid..."
                      className="min-h-[150px]"
                    />
                  </div>
                </div>
                
                {/* Right Column: Content Vetting Agencies */}
                <div className="space-y-6">
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
                                onCheckedChange={(checked) => 
                                  handleAgencyCheckboxChange(!!checked, agency)
                                }
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
                      value={brand.content_vetting_agencies}
                      onChange={handleInputChange}
                      className="hidden"
                    />
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
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAgencyDialog(true)}
                      className="mt-2"
                    >
                      + Add custom agency
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" onClick={() => setCurrentTab("basic-details")}>
                Back
              </Button>
              <Button type="button" onClick={() => setCurrentTab("content-types")}>
                Next: Content Types
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* New Content Types Tab */}
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
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Each content type has specific characteristics and benefits. Select those that align with this brand's marketing strategy.
                  </p>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="p-3 font-medium text-sm">Content Type</th>
                          <th className="p-3 font-medium text-sm">Description</th>
                          <th className="p-3 font-medium text-sm">Benefits</th>
                          <th className="p-3 font-medium text-sm">Select</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {contentTypes.map((contentType) => {
                          // Generate benefits based on content type name if no description 
                          // is available (this would ideally come from your database)
                          const typeBenefits = getContentTypeBenefits(contentType.name);
                          
                          return (
                            <tr 
                              key={contentType.id}
                              className={cn(
                                "hover:bg-muted/30 transition-colors",
                                brand.approved_content_types.includes(contentType.id) && "bg-primary/5"
                              )}
                            >
                              <td className="p-3">
                                <span className="font-medium">{contentType.name}</span>
                              </td>
                              <td className="p-3 text-sm">
                                {contentType.description || "Specialized content format for audience engagement"}
                              </td>
                              <td className="p-3 text-sm">
                                <ul className="list-disc pl-5 space-y-1">
                                  {typeBenefits.map((benefit, idx) => (
                                    <li key={idx}>{benefit}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-3 text-center">
                                <Checkbox 
                                  checked={brand.approved_content_types.includes(contentType.id)}
                                  onCheckedChange={() => handleContentTypeChange(contentType.id)}
                                  className="h-5 w-5"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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