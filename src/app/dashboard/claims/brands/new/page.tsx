"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface MasterClaimBrandFormData { 
  name: string;
  mixerai_brand_id: string | null;
}

export default function NewMasterClaimBrandPage() { 
  const router = useRouter();
  const [formData, setFormData] = useState<MasterClaimBrandFormData>({
    name: "",
    mixerai_brand_id: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MasterClaimBrandFormData, string>>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof MasterClaimBrandFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MasterClaimBrandFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Brand name is required.";
    }
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
      const response = await fetch('/api/master-claim-brands', { 
        method: 'POST',
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
        toast.success("Master Claim Brand created successfully!"); 
        router.push("/dashboard/claims/brands"); // Updated redirect path
      } else {
        throw new Error(result.error || "Failed to create Master Claim Brand.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to create Master Claim Brand:", errorMessage);
      toast.error("Failed to create Master Claim Brand.", { 
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
          <Link href="/dashboard/claims/brands"> {/* Updated back link path */}
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Master Claim Brands
          </Link>
        </Button>
      </div>

      <PageHeader 
        title="Add New Master Claim Brand" 
        description="Create a new master brand entity for claim association." 
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Brand Details</CardTitle>
            <CardDescription>
              Please fill in the details for the new Master Claim Brand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange} 
                placeholder="e.g., Master Food Corp Claims" 
                maxLength={255}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixerai_brand_id">MixerAI Brand ID (Optional)</Label>
              <Input 
                id="mixerai_brand_id" 
                name="mixerai_brand_id" 
                value={formData.mixerai_brand_id || ''} 
                onChange={handleInputChange}
                placeholder="Enter associated MixerAI Brand ID (UUID)"
                maxLength={36}
                className={errors.mixerai_brand_id ? "border-red-500" : ""}
              />
              {errors.mixerai_brand_id && <p className="text-xs text-red-500 mt-1">{errors.mixerai_brand_id}</p>}
               <p className="text-xs text-muted-foreground mt-1">
                If this Master Claim Brand corresponds to an existing brand in MixerAI, enter its ID here.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            {/* Cancel button uses router.back() which is fine */}
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Brand</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 