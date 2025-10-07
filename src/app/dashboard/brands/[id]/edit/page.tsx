'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectCheckboxCombobox } from '@/components/ui/MultiSelectCheckboxCombobox';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, AlertTriangle, Sparkles, Info } from 'lucide-react';
import { BrandIcon } from '@/components/brand-icon';
import { BrandLogoUpload } from '@/components/ui/brand-logo-upload';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/ui/save-status';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api-client';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';

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

const COUNTRY_SYNONYM_MAP: Record<string, string> = {
  UK: 'GB',
  GBR: 'GB',
  'UNITED KINGDOM': 'GB',
  'GREAT BRITAIN': 'GB',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'U.S.': 'US',
  'U.S.A.': 'US',
};

const normalizeCountryValue = (value: string | null | undefined): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const matchByValue = COUNTRIES.find((country) => country.value.toLowerCase() === trimmed.toLowerCase());
  if (matchByValue) {
    return matchByValue.value;
  }

  const matchByLabel = COUNTRIES.find((country) => country.label.toLowerCase() === trimmed.toLowerCase());
  if (matchByLabel) {
    return matchByLabel.value;
  }

  const upper = trimmed.toUpperCase();
  if (COUNTRY_SYNONYM_MAP[upper]) {
    return COUNTRY_SYNONYM_MAP[upper];
  }

  if (upper.length === 2) {
    const exists = COUNTRIES.some(country => country.value === upper);
    if (exists) {
      return upper;
    }
  }

  if (upper.length === 3) {
    const exists = COUNTRIES.some(country => country.value === upper);
    if (exists) {
      return upper;
    }
  }

  return '';
};

const getPriorityAgencyStyles = (priority: 'High' | 'Medium' | 'Low' | null | undefined): string => {
  if (priority === 'High') return 'text-red-600 font-bold';
  if (priority === 'Medium') return 'text-orange-500 font-semibold';
  if (priority === 'Low') return 'text-blue-600 font-normal';
  return 'font-normal text-gray-700 dark:text-gray-300';
};

