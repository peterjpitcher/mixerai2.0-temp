"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, Save, AlertTriangle, Package, Building2, FileText,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Globe, Tag, ShieldCheck, ShieldOff, ShieldAlert, Sprout, Info, Search
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from '@/lib/constants/country-codes';
import { Claim, ClaimTypeEnum, ClaimLevelEnum } from "@/lib/claims-utils"; // Import from claims-utils
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  description: string | null;
  master_brand_id: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductFormData {
  name: string;
  description: string | null;
  master_brand_id: string;
}

interface MasterClaimBrand {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
}

// Icons for claim display
const claimTypeIcons: Record<ClaimTypeEnum, JSX.Element> = {
  allowed: <ShieldCheck className="mr-1.5 h-4 w-4 text-green-500" />,
  disallowed: <ShieldOff className="mr-1.5 h-4 w-4 text-red-500" />,
  mandatory: <ShieldAlert className="mr-1.5 h-4 w-4 text-blue-500" />,
  conditional: <AlertTriangle className="mr-1.5 h-4 w-4 text-yellow-500" />
};

const claimLevelIcons: Record<ClaimLevelEnum, JSX.Element> = {
  brand: <Building2 className="mr-1.5 h-4 w-4 text-purple-500" />,
  product: <Package className="mr-1.5 h-4 w-4 text-orange-500" />,
  ingredient: <Sprout className="mr-1.5 h-4 w-4 text-teal-500" />,
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: null,
    master_brand_id: "",
  });
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  // State for Ingredients Association
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [initialSelectedIngredientIds, setInitialSelectedIngredientIds] = useState<string[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);

  // State for Stacked Claims
  const [selectedCountry, setSelectedCountry] = useState<string>(ALL_COUNTRIES_CODE);
  const [stackedClaims, setStackedClaims] = useState<Claim[]>([]);
  const [isLoadingStackedClaims, setIsLoadingStackedClaims] = useState(false);
  const [stackedClaimsError, setStackedClaimsError] = useState<string | null>(null);

  // Fetch countries from the API
  const [countries, setCountries] = useState<string[]>([]);

  const pageTitle = "Edit Product";
  const pageDescription = `Modifying product: ${formData.name || (id ? `ID: ${id}` : "Loading...")}`;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    // { label: "Admin", href: "/dashboard/admin" }, // Removed Admin step
    { label: "Claims", href: "/dashboard/claims" }, // Parent is now Claims
    { label: "Products", href: "/dashboard/claims/products" }, // Updated path
    { label: `Edit: ${formData.name || (id || 'Product')}` }
  ];

  useEffect(() => {
    if (!id) {
      setError("Invalid Product ID provided.");
      setIsLoadingProduct(false);
      setIsLoadingBrands(false);
      setIsLoadingIngredients(false);
      toast.error("Invalid Product ID", { description: "The Product ID in the URL is missing or invalid." });
      return;
    }

    async function fetchProductRelatedData() {
      setIsLoadingProduct(true);
      setIsLoadingBrands(true);
      setIsLoadingIngredients(true);
      setError(null);
      try {
        const productResponse = await fetch(`/api/products/${id}`);
        if (!productResponse.ok) {
          const errorData = await productResponse.json().catch(() => ({}));
          if (productResponse.status === 404) throw new Error("Product not found.");
          throw new Error(errorData.error || "Failed to fetch product details.");
        }
        const productResult = await productResponse.json();
        if (productResult.success && productResult.data) {
          const product: Product = productResult.data;
          setFormData({
            name: product.name,
            description: product.description,
            master_brand_id: product.master_brand_id,
          });
        } else {
          throw new Error(productResult.error || "Failed to parse product details.");
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "Product loading error.";
        console.error("Error fetching product details:", errorMessage);
        setError(prevError => prevError ? `${prevError}\n${errorMessage}` : errorMessage);
        toast.error("Failed to load product details.", { description: errorMessage });
      } finally {
        setIsLoadingProduct(false);
      }

      try {
        const brandsResponse = await fetch('/api/master-claim-brands');
        if (!brandsResponse.ok) {
          const errorData = await brandsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch master claim brands for selection.');
        }
        const brandsResult = await brandsResponse.json();
        if (brandsResult.success && Array.isArray(brandsResult.data)) {
          setMasterBrands(brandsResult.data);
        } else {
          throw new Error(brandsResult.error || 'Failed to parse master claim brands for selection.');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "Brands loading error.";
        console.error("Error fetching master brands:", errorMessage);
        if (!error) { 
            toast.error("Failed to load Master Claim Brands for selection.", { description: errorMessage });
        }
        setMasterBrands([]);
      } finally {
        setIsLoadingBrands(false);
      }

      // Fetch All Ingredients
      try {
        const ingredientsResponse = await fetch('/api/ingredients');
        if (!ingredientsResponse.ok) {
          const errorData = await ingredientsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch ingredients.');
        }
        const ingredientsResult = await ingredientsResponse.json();
        if (ingredientsResult.success && Array.isArray(ingredientsResult.data)) {
          setAllIngredients(ingredientsResult.data);
        } else {
          throw new Error(ingredientsResult.error || 'Failed to parse ingredients list.');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || 'Ingredients loading error.';
        console.error('Error fetching all ingredients:', errorMessage);
        setError(prevError => prevError ? `${prevError}\n${errorMessage}` : errorMessage);
        setAllIngredients([]);
      } finally {
        setIsLoadingIngredients(false);
      }

      // Fetch Associated Ingredients for this Product
      if (id) {
        try {
          const associatedIngredientsResponse = await fetch(`/api/products/${id}/ingredients`);
          if (!associatedIngredientsResponse.ok) {
            const errorData = await associatedIngredientsResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch associated ingredients.');
          }
          const associatedIngredientsResult = await associatedIngredientsResponse.json();
          if (associatedIngredientsResult.success && Array.isArray(associatedIngredientsResult.data)) {
            const currentIngredientIds = associatedIngredientsResult.data.map((ing: Ingredient) => ing.id);
            setSelectedIngredientIds(currentIngredientIds);
            setInitialSelectedIngredientIds(currentIngredientIds);
          } else {
            throw new Error(associatedIngredientsResult.error || 'Failed to parse associated ingredients.');
          }
        } catch (err) {
          const errorMessage = (err as Error).message || 'Associated ingredients loading error.';
          console.error('Error fetching associated ingredients:', errorMessage);
          setError(prevError => prevError ? `${prevError}\n${errorMessage}` : errorMessage);
          setSelectedIngredientIds([]);
          setInitialSelectedIngredientIds([]);
        }
      }
    }

    fetchProductRelatedData();
  }, [id, error]);

  // Effect for fetching stacked claims
  useEffect(() => {
    if (!id || !selectedCountry) {
      setStackedClaims([]);
      return;
    }

    async function fetchStackedClaims() {
      setIsLoadingStackedClaims(true);
      setStackedClaimsError(null);
      try {
        const response = await fetch(`/api/products/${id}/stacked-claims?countryCode=${selectedCountry}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch stacked claims.");
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setStackedClaims(result.data);
        } else {
          throw new Error(result.error || "Failed to parse stacked claims data.");
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "An unexpected error occurred while fetching stacked claims.";
        console.error("Error fetching stacked claims:", errorMessage);
        setStackedClaimsError(errorMessage);
        setStackedClaims([]);
        toast.error("Failed to load stacked claims.", { description: errorMessage });
      } finally {
        setIsLoadingStackedClaims(false);
      }
    }

    fetchStackedClaims();
  }, [id, selectedCountry]);

  // Fetch countries from the API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries');
        const data = await response.json();
        if (data.success) {
          setCountries(data.countries);
        } else {
          console.error('Failed to fetch countries:', data.error);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };
    fetchCountries();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof ProductFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, master_brand_id: value }));
    if (formErrors.master_brand_id) {
      setFormErrors(prev => ({ ...prev, master_brand_id: undefined }));
    }
  };

  const handleIngredientSelectionChange = (ingredientId: string) => {
    setSelectedIngredientIds(prevSelectedIds =>
      prevSelectedIds.includes(ingredientId)
        ? prevSelectedIds.filter(id => id !== ingredientId)
        : [...prevSelectedIds, ingredientId]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required.";
    if (!formData.master_brand_id) newErrors.master_brand_id = "Master Claim Brand is required.";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
        toast.error("Cannot save: Product ID is missing.");
        return;
    }
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Update Product Details
      const productUpdateResponse = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), 
      });
      const productUpdateResult = await productUpdateResponse.json();
      if (!productUpdateResponse.ok || !productUpdateResult.success) {
        throw new Error(productUpdateResult.error || 'Failed to update Product details.');
      }
      toast.success("Product details updated successfully!");

      // 2. Update Ingredient Associations
      const ingredientsToAdd = selectedIngredientIds.filter(ingId => !initialSelectedIngredientIds.includes(ingId));
      const ingredientsToRemove = initialSelectedIngredientIds.filter(ingId => !selectedIngredientIds.includes(ingId));

      const addPromises = ingredientsToAdd.map(ingredientId => 
        fetch('/api/product-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: id, ingredient_id: ingredientId }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Failed to associate ingredient ${ingredientId}: ${err.error || res.statusText}`);
          }
          return res.json();
        })
      );

      const removePromises = ingredientsToRemove.map(ingredientId =>
        fetch('/api/product-ingredients', { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: id, ingredient_id: ingredientId }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Failed to disassociate ingredient ${ingredientId}: ${err.error || res.statusText}`);
          }
          return res.json();
        })
      );
      
      await Promise.all([...addPromises, ...removePromises]);
      
      if (ingredientsToAdd.length > 0 || ingredientsToRemove.length > 0) {
        toast.success("Ingredient associations updated successfully!");
      }
      
      setInitialSelectedIngredientIds([...selectedIngredientIds]);

      router.push("/dashboard/claims/products");
    } catch (err) {
      const errorMessage = (err as Error).message || "An unexpected error occurred.";
      console.error("Failed to update Product:", errorMessage);
      toast.error("Failed to update Product.", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };
  
  const overallIsLoading = isLoadingProduct || isLoadingBrands || isLoadingIngredients;

  if (!id && !overallIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Page URL</h2>
        <p className="text-muted-foreground mb-4">Product ID is missing or invalid.</p>
        <Button asChild variant="outline"><Link href="/dashboard/claims/products"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button> {/* Updated back link */}
      </div>
    );
  }

  if (overallIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (error && !overallIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button asChild variant="outline"><Link href="/dashboard/claims/products"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button> {/* Updated back link */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Edit the details for this product. The Master Claim Brand association cannot be changed after creation via this form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Product Name <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9">
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Super Immune Booster Capsules" maxLength={255} className={formErrors.name ? "border-red-500" : ""} disabled={overallIsLoading || isSaving} />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="master_brand_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Master Claim Brand <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9">
                <Select value={formData.master_brand_id} onValueChange={handleSelectChange} disabled={isLoadingBrands || isSaving}>
                  <SelectTrigger className={formErrors.master_brand_id ? "border-red-500" : ""}>
                    <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select Master Claim Brand"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {isLoadingBrands ? (
                      <SelectItem value="loading" disabled>Loading brands...</SelectItem>
                    ) : masterBrands.length > 0 ? (
                      masterBrands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}><span className="truncate">{brand.name}</span></SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>No brands available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.master_brand_id && <p className="text-xs text-red-500 mt-1">{formErrors.master_brand_id}</p>}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="description" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Description (Optional)</Label>
              <div className="col-span-12 sm:col-span-9">
                <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Provide a brief description of the product..." rows={4} maxLength={1000} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/claims/products")}> {/* Updated cancel redirect */}
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || overallIsLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Associated Ingredients Section */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Ingredients</CardTitle>
          <CardDescription>
            Tag the ingredients that are part of this product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingIngredients ? (
            <div className="flex items-center"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading ingredients...</div>
          ) : allIngredients.length > 0 ? (
            <ScrollArea className="h-72 w-full rounded-md border p-4">
              <div className="space-y-2">
                {allIngredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ingredient-${ingredient.id}`}
                      checked={selectedIngredientIds.includes(ingredient.id)}
                      onCheckedChange={() => handleIngredientSelectionChange(ingredient.id)}
                      disabled={isSaving || isLoadingIngredients}
                    />
                    <Label 
                      htmlFor={`ingredient-${ingredient.id}`}
                      className="font-normal cursor-pointer"
                    >
                      {ingredient.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No ingredients available to associate. You can add ingredients from the &apos;Ingredients&apos; section.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stacked Claims Section */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stacked Claims Viewer</CardTitle>
            <CardDescription>View applicable claims for this product in a selected country.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stacked_claims_country_code">Country for Claims</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue placeholder="Select Country to View Claims" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={ALL_COUNTRIES_CODE}><span className="truncate">{ALL_COUNTRIES_NAME} (Effective Total)</span></SelectItem>
                  {Array.isArray(countries) ? countries.map((country: unknown) => {
                    const countryCode = typeof country === 'object' && country !== null && (country as { code?: string }).code ? (country as { code: string }).code : typeof country === 'string' ? country : 'unknown';
                    const countryName = typeof country === 'object' && country !== null && (country as { name?: string }).name ? (country as { name: string }).name : typeof country === 'string' ? country : 'Unknown Country';
                    return (
                      <SelectItem key={countryCode} value={countryCode}>
                        <span className="truncate">{countryName}</span>
                      </SelectItem>
                    );
                  }) : <SelectItem value="loading-countries" disabled>Loading countries...</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {isLoadingStackedClaims && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading claims...</p>
              </div>
            )}

            {!isLoadingStackedClaims && stackedClaimsError && (
              <div className="text-red-600 bg-red-50 p-3 rounded-md text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                  <strong>Error loading claims:</strong>
                </div>
                <p className="ml-7 text-xs">{stackedClaimsError}</p>
              </div>
            )}

            {!isLoadingStackedClaims && !stackedClaimsError && stackedClaims.length === 0 && (
              <div className="text-center text-muted-foreground py-6">
                <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
                <p>No stacked claims found for the selected country.</p>
              </div>
            )}

            {!isLoadingStackedClaims && !stackedClaimsError && stackedClaims.length > 0 && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {stackedClaims.map((claim) => (
                  <div key={claim.id} className="p-3 border rounded-md bg-background shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm leading-snug">{claim.claim_text}</p>
                    {claim.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{claim.description}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs">
                      <Badge variant="outline" className="flex items-center text-muted-foreground">
                        {claimTypeIcons[claim.claim_type]} {claim.claim_type}
                      </Badge>
                      <Badge variant="outline" className="flex items-center text-muted-foreground">
                        {claimLevelIcons[claim.level]} {claim.level}
                      </Badge>
                      <Badge variant="outline" className="flex items-center text-muted-foreground">
                        <Globe className="mr-1.5 h-3.5 w-3.5" /> 
                        {claim.country_code === ALL_COUNTRIES_CODE ? ALL_COUNTRIES_NAME : claim.country_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Claims are stacked: Product &gt; Ingredient &gt; Brand. Specific country claims override Global.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 