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
import { Loader2, ArrowLeft, Save,  } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface ProductFormData {
  name: string;
  description: string | null;
  master_brand_id: string;
}

interface MasterClaimBrand {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: null,
    master_brand_id: "",
  });
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  useEffect(() => {
    async function fetchMasterBrands() {
      setIsLoadingBrands(true);
      try {
        const response = await fetch('/api/master-claim-brands');
        if (!response.ok) {
          throw new Error('Failed to fetch master claim brands');
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMasterBrands(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse master claim brands');
        }
      } catch (err) {
        console.error("Error fetching master brands:", err);
        toast.error("Failed to load Master Claim Brands for selection.", {
          description: (err as Error).message,
        });
        setMasterBrands([]);
      } finally {
        setIsLoadingBrands(false);
      }
    }
    fetchMasterBrands();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, master_brand_id: value }));
    if (errors.master_brand_id) {
      setErrors(prev => ({ ...prev, master_brand_id: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required.";
    }
    if (!formData.master_brand_id) {
      newErrors.master_brand_id = "Master Claim Brand is required.";
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
          master_brand_id: formData.master_brand_id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Product created successfully!");
        router.push("/dashboard/claims/products"); // Updated redirect path
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
          <Link href="/dashboard/claims/products">  {/* Updated back link path */}
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      <PageHeader 
        title="Add New Product"
        description="Define a new product and associate it with a Master Claim Brand."
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
              <Label htmlFor="master_brand_id">Master Claim Brand <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.master_brand_id}
                onValueChange={handleSelectChange}
                disabled={isLoadingBrands}
              >
                <SelectTrigger className={errors.master_brand_id ? "border-red-500" : ""}>
                  <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select a Master Claim Brand"} />
                </SelectTrigger>
                <SelectContent>
                  {masterBrands.length === 0 && !isLoadingBrands ? (
                    <SelectItem value="" disabled>No brands available</SelectItem>
                  ) : (
                    masterBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.master_brand_id && <p className="text-xs text-red-500 mt-1">{errors.master_brand_id}</p>}
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
            {/* Cancel button uses router.back() which is fine */}
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