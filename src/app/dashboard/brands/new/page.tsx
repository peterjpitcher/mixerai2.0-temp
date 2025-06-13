'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
// import { Badge } from '@/components/ui/badge';
// import { cn } from "@/lib/utils";

// Define UserSessionData interface (can be moved to a shared types file later)
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

// Metadata for a redirecting page might be minimal or not strictly necessary
// as user shouldn't spend time here.
// export const metadata: Metadata = {
//   title: 'Creating New Brand | MixerAI 2.0',
//   description: 'Redirecting to the brand creation page.',
// };

/**
 * NewBrandPage allows users to create a new brand profile.
 * TODO: Implement the full brand creation form here.
 */

// Interface for VettingAgency (copied from edit page)
interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority: 'High' | 'Medium' | 'Low' | null;
}

interface VettingAgencyFromAPI {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority: 'High' | 'Medium' | 'Low' | number | null;
}

// Helper function to map numeric priority to string label
const mapNumericPriorityToLabel = (priority: number | string | null | undefined): 'High' | 'Medium' | 'Low' | null => {
  if (priority === 1 || priority === 'High') return 'High';
  if (priority === 2 || priority === 'Medium') return 'Medium';
  if (priority === 3 || priority === 'Low') return 'Low';
  return null;
};

// Helper function for VettingAgency styles (copied from edit page)
const getPriorityAgencyStyles = (priority: 'High' | 'Medium' | 'Low' | null | undefined): string => {
  if (priority === 'High') return 'text-red-600 font-bold';
  if (priority === 'Medium') return 'text-orange-500 font-semibold';
  if (priority === 'Low') return 'text-blue-600 font-normal';
  return 'font-normal text-gray-700 dark:text-gray-300';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
}

interface MasterClaimBrand {
  id: string;
  name: string;
}

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

