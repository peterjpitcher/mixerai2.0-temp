'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs'; // Commented out due to persistent import issues
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, Trash2, AlertTriangle, Users, Link2, ExternalLink, Sparkles } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Breadcrumbs as CustomBreadcrumbs } from '@/components/dashboard/breadcrumbs';
import { cn } from '@/lib/utils';

// export const metadata: Metadata = {
//   title: 'Edit Brand | MixerAI 2.0',
//   description: 'Edit the details, brand identity, and settings for an existing brand.',
// };

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority?: number;
}

interface GroupedVettingAgencies {
  high: VettingAgency[];
  medium: VettingAgency[];
  low: VettingAgency[];
  other: VettingAgency[];
}

interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string;
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string;
  }>;
}

interface MasterClaimBrand {
  id: string;
  name: string;
}

const REQUIRED_ROLE = 'admin';

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [brand, setBrand] = useState<any>(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // const [activeTab, setActiveTab] = useState('basic'); // Commented out as Tabs are removed
  const [isGenerating, setIsGenerating] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  
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
    selected_agency_ids: [] as string[], // Renamed for clarity, stores IDs of selected agencies
    master_claim_brand_id: null as string | null,
  });
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState('');
  const [customAgencyInput, setCustomAgencyInput] = useState('');
  const [newCustomAgencyNames, setNewCustomAgencyNames] = useState<string[]>([]); // For custom agencies not in the list

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  // Updated state for grouped agencies
  const [groupedAgenciesForBrandCountry, setGroupedAgenciesForBrandCountry] = useState<GroupedVettingAgencies>({ high: [], medium: [], low: [], other: [] });
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  const [displayedAdmins, setDisplayedAdmins] = useState<UserSearchResult[]>([]);
  
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brands", href: "/dashboard/brands" },
    { label: `Edit: ${brand?.name || id}` },
  ];

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          const userRole = data.user.user_metadata?.role;
          let hasBrandAdminPermission = false;
          if (data.user.brand_permissions) {
            const brandPerm = data.user.brand_permissions.find(p => p.brand_id === id);
            if (brandPerm && brandPerm.role === 'admin') {
              hasBrandAdminPermission = true;
            }
          }
          if (userRole !== REQUIRED_ROLE && !hasBrandAdminPermission) {
            setIsForbidden(true);
            toast.error("Access Denied", { description: "You do not have permission to edit this brand." });
          }
        } else {
          setCurrentUser(null);
          setIsForbidden(true);
          toast.error('Your session could not be verified.');
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        setCurrentUser(null);
        setIsForbidden(true);
        toast.error('Could not verify your permissions.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, [id]);

  useEffect(() => {
    if (isForbidden) return;

    const fetchBrandData = async () => {
      setIsLoadingBrand(true);
      try {
        const response = await fetch(`/api/brands/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Brand not found.');
            setIsForbidden(true); 
          } else {
            throw new Error(`Failed to fetch brand: ${response.statusText}`);
          }
          return;
        }
        
        const data = await response.json();
        if (!data.success || !data.brand) {
          throw new Error(data.error || 'Failed to fetch brand data structure');
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
          selected_agency_ids: Array.isArray(data.brand.selected_vetting_agencies) 
                                      ? data.brand.selected_vetting_agencies.map((agency: VettingAgency) => agency.id) 
                                      : [],
          master_claim_brand_id: data.brand.master_claim_brand_id || null,
        });

        if (data.brand.admins && Array.isArray(data.brand.admins)) {
          setDisplayedAdmins(data.brand.admins);
        } else {
          setDisplayedAdmins([]);
        }

      } catch (err) {
        console.error('Error fetching brand data:', err);
        setError((err as Error).message);
        toast.error("Failed to load brand data", { description: (err as Error).message });
      } finally {
        setIsLoadingBrand(false);
      }
    };

    const fetchAllVettingAgencies = async () => {
      setIsLoadingAgencies(true);
      try {
        const response = await fetch('/api/content-vetting-agencies');
        if (!response.ok) throw new Error('Failed to fetch vetting agencies');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) { // Corrected to data.data
          setAllVettingAgencies(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse vetting agencies');
        }
      } catch (err) {
        console.error('Error fetching vetting agencies:', err);
        toast.error("Failed to load vetting agencies", { description: (err as Error).message });
      } finally {
        setIsLoadingAgencies(false);
      }
    };

    const fetchMasterClaimBrands = async () => {
      setIsLoadingMasterClaimBrands(true);
      try {
        const response = await fetch('/api/master-claim-brands');
        if (!response.ok) throw new Error('Failed to fetch Master Claim Brands');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMasterClaimBrands(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse Master Claim Brands');
        }
      } catch (err) {
        console.error('Error fetching Master Claim Brands:', err);
        toast.error("Failed to load Master Claim Brands", { description: (err as Error).message });
      } finally {
        setIsLoadingMasterClaimBrands(false);
      }
    };

    fetchBrandData();
    fetchAllVettingAgencies();
    fetchMasterClaimBrands();
  }, [id, isForbidden]);

  // Effect to filter and group agencies based on brand country
  useEffect(() => {
    if (formData.country && allVettingAgencies.length > 0) {
      const filtered = allVettingAgencies.filter(agency => !agency.country_code || agency.country_code === formData.country);
      
      // Sort by priority (numeric) then by name
      filtered.sort((a, b) => {
        const priorityAValue = typeof a.priority === 'number' ? a.priority : Number.MAX_SAFE_INTEGER;
        const priorityBValue = typeof b.priority === 'number' ? b.priority : Number.MAX_SAFE_INTEGER;
        
        if (priorityAValue !== priorityBValue) {
          return priorityAValue - priorityBValue;
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      const groups: GroupedVettingAgencies = { high: [], medium: [], low: [], other: [] };
      filtered.forEach(agency => {
        const priorityValue = agency.priority;
        if (typeof priorityValue === 'number') {
          if (priorityValue === 1) {
            groups.high.push(agency);
          } else if (priorityValue === 2) {
            groups.medium.push(agency);
          } else if (priorityValue === 3) {
            groups.low.push(agency);
          } else {
            groups.other.push(agency); // Other numeric priorities
          }
        } else {
          groups.other.push(agency); // Agencies with undefined or non-numeric priority
        }
      });
      setGroupedAgenciesForBrandCountry(groups);
    } else {
      setGroupedAgenciesForBrandCountry({ high: [], medium: [], low: [], other: [] });
    }
  }, [formData.country, allVettingAgencies]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMasterClaimBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, master_claim_brand_id: value === "@none@" ? null : value }));
  };

  const handleAddAdditionalUrlField = () => {
    if (currentAdditionalUrl.trim() !== '') {
      setFormData(prev => ({
        ...prev,
        additional_website_urls: [...prev.additional_website_urls, { id: uuidv4(), value: currentAdditionalUrl.trim() }],
      }));
      setCurrentAdditionalUrl('');
    }
  };

  const handleRemoveAdditionalUrl = (idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.filter(url => url.id !== idToRemove),
    }));
  };

  const handleAdditionalUrlChange = (idToUpdate: string, newValue: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.map(url =>
        url.id === idToUpdate ? { ...url, value: newValue } : url
      ),
    }));
  };

  const handleAgencyCheckboxChange = (agencyId: string, checked: boolean | string) => {
    setFormData(prev => {
      const currentSelectedIds = prev.selected_agency_ids || [];
      let newSelectedIds;
      if (checked === true) {
        newSelectedIds = Array.from(new Set([...currentSelectedIds, agencyId]));
      } else {
        newSelectedIds = currentSelectedIds.filter(id => id !== agencyId);
      }
      return { ...prev, selected_agency_ids: newSelectedIds };
    });
  };

  const handleAddCustomAgency = () => {
    if (customAgencyInput.trim() !== '' && !newCustomAgencyNames.includes(customAgencyInput.trim())) {
      setNewCustomAgencyNames(prev => [...prev, customAgencyInput.trim()]);
      setCustomAgencyInput('');
    }
  };

  const handleRemoveCustomAgency = (nameToRemove: string) => {
    setNewCustomAgencyNames(prev => prev.filter(name => name !== nameToRemove));
  };


  const handleGenerateBrandIdentity = async () => {
    if (!formData.name || !formData.website_url) {
      toast.error('Brand Name and Website URL are required to generate Brand Identity.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-brand-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: formData.name,
          websiteUrl: formData.website_url,
          country: formData.country,
          currentIdentity: formData.brand_identity,
          brandId: id
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.brandIdentity) {
        setFormData(prev => ({ ...prev, brand_identity: data.brandIdentity }));
        toast.success('Brand Identity Generated', { description: 'The AI has generated a new brand identity based on the provided details.'});
      } else {
        throw new Error(data.error || 'Failed to generate brand identity - no content returned.');
      }
    } catch (err: any) {
      console.error('Error generating brand identity:', err);
      toast.error('Generation Failed', { description: err.message || 'Could not generate brand identity at this time.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Brand Name is required.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const payload = {
      ...formData,
      additional_website_urls: formData.additional_website_urls.map(url => url.value), // Send only values
      // selected_agency_ids is already in the correct format (array of IDs)
      new_custom_agency_names: newCustomAgencyNames, // Send the names of newly added custom agencies
    };
    
    // Remove content_vetting_agencies if it exists from old structure to avoid confusion
    // delete (payload as any).content_vetting_agencies;
    // Actually, ensure only selected_agency_ids and new_custom_agency_names are sent for agencies
    const finalPayload: Record<string, any> = { ...payload };
    delete finalPayload.content_vetting_agencies; // if this field was ever part of formData directly

    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      setBrand(result.brand); // Update local brand state with response from API
      setFormData(prev => ({
        ...prev,
        name: result.brand.name || '',
        website_url: result.brand.website_url || '',
        additional_website_urls: Array.isArray(result.brand.additional_website_urls)
                                    ? result.brand.additional_website_urls.map((urlItem: string | { id?: string, value: string }) =>
                                        typeof urlItem === 'string'
                                            ? { id: uuidv4(), value: urlItem }
                                            : { id: urlItem.id || uuidv4(), value: urlItem.value }
                                      )
                                    : [],
        country: result.brand.country || '',
        language: result.brand.language || '',
        brand_color: result.brand.brand_color || '#1982C4',
        brand_identity: result.brand.brand_identity || '',
        tone_of_voice: result.brand.tone_of_voice || '',
        guardrails: result.brand.guardrails || '',
        selected_agency_ids: Array.isArray(result.brand.selected_vetting_agencies) 
                                    ? result.brand.selected_vetting_agencies.map((agency: VettingAgency) => agency.id) 
                                    : [],
        master_claim_brand_id: result.brand.master_claim_brand_id || null,
      }));
      setNewCustomAgencyNames([]); // Clear custom names after successful save
      toast.success('Brand Updated', { description: `Successfully updated ${result.brand.name}.` });
      // Optionally, redirect or refresh some data
      // router.push('/dashboard/brands');
    } catch (err: any) {
      console.error('Error saving brand:', err);
      setError(err.message);
      toast.error('Save Failed', { description: err.message || 'Could not update brand details.' });
    } finally {
      setIsSaving(false);
    }
  };

  const ErrorDisplay = ({ message }: { message: string | null }) => (
    message ? (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{message}</span>
      </div>
    ) : null
  );

  const NotFoundDisplay = () => (
    <div className="text-center py-10">
      <AlertTriangle className="mx-auto h-12 w-12 text-orange-400" />
      <h2 className="mt-2 text-xl font-semibold">Brand Not Found</h2>
      <p className="mt-1 text-gray-500">The brand you are looking for does not exist or could not be loaded.</p>
      <Button onClick={() => router.push('/dashboard/brands')} className="mt-4">Go to Brands List</Button>
    </div>
  );

  const ForbiddenDisplay = () => (
    <div className="text-center py-10">
      <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      <h2 className="mt-2 text-xl font-semibold">Access Denied</h2>
      <p className="mt-1 text-gray-500">You do not have permission to edit this brand.</p>
      <p className="mt-1 text-gray-500">Contact your administrator if you believe this is an error.</p>
      <Button onClick={() => router.push('/dashboard/brands')} className="mt-4">Go to Brands List</Button>
    </div>
  );

  if (isLoadingUser || (isLoadingBrand && !isForbidden)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isForbidden && error === 'Brand not found.') {
    return <NotFoundDisplay />;
  }
  if (isForbidden) {
    return <ForbiddenDisplay />;
  }
  if (error && error !== 'Brand not found.') {
    return <ErrorDisplay message={error} />;
  }
  if (!brand && !isLoadingBrand && !isForbidden) {
    return <NotFoundDisplay />;
  }

  const pageTitle = brand ? `Edit Brand: ${brand.name}` : 'Edit Brand';

  return (
    <div className="container mx-auto px-4 py-8">
      <CustomBreadcrumbs items={breadcrumbItems} />
      <PageHeader 
        title={pageTitle}
        description="Manage the brand details, identity, and configurations."
        actions={[
          <Button key="back" variant="outline" onClick={() => router.push('/dashboard/brands')} className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Brands
          </Button>,
          <Button key="save" onClick={handleSave} disabled={isSaving || isGenerating} className="text-sm">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        ]}
      />

      {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6"> */}
      {/*   <TabsList className="grid w-full grid-cols-3 md:max-w-md"> */}
      {/*     <TabsTrigger value="basic">Basic Information</TabsTrigger> */}
      {/*     <TabsTrigger value="identity">Brand Identity</TabsTrigger> */}
      {/*     <TabsTrigger value="advanced">Advanced Settings</TabsTrigger> */}
      {/*   </TabsList> */}
      {/*   <TabsContent value="basic"> */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set the foundational details for this brand.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., MixerAI Foods" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Main Website URL</Label>
                <Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="e.g., https://www.mixerai.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Primary Country</Label>
                <Select name="country" value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Primary Language</Label>
                <Select name="language" value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
      {/*   </TabsContent> */}
      {/*   <TabsContent value="identity"> */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Define the core identity, voice, and visual style of the brand. 
                This information will be used by AI to generate on-brand content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Additional Website URLs */}
              <div className="space-y-2">
                <Label htmlFor="additional_website_urls">Additional Website URLs (for context)</Label>
                {formData.additional_website_urls.map((urlField) => (
                  <div key={urlField.id} className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={urlField.value}
                      onChange={(e) => handleAdditionalUrlChange(urlField.id, e.target.value)}
                      placeholder="e.g., https://blog.mixerai.com, https://mixerai.com/about-us"
                      className="flex-grow"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlField.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    id="additional_website_urls_new"
                    type="url"
                    value={currentAdditionalUrl}
                    onChange={(e) => setCurrentAdditionalUrl(e.target.value)}
                    placeholder="Add another URL..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAdditionalUrlField()}
                    className="flex-grow"
                  />
                  <Button onClick={handleAddAdditionalUrlField} variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add URL
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide links to other relevant pages like blogs, about us, or specific product lines for better AI context.
                </p>
              </div>

              {/* 2. AI Generate / Refine Button for Brand Identity */}
              <div className="space-y-2">
                <Button onClick={handleGenerateBrandIdentity} disabled={isGenerating || !formData.name || !formData.website_url} size="sm" variant="outline">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  AI Generate / Refine Brand Identity
                </Button>
                <p className="text-xs text-muted-foreground">
                  Provide a brand name and main website URL (in Basic Information) to enable AI generation. Results are best when you provide a starting point in the Brand Identity field below.
                </p>
              </div>

              {/* 3. Brand Identity Textarea */}
              <div className="space-y-2">
                <Label htmlFor="brand_identity">Brand Identity</Label>
                <Textarea 
                  id="brand_identity" 
                  name="brand_identity" 
                  value={formData.brand_identity} 
                  onChange={handleInputChange} 
                  placeholder="Describe the brand mission, values, target audience, and unique selling propositions..." 
                  rows={8} 
                  className="min-h-[160px]"
                />
              </div>

              {/* 4. Tone of Voice */}
              <div className="space-y-2">
                <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                <Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="e.g., Friendly & approachable, Professional & authoritative, Witty & humorous..." rows={3} />
              </div>

              {/* 5. Guardrails & Restrictions */}
              <div className="space-y-2">
                <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
                <Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="List topics, phrases, or claims to avoid. e.g., - Do not mention competitors by name.\n- Avoid making definitive health claims.\n- Max 3 exclamation marks per paragraph." rows={5} />
                <p className="text-xs text-muted-foreground">Enter each restriction on a new line, optionally starting with a dash or bullet.</p>
              </div>
              
              {/* 6. Brand Colour */}
              <div className="space-y-2">
                <Label htmlFor="brand_color" className="mb-1 block">Brand Colour</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input 
                      id="brand_color" 
                      name="brand_color" 
                      type="color" 
                      value={formData.brand_color} 
                      onChange={handleInputChange} 
                      className="w-12 h-12 p-0.5 border-none rounded-md cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.brand_color}
                      onChange={handleInputChange}
                      name="brand_color"
                      className="w-24 h-10"
                      aria-label="Brand color hex code"
                    />
                  </div>
                  <div className="mt-0">
                    <BrandIcon color={formData.brand_color} name={formData.name || 'B'} size="md" />
                  </div>
                </div>
              </div>

              {/* Content Vetting Agencies - ensuring correct display of groups */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Content Vetting Agencies</Label>
                {isLoadingAgencies ? (
                  <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading agencies...</div>
                ) : (
                  <>
                    {(Object.keys(groupedAgenciesForBrandCountry) as Array<keyof GroupedVettingAgencies>)
                      .filter(priorityGroup => groupedAgenciesForBrandCountry[priorityGroup].length > 0)
                      .map(priorityGroup => {
                        const agenciesInGroup = groupedAgenciesForBrandCountry[priorityGroup];

                        let groupLabel = '';
                        switch (priorityGroup) {
                          case 'high': groupLabel = 'High Priority'; break;
                          case 'medium': groupLabel = 'Medium Priority'; break;
                          case 'low': groupLabel = 'Low Priority'; break;
                          case 'other': groupLabel = 'Other / Uncategorized'; break;
                        }

                        return (
                          <div key={priorityGroup} className="pt-3">
                            <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">{groupLabel}</h4>
                            <div className="space-y-2 pl-2"> {/* Removed scrolling container, added slight indent */}
                              {agenciesInGroup.map(agency => (
                                <div key={agency.id} className="flex items-center space-x-2 py-1">
                                  <Checkbox 
                                    id={`agency-${agency.id}`}
                                    checked={formData.selected_agency_ids.includes(agency.id)}
                                    onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, checked)}
                                  />
                                  <label htmlFor={`agency-${agency.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {agency.name}
                                    {agency.description && <p className="text-xs text-muted-foreground">{agency.description}</p>}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                    })}
                    {Object.values(groupedAgenciesForBrandCountry).every(group => group.length === 0) && formData.country && (
                      <p className="text-sm text-muted-foreground pt-2">No vetting agencies found for the selected country. You can add custom ones below.</p>
                    )}
                    {!formData.country && (
                       <p className="text-sm text-muted-foreground pt-2">Please select a country in 'Basic Information' to see available vetting agencies.</p>
                    )}
                  </>
                )}
                
                <div className="mt-4 space-y-2">
                    <Label htmlFor="custom_agency_input">Add Custom Vetting Agency</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id="custom_agency_input"
                            value={customAgencyInput} 
                            onChange={(e) => setCustomAgencyInput(e.target.value)} 
                            placeholder="Enter name of a new agency..."
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAgency()}
                            className="flex-grow"
                        />
                        <Button onClick={handleAddCustomAgency} variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Custom
                        </Button>
                    </div>
                </div>
                  
                {newCustomAgencyNames.length > 0 && (
                    <div className="mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground">New custom agencies to be created:</p>
                        <div className="flex flex-wrap gap-2">
                        {newCustomAgencyNames.map(name => (
                            <Badge key={name} variant="secondary" className="flex items-center">
                            {name}
                            <button onClick={() => handleRemoveCustomAgency(name)} className="ml-2 appearance-none border-none bg-transparent p-0 cursor-pointer">
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                            </Badge>
                        ))}
                        </div>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
      {/*   </TabsContent> */}
      {/*   <TabsContent value="advanced"> */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Advanced Settings & Associations</CardTitle>
              <CardDescription>Manage content approval workflows and other advanced configurations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="master_claim_brand_id">Master Claim Brand Association</Label>
                <Select 
                  value={formData.master_claim_brand_id || '@none@'} 
                  onValueChange={handleMasterClaimBrandChange}
                >
                  <SelectTrigger id="master_claim_brand_id">
                    <SelectValue placeholder="Select Master Claim Brand..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="@none@"><em>None</em></SelectItem>
                    {isLoadingMasterClaimBrands ? (
                      <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : (
                      masterClaimBrands.map(mcb => (
                        <SelectItem key={mcb.id} value={mcb.id}>{mcb.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Associate this brand with a Master Claim Brand to inherit its claim definitions and rules.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Brand Administrators</Label>
                {displayedAdmins.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {displayedAdmins.map(admin => (
                      <li key={admin.id}>{admin.full_name || 'N/A'} ({admin.email || 'No email'})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No administrators specifically assigned to this brand. Global admins have access.</p>
                )}
              </div>

            </CardContent>
          </Card>
      {/*   </TabsContent> */}
      {/* </Tabs> */}
    </div>
  );
} 
