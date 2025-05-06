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
  country: string;
  language: string;
  brand_identity: string;
  tone_of_voice: string;
  guardrails: string;
  content_vetting_agencies: string;
  brand_color: string;
  approved_content_types: string[];
  user_added_agencies?: string;
  brand_admin_ids: string[];
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
  const [usedFallback, setUsedFallback] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
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
    approved_content_types: [],
    brand_admin_ids: []
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
  
  // State for filtering users in the brand admins dropdown
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  
  // Add new state for detecting emails
  const [isValidEmail, setIsValidEmail] = useState(false);
  
  // Add function to validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Add function to send invitation to new user
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
      setFormData(prev => ({
        ...prev,
        brand_admin_ids: [...prev.brand_admin_ids, tempUserId]
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
  
  // Update filtered users when users list changes or search term changes
  useEffect(() => {
    if (users.length) {
      // Check if the search term is a valid email that doesn't exist in users
      const isEmail = validateEmail(adminSearchTerm);
      const emailExists = isEmail && users.some(user => user.email?.toLowerCase() === adminSearchTerm.toLowerCase());
      setIsValidEmail(isEmail && !emailExists);
      
      const filtered = users
        .filter(user => user.role === 'Admin' || user.role === 'Editor')
        .filter(user => !formData.brand_admin_ids.includes(user.id))
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
  }, [users, adminSearchTerm, formData.brand_admin_ids]);
  
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

    if (!formData.website_url.trim()) {
      toast({
        title: "Validation Error",
        description: "Website URL is required",
        variant: "destructive",
      });
      return;
    }

    // Validate URL
    try {
      new URL(formData.website_url);
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
      console.log('Brand name:', formData.name);
      console.log('URL:', formData.website_url);
      console.log('Country:', formData.country);
      console.log('Language:', formData.language);
      
      // Important: Use the exact parameter names expected by the API
      const requestBody = {
        name: formData.name,
        urls: [formData.website_url],
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
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Brand name is required');
      }
      
      if (!formData.website_url.trim()) {
        throw new Error('Website URL is required');
      }

      // Validate URL
      try {
        new URL(formData.website_url);
      } catch (e) {
        throw new Error('Please enter a valid URL');
      }
      
      // Validate at least one brand admin is selected
      if (formData.brand_admin_ids.length === 0) {
        throw new Error('At least one brand admin must be selected');
      }
      
      // Create the request body
      const requestBody = {
        ...formData,
        brand_admin_ids: formData.brand_admin_ids,
        approved_content_types: formData.approved_content_types,
        user_added_agencies: JSON.stringify(userAddedAgencies)
      };
      
      console.log('Submitting brand with:', requestBody);
      
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create brand');
      }
      
      toast({
        title: 'Success!',
        description: 'Brand created successfully',
      });
      
      // Redirect to the brand page
      router.push(`/dashboard/brands/${data.brand.id}`);
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create brand',
        variant: 'destructive',
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

        <TabsContent value="basic-details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>
                Enter the basic information about the brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Enter brand name"
                    value={formData.name}
                    onChange={handleChange}
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
                      {formData.brand_admin_ids.map(adminId => {
                        const admin = users.find(u => u.id === adminId);
                        return admin ? (
                          <Badge key={adminId} variant="secondary" className="flex items-center gap-1">
                            {admin.full_name}
                            <button 
                              type="button" 
                              onClick={() => {
                                setFormData(prev => ({
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
                              setFormData(prev => ({
                                ...prev,
                                brand_admin_ids: [...prev.brand_admin_ids, user.id]
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
                  placeholder="https://example.com"
                  value={formData.website_url}
                  onChange={handleChange}
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
                    value={formData.country}
                    onValueChange={(value) => handleSelectChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
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
                      {LANGUAGES.map(language => (
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
              <div></div> {/* Empty div for alignment */}
              <Button 
                type="button" 
                onClick={() => setCurrentTab("brand-identity")}
              >
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
                <div className="space-y-2 pb-6 border-b">
                  <Label htmlFor="website-identity-url">Generate Brand Identity</Label>
                  <div className="flex gap-2">
                    <Input
                      id="website-identity-url"
                      placeholder="Enter website URL"
                      value={formData.website_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <Button 
                      onClick={generateBrandIdentity} 
                      disabled={isGenerating || !formData.website_url.trim()}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    The website URL will be analyzed to generate brand identity content
                  </p>
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
                                formData.approved_content_types.includes(contentType.id) && "bg-primary/5"
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
                                  checked={formData.approved_content_types.includes(contentType.id)}
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
                {isSubmitting ? 'Creating...' : 'Create Brand'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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