export default function NewBrandPage() {
  const router = useRouter();
  
  // State definitions
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    additional_website_urls: [] as { id: string, value: string }[],
    country: '',
    language: '',
    brand_color: '#1982C4',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: [] as string[],
    master_claim_brand_id: null as string | null,
  });

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [customAgencyInput, setCustomAgencyInput] = useState('');
  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  // Fetch Master Claim Brands
  useEffect(() => {
    const fetchMasterClaimBrands = async () => {
      if (isForbidden || isLoadingUser) return;
      setIsLoadingMasterClaimBrands(true);
      try {
        const response = await fetch('/api/master-claim-brands');
        if (!response.ok) throw new Error('Failed to fetch Master Claim Brands');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMasterClaimBrands(data.data);
        } else {
          toast.error(data.error || 'Could not load Master Claim Brands.');
          setMasterClaimBrands([]);
        }
      } catch (err) {
        toast.error('Failed to fetch Master Claim Brands list.');
        console.error('Error fetching Master Claim Brands:', err);
        setMasterClaimBrands([]);
      } finally {
        setIsLoadingMasterClaimBrands(false);
      }
    };
    fetchMasterClaimBrands();
  }, [isForbidden, isLoadingUser]);

  // Effect for fetching current user data and checking permissions
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          if (data.user.user_metadata?.role !== 'admin') {
            setIsForbidden(true);
          }
        } else {
          setCurrentUser(null);
          setIsForbidden(true);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setCurrentUser(null);
        setIsForbidden(true);
        toast.error('Could not verify your permissions.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Effect for fetching vetting agencies
  useEffect(() => {
    const fetchAllVettingAgencies = async () => {
      if (isForbidden || isLoadingUser) return; 
      const apiUrl = '/api/content-vetting-agencies';
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch vetting agencies');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const transformedAgencies: VettingAgency[] = data.data.map((agency: VettingAgencyFromAPI) => ({
            ...agency,
            priority: mapNumericPriorityToLabel(agency.priority),
          }));
          setAllVettingAgencies(transformedAgencies);
        } else {
          toast.error(data.error || 'Could not load vetting agencies.');
          setAllVettingAgencies([]); 
        }
      } catch (err) {
        toast.error('Failed to fetch vetting agencies list.');
        console.error('Error fetching all vetting agencies:', err);
        setAllVettingAgencies([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllVettingAgencies();
  }, [isForbidden, isLoadingUser]); // Removed formData and formData.country dependency to fetch all initially

  // Conditional rendering for loading and forbidden states
  // These MUST come AFTER all hook calls (useState, useEffect)
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading your details...</p>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <X className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">
          You do not have the necessary permissions to create a new brand. This action is restricted to Global Administrators.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Handler functions (can be defined here, after hooks and conditional returns)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMasterClaimBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, master_claim_brand_id: value === 'NO_SELECTION' ? null : value }));
  };

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

  // Agency checkbox handler (copied from edit page)
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

  const canGenerateIdentity = formData.additional_website_urls.some(url => url.value.trim() !== '') || (formData.website_url && formData.website_url.trim() !== '');

  const handleGenerateBrandIdentity = async () => {
    if (!formData.name) {
      toast.error('Please enter a brand name first.');
      return;
    }
    if (!canGenerateIdentity) {
       toast.error('Please enter at least one website URL (main or additional) to generate identity.');
       return;
    }
    const urls = [formData.website_url, ...formData.additional_website_urls.map(u => u.value)].filter(url => url && url.trim() !== '');
    for (const url of urls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('All URLs must start with http:// or https://');
        return;
      }
    }

    setIsGenerating(true);
    toast.info('Generating brand identity...');
    try {
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: formData.name,
          urls: urls,
          country: formData.country,
          language: formData.language
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || 'Failed to generate brand identity');
      }
      const data = await response.json();
      if (data.success && data.data) {
        const generatedAgencies = Array.isArray(data.data.suggestedAgencies) 
                                    ? data.data.suggestedAgencies.map((a: unknown) => (a as { id?: string; name?: string }).id || (a as { id?: string; name?: string }).name)
                                    : [];
        setFormData(prev => ({
          ...prev,
          brand_identity: data.data.brandIdentity || prev.brand_identity,
          tone_of_voice: data.data.toneOfVoice || prev.tone_of_voice,
          guardrails: data.data.guardrails || prev.guardrails,
          content_vetting_agencies: Array.from(new Set([...prev.content_vetting_agencies, ...generatedAgencies])),
          brand_color: data.data.brandColor || prev.brand_color
        }));
        toast.success('Brand identity generated successfully!');
        setActiveTab('identity');
      } else {
        throw new Error(data.error || 'Failed to parse generation response');
      }
    } catch (error) {
      toast.error((error as Error).message || 'An error occurred during identity generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!formData.name.trim()) {
      toast.error('Brand name is required.');
      setActiveTab('basic');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = { 
        ...formData,
        selected_agency_ids: formData.content_vetting_agencies,
      };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || (Array.isArray(payload[key]) && payload[key].length === 0) ) {
          payload[key] = null;
        }
      });
      if (payload.additional_website_urls && Array.isArray(payload.additional_website_urls)){
        const urls = payload.additional_website_urls as Array<{id:string, value:string}>;
        payload.additional_website_urls = urls.map((item) => item.value).filter(Boolean);
        if((payload.additional_website_urls as string[]).length === 0) payload.additional_website_urls = null;
      }
      if (payload.master_claim_brand_id === 'NO_SELECTION') {
        payload.master_claim_brand_id = null;
      }

      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create brand');
      }
      toast.success('Brand created successfully!');
      router.push(`/dashboard/brands/${data.data.id}`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create brand.');
    } finally {
      setIsSaving(false);
    }
  };

  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = LANGUAGES.find(l => l.value === formData.language)?.label || formData.language || 'Select language';
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6"> {/* Standard Page Padding */}
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands", href: "/dashboard/brands" }, { label: "Create New Brand" }]} />
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/brands')} aria-label="Back to Brands">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandIcon name={formData.name || "New Brand"} color={formData.brand_color} size="lg" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Brand</h1>
            <p className="text-muted-foreground">Define the details for your new brand.</p>
          </div>
        </div>
        <Link 
          href="/dashboard/help?article=02-brands" 
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need help?
        </Link>
       </div>
       
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Set the foundational details for your brand.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter brand name" required/></div>
                <div className="space-y-2"><Label htmlFor="website_url">Main Website URL</Label><Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="https://example.com" type="url"/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="country">Country</Label><Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent className="max-h-[300px]">{COUNTRIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="language">Language</Label><Select value={formData.language} onValueChange={(v) => handleSelectChange('language', v)}><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent className="max-h-[300px]">{LANGUAGES.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}</SelectContent></Select></div>
              </div>

              {/* Master Claim Brand Selector */}
              <div className="space-y-2">
                <Label htmlFor="master_claim_brand_id">Product Claims Brand (Optional)</Label>
                <Select 
                  value={formData.master_claim_brand_id || 'NO_SELECTION'} 
                  onValueChange={handleMasterClaimBrandChange}
                  disabled={isLoadingMasterClaimBrands}
                >
                  <SelectTrigger id="master_claim_brand_id">
                    <SelectValue placeholder={isLoadingMasterClaimBrands ? "Loading claim brands..." : "Link to a Product Claims Brand..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_SELECTION">No specific Product Claims Brand</SelectItem>
                    {masterClaimBrands.map(mcb => (
                      <SelectItem key={mcb.id} value={mcb.id}>{mcb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Info className="h-3 w-3 mr-1" /> Link this MixerAI brand to a central Product Claims Brand if applicable.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Brand Identity</CardTitle><CardDescription>Generate or manually define your brand identity profile.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Generate Brand Identity</h3>
                    <p className="text-sm text-muted-foreground">Add website URLs to auto-generate or enhance brand identity, tone, and guardrails. The main URL from Basic Details is included by default.</p>
                      <div className="space-y-2">
                      <Label>Additional Website URLs (Optional)</Label>
                      {formData.additional_website_urls.map((urlObj) => (
                        <div key={urlObj.id} className="flex items-center gap-2">
                          <Input
                            value={urlObj.value}
                            onChange={(e) => handleAdditionalUrlChange(urlObj.id, e.target.value)}
                            placeholder="https://additional-example.com"
                            className="flex-grow"
                            type="url"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlObj.id)} className="h-8 w-8" aria-label="Remove URL">
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
                      <Button onClick={handleGenerateBrandIdentity} disabled={isGenerating || !canGenerateIdentity} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Brand Identity'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="brand_identity">Brand Identity</Label><Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} placeholder="Describe your brand..." rows={6}/></div>
                    <div className="space-y-2"><Label htmlFor="tone_of_voice">Tone of Voice</Label><Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="Describe your brand's tone..." rows={4}/></div>
                    <div className="space-y-2"><Label htmlFor="guardrails">Content Guardrails</Label><Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="e.g., Do not mention competitors..." rows={4}/></div>
                    
                    <div className="space-y-4">
                      <Label>Content Vetting Agencies (Optional)</Label>
                      {isLoading && <p className="text-sm text-muted-foreground">Loading agencies...</p>}
                      
                      {(() => { // IIFE to manage filteredAgencies
                        const filteredAgenciesByIdentityTab = allVettingAgencies.filter(agency => !formData.country || !agency.country_code || agency.country_code === formData.country);

                        if (!isLoading && !formData.country && allVettingAgencies.length > 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Select a country to see relevant vetting agencies. Showing all available agencies.
                            </p>
                          );
                        }

                        if (!isLoading && formData.country && filteredAgenciesByIdentityTab.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              No specific vetting agencies found for {COUNTRIES.find(c => c.value === formData.country)?.label || formData.country}.
                            </p>
                          );
                        }

                        if (!isLoading && allVettingAgencies.length === 0) {
                           return (
                             <p className="text-sm text-muted-foreground">
                               No vetting agencies found in the system.
                             </p>
                           );
                        }
                        
                        // Render agency groups only if there are agencies to show (either all or filtered)
                        if (!isLoading && (allVettingAgencies.length > 0 && (!formData.country || filteredAgenciesByIdentityTab.length > 0))) {
                          return (
                            <>
                              {priorityOrder.map(priorityLevel => {
                                const agenciesInGroup = filteredAgenciesByIdentityTab.filter(agency => agency.priority === priorityLevel);
                                if (agenciesInGroup.length === 0) return null;
                                return (
                                  <div key={priorityLevel} className="mt-3">
                                    <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(priorityLevel)}`}>{priorityLevel} Priority</h4>
                                    <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                                      {agenciesInGroup.map(agency => (
                                        <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`new-agency-${agency.id}`}
                                            checked={formData.content_vetting_agencies.includes(agency.id)}
                                            onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                          />
                                          <Label
                                            htmlFor={`new-agency-${agency.id}`}
                                            className={getPriorityAgencyStyles(agency.priority)}
                                          >
                                            {agency.name}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                              {filteredAgenciesByIdentityTab.filter(a => !priorityOrder.includes(a.priority as ('High' | 'Medium' | 'Low')) && a.priority != null).length > 0 && (
                                <div key="other-priority" className="mt-3">
                                  <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(null)}`}>Other Priority</h4>
                                  <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                                    {filteredAgenciesByIdentityTab.filter(a => !priorityOrder.includes(a.priority as ('High' | 'Medium' | 'Low')) && a.priority != null).map(agency => (
                                      <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`new-agency-${agency.id}`}
                                          checked={formData.content_vetting_agencies.includes(agency.id)}
                                          onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                        />
                                        <Label
                                          htmlFor={`new-agency-${agency.id}`}
                                          className={getPriorityAgencyStyles(agency.priority)}
                                        >
                                          {agency.name}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {filteredAgenciesByIdentityTab.filter(a => a.priority == null).length > 0 && (
                                <div key="no-priority" className="mt-3">
                                  <h4 className={`text-md font-semibold mb-2 ${getPriorityAgencyStyles(null)}`}>Uncategorised</h4>
                                  <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                                    {filteredAgenciesByIdentityTab.filter(a => a.priority == null).map(agency => (
                                      <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`new-agency-${agency.id}`}
                                          checked={formData.content_vetting_agencies.includes(agency.id)}
                                          onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                                        />
                                        <Label
                                          htmlFor={`new-agency-${agency.id}`}
                                          className={getPriorityAgencyStyles(agency.priority)}
                                        >
                                          {agency.name}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        }
                        return null; // Fallback if no conditions met to render agencies
                      })()}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Quick Preview</Label>
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                        <BrandIcon name={formData.name || 'Brand Name'} color={formData.brand_color ?? undefined} />
                        <span className="truncate">{formData.name || 'Your Brand Name'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand_color_identity_tab">Brand Colour</Label>
                      <div className="flex gap-2 items-center">
                        <input 
                            type="color" 
                            id="brand_color_identity_tab"
                            name="brand_color" 
                            value={formData.brand_color} 
                            onChange={handleInputChange} 
                            className="w-10 h-10 rounded cursor-pointer border"
                        />
                        <Input 
                            id="brand_color_hex_identity_tab"
                            value={formData.brand_color} 
                            onChange={handleInputChange} 
                            name="brand_color" 
                            placeholder="#HEX" 
                            className="w-32"
                        />
                      </div>
                       <div className="w-full h-12 rounded-md mt-2" style={{ backgroundColor: formData.brand_color }} />
                       <p className="text-xs text-center text-muted-foreground">{formData.brand_color}</p>
                    </div>
                  </div>
                </div>
              </div>
         </CardContent>
       </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
        <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
            Cancel
        </Button>
        <Button onClick={handleCreateBrand} disabled={isSaving || isGenerating}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Create Brand'}
        </Button>
      </div>
    </div>
  );
} 