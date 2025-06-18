'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, AlertTriangle, Sparkles, Info } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { BrandLogoUpload } from '@/components/ui/brand-logo-upload';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// export const metadata: Metadata = {
//   title: 'Edit Brand | MixerAI 2.0',
//   description: 'Edit the details, brand identity, and settings for an existing brand.',
// };

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const mapNumericPriorityToLabel = (priority: number | string | null | undefined): 'High' | 'Medium' | 'Low' | null => {
  if (priority === 1 || priority === 'High') return 'High';
  if (priority === 2 || priority === 'Medium') return 'Medium';
  if (priority === 3 || priority === 'Low') return 'Low';
  return null;
};

const getPriorityAgencyStyles = (priority: 'High' | 'Medium' | 'Low' | null | undefined): string => {
  if (priority === 'High') return 'text-red-600 font-bold';
  if (priority === 'Medium') return 'text-orange-500 font-semibold';
  if (priority === 'Low') return 'text-blue-600 font-normal';
  return 'font-normal text-gray-700 dark:text-gray-300';
};

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

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const router = useRouter();
  const { id } = params;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [brand, setBrand] = useState<Record<string, unknown> | null>(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

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
    logo_url: null as string | null,
  });

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);
  
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brands", href: "/dashboard/brands" },
    { label: `Edit: ${formData.name || 'Loading...'}` },
  ];

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('Failed to fetch user session');
        const data = await response.json();
        if (data.success && data.user) {
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
          setIsForbidden(true);
          toast.error('Your session could not be verified.');
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        setIsForbidden(true);
        toast.error('Could not verify your permissions.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, [id]);

  useEffect(() => {
    if (isForbidden || isLoadingUser) return;

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
        
        console.log('Edit page - Received brand data:', data.brand);
        console.log('Edit page - Logo URL:', data.brand.logo_url);
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
                                      ? data.brand.selected_vetting_agencies.map((agency: unknown) => (agency as { id: string }).id)
                                      : [],
          master_claim_brand_id: data.brand.master_claim_brand_id || null,
          logo_url: data.brand.logo_url || null,
        });

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
        if (data.success && Array.isArray(data.data)) {
          const transformedAgencies: VettingAgency[] = data.data.map((agency: VettingAgencyFromAPI) => ({
            ...agency,
            priority: mapNumericPriorityToLabel(agency.priority),
          }));
          setAllVettingAgencies(transformedAgencies);
        } else {
          setAllVettingAgencies([]);
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

    if (!isForbidden) {
    fetchBrandData();
    fetchAllVettingAgencies();
    fetchMasterClaimBrands();
    }
  }, [id, isForbidden, isLoadingUser]);

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
      additional_website_urls: prev.additional_website_urls.filter(url => url.id !== idToRemove)
    }));
  };

  const handleAdditionalUrlChange = (id: string, newValue: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.map(url =>
        url.id === id ? { ...url, value: newValue } : url
      )
    }));
  };

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
                                    ? data.data.suggestedAgencies.map((a: { id?: string; name: string }) => a.id || a.name)
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

  const handleSave = async () => {
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

      console.log('Updating brand with payload:', payload);
      console.log('Logo URL in payload:', payload.logo_url);
      
      const response = await apiClient.put(`/api/brands/${id}`, payload);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update brand');
      }
      toast.success('Brand updated successfully!');
      router.push('/dashboard/brands');
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || 'Failed to update brand.');
    } finally {
      setIsSaving(false);
    }
  };

  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = LANGUAGES.find(l => l.value === formData.language)?.label || formData.language || 'Select language';

  if (isLoadingUser || (!isForbidden && isLoadingBrand)) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (isForbidden) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have the necessary permissions to view or edit this brand.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Contact your administrator if you believe this is an error.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard/brands')} variant="outline">
              Back to Brands List
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  if (error) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto">
                <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                <CardContent><p>{error}</p></CardContent>
                <CardFooter>
                    <Button onClick={() => router.push('/dashboard/brands')} variant="outline">
                        Back to Brands List
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/brands')} aria-label="Back to Brands">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100">
            {formData.logo_url ? (
              <Image
                src={formData.logo_url}
                alt={formData.name || 'Brand logo'}
                width={112}
                height={112}
                className="object-cover w-full h-full"
                quality={100}
                unoptimized={formData.logo_url.includes('supabase')}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: formData.brand_color || '#3498db' }}
              >
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Brand: {formData.name || 'Loading...'}</h1>
            <p className="text-muted-foreground">Update the details, identity, and settings for this brand.</p>
          </div>
        </div>
      </div>
       
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="identity">Brand Identity</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set the foundational details for your brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right">Brand Name <span className="text-destructive">*</span></Label>
                <div className="col-span-12 sm:col-span-9">
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter brand name" required/>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="website_url" className="col-span-12 sm:col-span-3 text-left sm:text-right">Main Website URL</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="https://example.com" type="url"/>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="country" className="col-span-12 sm:col-span-3 text-left sm:text-right">Country</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COUNTRIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="language" className="col-span-12 sm:col-span-3 text-left sm:text-right">Language</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select value={formData.language} onValueChange={(v) => handleSelectChange('language', v)}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {LANGUAGES.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-start">
                <Label htmlFor="master_claim_brand_id" className="col-span-12 sm:col-span-3 text-left sm:text-right sm:pt-2">Product Claims Brand</Label>
                <div className="col-span-12 sm:col-span-9 space-y-1">
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
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t pt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
                  Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isGenerating}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Generate or manually define your brand identity profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4 border-b pb-4">
                    <h3 className="text-lg font-semibold">Generate Brand Identity</h3>
                    <p className="text-sm text-muted-foreground">Add website URLs to auto-generate or enhance brand identity, tone, and guardrails. The main URL from Basic Details is included by default.</p>
                    <div className="grid grid-cols-12 gap-4">
                      <Label className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">
                        Additional<br />Website URLs
                      </Label>
                      <div className="col-span-12 sm:col-span-9 space-y-2">
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
                    </div>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground">Identity will be generated for {countryName} in {languageName} (if set).</p>
                      <Button onClick={handleGenerateBrandIdentity} disabled={isGenerating || !canGenerateIdentity} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : ( <> <Sparkles className="mr-2 h-4 w-4" /> Generate Brand Identity </>)}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="brand_identity" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Brand Identity</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} placeholder="Describe your brand..." rows={6}/>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="tone_of_voice" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Tone of Voice</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="Describe your brand's tone..." rows={4}/>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="guardrails" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Content Guardrails</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="e.g., Do not mention competitors..." rows={4}/>
                </div>
              </div>
              
              <div className="grid grid-cols-12 gap-4">
                <Label className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">
                  Content Vetting<br />Agencies
                </Label>
                <div className="col-span-12 sm:col-span-9 space-y-2">
                      {isLoadingAgencies && <p className="text-sm text-muted-foreground">Loading agencies...</p>}
                      
                      {(() => { 
                        const filteredAgenciesByIdentityTab = allVettingAgencies.filter(agency => !formData.country || !agency.country_code || agency.country_code === formData.country);

                        if (!isLoadingAgencies && !formData.country && allVettingAgencies.length > 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              Select a country to see relevant vetting agencies. Showing all available agencies.
                            </p>
                          );
                        }

                        if (!isLoadingAgencies && formData.country && filteredAgenciesByIdentityTab.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground">
                              No specific vetting agencies found for {COUNTRIES.find(c => c.value === formData.country)?.label || formData.country}.
                            </p>
                          );
                        }

                        if (!isLoadingAgencies && allVettingAgencies.length === 0) {
                           return (
                             <p className="text-sm text-muted-foreground">
                               No vetting agencies found in the system.
                             </p>
                           );
                        }
                        
                        if (!isLoadingAgencies && (allVettingAgencies.length > 0 && (!formData.country || filteredAgenciesByIdentityTab.length > 0))) {
                          return (
                            <>
                              {priorityOrder.map(priorityLevel => {
                                const agenciesInGroup = filteredAgenciesByIdentityTab.filter(agency => agency.priority === priorityLevel);
                                if (agenciesInGroup.length === 0) return null;
                        return (
                                  <div key={priorityLevel} className="mt-3">
                                    <h4 className={cn("text-md font-semibold mb-2", getPriorityAgencyStyles(priorityLevel))}>{priorityLevel} Priority</h4>
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
                                  <h4 className={cn("text-md font-semibold mb-2", getPriorityAgencyStyles(null))}>Other Priority</h4>
                                   <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                                    {filteredAgenciesByIdentityTab.filter(a => !priorityOrder.includes(a.priority as ('High' | 'Medium' | 'Low')) && a.priority != null).map(agency => (
                                      <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                        <Checkbox id={`edit-agency-${agency.id}-other`} checked={formData.content_vetting_agencies.includes(agency.id)} onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)} />
                                        <Label htmlFor={`edit-agency-${agency.id}-other`} className={getPriorityAgencyStyles(agency.priority)}>{agency.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {filteredAgenciesByIdentityTab.filter(a => a.priority == null).length > 0 && (
                                <div key="no-priority" className="mt-3">
                                  <h4 className={cn("text-md font-semibold mb-2", getPriorityAgencyStyles(null))}>Uncategorised</h4>
                                   <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                                    {filteredAgenciesByIdentityTab.filter(a => a.priority == null).map(agency => (
                                      <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                                        <Checkbox id={`edit-agency-${agency.id}-no`} checked={formData.content_vetting_agencies.includes(agency.id)} onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)} />
                                        <Label htmlFor={`edit-agency-${agency.id}-no`} className={getPriorityAgencyStyles(agency.priority)}>{agency.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                    )}
                  </>
                          );
                        }
                        return null; 
                      })()}
                    </div>
                  </div>
                </div>
              </div>
                <div className="lg:col-span-1">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Brand Preview</Label>
                      {/* Large logo preview */}
                      <div className="flex justify-center p-4 border rounded-md bg-muted/30">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                          {formData.logo_url ? (
                            <Image
                              src={formData.logo_url}
                              alt={formData.name || 'Brand logo'}
                              width={256}
                              height={256}
                              className="object-cover w-full h-full"
                              quality={100}
                              unoptimized={formData.logo_url.includes('supabase')}
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                              style={{ backgroundColor: formData.brand_color || '#3498db' }}
                            >
                              {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Small preview with name */}
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                        <BrandIcon name={formData.name || 'Brand Name'} color={formData.brand_color ?? undefined} logoUrl={formData.logo_url} size="sm" />
                        <span className="truncate text-sm">{formData.name || 'Your Brand Name'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <BrandLogoUpload
                        currentLogoUrl={formData.logo_url}
                        onLogoChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                        brandId={id}
                        brandName={formData.name}
                        isDisabled={isSaving}
                      />
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
            <CardFooter className="flex justify-end space-x-2 border-t pt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
                  Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isGenerating}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
