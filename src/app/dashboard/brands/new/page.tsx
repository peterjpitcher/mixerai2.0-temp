'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectCheckboxCombobox } from '@/components/ui/MultiSelectCheckboxCombobox';
import { toast } from 'sonner';
import { Loader2, X, PlusCircle, ArrowLeft, Info, HelpCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { BrandIcon } from '@/components/features/brands/brand-icon';
import { BrandLogoUpload } from '@/components/ui/brand-logo-upload';
import { COUNTRIES, LANGUAGES, getLanguagesForCountry, getLanguageLabel } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { apiFetch } from '@/lib/api-client';
import {
  normalizeUrlCandidate,
  sanitizeAdditionalWebsiteEntries,
  resolveBrandColor,
  isAbortError,
  isValidUuid,
} from './utils';

/**
 * NewBrandPage allows users to create a new brand profile.
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

const mergeAgencies = (
  existing: VettingAgency[],
  additions: VettingAgency[],
): VettingAgency[] => {
  const map = new Map<string, VettingAgency>();
  existing.forEach((agency) => map.set(agency.id, agency));
  additions.forEach((agency) => map.set(agency.id, agency));
  return Array.from(map.values());
};


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
  const [isGeneratingAgencies, setIsGeneratingAgencies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);

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
  const priorityOrder: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingMasterClaimBrands, setIsLoadingMasterClaimBrands] = useState(true);

  const draftBrandIdRef = useRef<string | null>(null);
  if (!draftBrandIdRef.current) {
    draftBrandIdRef.current = uuidv4();
  }
  const draftBrandId = draftBrandIdRef.current;

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

  const fetchCurrentUser = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoadingUser(true);
      setUserLoadError(null);
      try {
        const response = await apiFetch('/api/me', { retry: 2, retryDelayMs: 400, signal });
        if (signal?.aborted) return;

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setIsForbidden(true);
            return;
          }
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody === 'object' && errorBody && 'error' in errorBody && typeof errorBody.error === 'string'
              ? errorBody.error
              : 'Failed to fetch user session';
          throw new Error(message);
        }

        const data = await response.json();
        if (signal?.aborted) return;

        if (data.success && data.user) {
          const userRole = data.user.user_metadata?.role;
          setIsForbidden(userRole !== 'admin');
        } else {
          const fallbackMessage =
            (typeof data?.error === 'string' && data.error) ||
            'Your session could not be verified. Please try again.';
          throw new Error(fallbackMessage);
        }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) {
          return;
        }
        console.error('Error fetching current user:', error);
        setIsForbidden(false);
        setUserLoadError((error as Error).message || 'Could not verify your permissions.');
      } finally {
        if (!signal?.aborted) {
          setIsLoadingUser(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentUser(controller.signal);
    return () => controller.abort();
  }, [fetchCurrentUser]);

  const fetchMasterClaimBrands = useCallback(
    async (signal?: AbortSignal) => {
      if (isForbidden || isLoadingUser || userLoadError) return;
      setIsLoadingMasterClaimBrands(true);
      try {
        const response = await apiFetch('/api/master-claim-brands', { signal });
        if (signal?.aborted) return;
        if (!response.ok) throw new Error('Failed to fetch Master Claim Brands');

        const data = await response.json();
        if (signal?.aborted) return;

        if (data.success && Array.isArray(data.data)) {
          setMasterClaimBrands(data.data);
        } else if (!signal?.aborted) {
          toast.error(data.error || 'Could not load Master Claim Brands.');
          setMasterClaimBrands([]);
        }
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          return;
        }
        toast.error('Failed to fetch Master Claim Brands list.');
        console.error('Error fetching Master Claim Brands:', err);
        setMasterClaimBrands([]);
      } finally {
        if (!signal?.aborted) {
          setIsLoadingMasterClaimBrands(false);
        }
      }
    },
    [isForbidden, isLoadingUser, userLoadError]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMasterClaimBrands(controller.signal);
    return () => controller.abort();
  }, [fetchMasterClaimBrands]);

  const fetchAllVettingAgencies = useCallback(async (signal?: AbortSignal) => {
    if (isForbidden || isLoadingUser || userLoadError) return;
    const apiUrl = '/api/content-vetting-agencies';
    setIsLoading(true);
    try {
      const response = await apiFetch(apiUrl, { signal });
      if (signal?.aborted) return;
      if (!response.ok) throw new Error('Failed to fetch vetting agencies');
      const data = await response.json();
      if (signal?.aborted) return;
      if (data.success && Array.isArray(data.data)) {
        const transformedAgencies: VettingAgency[] = data.data.map((agency: VettingAgencyFromAPI) => ({
          ...agency,
          priority: mapNumericPriorityToLabel(agency.priority),
        }));
        setAllVettingAgencies(transformedAgencies);
      } else if (!signal?.aborted) {
        toast.error(data.error || 'Could not load vetting agencies.');
        setAllVettingAgencies([]);
      }
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return;
      }
      toast.error('Failed to fetch vetting agencies list.');
      console.error('Error fetching all vetting agencies:', err);
      setAllVettingAgencies([]);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [isForbidden, isLoadingUser, userLoadError]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllVettingAgencies(controller.signal);
    return () => controller.abort();
  }, [fetchAllVettingAgencies]);

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

  if (userLoadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Unable to verify permissions</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl">
          {userLoadError}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={() => fetchCurrentUser()} disabled={isLoadingUser}>
            {isLoadingUser ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
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
  const canGenerateAgencyRecommendations = Boolean(formData.name?.trim()) && Boolean(formData.country?.trim());

  const handleGenerateBrandIdentity = async () => {
    if (!formData.name) {
      toast.error('Please enter a brand name first.');
      return;
    }
    if (!canGenerateIdentity) {
      toast.error('Please enter at least one website URL (main or additional) to generate identity.');
      return;
    }
    const rawUrls = [formData.website_url, ...formData.additional_website_urls.map(u => u.value)]
      .map(url => (url || '').trim())
      .filter((url): url is string => Boolean(url));
    const urls = Array.from(
      new Set(
        rawUrls.map(url => (/^https?:\/\//i.test(url) ? url : `https://${url}`))
      )
    );
    if (!urls.length) {
      toast.error('Please enter at least one website URL (main or additional) to generate identity.');
      return;
    }

    setIsGenerating(true);
    toast.info('Generating brand identity...');
    try {
      const response = await apiFetch('/api/brands/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          urls,
          country: (formData.country && formData.country.trim()) || 'GB',
          language: (formData.language && formData.language.trim()) || 'en-GB'
        })
      });
      let payload: unknown = null;
      let parseError: unknown = null;
      try {
        payload = await response.json();
      } catch (jsonError) {
        parseError = jsonError;
      }

      const parsed = payload as {
        success?: boolean;
        data?: {
          brandIdentity?: string | null;
          toneOfVoice?: string | null;
          brandColor?: string | null;
          suggestedAgencies?: unknown;
          scrapeWarnings?: string[];
          normalizationWarnings?: string[];
          processingWarnings?: string[];
        };
        error?: string;
        details?: unknown;
      } | null;

      const isSuccessfulResponse = response.ok && parsed?.success && parsed.data;

      if (!isSuccessfulResponse) {
        const detailSet = new Set<string>();
        const collectDetails = (value: unknown) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach(collectDetails);
            return;
          }
          if (typeof value === 'object') {
            Object.values(value as Record<string, unknown>).forEach(collectDetails);
            return;
          }
          const text = String(value).trim();
          if (text) {
            detailSet.add(text);
          }
        };

        collectDetails(parsed?.details);
        if (parseError) {
          detailSet.add('The server response could not be parsed.');
        }

        const detailMessages = Array.from(detailSet);
        const description = detailMessages.length
          ? detailMessages.join('\n').slice(0, 500)
          : undefined;
        const message =
          parsed?.error ||
          (parseError ? 'Unexpected response from the server' : 'Failed to generate brand identity');
        const notify = response.status >= 500 ? toast.error : toast.warning;
        notify(message, description ? { description } : undefined);
        return;
      }

      const data = parsed.data;
      if (!data) {
        throw new Error(parsed?.error || 'Failed to parse generation response');
      }

      const { matched: generatedAgencies, unmatched } = resolveSuggestedAgencyIds(data.suggestedAgencies);
      setFormData(prev => {
        const nextBrandColor = resolveBrandColor(data.brandColor ?? null, prev.brand_color);
        return {
          ...prev,
          brand_identity: data.brandIdentity || prev.brand_identity,
          tone_of_voice: data.toneOfVoice || prev.tone_of_voice,
          content_vetting_agencies: Array.from(new Set([...prev.content_vetting_agencies, ...generatedAgencies])),
          brand_color: nextBrandColor,
        };
      });
      const toDescription = (messages: string[]) => messages.join('\n').slice(0, 400);
      if (Array.isArray(data.scrapeWarnings) && data.scrapeWarnings.length) {
        toast.warning('Some URLs could not be processed completely.', {
          description: toDescription(data.scrapeWarnings),
        });
      }
      if (Array.isArray(data.normalizationWarnings) && data.normalizationWarnings.length) {
        toast.warning('Some URLs were reformatted automatically.', {
          description: toDescription(data.normalizationWarnings),
        });
      }
      if (Array.isArray(data.processingWarnings) && data.processingWarnings.length) {
        toast.info('Website content was adjusted to fit AI limits.', {
          description: toDescription(data.processingWarnings),
        });
      }
      if (unmatched.length > 0) {
        toast.info('Some suggested vetting agencies were not recognised and were skipped.', {
          description: unmatched.join(', ')
        });
      }
      toast.success('Brand identity generated successfully!');
      setActiveTab('identity');
    } catch (error) {
      const message =
        error instanceof Error
          ? (error.message || 'An error occurred during identity generation.')
          : 'An error occurred during identity generation.';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAgencies = async () => {
    if (!canGenerateAgencyRecommendations) {
      toast.error('Please provide a brand name and country before generating vetting agencies.');
      return;
    }

    setIsGeneratingAgencies(true);
    try {
      const response = await apiFetch('/api/content-vetting-agencies/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: formData.name?.trim(),
          countryCode: formData.country?.trim(),
          languageCodes: formData.language ? [formData.language] : [],
          brandSummary: formData.brand_identity || null,
          existingAgencyIds: formData.content_vetting_agencies,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to generate vetting agencies');
      }

      const suggestionIds: string[] = Array.isArray(payload.data?.suggestions)
        ? payload.data.suggestions
          .map((entry: { record?: { id?: string } }) => entry?.record?.id)
          .filter((id: unknown): id is string => typeof id === 'string')
        : [];

      if (suggestionIds.length > 0) {
        setFormData((prev) => ({
          ...prev,
          content_vetting_agencies: Array.from(
            new Set([...(prev.content_vetting_agencies ?? []), ...suggestionIds])
          ),
        }));
      }

      if (Array.isArray(payload.data?.warnings) && payload.data.warnings.length > 0) {
        toast.warning('Review suggested agencies', {
          description: payload.data.warnings.join('\\n').slice(0, 400),
        });
      }

      if (payload.data?.fallbackApplied) {
        toast.info('Used fallback catalogue while generating vetting agencies.');
      }

      const catalogRecordsRaw = Array.isArray(payload.data?.catalog) ? payload.data.catalog : [];
      const normalizedCatalog: VettingAgency[] = catalogRecordsRaw
        .map((record: Record<string, unknown>) => ({
          id: String(record.id ?? ''),
          name: String(record.name ?? ''),
          description: (record.description as string | null) ?? null,
          country_code: record.countryCode
            ? String(record.countryCode).toUpperCase()
            : record.country_code
              ? String(record.country_code).toUpperCase()
              : null,
          priority: mapNumericPriorityToLabel(
            (record.priority as number | string | null | undefined) ??
            (record.priorityLabel as string | null | undefined),
          ),
        }))
        .filter((agency) => agency.id && agency.name);

      if (normalizedCatalog.length > 0) {
        setAllVettingAgencies((prev) => mergeAgencies(prev, normalizedCatalog));
      } else {
        await fetchAllVettingAgencies();
      }
      toast.success('Vetting agencies generated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate vetting agencies.';
      toast.error(message);
    } finally {
      setIsGeneratingAgencies(false);
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
      const dedupedAgencyIds = Array.from(new Set(formData.content_vetting_agencies));
      const knownAgencyIds = dedupedAgencyIds.filter((id) => agencyLookupById.has(id));
      const unknownAgencyIds = dedupedAgencyIds.filter((id) => !agencyLookupById.has(id));

      const uuidValidAgencyIds = knownAgencyIds.filter((id) => isValidUuid(id));
      const invalidUuidAgencyIds = knownAgencyIds.filter((id) => !isValidUuid(id));

      if (unknownAgencyIds.length > 0 || invalidUuidAgencyIds.length > 0) {
        const combinedInvalid = [...unknownAgencyIds, ...invalidUuidAgencyIds];
        toast.info('Some agencies could not be matched to verified records and were excluded.', {
          description: combinedInvalid.join(', ')
        });
        setFormData(prev => ({
          ...prev,
          content_vetting_agencies: uuidValidAgencyIds
        }));
      }

      const trimmedWebsite = formData.website_url?.trim() ?? '';
      const normalizedWebsiteUrl = trimmedWebsite ? normalizeUrlCandidate(trimmedWebsite) : null;

      if (trimmedWebsite && !normalizedWebsiteUrl) {
        toast.error('Main website URL must be a valid http(s) address.');
        setActiveTab('basic');
        setIsSaving(false);
        return;
      }

      const { normalized: normalizedAdditionalUrls, invalid: invalidAdditionalUrls } =
        sanitizeAdditionalWebsiteEntries(formData.additional_website_urls);

      if (invalidAdditionalUrls.length > 0) {
        toast.error('Some additional website URLs are invalid.', {
          description: invalidAdditionalUrls.join(', ')
        });
        setActiveTab('basic');
        setIsSaving(false);
        return;
      }

      const rawMasterClaimBrandIds = Array.isArray(formData.master_claim_brand_ids)
        ? formData.master_claim_brand_ids
        : [];
      const validMasterClaimBrandIds = rawMasterClaimBrandIds.filter((id) => isValidUuid(id));
      const invalidMasterClaimBrandIds = rawMasterClaimBrandIds.filter((id) => !isValidUuid(id));

      if (invalidMasterClaimBrandIds.length > 0) {
        toast.info('Some product claim brand selections were invalid and were removed.', {
          description: invalidMasterClaimBrandIds.join(', '),
        });
        setFormData((prev) => ({
          ...prev,
          master_claim_brand_ids: validMasterClaimBrandIds,
        }));
      }

      const {
        additional_website_urls: _unusedAdditionalUrls,
        master_claim_brand_ids: _unusedMasterClaimBrandIds,
        ...restFormData
      } = formData;

      const payload: Record<string, unknown> = {
        ...restFormData,
        website_url: normalizedWebsiteUrl,
        additional_website_urls: normalizedAdditionalUrls,
        selected_agency_ids: uuidValidAgencyIds,
        master_claim_brand_ids: validMasterClaimBrandIds, // Include the array of master claim brand IDs
      };
      payload.content_vetting_agencies = uuidValidAgencyIds;

      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || (Array.isArray(payload[key]) && (payload[key] as unknown[]).length === 0)) {
          payload[key] = null;
        }
      });
      if (payload.master_claim_brand_id === 'NO_SELECTION') {
        payload.master_claim_brand_id = null;
      }

      const response = await apiFetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create brand');
      }
      toast.success('Brand created successfully!');

      router.push('/dashboard/brands');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create brand.');
    } finally {
      setIsSaving(false);
    }
  };

  const countryName = COUNTRIES.find(c => c.value === formData.country)?.label || formData.country || 'Select country';
  const languageName = formData.language ? getLanguageLabel(formData.language) : 'Select language';
  const languagesForCountry = getLanguagesForCountry(formData.country);
  const availableLanguageOptions = languagesForCountry.length ? languagesForCountry : LANGUAGES;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands", href: "/dashboard/brands" }, { label: "Create New Brand" }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/brands')} aria-label="Back to Brands">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandIcon
            name={formData.name || "New Brand"}
            color={formData.brand_color}
            logoUrl={formData.logo_url}
            size="lg"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Brand</h1>
            <p className="text-muted-foreground">Define the details for your new brand.</p>
          </div>
        </div>
        <Link
          href="/dashboard/help#brands"
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
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right">Brand Name <span className="text-destructive">*</span></Label>
                <div className="col-span-12 sm:col-span-9">
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter brand name" required />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="website_url" className="col-span-12 sm:col-span-3 text-left sm:text-right">Main Website URL</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Input id="website_url" name="website_url" value={formData.website_url} onChange={handleInputChange} placeholder="https://example.com" type="url" />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label htmlFor="country" className="col-span-12 sm:col-span-3 text-left sm:text-right">Country</Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableLanguageOptions.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Master Claim Brands Selector */}
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
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t pt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/brands')} disabled={isSaving || isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleCreateBrand} disabled={isSaving || isGenerating}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Create Brand'}
              </Button>
            </CardFooter>
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
                    <div className="grid grid-cols-12 gap-4">
                      <Label className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Additional<br />Website URLs</Label>
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
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Brand Identity'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                      <Label htmlFor="brand_identity" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Brand Identity</Label>
                      <div className="col-span-12 sm:col-span-9">
                        <Textarea id="brand_identity" name="brand_identity" value={formData.brand_identity} onChange={handleInputChange} placeholder="Describe your brand..." rows={6} />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      <Label htmlFor="tone_of_voice" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Tone of Voice</Label>
                      <div className="col-span-12 sm:col-span-9">
                        <Textarea id="tone_of_voice" name="tone_of_voice" value={formData.tone_of_voice} onChange={handleInputChange} placeholder="Describe your brand's tone..." rows={4} />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                      <Label htmlFor="guardrails" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Content Guardrails</Label>
                      <div className="col-span-12 sm:col-span-9">
                        <Textarea id="guardrails" name="guardrails" value={formData.guardrails} onChange={handleInputChange} placeholder="e.g., Do not mention competitors..." rows={4} />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                      <Label className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Content Vetting<br />Agencies</Label>
                      <div className="col-span-12 sm:col-span-9">
                        {isLoading && <p className="text-sm text-muted-foreground">Loading agencies...</p>}

                        {(() => { // IIFE to manage filteredAgencies
                          const filteredAgenciesByIdentityTab = allVettingAgencies.filter(agency => !formData.country || !agency.country_code || agency.country_code === formData.country);

                          const renderGenerationCta = (message: string) => (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">{message}</p>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleGenerateAgencies}
                                disabled={isGeneratingAgencies || !canGenerateAgencyRecommendations}
                                className="inline-flex items-center"
                              >
                                {isGeneratingAgencies ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating…
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate vetting agencies
                                  </>
                                )}
                              </Button>
                              {!canGenerateAgencyRecommendations && (
                                <p className="text-xs text-muted-foreground">
                                  Add a brand name and country to enable AI-generated recommendations.
                                </p>
                              )}
                            </div>
                          );

                          if (!isLoading && !formData.country && allVettingAgencies.length > 0) {
                            return (
                              <p className="text-sm text-muted-foreground">
                                Select a country to see relevant vetting agencies. Showing all available agencies.
                              </p>
                            );
                          }

                          if (!isLoading && formData.country && filteredAgenciesByIdentityTab.length === 0) {
                            return renderGenerationCta(`No specific vetting agencies found for ${COUNTRIES.find(c => c.value === formData.country)?.label || formData.country}.`);
                          }

                          if (!isLoading && allVettingAgencies.length === 0) {
                            return renderGenerationCta('No vetting agencies found in the system. Generate suggestions to seed the catalogue.');
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
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-muted rounded-lg p-4 space-y-6 sticky top-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Quick Preview</Label>
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                        <BrandIcon
                          name={formData.name || 'Brand Name'}
                          color={formData.brand_color ?? undefined}
                          logoUrl={formData.logo_url}
                        />
                        <span className="truncate">{formData.name || 'Your Brand Name'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <BrandLogoUpload
                        currentLogoUrl={formData.logo_url}
                        onLogoChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                        brandId={draftBrandId}
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
              <Button onClick={handleCreateBrand} disabled={isSaving || isGenerating}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Create Brand'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
