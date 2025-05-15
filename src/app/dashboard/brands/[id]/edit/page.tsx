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
import { Loader2, X, PlusCircle, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

// export const metadata: Metadata = {
//   title: 'Edit Brand | MixerAI 2.0',
//   description: 'Edit the details, brand identity, and settings for an existing brand.',
// };

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

// Define the type for user search results
interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

// Define the type for content vetting agencies (can be refined based on API response)
interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority?: 'High' | 'Medium' | 'Low' | null;
}

// Helper function to get priority-based Tailwind CSS classes
const getPriorityAgencyStyles = (priority: 'High' | 'Medium' | 'Low' | null | undefined): string => {
  if (priority === 'High') {
    return 'text-red-600 font-bold';
  }
  if (priority === 'Medium') {
    return 'text-orange-500 font-semibold';
  }
  if (priority === 'Low') {
    return 'text-blue-600 font-normal'; // Example for Low
  }
  return 'font-normal text-gray-700 dark:text-gray-300'; // Default for null/undefined or other values
};

// Placeholder Breadcrumbs component - replace with actual implementation later
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

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
  
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    additional_website_urls: [] as { id: string; value: string }[],
    country: '',
    language: '',
    brand_color: '#1982C4',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: [] as string[]
  });
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState('');
  const [customAgencyInput, setCustomAgencyInput] = useState('');

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);

  // UPDATED: State for selected brand admins
  const [selectedAdmins, setSelectedAdmins] = useState<UserSearchResult[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  // Function to search users
  const searchUsers = async (query) => {
    if (!query) return;
    try {
      const response = await fetch(`/api/users/search?query=${query}`);
      const data = await response.json();
      if (data.success) {
        setUserSearchResults(data.users);
      } else {
        setUserSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSearchResults([]);
    }
  };

  // Effect to trigger user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
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
          content_vetting_agencies: Array.isArray(data.brand.selected_vetting_agencies) 
                                      ? data.brand.selected_vetting_agencies.map((agency: VettingAgency) => agency.id) 
                                      : [],
        });

        // Populate selectedAdmins from fetched brand data
        if (data.brand.admins && Array.isArray(data.brand.admins)) {
          setSelectedAdmins(data.brand.admins);
        }

      } catch (error) {
        setError((error as Error).message);
        toast.error('Failed to load brand details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrandData();
  }, [id]);

  // useEffect to fetch vetting agencies based on brand's country
  useEffect(() => {
    const fetchAllVettingAgencies = async () => {
      // Only fetch if country is selected, or fetch all if no country specific logic desired when country is empty
      // For now, let's assume we always want to try fetching, API will handle if country_code is undefined/empty
      let apiUrl = '/api/content-vetting-agencies';
      if (formData.country) {
        apiUrl = `/api/content-vetting-agencies?country_code=${formData.country}`;
      }

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch vetting agencies');
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAllVettingAgencies(data.data);
        } else {
          toast.error(data.error || 'Could not load vetting agencies for the selected country.');
          setAllVettingAgencies([]); // Clear previous list if fetch fails or returns no data for country
        }
      } catch (err) {
        toast.error('Failed to fetch vetting agencies list.');
        console.error('Error fetching all vetting agencies:', err);
        setAllVettingAgencies([]);
      }
    };

    // We need formData.country to be populated before fetching agencies by country.
    // Check if isLoading is false, which means fetchBrandData has likely completed and set formData.country.
    if (!isLoading) { 
      fetchAllVettingAgencies();
    }
  }, [formData.country, isLoading]); // Re-fetch when formData.country changes or when initial loading finishes
  
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
  const handleAgencyCheckboxChange = (agencyId: string, checked: boolean) => {
    setFormData(prev => {
      const currentAgencies = Array.isArray(prev.content_vetting_agencies) ? prev.content_vetting_agencies : [];
      if (checked) {
        return { ...prev, content_vetting_agencies: Array.from(new Set([...currentAgencies, agencyId])) };
      } else {
        return { ...prev, content_vetting_agencies: currentAgencies.filter(id => id !== agencyId) };
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

  const handleRemoveCustomAgency = (agencyIdToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      // This assumes content_vetting_agencies is an array of IDs
      content_vetting_agencies: prev.content_vetting_agencies.filter(id => id !== agencyIdToRemove)
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
  
  // UPDATED: Handler for selecting an admin from search results
  const handleSelectAdmin = (user: UserSearchResult) => {
    if (!selectedAdmins.find(admin => admin.id === user.id)) {
      setSelectedAdmins(prevAdmins => [...prevAdmins, user]);
    }
    setSearchQuery(''); // Clear search query
    setUserSearchResults([]); // Clear search results
  };

  // NEW: Handler for removing a selected admin
  const handleRemoveAdmin = (adminId: string) => {
    setSelectedAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== adminId));
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!formData.name) {
        toast.error('Brand name is required.');
        setIsSaving(false);
        return;
      }
      
      const { content_vetting_agencies, ...restOfFormData } = formData;
      
      const updateData = {
        ...restOfFormData,
        // UPDATED: Send an array of admin IDs
        brand_admin_ids: selectedAdmins.map(admin => admin.id), 
        selected_agency_ids: content_vetting_agencies,
        updated_at: new Date().toISOString()
      };
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        throw new Error(errorData.error || `Failed to update brand: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update brand');
      }
      
      toast.success('Brand updated successfully!');
      router.push(`/dashboard/brands/${id}`); // Or router.refresh() if staying on page
    } catch (error) {
      toast.error((error as Error).message || 'Failed to save brand. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Error state component from BrandsPage, adapted for this page
  const ErrorDisplay = ({ message }: { message: string | null }) => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-red-500">
        <AlertTriangle size={64} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold mb-2">Error Loading Brand</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{message}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  // Not found state component from BrandsPage, adapted for this page
  const NotFoundDisplay = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
       <div className="mb-4 text-yellow-500"> {/* Changed color for not found */}
        <AlertTriangle size={64} strokeWidth={1.5} /> {/* Or a different icon like SearchX */}
      </div>
      <h3 className="text-xl font-bold mb-2">Brand Not Found</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        The brand you are looking for does not exist or has been deleted.
      </p>
      <Button onClick={() => router.push('/dashboard/brands')}>Back to Brands</Button>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6"> {/* Added standard padding */}
        <div className="flex justify-center items-center h-[50vh]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /> {/* Matched BrandsPage loader style */}
            <p className="text-muted-foreground">Loading brand details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6"> {/* Added standard padding */}
            <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" }, 
                { label: "Brands", href: "/dashboard/brands" }, 
                { label: "Error" }
            ]} />
            <ErrorDisplay message={error} />
        </div>
    );
  }
  
  // Not found state
  if (!brand) { // This check should be after isLoading and error, and if brand is still null
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6"> {/* Added standard padding */}
            <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" }, 
                { label: "Brands", href: "/dashboard/brands" }, 
                { label: "Not Found" }
            ]} />
            <NotFoundDisplay />
        </div>
    );
  }
  
  // Find the country and language labels for the selected values
  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = LANGUAGES.find(l => l.value === formData.language)?.label || formData.language || 'Select language';
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6"> {/* Standard 0.4: Consistent Page Padding & root spacing */}
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" }, 
        { label: "Brands", href: "/dashboard/brands" }, 
        { label: formData.name || "Loading...", href: `/dashboard/brands/${id}` }, // Display current name, link to view page
        { label: "Edit" }
      ]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Standard 1.3: Back Button - Top Left */}
          <Button variant="outline" size="icon" onClick={() => router.push(id ? `/dashboard/brands/${id}` : '/dashboard/brands')} aria-label="Back to Brand">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandIcon name={formData.name} color={formData.brand_color ?? undefined} size="lg" /> {/* Ensured color prop safety */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit: {formData.name || 'Brand'}</h1>
            <p className="text-muted-foreground">
              Update the name, identity, and other settings for this brand.
            </p>
          </div>
        </div>
        
        {/* Standard: Page-level actions like Delete can be here */}
        <Button 
          variant="destructive" 
          onClick={() => { /* Logic to show delete confirmation dialog */ }}
          disabled={isSaving || isGenerating} // Consider if isGenerating applies here
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Brand
        </Button>
        {/* Top-right save/cancel removed from here, moved to bottom */}
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
              <div className="space-y-2">
                <Label htmlFor="brand_admins_search">Brand Admins</Label>
                {/* Display selected admins */}
                {selectedAdmins.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-muted/50">
                    {selectedAdmins.map(admin => (
                      <Badge key={admin.id} variant="secondary" className="flex items-center gap-1">
                        {admin.full_name || admin.email}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full hover:bg-destructive/20"
                          onClick={() => handleRemoveAdmin(admin.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Input 
                  id="brand_admins_search" 
                  name="brand_admins_search" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search and add admins by name or email" 
                />
                {userSearchResults.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-60 overflow-y-auto">
                    {userSearchResults.map(user => (
                      <div 
                        key={user.id} 
                        className="p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectAdmin(user)}
                      >
                        {user.full_name || user.email}
                        {user.job_title && <span className="text-xs text-muted-foreground ml-2">({user.job_title})</span>}
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery && userSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">No users found matching "{searchQuery}".</p>
                )}
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
                      {/* START: Render checkboxes for allVettingAgencies grouped by priority */}
                      {isLoading && <p className="text-sm text-muted-foreground">Loading agencies...</p>}
                      {!isLoading && allVettingAgencies.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No vetting agencies available for the selected country.
                        </p>
                      )}
                      {!isLoading && allVettingAgencies.length > 0 && priorityOrder.map(priorityLevel => {
                        const agenciesInGroup = allVettingAgencies.filter(agency => agency.priority === priorityLevel);
                        if (agenciesInGroup.length === 0) {
                          return null; 
                        }
                        return (
                          <div key={priorityLevel} className="mt-3">
                            <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(priorityLevel)}`}>{priorityLevel} Priority</h4>
                            <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                              {agenciesInGroup.map(agency => (
                                <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`edit-agency-${agency.id}`} 
                                    checked={formData.content_vetting_agencies.includes(agency.id)}
                                    onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                  />
                                  <Label 
                                    htmlFor={`edit-agency-${agency.id}`} 
                                    className={getPriorityAgencyStyles(agency.priority)} // Apply dynamic styles to name as well
                                  >
                                    {agency.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                    </div>
                        );
                      })}
                      {/* Render agencies with other/null priorities last */}
                      {!isLoading && allVettingAgencies.filter(a => !priorityOrder.includes(a.priority as any) && a.priority != null).length > 0 && (
                         <div key="other-priority" className="mt-3">
                            <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(null)}`}>Other Priority</h4>
                            <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                              {allVettingAgencies.filter(a => !priorityOrder.includes(a.priority as any) && a.priority != null).map(agency => (
                                <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-agency-${agency.id}`}
                                    checked={formData.content_vetting_agencies.includes(agency.id)}
                                    onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                  />
                                  <Label
                                    htmlFor={`edit-agency-${agency.id}`}
                                    className={getPriorityAgencyStyles(agency.priority)}
                                  >
                                    {agency.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                    </div>
                      )}
                      {!isLoading && allVettingAgencies.filter(a => a.priority == null).length > 0 && (
                         <div key="no-priority" className="mt-3">
                            <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(null)}`}>Uncategorized</h4>
                            <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                              {allVettingAgencies.filter(a => a.priority == null).map(agency => (
                                <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-agency-${agency.id}`}
                                    checked={formData.content_vetting_agencies.includes(agency.id)}
                                    onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                  />
                                  <Label
                                    htmlFor={`edit-agency-${agency.id}`}
                                    className={getPriorityAgencyStyles(agency.priority)}
                                  >
                                    {agency.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                      )}
                      {/* END: Render checkboxes grouped by priority */}
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
                      <Label htmlFor="brand_color">Brand Colour</Label>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color" 
                          id="brand_color" 
                          name="brand_color" 
                          value={formData.brand_color} 
                          onChange={handleInputChange} 
                          className="w-10 h-10 rounded cursor-pointer border"
                        />
                        <Input 
                          value={formData.brand_color} 
                          onChange={handleInputChange} 
                          name="brand_color" 
                          placeholder="#HEX colour" 
                          className="w-32" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Standard 3.1: Consolidated Form Actions - Bottom Right, sticky if form is long */}
      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
        <Button variant="outline" onClick={() => router.push(id ? `/dashboard/brands/${id}` : '/dashboard/brands')} disabled={isSaving || isGenerating}>
            Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isGenerating}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
      </div>
      {/* TODO: Ensure Delete Confirmation Dialog is correctly implemented and triggered by the new Delete Brand button */}
    </div>
  );
} 
