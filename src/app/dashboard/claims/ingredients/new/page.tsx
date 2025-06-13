"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Added for description
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save,  } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface IngredientFormData {
  name: string;
  description: string | null;
}

export default function NewIngredientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<IngredientFormData>({
    name: "",
    description: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof IngredientFormData, string>>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof IngredientFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IngredientFormData, string>> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Ingredient name is required.";
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
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description ? formData.description.trim() : null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Ingredient created successfully!");
        router.push("/dashboard/claims/ingredients"); // Updated redirect path
      } else {
        throw new Error(result.error || "Failed to create Ingredient.");
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "An unexpected error occurred.";
      console.error("Failed to create Ingredient:", errorMessage);
      toast.error("Failed to create Ingredient.", {
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
          <Link href="/dashboard/claims/ingredients"> {/* Updated back link path */}
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ingredients
          </Link>
        </Button>
      </div>

      <PageHeader 
        title="Add New Ingredient"
        description="Define a new ingredient for use in products and claims."
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Ingredient Details</CardTitle>
            <CardDescription>
              Please fill in the details for the new ingredient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ingredient Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleInputChange} 
                placeholder="e.g., Turmeric Extract, Vitamin C"
                maxLength={255}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Provide a brief description of the ingredient..."
                rows={4}
                maxLength={1000} // Example max length
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Ingredient</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 