// Remove inline Breadcrumbs - now using BreadcrumbNav

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [, setBrand] = useState<Record<string, unknown> | null>(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
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
    master_claim_brand_id: null as string | null, // Keep for backward compatibility
    master_claim_brand_ids: [] as string[], // NEW: Array for multiple master claim brands
    logo_url: null as string | null,
  });

  const [allVettingAgencies, setAllVettingAgencies] = useState<VettingAgency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  const agencyLookupById = useMemo(() => {
    const map = new Map<string, VettingAgency>();
    allVettingAgencies.forEach(agency => {
      map.set(agency.id, agency);
    });
    return map;
  }, [allVettingAgencies]);

  const agencyLookupByName = useMemo(() => {
    const map = new Map<string, VettingAgency>();
    allVettingAgencies.forEach(agency => {
      if (agency.name) {
        map.set(agency.name.toLowerCase(), agency);
      }
    });
    return map;
  }, [allVettingAgencies]);

  const resolveSuggestedAgencyIds = useCallback(
    (suggested: unknown): { matched: string[]; unmatched: string[] } => {
      const matched = new Set<string>();
      const unmatched: string[] = [];

      if (!Array.isArray(suggested)) {
        return { matched: [], unmatched: [] };
      }

      suggested.forEach(item => {
        if (typeof item === 'string') {
          const normalized = item.trim().toLowerCase();
          if (!normalized) return;
          const match = agencyLookupByName.get(normalized);
          if (match) {
            matched.add(match.id);
          } else {
            unmatched.push(item);
          }
          return;
        }

        if (item && typeof item === 'object') {
          const maybeId = 'id' in item && typeof (item as { id?: unknown }).id === 'string'
            ? ((item as { id: string }).id)
            : null;
          if (maybeId) {
            const agency = agencyLookupById.get(maybeId);
            if (agency) {
              matched.add(agency.id);
              return;
            }
          }

          const maybeName = 'name' in item && typeof (item as { name?: unknown }).name === 'string'
            ? ((item as { name: string }).name)
            : null;
          if (maybeName) {
            const normalizedName = maybeName.trim().toLowerCase();
            if (!normalizedName) return;
            const agency = agencyLookupByName.get(normalizedName);
            if (agency) {
              matched.add(agency.id);
            } else {
              unmatched.push(maybeName);
            }
          }
        }
      });

      return { matched: Array.from(matched), unmatched };
    },
    [agencyLookupById, agencyLookupByName]
  );
  
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
        
        const normalizedCountry = normalizeCountryValue(data.brand.country);

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
          country: normalizedCountry,
          language: data.brand.language || '',
          brand_color: data.brand.brand_color || '#1982C4',
          brand_identity: data.brand.brand_identity || '',
          tone_of_voice: data.brand.tone_of_voice || '',
          guardrails: data.brand.guardrails || '',
          content_vetting_agencies: Array.isArray(data.brand.selected_vetting_agencies) 
                                      ? data.brand.selected_vetting_agencies.map((agency: { id: string }) => agency.id)
                                      : [],
          master_claim_brand_id: data.brand.master_claim_brand_id || null,
          master_claim_brand_ids: [], // Will be populated separately
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
            country_code: agency.country_code ? agency.country_code.toUpperCase() : null,
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
        // Fetch all master claim brands
        const response = await fetch('/api/master-claim-brands');
        if (!response.ok) throw new Error('Failed to fetch Master Claim Brands');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMasterClaimBrands(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse Master Claim Brands');
        }
        
        // Fetch which master claim brands are linked to this brand
        const linkedResponse = await fetch(`/api/brands/${id}/master-claim-brands`);
        if (linkedResponse.ok) {
          const linkedData = await linkedResponse.json();
          if (linkedData.success && Array.isArray(linkedData.data)) {
            // Update the form with the linked master claim brand IDs
            setFormData(prev => ({
              ...prev,
              master_claim_brand_ids: linkedData.data.map((link: { master_claim_brand_id: string }) => link.master_claim_brand_id)
            }));
          }
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


  const handleMasterClaimBrandsChange = (values: string[]) => {
    setFormData(prev => ({ ...prev, master_claim_brand_ids: values }));
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
      const response = await apiFetch('/api/brands/identity', {
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
        const { matched: generatedAgencies, unmatched } = resolveSuggestedAgencyIds(data.data.suggestedAgencies);
        setFormData(prev => ({
          ...prev,
          brand_identity: data.data.brandIdentity || prev.brand_identity,
          tone_of_voice: data.data.toneOfVoice || prev.tone_of_voice,
          guardrails: data.data.guardrails || prev.guardrails,
          content_vetting_agencies: Array.from(new Set([...prev.content_vetting_agencies, ...generatedAgencies])),
          brand_color: data.data.brandColor || prev.brand_color
        }));
        if (unmatched.length > 0) {
          toast.info('Some suggested vetting agencies were not recognised and were skipped.', {
            description: unmatched.join(', ')
          });
        }
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

  const handleSave = async (isManualSave = false) => {
    if (!formData.name.trim()) {
      toast.error('Brand name is required.');
      setActiveTab('basic');
      throw new Error('Brand name is required');
    }
    setIsSaving(true);
    setLastSaveError(null);
    try {
      const validAgencyIds = formData.content_vetting_agencies.filter(id => agencyLookupById.has(id));
      const invalidAgencyIds = formData.content_vetting_agencies.filter(id => !agencyLookupById.has(id));

      if (invalidAgencyIds.length > 0) {
        toast.info('Some agencies could not be matched to existing records and were excluded.', {
          description: invalidAgencyIds.join(', ')
        });
        setFormData(prev => ({
          ...prev,
          content_vetting_agencies: validAgencyIds
        }));
      }

      const payload: Record<string, unknown> = {
        ...formData,
        selected_agency_ids: validAgencyIds,
        master_claim_brand_ids: formData.master_claim_brand_ids, // Include the array of master claim brand IDs
      };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || (Array.isArray(payload[key]) && (payload[key] as unknown[]).length === 0) ) {
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
      
      // Temporary workaround for CloudFlare 403 issue with PUT requests
      const response = await apiClient.post(`/api/brands/${id}?_method=PUT`, payload);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, try to get text for error message
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(response.status === 403 ? 'Permission denied' : 
                       response.status === 429 ? 'Too many requests. Please try again later.' :
                       'Server error. Please try again.');
      }
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update brand');
      }
      
      // Only show success toast and redirect on manual save
      if (isManualSave) {
        toast.success('Brand updated successfully!');
        router.push('/dashboard/brands');
      }
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Failed to update brand.';
      setLastSaveError(errorMessage);
      toast.error(errorMessage);
      throw error; // Re-throw for auto-save hook
    } finally {
      setIsSaving(false);
    }
  };
  
  // Configure auto-save
  const {
    isSaving: isAutoSaving,
    lastSaved,
    error: autoSaveError,
    save: triggerSave,
  } = useAutoSave({
    data: formData,
    onSave: () => handleSave(false), // Explicitly pass false for auto-save
    debounceMs: 3000, // Auto-save after 3 seconds of inactivity
    enabled: !isForbidden && !error && !isLoadingBrand && !!formData.name,
    onError: (error) => {
      console.error('Auto-save error:', error);
      // Don't show toast for auto-save errors, already shown in handleSave
    },
    onSuccess: () => {
      console.log('Auto-save successful');
    }
  });

  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = LANGUAGES.find(l => l.value === formData.language)?.label || formData.language || 'Select language';

  const renderVettingAgencyCheckboxes = () => {
    if (isLoadingAgencies) {
      return <p className="text-sm text-muted-foreground">Loading agencies...</p>;
    }

    const effectiveCountryCode = (() => {
      if (!formData.country) return '';
      const matchByValue = COUNTRIES.find((country) => country.value === formData.country);
      if (matchByValue) return matchByValue.value;
      const matchByLabel = COUNTRIES.find((country) => country.label.toLowerCase() === formData.country.toLowerCase());
      if (matchByLabel) return matchByLabel.value;
      return normalizeCountryValue(formData.country);
    })();

    const effectiveCountryLabel = effectiveCountryCode
      ? COUNTRIES.find((country) => country.value === effectiveCountryCode)?.label || ''
      : '';

    const filteredAgencies = allVettingAgencies.filter((agency) => {
      if (!effectiveCountryCode) return true;
      if (!agency.country_code) return true;
      return agency.country_code.toLowerCase() === effectiveCountryCode.toLowerCase();
    });

    if (!formData.country && allVettingAgencies.length > 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Select a country to see relevant vetting agencies. Showing all available agencies.
        </p>
      );
    }

    if (formData.country && filteredAgencies.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No specific vetting agencies found for {effectiveCountryLabel || formData.country}.
        </p>
      );
    }

    if (allVettingAgencies.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No vetting agencies found in the system.</p>
      );
    }

    const renderGroup = (
      key: string,
      heading: string,
      priority: 'High' | 'Medium' | 'Low' | null,
      agencies: VettingAgency[]
    ) => {
      if (agencies.length === 0) return null;

      return (
        <div key={key} className="mt-3">
          <h4 className={cn('text-md font-semibold mb-2', getPriorityAgencyStyles(priority))}>{heading}</h4>
          <div className="space-y-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
            {agencies.map((agency) => (
              <div key={`agency-checkbox-${agency.id}`} className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-agency-${agency.id}-${key}`}
                  checked={formData.content_vetting_agencies.includes(agency.id)}
                  onCheckedChange={(checked) => handleAgencyCheckboxChange(agency.id, !!checked)}
                />
                <Label
                  htmlFor={`edit-agency-${agency.id}-${key}`}
                  className={getPriorityAgencyStyles(agency.priority)}
                >
                  {agency.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const standardGroups = priorityOrder.map((priorityLevel) =>
      renderGroup(
        `priority-${priorityLevel.toLowerCase()}`,
        `${priorityLevel} Priority`,
        priorityLevel,
        filteredAgencies.filter((agency) => agency.priority === priorityLevel)
      )
    );

    const otherPriorityAgencies = filteredAgencies.filter(
      (agency) => agency.priority && !priorityOrder.includes(agency.priority)
    );

    const uncategorisedAgencies = filteredAgencies.filter((agency) => agency.priority == null);

    return (
      <>
        {standardGroups}
        {renderGroup('priority-other', 'Other Priority', null, otherPriorityAgencies)}
        {renderGroup('priority-none', 'Uncategorised', null, uncategorisedAgencies)}
      </>
    );
  };

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
      <BreadcrumbNav items={breadcrumbItems} className="mb-4" showHome={false} separator="/" />
      
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
        <div className="flex items-center">
          <SaveStatusIndicator
            status={isAutoSaving || isSaving ? 'saving' : (autoSaveError || lastSaveError) ? 'error' : lastSaved ? 'saved' : 'idle'}
            lastSaved={lastSaved}
            error={autoSaveError?.message || lastSaveError || undefined}
            onRetry={triggerSave}
            showTimestamp={true}
          />
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
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <div className="space-y-4">
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
                    <Label htmlFor="master_claim_brand_ids" className="col-span-12 sm:col-span-3 text-left sm:text-right sm:pt-2">Product Claims Brands</Label>
                    <div className="col-span-12 sm:col-span-9 space-y-1">
                      <MultiSelectCheckboxCombobox
                        options={masterClaimBrands.map(mcb => ({ value: mcb.id, label: mcb.name }))}
                        selectedValues={formData.master_claim_brand_ids}
                        onChange={handleMasterClaimBrandsChange}
                        placeholder={isLoadingMasterClaimBrands ? "Loading claim brands..." : "Select Product Claims Brands..."}
                        searchPlaceholder="Search brands..."
                        disabled={isLoadingMasterClaimBrands}
                      />
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Info className="h-3 w-3 mr-1" /> Link this MixerAI brand to one or more Product Claims Brands. Products from all selected brands will be available.
                      </p>
                    </div>
                  </div>
                </div>
                <aside className="space-y-6">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Brand Preview</Label>
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
                      <Label htmlFor="brand_color_basic_tab">Brand Colour</Label>
                      <div className="flex gap-2 items-center">
                        <input 
                            type="color" 
                            id="brand_color_basic_tab"
                            name="brand_color" 
                            value={formData.brand_color} 
                            onChange={handleInputChange} 
                            className="w-10 h-10 rounded cursor-pointer border"
                        />
                        <Input 
                            id="brand_color_hex_basic_tab"
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
                </aside>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t pt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
                  Cancel
              </Button>
              <Button onClick={() => handleSave(true)} disabled={isSaving || isAutoSaving || isGenerating}>
                  {(isSaving || isAutoSaving) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
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
              <div className="space-y-6">
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
                      {renderVettingAgencyCheckboxes()}
                    </div>
                </div>
              </div>
            </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t pt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
                  Cancel
              </Button>
              <Button onClick={() => handleSave(true)} disabled={isSaving || isAutoSaving || isGenerating}>
                  {(isSaving || isAutoSaving) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
