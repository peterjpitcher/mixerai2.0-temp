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
  Globe, Tag, ShieldCheck, ShieldOff, ShieldAlert, Sprout, Info, Search
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { COUNTRY_CODES, GLOBAL_COUNTRY_CODE, GLOBAL_COUNTRY_NAME } from "@/lib/constants/country-codes";
import { Claim, ClaimTypeEnum, ClaimLevelEnum } from "@/lib/claims-utils"; // Import from claims-utils
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  global_brand_id: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductFormData {
  name: string;
  description: string | null;
  global_brand_id: string;
}

interface GlobalClaimBrand {
  id: string;
  name: string;
}

// Icons for claim display
const claimTypeIcons: Record<ClaimTypeEnum, JSX.Element> = {
  allowed: <ShieldCheck className="mr-1.5 h-4 w-4 text-green-500" />,
  disallowed: <ShieldOff className="mr-1.5 h-4 w-4 text-red-500" />,
  mandatory: <ShieldAlert className="mr-1.5 h-4 w-4 text-blue-500" />,
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
    global_brand_id: "",
  });
  const [globalBrands, setGlobalBrands] = useState<GlobalClaimBrand[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  // State for Stacked Claims
  const [selectedCountry, setSelectedCountry] = useState<string>(GLOBAL_COUNTRY_CODE);
  const [stackedClaims, setStackedClaims] = useState<Claim[]>([]);
  const [isLoadingStackedClaims, setIsLoadingStackedClaims] = useState(false);
  const [stackedClaimsError, setStackedClaimsError] = useState<string | null>(null);

  const pageTitle = "Edit Product";
  const pageDescription = `Modifying product: ${formData.name || (id ? `ID: ${id}` : "Loading...")}`;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Admin", href: "/dashboard/admin" },
    { label: "Products", href: "/dashboard/admin/products" },
    { label: `Edit: ${formData.name || (id || 'Product')}` }
  ];

  useEffect(() => {
    if (!id) {
      setError("Invalid Product ID provided.");
      setIsLoadingProduct(false);
      setIsLoadingBrands(false);
      toast.error("Invalid Product ID", { description: "The Product ID in the URL is missing or invalid." });
      return;
    }

    async function fetchProductAndBrands() {
      setIsLoadingProduct(true);
      setIsLoadingBrands(true);
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
            global_brand_id: product.global_brand_id,
          });
        } else {
          throw new Error(productResult.error || "Failed to parse product details.");
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "Product loading error.";
        console.error("Error fetching product details:", errorMessage);
        setError(prevError => prevError ? `${prevError}\\n${errorMessage}` : errorMessage);
        toast.error("Failed to load product details.", { description: errorMessage });
      } finally {
        setIsLoadingProduct(false);
      }

      try {
        const brandsResponse = await fetch('/api/global-claim-brands');
        if (!brandsResponse.ok) {
          const errorData = await brandsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch global claim brands for selection.');
        }
        const brandsResult = await brandsResponse.json();
        if (brandsResult.success && Array.isArray(brandsResult.data)) {
          setGlobalBrands(brandsResult.data);
        } else {
          throw new Error(brandsResult.error || 'Failed to parse global claim brands for selection.');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "Brands loading error.";
        console.error("Error fetching global brands:", errorMessage);
        if (!error) { 
            toast.error("Failed to load Global Claim Brands for selection.", { description: errorMessage });
        }
        setGlobalBrands([]);
      } finally {
        setIsLoadingBrands(false);
      }
    }

    fetchProductAndBrands();
  }, [id]); // Removed router from dependencies as it's not used here

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof ProductFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, global_brand_id: value }));
    if (formErrors.global_brand_id) {
      setFormErrors(prev => ({ ...prev, global_brand_id: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required.";
    if (!formData.global_brand_id) newErrors.global_brand_id = "Global Claim Brand is required.";
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
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), // Send only ProductFormData
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Product updated successfully!");
        router.push("/dashboard/admin/products");
      } else {
        throw new Error(result.error || "Failed to update Product.");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || "An unexpected error occurred.";
      console.error("Failed to update Product:", errorMessage);
      toast.error("Failed to update Product.", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };
  
  const overallIsLoading = isLoadingProduct || isLoadingBrands;

  if (!id && !overallIsLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Page URL</h2>
        <p className="text-muted-foreground mb-4">Product ID is missing or invalid.</p>
        <Button asChild variant="outline"><Link href="/dashboard/admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
      </div>
    );
  }

  if (overallIsLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (error && !overallIsLoading) { 
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button asChild variant="outline"><Link href="/dashboard/admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
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
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Edit the details for this product. The Global Claim Brand association cannot be changed after creation via this form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Super Immune Booster Capsules" maxLength={255} className={formErrors.name ? "border-red-500" : ""} />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="global_brand_id">Global Claim Brand <span className="text-red-500">*</span></Label>
              <Select value={formData.global_brand_id} onValueChange={handleSelectChange} disabled={isLoadingBrands}>
                <SelectTrigger className={formErrors.global_brand_id ? "border-red-500" : ""}>
                  <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select a Global Claim Brand"} />
                </SelectTrigger>
                <SelectContent>
                  {globalBrands.length === 0 && !isLoadingBrands ? (
                    <SelectItem value="" disabled>No brands available</SelectItem>
                  ) : (
                    globalBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formErrors.global_brand_id && <p className="text-xs text-red-500 mt-1">{formErrors.global_brand_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Provide a brief description of the product..." rows={4} maxLength={1000} />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex justify-end gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/admin/products")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || overallIsLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

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
                <SelectTrigger id="stacked_claims_country_code">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value={GLOBAL_COUNTRY_CODE}>{GLOBAL_COUNTRY_NAME} ({GLOBAL_COUNTRY_CODE})</SelectItem>
                  {COUNTRY_CODES.map(country => (
                    <SelectItem key={country.code} value={country.code}>{country.name} ({country.code})</SelectItem>
                  ))}
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
                        {claim.country_code === GLOBAL_COUNTRY_CODE ? GLOBAL_COUNTRY_NAME : claim.country_code}
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

 