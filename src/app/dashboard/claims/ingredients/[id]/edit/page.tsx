"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, AlertTriangle,  } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from '@/lib/api-client';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

interface IngredientFormData {
  name: string;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
}

export default function EditIngredientPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;

  const [formData, setFormData] = useState<IngredientFormData>({
    name: "",
    description: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof IngredientFormData, string>>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [initialSelectedProductIds, setInitialSelectedProductIds] = useState<string[]>([]);
  
  const pageTitle = "Edit Ingredient";
  const pageDescription = `Modifying ingredient: ${formData.name || (id ? `ID: ${id}` : "Loading...")}`;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Claims", href: "/dashboard/claims" }, 
    { label: "Ingredients", href: "/dashboard/claims/ingredients" }, 
    { label: `Edit: ${formData.name || (id || 'Ingredient')}` }
  ];


  useEffect(() => {
    if (!id) {
      setError("Invalid Ingredient ID provided.");
      setIsLoading(false);
      toast.error("Invalid Ingredient ID", { description: "The Ingredient ID in the URL is missing or invalid." });
      return;
    }
    setIsLoading(true);
    async function fetchIngredientAndProducts() {
      try {
        const ingredientResponse = await fetch(`/api/ingredients/${id}`);
        if (!ingredientResponse.ok) {
          const errorData = await ingredientResponse.json().catch(() => ({}));
          if (ingredientResponse.status === 404) {
            throw new Error("Ingredient not found.");
          } 
          throw new Error(errorData.error || "Failed to fetch ingredient details.");
        }
        const ingredientResult = await ingredientResponse.json();
        if (ingredientResult.success && ingredientResult.data) {
          const ingredient: Ingredient = ingredientResult.data;
          setFormData({
            name: ingredient.name,
            description: ingredient.description,
          });
        } else {
          throw new Error(ingredientResult.error || "Failed to parse ingredient details.");
        }

        const productsResponse = await fetch(`/api/products?limit=1000`);
        if (!productsResponse.ok) {
          const errorData = await productsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch products.");
        }
        const productsResult = await productsResponse.json();
        if (productsResult.success && Array.isArray(productsResult.data)) {
          setAllProducts(productsResult.data);
        } else {
          throw new Error(productsResult.error || "Failed to parse products list.");
        }

        const associatedProductsResponse = await fetch(`/api/ingredients/${id}/products`);
        if (!associatedProductsResponse.ok) {
          const errorData = await associatedProductsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch associated products.");
        }
        const associatedProductsResult = await associatedProductsResponse.json();
        if (associatedProductsResult.success && Array.isArray(associatedProductsResult.data)) {
          const currentProductIds = associatedProductsResult.data.map((p: Product) => p.id);
          setSelectedProductIds(currentProductIds);
          setInitialSelectedProductIds(currentProductIds);
        } else {
          throw new Error(associatedProductsResult.error || "Failed to parse associated products.");
        }
        setError(null);

      } catch (err) {
        const errorMessage = (err as Error).message || "An unexpected error occurred.";
        console.error("Error fetching data for ingredient edit page:", errorMessage);
        setError(errorMessage);
        toast.error("Failed to load page data.", { description: errorMessage }); 
      } finally {
        setIsLoading(false);
      }
    }
    fetchIngredientAndProducts();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof IngredientFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleProductSelectionChange = (productId: string) => {
    setSelectedProductIds(prevSelectedIds =>
      prevSelectedIds.includes(productId)
        ? prevSelectedIds.filter(id => id !== productId)
        : [...prevSelectedIds, productId]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IngredientFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Ingredient name is required.";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
        toast.error("Cannot save: Ingredient ID is missing.");
        return;
    }
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Ingredient Details
      const ingredientUpdateResponse = await apiFetch(`/api/ingredients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description ? formData.description.trim() : null,
        }),
      });

      const ingredientUpdateResult = await ingredientUpdateResponse.json();

      if (!ingredientUpdateResponse.ok || !ingredientUpdateResult.success) {
        throw new Error(ingredientUpdateResult.error || "Failed to update Ingredient details.");
      }
      toast.success("Ingredient details updated successfully!");

      // 2. Update Product Associations
      const productsToAdd = selectedProductIds.filter(pid => !initialSelectedProductIds.includes(pid));
      const productsToRemove = initialSelectedProductIds.filter(pid => !selectedProductIds.includes(pid));

      const addPromises = productsToAdd.map(productId => 
        apiFetch(`/api/product-ingredients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, ingredient_id: id }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Failed to associate product ${productId}: ${err.error || res.statusText}`);
          }
          return res.json();
        })
      );

      const removePromises = productsToRemove.map(productId =>
        apiFetch(`/api/product-ingredients`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, ingredient_id: id }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Failed to disassociate product ${productId}: ${err.error || res.statusText}`);
          }
          return res.json();
        })
      );
      
      await Promise.all([...addPromises, ...removePromises]);
      
      if (productsToAdd.length > 0 || productsToRemove.length > 0) {
        toast.success("Product associations updated successfully!");
      }
      
      setInitialSelectedProductIds([...selectedProductIds]);

      router.push("/dashboard/claims/ingredients");
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to update Ingredient:", errorMessage);
      toast.error("Failed to update Ingredient.", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!id && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Page URL</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          The Ingredient ID is missing or invalid in the URL. Please check the link and try again.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/claims/ingredients"> {/* Updated back link */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading ingredient details...</p>
      </div>
    );
  }

  if (error && !isLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/claims/ingredients"> {/* Updated back link */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Link>
        </Button>
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
            <CardTitle>Ingredient Details</CardTitle>
            <CardDescription>
              Modify the details for the ingredient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Ingredient Name <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9">
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name}
                  onChange={handleInputChange} 
                  placeholder="e.g., Turmeric Extract, Vitamin C"
                  maxLength={255}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <Label htmlFor="description" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Description (Optional)</Label>
              <div className="col-span-12 sm:col-span-9">
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Provide a brief description of the ingredient..."
                  rows={4}
                  maxLength={1000}
                  className={formErrors.description ? "border-red-500" : ""}
                />
                {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label className="text-base font-medium">Associated Products</Label>
              <CardDescription>
                Select the products that contain this ingredient.
              </CardDescription>
              {allProducts.length > 0 ? (
                <ScrollArea className="h-72 w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {allProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => handleProductSelectionChange(product.id)}
                          disabled={isSaving}
                        />
                        <Label 
                          htmlFor={`product-${product.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {product.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading products..." : "No products available to associate."}
                </p>
              )}
            </div>

          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/claims/ingredients")} disabled={isSaving}> {/* Updated cancel redirect */}
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 