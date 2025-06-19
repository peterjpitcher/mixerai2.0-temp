"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save,  } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";
import { BrandIcon } from "@/components/brand-icon";

// Types
type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface ClaimFormData {
  claim_text: string;
  claim_type: ClaimTypeEnum | ""; // Allow empty initial state
  level: ClaimLevelEnum | ""; // Allow empty initial state
  master_brand_id: string | null;
  product_id: string | null;
  ingredient_id: string | null;
  country_code: string; // Single country code for now
  description: string | null;
  workflow_id: string | null; // Added for workflow support
}

interface MasterClaimBrand { id: string; name: string; brand_color?: string | null; logo_url?: string | null; }
interface Product { id: string; name: string; master_brand_id?: string; master_brand_name?: string; }
interface Ingredient { id: string; name: string; }
interface CountryOption { code: string; name: string; }
interface Workflow { id: string; name: string; brand_id: string; brand_name?: string; }

const initialFormData: ClaimFormData = {
  claim_text: "",
  claim_type: "",
  level: "",
  master_brand_id: null,
  product_id: null,
  ingredient_id: null,
  country_code: "", // Default to empty, user must select
  description: null,
  workflow_id: null, // Default to null - optional
};

export default function NewClaimPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ClaimFormData>(initialFormData);
  
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [errors, setErrors] = useState<Partial<Record<keyof ClaimFormData, string>>>({});

  // Fetch related entities for dropdowns
  useEffect(() => {
    async function fetchEntitiesForSelect() {
      setIsLoadingBrands(true);
      setIsLoadingProducts(true);
      setIsLoadingIngredients(true);
      setIsLoadingCountries(true);
      setIsLoadingWorkflows(true);
      try {
        const [brandsRes, productsRes, ingredientsRes, countriesRes, workflowsRes] = await Promise.allSettled([
          fetch('/api/master-claim-brands').then(res => res.json()),
          fetch('/api/products').then(res => res.json()),
          fetch('/api/ingredients').then(res => res.json()),
          fetch('/api/countries').then(res => res.json()),
          fetch('/api/claims/workflows').then(res => res.json()),
        ]);

        if (brandsRes.status === 'fulfilled' && brandsRes.value.success) setMasterBrands(brandsRes.value.data || []);
        else console.error("Failed to load master brands:", brandsRes.status === 'rejected' ? brandsRes.reason : brandsRes.value.error);
        
        if (productsRes.status === 'fulfilled' && productsRes.value.success) setProducts(productsRes.value.data || []);
        else console.error("Failed to load products:", productsRes.status === 'rejected' ? productsRes.reason : productsRes.value.error);

        if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.success) setIngredients(ingredientsRes.value.data || []);
        else console.error("Failed to load ingredients:", ingredientsRes.status === 'rejected' ? ingredientsRes.reason : ingredientsRes.value.error);
        
        if (countriesRes.status === 'fulfilled' && countriesRes.value.success) setAvailableCountries(countriesRes.value.data || []);
        else console.error("Failed to load countries:", countriesRes.status === 'rejected' ? countriesRes.reason : countriesRes.value.error);

        if (workflowsRes.status === 'fulfilled' && workflowsRes.value.success) setWorkflows(workflowsRes.value.data || []);
        else console.error("Failed to load workflows:", workflowsRes.status === 'rejected' ? workflowsRes.reason : workflowsRes.value.error);

      } catch (error) {
        toast.error("Failed to load some selection data. Please refresh.");
        console.error("Error fetching entities for claim form:", error);
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingProducts(false);
        setIsLoadingIngredients(false);
        setIsLoadingCountries(false);
        setIsLoadingWorkflows(false);
      }
    }
    fetchEntitiesForSelect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ClaimFormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (name: keyof ClaimFormData, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      // Reset related IDs when level changes
      if (name === 'level') {
        newState.master_brand_id = null;
        newState.product_id = null;
        newState.ingredient_id = null;
      }
      return newState;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClaimFormData, string>> = {};
    if (!formData.claim_text.trim()) newErrors.claim_text = "Claim text is required.";
    if (!formData.claim_type) newErrors.claim_type = "Claim type is required.";
    if (!formData.level) newErrors.level = "Claim level is required.";
    if (!formData.country_code) newErrors.country_code = "Country code is required.";

    if (formData.level === 'brand' && !formData.master_brand_id) newErrors.master_brand_id = "Master Brand is required for brand-level claims.";
    if (formData.level === 'product' && !formData.product_id) newErrors.product_id = "Product is required for product-level claims.";
    if (formData.level === 'ingredient' && !formData.ingredient_id) newErrors.ingredient_id = "Ingredient is required for ingredient-level claims.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    setIsSaving(true);

    const payload: Record<string, unknown> = {
      claim_text: formData.claim_text.trim(),
      claim_type: formData.claim_type,
      level: formData.level,
      country_codes: [formData.country_code], // API expects an array
      description: formData.description ? formData.description.trim() : null,
      workflow_id: formData.workflow_id, // Add workflow support
    };

    if (formData.level === 'brand') payload.master_brand_id = formData.master_brand_id;
    if (formData.level === 'product') payload.product_ids = [formData.product_id]; // API expects array for product_ids
    if (formData.level === 'ingredient') payload.ingredient_id = formData.ingredient_id;

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Claim created successfully!");
        router.push("/dashboard/claims");
      } else {
        throw new Error(result.error || "Failed to create Claim.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to create Claim:", errorMessage);
      toast.error("Failed to create Claim.", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isEntityLoading = isLoadingBrands || isLoadingProducts || isLoadingIngredients;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/claims"><ArrowLeft className="mr-2 h-4 w-4" />Back to Claims</Link>
        </Button>
      </div>
      <PageHeader title="Add New Claim" description="Define a new claim and its associations."/>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Claim Details</CardTitle>
            <CardDescription>Fill in the information for the new claim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Claim Text */}
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="claim_text" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Claim Text <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9">
                <Textarea id="claim_text" name="claim_text" value={formData.claim_text} onChange={handleInputChange} placeholder="e.g., Clinically proven to boost immunity" rows={3} className={errors.claim_text ? "border-red-500" : ""}/>
                {errors.claim_text && <p className="text-xs text-red-500 mt-1">{errors.claim_text}</p>}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="claim_type" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Claim Type <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Select name="claim_type" value={formData.claim_type} onValueChange={(value) => handleSelectChange('claim_type', value)} >
                    <SelectTrigger className={errors.claim_type ? "border-red-500" : ""}><SelectValue placeholder="Select claim type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allowed">Allowed</SelectItem>
                      <SelectItem value="disallowed">Disallowed</SelectItem>
                      <SelectItem value="mandatory">Mandatory</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.claim_type && <p className="text-xs text-red-500 mt-1">{errors.claim_type}</p>}
                </div>

                <div>
                  <Select name="level" value={formData.level} onValueChange={(value) => handleSelectChange('level', value)}>
                    <SelectTrigger className={errors.level ? "border-red-500" : ""}><SelectValue placeholder="Select claim level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="ingredient">Ingredient</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.level && <p className="text-xs text-red-500 mt-1">{errors.level}</p>}
                </div>
                
                <div>
                  <Select name="country_code" value={formData.country_code} onValueChange={(value) => handleSelectChange('country_code', value)} disabled={isLoadingCountries}>
                      <SelectTrigger className={errors.country_code ? "border-red-500" : ""}><SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} /></SelectTrigger>
                      <SelectContent className="max-h-60">
                          <SelectItem value={ALL_COUNTRIES_CODE}><span className="truncate">{ALL_COUNTRIES_NAME}</span></SelectItem>
                          {availableCountries.map(country => (
                              <SelectItem key={country.code} value={country.code}><span className="truncate">{country.name} ({country.code})</span></SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {errors.country_code && <p className="text-xs text-red-500 mt-1">{errors.country_code}</p>}
                </div>
              </div>
            </div>

            {/* Dynamic Entity Selector based on Level */} 
            {formData.level === 'brand' && (
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="master_brand_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Master Claim Brand <span className="text-red-500">*</span></Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select name="master_brand_id" value={formData.master_brand_id || ""} onValueChange={(value) => handleSelectChange('master_brand_id', value)} disabled={isLoadingBrands}>
                    <SelectTrigger className={errors.master_brand_id ? "border-red-500" : ""}>
                      <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select master brand"}>
                        {formData.master_brand_id && (() => {
                          const selectedBrand = masterBrands.find(b => b.id === formData.master_brand_id);
                          return selectedBrand ? (
                            <div className="flex items-center gap-2">
                              <BrandIcon 
                                name={selectedBrand.name} 
                                color={selectedBrand.brand_color || undefined}
                                logoUrl={selectedBrand.logo_url || undefined}
                                size="sm"
                              />
                              <span>{selectedBrand.name}</span>
                            </div>
                          ) : null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {masterBrands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          <div className="flex items-center gap-2">
                            <BrandIcon 
                              name={brand.name} 
                              color={brand.brand_color || undefined}
                              logoUrl={brand.logo_url || undefined}
                              size="sm"
                            />
                            <span className="truncate">{brand.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.master_brand_id && <p className="text-xs text-red-500 mt-1">{errors.master_brand_id}</p>}
                </div>
              </div>
            )}
            {formData.level === 'product' && (
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="product_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Product <span className="text-red-500">*</span></Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select name="product_id" value={formData.product_id || ""} onValueChange={(value) => handleSelectChange('product_id', value)} disabled={isLoadingProducts}>
                    <SelectTrigger className={errors.product_id ? "border-red-500" : ""}>
                      <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select product"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}><span className="truncate">{product.name} {product.master_brand_name ? `(${product.master_brand_name})` : ""}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
                </div>
              </div>
            )}
            {formData.level === 'ingredient' && (
              <div className="grid grid-cols-12 gap-4">
                <Label htmlFor="ingredient_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Ingredient <span className="text-red-500">*</span></Label>
                <div className="col-span-12 sm:col-span-9">
                  <Select name="ingredient_id" value={formData.ingredient_id || ""} onValueChange={(value) => handleSelectChange('ingredient_id', value)} disabled={isLoadingIngredients}>
                    <SelectTrigger className={errors.ingredient_id ? "border-red-500" : ""}>
                      <SelectValue placeholder={isLoadingIngredients ? "Loading ingredients..." : "Select ingredient"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {ingredients.map(ingredient => (
                        <SelectItem key={ingredient.id} value={ingredient.id}><span className="truncate">{ingredient.name}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.ingredient_id && <p className="text-xs text-red-500 mt-1">{errors.ingredient_id}</p>}
                </div>
              </div>
            )}

            {/* Description (Optional) */}
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="description" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Description (Optional)</Label>
              <div className="col-span-12 sm:col-span-9">
                <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Provide additional context or notes for this claim" rows={3}/>
              </div>
            </div>

            {/* Workflow (Optional) */}
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="workflow_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Approval Workflow (Optional)</Label>
              <div className="col-span-12 sm:col-span-9">
                <Select name="workflow_id" value={formData.workflow_id || ""} onValueChange={(value) => handleSelectChange('workflow_id', value)} disabled={isLoadingWorkflows}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingWorkflows ? "Loading workflows..." : "Select workflow (optional)"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">No workflow</SelectItem>
                    {workflows.map(workflow => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        <span className="truncate">{workflow.name} {workflow.brand_name ? `(${workflow.brand_name})` : ""}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a workflow if this claim requires approval before use.
                  {workflows.length === 0 && !isLoadingWorkflows && (
                    <> <Link href="/dashboard/claims/workflows/new" className="text-primary hover:underline">Create a claims workflow</Link> to enable approval processes.</>
                  )}
                </p>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving || isEntityLoading}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Claim</>}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 