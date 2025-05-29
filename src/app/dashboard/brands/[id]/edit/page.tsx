'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, Trash2, AlertTriangle, Users, Link2, ExternalLink, Sparkles, Info } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from "@/components/checkbox";
import { Badge } from "@/components/badge";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

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
    selected_agency_ids: [] as string[],
    master_claim_brand_id: null as string | null,
  });
  const [currentAdditionalUrl, setCurrentAdditionalUrl] = useState('');

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  const [displayedAdmins, setDisplayedAdmins] = useState<UserSearchResult[]>([]);
  
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brands", href: "/dashboard/brands" },
    { label: `Edit: ${formData.name || brand?.name || id}` },
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
        if (data.success && Array.isArray(data.data)) {
          setAllVettingAgencies(data.data.map((a:any) => ({...a, priority: a.priority || 4 })));
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
    setFormData(prev => ({ ...prev, master_claim_brand_id: value || null }));
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

  const handleAgencyCheckboxChange = (agencyId: string, checked: boolean | string) => {
    setFormData(prev => {
      const currentSelected = prev.selected_agency_ids || [];
      if (checked) {
        return { ...prev, selected_agency_ids: [...currentSelected, agencyId] };
      } else {
        return { ...prev, selected_agency_ids: currentSelected.filter(id => id !== agencyId) };
      }
    });
  };

  const handleGenerateBrandIdentity = async () => {
    if (!formData.website_url && formData.additional_website_urls.length === 0) {
      toast.error("Please provide at least one website URL to generate brand identity.");
      return;
    }
    setIsGenerating(true);
    try {
      const primaryUrl = formData.website_url;
      const otherUrls = formData.additional_website_urls.map(item => item.value);
      
      const response = await fetch('/api/brands/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main_url: primaryUrl, additional_urls: otherUrls })
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          brand_identity: data.brandIdentity?.brandIdentity || prev.brand_identity,
          tone_of_voice: data.brandIdentity?.toneOfVoice || prev.tone_of_voice,
        }));
        toast.success("Brand identity generated!");
      } else {
        toast.error(data.error || "Failed to generate brand identity.");
      }
    } catch (err) {
      toast.error("An error occurred while generating brand identity.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
      };
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Brand updated successfully!');
        setBrand(data.brand);
        if (data.brand && data.brand.admins && Array.isArray(data.brand.admins)) {
          setDisplayedAdmins(data.brand.admins);
        }
        router.refresh(); 
      } else {
        toast.error(data.error || 'Failed to update brand.');
      }
    } catch (err) {
      toast.error('An error occurred while saving the brand.');
      console.error(err);
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
    <div className="container mx-auto px-4 py-8">
      <CustomBreadcrumbs items={breadcrumbItems} />
      <PageHeader 
        title={`Edit Brand: ${formData.name || 'Loading...'}`}
        description="Update the details, identity, and settings for this brand."
        actions={
          <div className="flex items-center space-x-2">
            <Button onClick={() => router.push('/dashboard/brands')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isGenerating}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        }
      />

      <Card className="mt-6">
        <CardHeader>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="identity">Brand Identity</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="rules">Content Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Acme Innovations" required />
                  </div>
                  <div>
                    <Label htmlFor="website_url">Primary Website URL</Label>
                    <Input id="website_url" name="website_url" type="url" value={formData.website_url} onChange={handleInputChange} placeholder="https://www.example.com" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="additional_website_urls">Additional Website URLs</Label>
                  {formData.additional_website_urls.map((urlItem) => (
                    <div key={urlItem.id} className="flex items-center space-x-2 mt-2">
                      <Input
                        type="url"
                        value={urlItem.value}
                        onChange={(e) => handleAdditionalUrlChange(urlItem.id, e.target.value)}
                        placeholder="https://www.another-example.com"
                        className="flex-grow"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlItem.id)} aria-label="Remove URL">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      type="url"
                      value={currentAdditionalUrl}
                      onChange={(e) => setCurrentAdditionalUrl(e.target.value)}
                      placeholder="Add another URL and click Plus"
                      className="flex-grow"
                    />
                    <Button variant="outline" size="icon" onClick={handleAddAdditionalUrlField} aria-label="Add URL">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                   <p className="text-xs text-muted-foreground mt-1">
                    <Info className="inline-block h-3 w-3 mr-1" />
                    Used for brand identity generation and content research.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select name="country" value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select name="language" value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="brand_color">Brand Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="brand_color" name="brand_color" type="color" value={formData.brand_color} onChange={handleInputChange} className="w-16 h-10 p-1" />
                    <Input type="text" value={formData.brand_color} onChange={handleInputChange} name="brand_color" className="max-w-xs" placeholder="#1982C4"/>
                    <BrandIcon color={formData.brand_color} name={formData.name || 'B'} className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Used for UI theming and visual consistency.</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="identity">
              <div className="space-y-6">
                <div>
                  <Button 
                    onClick={handleGenerateBrandIdentity} 
                    disabled={isGenerating || (!formData.website_url?.trim() && !formData.additional_website_urls.some(url => url.value.trim() !== ''))}
                    variant="outline"
                  >
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    AI Generate / Refine Brand Identity
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Info className="inline-block h-3 w-3 mr-1" />
                    Provide a Website URL (in Basic Info) to enable AI generation. Results are best with a starting point below.
                  </p>
                </div>
                <div>
                  <Label htmlFor="brand_identity">Brand Identity</Label>
                  <Textarea 
                    id="brand_identity" 
                    name="brand_identity" 
                    value={formData.brand_identity} 
                    onChange={handleInputChange} 
                    placeholder="Describe the brand values, mission, target audience, and unique selling propositions..." 
                    rows={8} 
                    className="min-h-[160px]"
                  />
                </div>
                <div>
                  <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                  <Textarea 
                    id="tone_of_voice" 
                    name="tone_of_voice" 
                    value={formData.tone_of_voice} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Friendly & approachable, Formal & authoritative, Witty & irreverent..." 
                    rows={4} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team">
              <div className="space-y-4">
                <Label className="text-base font-medium">Brand Administrators</Label>
                {displayedAdmins.length > 0 ? (
                  <div className="p-3 border rounded-md bg-muted/10 space-y-2">
                    {displayedAdmins.map(admin => (
                      <div key={admin.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{admin.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{admin.email || 'No email provided'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No specific administrators are assigned to this brand. Global administrators have access.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <Info className="inline-block h-3 w-3 mr-1" />
                  Brand-specific administrators are managed via the global Users page. 
                  This section is for informational purposes only.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="rules">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
                  <Textarea 
                    id="guardrails" 
                    name="guardrails" 
                    value={formData.guardrails} 
                    onChange={handleInputChange} 
                    placeholder="List topics, phrases, brand elements to avoid, or specific mandatory inclusions. Enter each on a new line..." 
                    rows={6} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Guidelines for AI to follow, ensuring content aligns with brand safety and specific messaging requirements.
                  </p>
                </div>

                <div>
                  <Label className="text-base font-medium">Content Vetting Agencies</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select agencies pre-approved for vetting content for this brand. 
                    Agencies are typically filtered by the brand's country (set in Basic Info).
                  </p>
                  {isLoadingAgencies ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading agencies...
                    </div>
                  ) : allVettingAgencies.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                      {allVettingAgencies
                        .filter(agency => !formData.country || !agency.country_code || agency.country_code === formData.country)
                        .map(agency => (
                        <div key={agency.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`agency-${agency.id}`} 
                            checked={formData.selected_agency_ids.includes(agency.id)} 
                            onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)} // Ensure boolean
                          />
                          <Label htmlFor={`agency-${agency.id}`} className="font-normal">
                            {agency.name}
                            {agency.country_code && <span className='text-xs text-muted-foreground ml-1'>({agency.country_code})</span>}
                          </Label>
                        </div>
                      ))}
                      {allVettingAgencies.filter(agency => !formData.country || !agency.country_code || agency.country_code === formData.country).length === 0 && formData.country && (
                        <p className="text-xs text-muted-foreground">No agencies found for the selected country ({formData.country}).</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No vetting agencies available. Please select a country or add agencies in the system.</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="master_claim_brand_id">Master Claim Brand</Label>
                  <Select 
                    name="master_claim_brand_id"
                    value={formData.master_claim_brand_id || ''} // Ensure value is not null for Select
                    onValueChange={handleMasterClaimBrandChange}
                    disabled={isLoadingMasterClaimBrands}
                  >
                    <SelectTrigger id="master_claim_brand_id">
                      <SelectValue placeholder={isLoadingMasterClaimBrands ? "Loading..." : "Select Master Claim Brand (Optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=""><em>None</em></SelectItem> {/* Use empty string for "None" selection */}
                      {masterClaimBrands.map(mcb => (
                        <SelectItem key={mcb.id} value={mcb.id}>{mcb.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Associate this brand with a global Master Claim Brand for consistent claim management.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/dashboard/brands')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isGenerating}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
