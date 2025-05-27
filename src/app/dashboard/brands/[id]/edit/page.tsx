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
  priority?: 'High' | 'Medium' | 'Low' | null;
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

const getPriorityAgencyStyles = (priority: 'High' | 'Medium' | 'Low' | null | undefined): string => {
  if (priority === 'High') return 'text-red-600 font-bold';
  if (priority === 'Medium') return 'text-orange-500 font-semibold';
  if (priority === 'Low') return 'text-blue-600 font-normal';
  return 'font-normal text-gray-700 dark:text-gray-300';
};

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
    content_vetting_agencies: [] as string[],
    master_claim_brand_id: null as string | null,
  });
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState('');
  const [customAgencyInput, setCustomAgencyInput] = useState('');

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  const [displayedAdmins, setDisplayedAdmins] = useState<UserSearchResult[]>([]);

  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];
  
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
          content_vetting_agencies: Array.isArray(data.brand.selected_vetting_agencies) 
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
      try {
        const response = await fetch('/api/content-vetting-agencies');
        if (!response.ok) throw new Error('Failed to fetch vetting agencies');
        const data = await response.json();
        if (data.success && Array.isArray(data.agencies)) {
          setAllVettingAgencies(data.agencies);
        } else {
          throw new Error(data.error || 'Failed to parse vetting agencies');
        }
      } catch (err) {
        console.error('Error fetching vetting agencies:', err);
        toast.error("Failed to load vetting agencies", { description: (err as Error).message });
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


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleMasterClaimBrandChange = (value: string) => {
    setFormData(prev => ({ ...prev, master_claim_brand_id: value === "none" ? null : value }));
  };

  const handleAddAdditionalUrlField = () => {
    if (currentAdditionalUrl.trim() !== '') {
      setFormData(prev => ({
        ...prev,
        additional_website_urls: [...prev.additional_website_urls, { id: uuidv4(), value: currentAdditionalUrl.trim() }]
      }));
      setCurrentAdditionalUrl('');
    }
  };

  const handleRemoveAdditionalUrl = (idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.filter(url => url.id !== idToRemove)
    }));
  };

  const handleAdditionalUrlChange = (idToUpdate: string, newValue: string) => {
    setFormData(prev => ({
      ...prev,
      additional_website_urls: prev.additional_website_urls.map(url =>
        url.id === idToUpdate ? { ...url, value: newValue } : url
      )
    }));
  };

  const handleAgencyCheckboxChange = (agencyId: string, checked: boolean) => {
    setFormData(prev => {
      const currentAgencies = prev.content_vetting_agencies || [];
      if (checked) {
        return { ...prev, content_vetting_agencies: [...currentAgencies, agencyId] };
      } else {
        return { ...prev, content_vetting_agencies: currentAgencies.filter(id => id !== agencyId) };
      }
    });
  };

  const handleAddCustomAgency = () => {
    if (customAgencyInput.trim() !== '') {
      const newAgency: VettingAgency = {
        id: `custom-${uuidv4()}`,
        name: customAgencyInput.trim(),
      };
      setAllVettingAgencies(prev => [...prev, newAgency]);
      setFormData(prev => ({
        ...prev,
        content_vetting_agencies: [...(prev.content_vetting_agencies || []), newAgency.id]
      }));
      setCustomAgencyInput('');
    }
  };

  const handleRemoveCustomAgency = (agencyIdToRemove: string) => {
    setAllVettingAgencies(prev => prev.filter(agency => agency.id !== agencyIdToRemove));
    setFormData(prev => ({
      ...prev,
      content_vetting_agencies: (prev.content_vetting_agencies || []).filter(id => id !== agencyIdToRemove)
    }));
  };
  
  const handleGenerateBrandIdentity = async () => {
    if (!formData.name || !formData.website_url) {
      toast.error("Brand Name and Main Website URL are required to generate brand identity.");
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
          additionalWebsites: formData.additional_website_urls.map(url => url.value),
          brandCountry: formData.country,
          brandLanguage: formData.language,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI generation failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success && data.brandIdentity) {
        setFormData(prev => ({
          ...prev,
          brand_identity: data.brandIdentity.brand_identity || prev.brand_identity,
          tone_of_voice: data.brandIdentity.tone_of_voice || prev.tone_of_voice,
          guardrails: data.brandIdentity.guardrails || prev.guardrails,
        }));
        toast.success("Brand identity generated successfully!");
      } else {
        throw new Error(data.error || "Failed to parse AI-generated brand identity.");
      }
    } catch (error) {
      console.error("Error generating brand identity:", error);
      toast.error("Failed to generate brand identity", { description: (error as Error).message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const payload = {
      ...formData,
      additional_website_urls: formData.additional_website_urls.map(url => url.value),
      selected_vetting_agencies: formData.content_vetting_agencies,
    };

    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save brand: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        toast.success("Brand saved successfully!");
        router.push('/dashboard/brands');
      } else {
        throw new Error(data.error || "Failed to save brand data.");
      }
    } catch (err) {
      console.error("Error saving brand:", err);
      setError((err as Error).message);
      toast.error("Failed to save brand", { description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const ErrorDisplay = ({ message }: { message: string | null }) => (
    message && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{message}</span>
      </div>
    )
  );

  const NotFoundDisplay = () => (
    <div className="text-center py-10">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-xl font-semibold">Brand Not Found</h2>
      <p className="mt-2 text-muted-foreground">The brand you are looking for does not exist or you do not have permission to view it.</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/brands">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Brands
        </Link>
      </Button>
    </div>
  );

  const ForbiddenDisplay = () => (
     <div className="text-center py-10">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
      <p className="mt-2 text-muted-foreground">You do not have the necessary permissions to edit this brand.</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/brands">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Brands
        </Link>
      </Button>
    </div>
  );
  
  if (isLoadingUser || isLoadingBrand) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading brand details...</p>
      </div>
    );
  }

  if (isForbidden) return <ForbiddenDisplay />;
  if (error && error === 'Brand not found.') return <NotFoundDisplay />;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <CustomBreadcrumbs items={breadcrumbItems} />
      <PageHeader 
        title="Edit Brand"
        description={`Manage details for ${brand?.name || 'this brand'}.`}
      />

      <ErrorDisplay message={error} />

      <div className="space-y-6"> 
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Basic Information</CardTitle>
                {brand && <BrandIcon name={brand.name} color={formData.brand_color} size="md" />}
              </div>
              <CardDescription>Update the core details of your brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Awesome Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url">Main Website URL</Label>
                  <Input id="website_url" name="website_url" type="url" value={formData.website_url} onChange={handleInputChange} placeholder="https://www.example.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select name="country" value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Primary Language</Label>
                  <Select name="language" value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {LANGUAGES.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
      
          {/* Brand Identity Section */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>
                Define the voice and style for AI-generated content. You can generate this with AI or fill it manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button type="button" onClick={handleGenerateBrandIdentity} disabled={isGenerating || !formData.name || !formData.website_url}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate with AI
              </Button>
              <p className="text-xs text-muted-foreground">
                Ensure Brand Name and Main Website URL are filled in the Basic Information tab to enable AI generation.
                 Additional URLs and Vetting Agencies below will also be considered.
              </p>

              <div className="space-y-2">
                <Label htmlFor="brand_color">Brand Color</Label>
                <Input id="brand_color" name="brand_color" type="color" value={formData.brand_color} onChange={handleInputChange} className="w-24 h-10 p-1" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_website_urls">Additional Website URLs (used for AI generation)</Label>
                {formData.additional_website_urls.map((urlField) => (
                  <div key={urlField.id} className="flex items-center space-x-2">
                    <Input
                      type="url"
                      value={urlField.value}
                      onChange={(e) => handleAdditionalUrlChange(urlField.id, e.target.value)}
                      placeholder="https://www.another-example.com"
                      className="flex-grow"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlField.id)} aria-label="Remove URL">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Input
                    type="url"
                    value={currentAdditionalUrl}
                    onChange={(e) => setCurrentAdditionalUrl(e.target.value)}
                    placeholder="Add another URL"
                    className="flex-grow"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdditionalUrlField(); }}}
                  />
                  <Button type="button" variant="outline" onClick={handleAddAdditionalUrlField} disabled={!currentAdditionalUrl.trim()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_identity">Brand Identity</Label>
                <Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} placeholder="Describe your brand's core identity, values, and mission." rows={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                <Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="e.g., Professional yet approachable, witty and informal, inspiring and authoritative." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
                <Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="Specific topics, phrases, or styles to avoid. Sensitive subjects, competitor mentions, etc." rows={4} />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-md font-semibold mb-2">Content Vetting Agencies (considered for AI context)</h4>
                <div className="space-y-2">
                  <Label>Available Agencies</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                  {allVettingAgencies.length > 0 ? (
                    priorityOrder.flatMap(priority =>
                      allVettingAgencies
                        .filter(agency => (agency.priority || 'Medium') === priority)
                        .map(agency => (
                          <div key={agency.id} className={cn("flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors")}>
                            <Checkbox
                              id={`agency-${agency.id}`}
                              checked={(formData.content_vetting_agencies || []).includes(agency.id)}
                              onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                            />
                            <div className="flex-grow">
                              <Label htmlFor={`agency-${agency.id}`} className={cn("font-medium cursor-pointer", getPriorityAgencyStyles(agency.priority))}>
                                {agency.name}
                              </Label>
                              {agency.country_code && <Badge variant="outline" className="ml-2 text-xs">{agency.country_code}</Badge>}
                              {agency.description && <p className="text-xs text-muted-foreground">{agency.description}</p>}
                            </div>
                            {agency.id.startsWith('custom-') && (
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveCustomAgency(agency.id)} aria-label="Remove custom agency">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                          </div>
                        ))
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">No vetting agencies available or configured.</p>
                  )}
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="custom_agency_input">Add Custom Agency</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="custom_agency_input"
                      value={customAgencyInput}
                      onChange={(e) => setCustomAgencyInput(e.target.value)}
                      placeholder="Enter name of new agency"
                      className="flex-grow"
                    />
                    <Button type="button" variant="outline" onClick={handleAddCustomAgency} disabled={!customAgencyInput.trim()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Agency
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        
          {/* Settings & Admins Section - Now only Claims Brand Association and Admins List */}
          <Card>
            <CardHeader>
              <CardTitle>Settings & Connections</CardTitle>
              <CardDescription>Manage external connections and administrative access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="master_claim_brand_id" className="text-md font-semibold">Master Claim Brand</Label>
                <p className="text-xs text-muted-foreground mb-2">Link this MixerAI brand to a Master Claim Brand for claims management.</p>
                <Select 
                  value={formData.master_claim_brand_id || "none"} 
                  onValueChange={handleMasterClaimBrandChange}
                  disabled={isLoadingMasterClaimBrands}
                >
                  <SelectTrigger id="master_claim_brand_id">
                    <SelectValue placeholder={isLoadingMasterClaimBrands ? "Loading claim brands..." : "Select Master Claim Brand"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">(None)</SelectItem>
                    {masterClaimBrands.map(mcb => (
                      <SelectItem key={mcb.id} value={mcb.id}>{mcb.name}</SelectItem>
                    ))}
                    {isLoadingMasterClaimBrands && masterClaimBrands.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {!isLoadingMasterClaimBrands && masterClaimBrands.length === 0 && <SelectItem value="no-options" disabled>No Master Claim Brands available</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-md font-semibold mb-1 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-muted-foreground" /> Brand Administrators
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Users with admin roles for this brand. Manage admin assignments via the 
                  <Link href="/dashboard/users" className="text-primary hover:underline mx-1">Users</Link> page.
                </p>
                {displayedAdmins.length > 0 ? (
                  <ul className="space-y-2">
                    {displayedAdmins.map(admin => (
                      <li key={admin.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30 hover:bg-muted/60">
                        <div>
                          <span className="font-medium">{admin.full_name || 'N/A'}</span>
                          <span className="text-sm text-muted-foreground ml-2">({admin.email || 'No email'})</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/users/${admin.id}/edit`}>
                            View User <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No administrators are currently assigned to this brand.</p>
                )}
              </div>
            </CardContent>
          </Card>
      </div> 

      <div className="flex justify-end space-x-2 mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingBrand || isLoadingUser || isGenerating || isForbidden}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
} 
