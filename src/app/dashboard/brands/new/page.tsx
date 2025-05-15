'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Label } from '@/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from "@/components/checkbox";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "@/components/badge";

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

interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title?: string | null;
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
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isGenerating, setIsGenerating] = useState(false);

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
    content_vetting_agencies: ''
  });

  const [selectedAdmins, setSelectedAdmins] = useState<UserSearchResult[]>([]);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectAdmin = (user: UserSearchResult) => {
    if (!selectedAdmins.find(admin => admin.id === user.id)) {
      setSelectedAdmins(prevAdmins => [...prevAdmins, user]);
    }
    setSearchQuery('');
    setUserSearchResults([]);
  };

  const handleRemoveAdmin = (adminId: string) => {
    setSelectedAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== adminId));
  };

  const handleGenerateBrandIdentity = async () => {
    if (!formData.name) {
      toast.error('Please enter a brand name first.');
      return;
    }
    const urls = [formData.website_url, ...formData.additional_website_urls.map(u => u.value)].filter(url => url && url.trim() !== '');
    if (urls.length === 0) {
      toast.error('Please enter at least one website URL (main or additional) to generate identity.');
      return;
    }
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
        setFormData(prev => ({
          ...prev,
          brand_identity: data.data.brandIdentity || prev.brand_identity,
          tone_of_voice: data.data.toneOfVoice || prev.tone_of_voice,
          guardrails: data.data.guardrails || prev.guardrails,
          content_vetting_agencies: (Array.isArray(data.data.suggestedAgencies) ? data.data.suggestedAgencies.map((a: any) => a.name).join(', ') : '') || prev.content_vetting_agencies,
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
      const payload: any = { 
        ...formData,
        brand_admin_ids: selectedAdmins.map(admin => admin.id)
      };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        }
      });
      if (payload.additional_website_urls && Array.isArray(payload.additional_website_urls)){
        payload.additional_website_urls = payload.additional_website_urls.map((item: {id:string, value:string}) => item.value).filter(Boolean);
        if(payload.additional_website_urls.length === 0) payload.additional_website_urls = null;
      }
      if (typeof payload.content_vetting_agencies === 'string' && payload.content_vetting_agencies.trim() === ''){
          payload.content_vetting_agencies = null;
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
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands", href: "/dashboard/brands" }, { label: "Create New Brand" }]} />
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Standard 1.3: Back Button - Top Left */}
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/brands')} aria-label="Back to Brands">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandIcon name={formData.name || "New Brand"} color={formData.brand_color} size="lg" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Brand</h1>
            <p className="text-muted-foreground">Define the details for your new brand.</p>
          </div>
        </div>
        {/* Top-right actions removed as per audit recommendation D.2 (point 3 & 5a) 
            Primary form actions will be at the bottom. */}
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
                <div className="space-y-2"><Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter brand name"/></div>
                <div className="space-y-2"><Label htmlFor="website_url">Website URL</Label><Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="https://example.com"/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="country">Country</Label><Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent>{COUNTRIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="language">Language</Label><Select value={formData.language} onValueChange={(v) => handleSelectChange('language', v)}><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent>{LANGUAGES.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label htmlFor="brand_color">Brand Colour</Label><div className="flex gap-2 items-center"><input type="color" id="brand_color" name="brand_color" value={formData.brand_color} onChange={handleInputChange} className="w-10 h-10 rounded cursor-pointer"/><Input value={formData.brand_color} onChange={handleInputChange} name="brand_color" placeholder="#HEX colour" className="w-32"/></div></div>
              <div className="space-y-2">
                <Label htmlFor="brand_admins_search">Brand Admins <span className="text-muted-foreground text-xs">(Optional)</span></Label>
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
            <CardHeader><CardTitle>Brand Identity</CardTitle><CardDescription>Generate or manually define your brand identity profile.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Generate Brand Identity</h3>
                    <p className="text-sm text-muted-foreground">Provide URLs to auto-generate brand identity, tone, guardrails, and more. The main website URL from Basic Details will be used.</p>
                    <div className="space-y-2">
                      <Label>Additional Website URLs (Optional)</Label>
                      {formData.additional_website_urls.map((urlObj, index) => (
                        <div key={urlObj.id} className="flex items-center gap-2">
                          <Input 
                            value={urlObj.value} 
                            onChange={(e) => handleAdditionalUrlChange(urlObj.id, e.target.value)} 
                            placeholder="https://another-example.com"
                            className="flex-grow"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAdditionalUrl(urlObj.id)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={handleAddAdditionalUrlField} size="sm" className="mt-2 w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add another URL
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="brand_identity">Brand Identity</Label><Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} placeholder="Describe your brand..." rows={6}/></div>
                    <div className="space-y-2"><Label htmlFor="tone_of_voice">Tone of Voice</Label><Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="Describe your brand's tone..." rows={4}/></div>
                    <div className="space-y-2"><Label htmlFor="guardrails">Content Guardrails</Label><Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="e.g., Do not mention competitors..." rows={4}/></div>
                    <div className="space-y-2"><Label htmlFor="content_vetting_agencies">Content Vetting Agencies</Label><Textarea id="content_vetting_agencies" name="content_vetting_agencies" value={formData.content_vetting_agencies} onChange={handleInputChange} placeholder="e.g., FDA, ASA (comma-separated)" rows={2}/></div>
                  </div>
                </div>
                <div className="lg:col-span-1"><div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4"><div className="space-y-2"><h4 className="font-semibold">Quick Preview</h4><div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30"><BrandIcon name={formData.name || 'Brand'} color={formData.brand_color} /><span className="truncate">{formData.name || 'Your Brand Name'}</span></div></div><div className="space-y-2"><h4 className="font-medium">Brand Colour</h4><div className="w-full h-12 rounded-md" style={{ backgroundColor: formData.brand_color }} /><p className="text-xs text-center text-muted-foreground">{formData.brand_color}</p></div>{/* Recommendations can be added here */ }</div></div>
              </div>
         </CardContent>
       </Card>
        </TabsContent>
      </Tabs>

      {/* Standard 3.1: Consolidated Form Actions - Bottom Right */}
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