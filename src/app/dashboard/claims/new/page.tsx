"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, FileText, Building2, Package, Sprout, Globe, Info } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";

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
}

interface MasterClaimBrand { id: string; name: string; }
interface Product { id: string; name: string; master_brand_id?: string; master_brand_name?: string; }
interface Ingredient { id: string; name: string; }
interface CountryOption { code: string; name: string; }

const initialFormData: ClaimFormData = {
  claim_text: "",
  claim_type: "",
  level: "",
  master_brand_id: null,
  product_id: null,
  ingredient_id: null,
  country_code: "", // Default to empty, user must select
  description: null,
};

export default function NewClaimPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ClaimFormData>(initialFormData);
  
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);

  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [errors, setErrors] = useState<Partial<Record<keyof ClaimFormData, string>>>({});

  // Fetch related entities for dropdowns
  useEffect(() => {
    async function fetchEntitiesForSelect() {
      setIsLoadingBrands(true);
      setIsLoadingProducts(true);
      setIsLoadingIngredients(true);
      setIsLoadingCountries(true);
      try {
        const [brandsRes, productsRes, ingredientsRes, countriesRes] = await Promise.allSettled([
          fetch('/api/master-claim-brands').then(res => res.json()),
          fetch('/api/products').then(res => res.json()),
          fetch('/api/ingredients').then(res => res.json()),
          fetch('/api/countries').then(res => res.json()),
        ]);

        if (brandsRes.status === 'fulfilled' && brandsRes.value.success) setMasterBrands(brandsRes.value.data || []);
        else console.error("Failed to load master brands:", brandsRes.status === 'rejected' ? brandsRes.reason : brandsRes.value.error);
        
        if (productsRes.status === 'fulfilled' && productsRes.value.success) setProducts(productsRes.value.data || []);
        else console.error("Failed to load products:", productsRes.status === 'rejected' ? productsRes.reason : productsRes.value.error);

        if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.success) setIngredients(ingredientsRes.value.data || []);
        else console.error("Failed to load ingredients:", ingredientsRes.status === 'rejected' ? ingredientsRes.reason : ingredientsRes.value.error);
        
        if (countriesRes.status === 'fulfilled' && countriesRes.value.success) setAvailableCountries(countriesRes.value.data || []);
        else console.error("Failed to load countries:", countriesRes.status === 'rejected' ? countriesRes.reason : countriesRes.value.error);

      } catch (error) {
        toast.error("Failed to load some selection data. Please refresh.");
        console.error("Error fetching entities for claim form:", error);
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingProducts(false);
        setIsLoadingIngredients(false);
        setIsLoadingCountries(false);
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

    const payload: any = {
      claim_text: formData.claim_text.trim(),
      claim_type: formData.claim_type,
      level: formData.level,
      country_codes: [formData.country_code], // API expects an array
      description: formData.description ? formData.description.trim() : null,
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
            <div className="space-y-2">
              <Label htmlFor="claim_text">Claim Text <span className="text-red-500">*</span></Label>
              <Textarea id="claim_text" name="claim_text" value={formData.claim_text} onChange={handleInputChange} placeholder="e.g., Clinically proven to boost immunity" rows={3} className={errors.claim_text ? "border-red-500" : ""}/>
              {errors.claim_text && <p className="text-xs text-red-500 mt-1">{errors.claim_text}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Claim Type */}
              <div className="space-y-2">
                <Label htmlFor="claim_type">Claim Type <span className="text-red-500">*</span></Label>
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

              {/* Claim Level */}
              <div className="space-y-2">
                <Label htmlFor="level">Claim Level <span className="text-red-500">*</span></Label>
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
              
              {/* Country Code */}
              <div className="space-y-2">
                <Label htmlFor="country_code">Country <span className="text-red-500">*</span></Label>
                <Select name="country_code" value={formData.country_code} onValueChange={(value) => handleSelectChange('country_code', value)} disabled={isLoadingCountries}>
                    <SelectTrigger className={errors.country_code ? "border-red-500" : ""}><SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                        <SelectItem value={ALL_COUNTRIES_CODE}>{ALL_COUNTRIES_NAME}</SelectItem>
                        {availableCountries.map(country => (
                            <SelectItem key={country.code} value={country.code}>{country.name} ({country.code})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.country_code && <p className="text-xs text-red-500 mt-1">{errors.country_code}</p>}
              </div>
            </div>

            {/* Dynamic Entity Selector based on Level */} 
            {formData.level === 'brand' && (
              <div className="space-y-2">
                <Label htmlFor="master_brand_id">Master Claim Brand <span className="text-red-500">*</span></Label>
                <Select name="master_brand_id" value={formData.master_brand_id || ""} onValueChange={(value) => handleSelectChange('master_brand_id', value)} disabled={isLoadingBrands}>
                  <SelectTrigger className={errors.master_brand_id ? "border-red-500" : ""}><SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select Master Brand"} /></SelectTrigger>
                  <SelectContent>
                    {masterBrands.length === 0 && !isLoadingBrands ? <SelectItem value="" disabled>No brands available</SelectItem> : 
                     masterBrands.map(brand => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.master_brand_id && <p className="text-xs text-red-500 mt-1">{errors.master_brand_id}</p>}
              </div>
            )}
            {formData.level === 'product' && (
              <div className="space-y-2">
                <Label htmlFor="product_id">Product <span className="text-red-500">*</span></Label>
                <Select name="product_id" value={formData.product_id || ""} onValueChange={(value) => handleSelectChange('product_id', value)} disabled={isLoadingProducts}>
                  <SelectTrigger className={errors.product_id ? "border-red-500" : ""}><SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select Product"} /></SelectTrigger>
                  <SelectContent>
                    {products.length === 0 && !isLoadingProducts ? <SelectItem value="" disabled>No products available</SelectItem> : 
                     products.map(product => <SelectItem key={product.id} value={product.id}>{product.name} {product.master_brand_name ? `(${product.master_brand_name})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.product_id && <p className="text-xs text-red-500 mt-1">{errors.product_id}</p>}
              </div>
            )}
            {formData.level === 'ingredient' && (
              <div className="space-y-2">
                <Label htmlFor="ingredient_id">Ingredient <span className="text-red-500">*</span></Label>
                <Select name="ingredient_id" value={formData.ingredient_id || ""} onValueChange={(value) => handleSelectChange('ingredient_id', value)} disabled={isLoadingIngredients}>
                  <SelectTrigger className={errors.ingredient_id ? "border-red-500" : ""}><SelectValue placeholder={isLoadingIngredients ? "Loading ingredients..." : "Select Ingredient"} /></SelectTrigger>
                  <SelectContent>
                    {ingredients.length === 0 && !isLoadingIngredients ? <SelectItem value="" disabled>No ingredients available</SelectItem> : 
                    ingredients.map(ing => <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.ingredient_id && <p className="text-xs text-red-500 mt-1">{errors.ingredient_id}</p>}
              </div>
            )}

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Provide additional context or notes for this claim" rows={3}/>
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