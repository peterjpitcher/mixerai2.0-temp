"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { apiFetch } from '@/lib/api-client';

interface MasterClaimBrand { 
  id: string;
  name: string;
  mixerai_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

interface MasterClaimBrandFormData { 
  name: string;
  mixerai_brand_id: string | null;
}

export default function EditMasterClaimBrandPage() { 
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;

  const [formData, setFormData] = useState<MasterClaimBrandFormData>({
    name: "",
    mixerai_brand_id: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MasterClaimBrandFormData, string>>>({});

  const pageTitle = "Edit Master Claim Brand";
  const pageDescription = `Modifying Master Claim Brand: ${formData.name || (id ? `ID: ${id}` : "Loading...")}`;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Claims", href: "/dashboard/claims" }, 
    { label: "Claim Brands", href: "/dashboard/claims/brands" }, 
    { label: `Edit: ${formData.name || (id || 'Brand')}` }
  ];

  useEffect(() => {
    if (!id) {
      setError("Invalid Master Brand ID provided.");
      setIsLoading(false);
      toast.error("Invalid Master Brand ID", { description: "The Master Brand ID in the URL is missing or invalid." });
      return;
    }
    setIsLoading(true);
    async function fetchBrandDetails() {
      try {
        const response = await fetch(`/api/master-claim-brands/${id}`); 
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            throw new Error("Master Claim Brand not found.");
          } 
          throw new Error(errorData.error || "Failed to fetch brand details.");
        }
        const result = await response.json();
        if (result.success && result.data) {
          const brand: MasterClaimBrand = result.data;
          setFormData({
            name: brand.name,
            mixerai_brand_id: brand.mixerai_brand_id,
          });
          setError(null);
        } else {
          throw new Error(result.error || "Failed to parse brand details.");
        }
      } catch (err) {
        const errorMessage = (err as Error).message || "An unexpected error occurred.";
        console.error("Error fetching brand details:", errorMessage);
        setError(errorMessage);
        toast.error("Failed to load brand details.", { description: errorMessage }); 
      } finally {
        setIsLoading(false);
      }
    }
    fetchBrandDetails();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof MasterClaimBrandFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MasterClaimBrandFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Brand name is required.";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
        toast.error("Cannot save: Master Brand ID is missing.");
        return;
    }
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/master-claim-brands/${id}`, { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          mixerai_brand_id: formData.mixerai_brand_id ? formData.mixerai_brand_id.trim() : null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Master Claim Brand updated successfully!"); 
        router.push("/dashboard/claims/brands");
      } else {
        throw new Error(result.error || "Failed to update Master Claim Brand.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to update Master Claim Brand:", errorMessage);
      toast.error("Failed to update Master Claim Brand.", { 
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
          The Master Brand ID is missing or invalid in the URL. Please check the link and try again.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/claims/brands">
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
        <p className="ml-2 text-muted-foreground">Loading brand details...</p>
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
          <Link href="/dashboard/claims/brands">
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
            <CardTitle>Brand Details</CardTitle>
            <CardDescription>
              Modify the details for the Master Claim Brand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-start">
              <Label htmlFor="name" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">Brand Name <span className="text-red-500">*</span></Label>
              <div className="col-span-12 sm:col-span-9">
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name}
                  onChange={handleInputChange} 
                  placeholder="e.g., Master Food Corp Claims" 
                  maxLength={255}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4 items-start">
              <Label htmlFor="mixerai_brand_id" className="col-span-12 sm:col-span-3 text-left sm:text-right pt-2">MixerAI Brand ID (Optional)</Label>
              <div className="col-span-12 sm:col-span-9">
                <Input 
                  id="mixerai_brand_id" 
                  name="mixerai_brand_id" 
                  value={formData.mixerai_brand_id || ''} 
                  onChange={handleInputChange}
                  placeholder="Enter associated MixerAI Brand ID (UUID)"
                  maxLength={36} 
                  className={formErrors.mixerai_brand_id ? "border-red-500" : ""}
                />
                {formErrors.mixerai_brand_id && <p className="text-xs text-red-500 mt-1">{formErrors.mixerai_brand_id}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  If this Master Claim Brand corresponds to an existing brand in MixerAI, enter its ID here.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/claims/brands")} disabled={isSaving}>
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