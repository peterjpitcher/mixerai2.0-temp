"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, Package, Building2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface ProductFormData {
  name: string;
  description: string | null;
  global_brand_id: string;
}

interface GlobalClaimBrand {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: null,
    global_brand_id: "",
  });
  const [globalBrands, setGlobalBrands] = useState<GlobalClaimBrand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  useEffect(() => {
    async function fetchGlobalBrands() {
      setIsLoadingBrands(true);
      try {
        const response = await fetch('/api/global-claim-brands');
        if (!response.ok) {
          throw new Error('Failed to fetch global claim brands');
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setGlobalBrands(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse global claim brands');
        }
      } catch (err) {
        console.error("Error fetching global brands:", err);
        toast.error("Failed to load Global Claim Brands for selection.", {
          description: (err as Error).message,
        });
        setGlobalBrands([]); // Ensure it's an empty array on error
      } finally {
        setIsLoadingBrands(false);
      }
    }
    fetchGlobalBrands();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, global_brand_id: value }));
    if (errors.global_brand_id) {
      setErrors(prev => ({ ...prev, global_brand_id: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required.";
    }
    if (!formData.global_brand_id) {
      newErrors.global_brand_id = "Global Claim Brand is required.";
    }
    // Description is optional
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
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description ? formData.description.trim() : null,
          global_brand_id: formData.global_brand_id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Product created successfully!");
        router.push("/dashboard/admin/products");
      } else {
        throw new Error(result.error || "Failed to create Product.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to create Product:", errorMessage);
      toast.error("Failed to create Product.", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader 
        title="Add New Product"
        description="Define a new product and associate it with a Global Claim Brand."
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              Please fill in the details for the new product.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange} 
                placeholder="e.g., Super Immune Booster Capsules"
                maxLength={255}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="global_brand_id">Global Claim Brand <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.global_brand_id}
                onValueChange={handleSelectChange}
                disabled={isLoadingBrands}
              >
                <SelectTrigger className={errors.global_brand_id ? "border-red-500" : ""}>
                  <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select a Global Claim Brand"} />
                </SelectTrigger>
                <SelectContent>
                  {globalBrands.length === 0 && !isLoadingBrands ? (
                    <SelectItem value="" disabled>No brands available</SelectItem>
                  ) : (
                    globalBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.global_brand_id && <p className="text-xs text-red-500 mt-1">{errors.global_brand_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Provide a brief description of the product..."
                rows={4}
                maxLength={1000}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingBrands}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Product</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 