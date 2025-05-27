"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Though not directly used, kept for consistency
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, AlertTriangle, Info, Link2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";

// Types
type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  global_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  // For display on list, not strictly needed here but good for reference
  entity_name?: string; 
}

interface ClaimEditFormData {
  claim_text: string;
  claim_type: ClaimTypeEnum | "";
  country_code: string;
  description: string | null;
  // Level and associated entity ID are fetched but not directly part of the editable form data here
  // They are displayed as read-only info.
}

// For displaying the non-editable entity associated with the claim
interface AssociatedEntityInfo {
    id: string | null;
    name: string;
    type: ClaimLevelEnum | null;
}

interface MarketOverride {
    id: string;
    master_claim_id: string;
    market_country_code: string;
    target_product_id: string; // We might want to fetch product name for display
    is_blocked: boolean;
    replacement_claim_id: string | null;
}

interface CountryOption { code: string; name: string; }

export default function EditClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;

  const [formData, setFormData] = useState<ClaimEditFormData>({
    claim_text: "",
    claim_type: "",
    country_code: "",
    description: null,
  });
  const [associatedEntity, setAssociatedEntity] = useState<AssociatedEntityInfo | null>(null);
  const [linkedOverrides, setLinkedOverrides] = useState<MarketOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ClaimEditFormData, string>>>({});

  const pageTitle = "Edit Claim";
  const pageDescription = `Modifying claim: ${formData.claim_text || (id ? `ID: ${id}` : "Loading...")}`;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Claims", href: "/dashboard/claims" },
    { label: `Edit: ${associatedEntity?.name ? formData.claim_text.substring(0,20)+'...' : (id || 'Claim')}` }
  ];

  useEffect(() => {
    if (!id) {
      setError("Invalid Claim ID provided.");
      setIsLoading(false);
      toast.error("Invalid Claim ID", { description: "The Claim ID in the URL is missing or invalid." });
      return;
    }
    setIsLoading(true);
    setIsLoadingCountries(true); // Start loading countries too

    async function fetchClaimDetails() {
      try {
        const response = await fetch(`/api/claims/${id}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) throw new Error("Claim not found.");
          throw new Error(errorData.error || "Failed to fetch claim details.");
        }
        const result = await response.json();
        if (result.success && result.data) {
          const claim: Claim = result.data;
          setFormData({
            claim_text: claim.claim_text,
            claim_type: claim.claim_type,
            country_code: claim.country_code,
            description: claim.description || null,
          });

          // Determine and fetch associated entity name for display
          let entityPromise: Promise<any> | null = null;
          let entityType: ClaimLevelEnum | null = claim.level;

          if (claim.level === 'brand' && claim.global_brand_id) {
            entityPromise = fetch(`/api/global-claim-brands/${claim.global_brand_id}`).then(res => res.json());
          } else if (claim.level === 'product' && claim.product_id) {
            entityPromise = fetch(`/api/products/${claim.product_id}`).then(res => res.json());
          } else if (claim.level === 'ingredient' && claim.ingredient_id) {
            entityPromise = fetch(`/api/ingredients/${claim.ingredient_id}`).then(res => res.json());
          }

          if (entityPromise) {
            const entityRes = await entityPromise;
            if (entityRes.success && entityRes.data) {
              setAssociatedEntity({ id: entityRes.data.id, name: entityRes.data.name, type: entityType });
            } else {
              setAssociatedEntity({ id: null, name: 'Error loading entity name', type: entityType });
              console.error("Failed to load entity name for claim:", entityRes.error);
            }
          } else {
            setAssociatedEntity({ id: null, name: 'N/A', type: entityType });
          }

          // If it's a market-specific claim, check for linked overrides
          if (claim.country_code !== ALL_COUNTRIES_CODE) {
            setIsLoadingOverrides(true);
            try {
              const overridesResponse = await fetch(`/api/market-overrides?replacementClaimId=${id}`);
              const overridesResult = await overridesResponse.json();
              if (overridesResult.success && Array.isArray(overridesResult.data)) {
                setLinkedOverrides(overridesResult.data);
              } else {
                console.warn("Could not fetch or parse linked overrides:", overridesResult.error);
                setLinkedOverrides([]); 
              }
            } catch (overrideErr) {
              console.error("Error fetching linked market overrides:", overrideErr);
              setLinkedOverrides([]);
            } finally {
              setIsLoadingOverrides(false);
            }
          }
          setError(null);
        } else {
          throw new Error(result.error || "Failed to parse claim details.");
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "An unexpected error occurred.";
        console.error("Error fetching claim details:", errorMessage);
        setError(errorMessage);
        toast.error("Failed to load claim details.", { description: errorMessage }); 
      } finally {
        setIsLoading(false); // Only set main loading to false after all primary data is fetched
      }
    }

    async function fetchCountries() {
      try {
        const countriesResponse = await fetch('/api/countries');
        if (!countriesResponse.ok) throw new Error('Failed to fetch countries');
        const countriesResult = await countriesResponse.json();
        if (countriesResult.success) {
          setAvailableCountries(countriesResult.data || []);
        } else {
          throw new Error(countriesResult.error || 'Could not parse countries data');
        }
      } catch (err) {
        toast.error("Failed to load countries for selection.", { description: (err as Error).message});
      } finally {
        setIsLoadingCountries(false);
      }
    }

    fetchClaimDetails();
    fetchCountries();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof ClaimEditFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof ClaimEditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof ClaimEditFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClaimEditFormData, string>> = {};
    if (!formData.claim_text.trim()) newErrors.claim_text = "Claim text is required.";
    if (!formData.claim_type) newErrors.claim_type = "Claim type is required.";
    if (!formData.country_code) newErrors.country_code = "Country code is required.";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
        toast.error("Cannot save: Claim ID is missing.");
        return;
    }
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    setIsSaving(true);
    
    // API for PUT /api/claims/[id] expects only the editable fields
    // claim_text, claim_type, country_code, description
    const payload = {
        claim_text: formData.claim_text.trim(),
        claim_type: formData.claim_type,
        country_code: formData.country_code,
        description: formData.description ? formData.description.trim() : null,
    };

    try {
      const response = await fetch(`/api/claims/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Claim updated successfully!");
        router.push("/dashboard/claims");
      } else {
        throw new Error(result.error || "Failed to update Claim.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to update Claim:", errorMessage);
      toast.error("Failed to update Claim.", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const isMarketSpecificClaimUsedAsReplacement = formData.country_code !== ALL_COUNTRIES_CODE && linkedOverrides.length > 0;

  if (!id && !isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Page URL</h2>
        <p className="text-muted-foreground mb-4">Claim ID is missing or invalid.</p>
        <Button asChild variant="outline"><Link href="/dashboard/claims"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading claim details...</p>
      </div>
    );
  }

  if (error && !isLoading) { 
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button asChild variant="outline"><Link href="/dashboard/claims"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Breadcrumbs items={breadcrumbItems} />
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Claim Details</CardTitle>
            <CardDescription>
              Edit the core properties of the claim. The claim level and its primary associated entity (Brand, Product, or Ingredient) cannot be changed once created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display Associated Entity Info (Read-Only) */}
            {associatedEntity && associatedEntity.type && (
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <h4 className="font-medium text-sm text-muted-foreground">Associated With:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center">
                        <Label className="w-20 shrink-0">Level:</Label>
                        <span className="text-sm font-medium capitalize">{associatedEntity.type}</span>
                    </div>
                    <div className="flex items-center">
                        <Label className="w-20 shrink-0">Entity:</Label>
                        <span className="text-sm font-medium truncate" title={associatedEntity.name}>{associatedEntity.name}</span>
                    </div>
                </div>
                 <div className="flex items-center text-xs text-muted-foreground pt-1">
                    <Info className="h-3 w-3 mr-1.5" />
                    <span>The claim level and its main associated entity (Brand, Product, or Ingredient) cannot be changed after creation.</span>
                </div>
              </div>
            )}

            {isMarketSpecificClaimUsedAsReplacement && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start">
                <Link2 className="h-5 w-5 text-blue-600 mr-2.5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    This market-specific claim is currently used as a replacement in {linkedOverrides.length} market override(s).
                  </p>
                  <p className="text-xs text-blue-600">
                    Editing its text or type will affect these overrides. The country code cannot be changed while it's linked.
                  </p>
                  {/* Optionally list the overrides or link to them if a UI exists */}
                </div>
              </div>
            )}
             {isLoadingOverrides && (
                <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" />Checking for linked overrides...</div>
            )}

            {/* Claim Text */}
            <div className="space-y-2">
              <Label htmlFor="claim_text">Claim Text <span className="text-red-500">*</span></Label>
              <Textarea id="claim_text" name="claim_text" value={formData.claim_text} onChange={handleInputChange} placeholder="e.g., Clinically proven to boost immunity" rows={3} className={formErrors.claim_text ? "border-red-500" : ""}/>
              {formErrors.claim_text && <p className="text-xs text-red-500 mt-1">{formErrors.claim_text}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Claim Type */}
              <div className="space-y-2">
                <Label htmlFor="claim_type">Claim Type <span className="text-red-500">*</span></Label>
                <Select name="claim_type" value={formData.claim_type} onValueChange={(value) => handleSelectChange('claim_type' as keyof ClaimEditFormData, value)} >
                  <SelectTrigger className={formErrors.claim_type ? "border-red-500" : ""}><SelectValue placeholder="Select claim type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allowed">Allowed</SelectItem>
                    <SelectItem value="disallowed">Disallowed</SelectItem>
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.claim_type && <p className="text-xs text-red-500 mt-1">{formErrors.claim_type}</p>}
              </div>
              
              {/* Country Code */}
              <div className="space-y-2">
                <Label htmlFor="country_code">Country <span className="text-red-500">*</span></Label>
                <Select name="country_code" value={formData.country_code} onValueChange={(value) => handleSelectChange('country_code' as keyof ClaimEditFormData, value)}
                    disabled={isMarketSpecificClaimUsedAsReplacement || isLoadingCountries}
                >
                    <SelectTrigger className={formErrors.country_code ? "border-red-500" : ""}><SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                        <SelectItem value={ALL_COUNTRIES_CODE}>{ALL_COUNTRIES_NAME}</SelectItem>
                        {availableCountries.map(country => (
                            <SelectItem key={country.code} value={country.code}>{country.name} ({country.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {formErrors.country_code && <p className="text-xs text-red-500 mt-1">{formErrors.country_code}</p>}
                {isMarketSpecificClaimUsedAsReplacement && <p className="text-xs text-muted-foreground mt-1">Country code cannot be changed while claim is used as a replacement.</p>}
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Provide additional context or notes for this claim" rows={3}/>
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/claims")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isLoading || isLoadingCountries}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 