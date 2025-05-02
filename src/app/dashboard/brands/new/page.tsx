'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { useToast } from "@/components/toast-provider";

interface BrandFormData {
  name: string;
  website_url: string;
  country: string;
  language: string;
  brand_identity: string;
  tone_of_voice: string;
  guardrails: string;
  content_vetting_agencies: string;
}

export default function NewBrandPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: ''
  });

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Brand created successfully",
        });
        router.push('/brands');
      } else {
        throw new Error(data.error || 'Failed to create brand');
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if form has required fields filled
  const isFormValid = formData.name.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Brand</h1>
          <p className="text-muted-foreground">
            Create a new brand to generate content for
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/brands">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Information</CardTitle>
          <CardDescription>
            Enter the basic details about the brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit} id="brand-form">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="Enter brand name" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input 
                  id="website_url" 
                  type="url" 
                  placeholder="https://example.com" 
                  value={formData.website_url}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    placeholder="Country" 
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input 
                    id="language" 
                    placeholder="Language" 
                    value={formData.language}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="brand_identity">Brand Identity</Label>
                <Textarea
                  id="brand_identity"
                  placeholder="Describe the brand's identity, values, and mission"
                  rows={3}
                  value={formData.brand_identity}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <Label htmlFor="tone_of_voice">Tone of Voice</Label>
                <Textarea
                  id="tone_of_voice"
                  placeholder="Describe the brand's tone of voice (formal, casual, friendly, professional, etc.)"
                  rows={3}
                  value={formData.tone_of_voice}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <Label htmlFor="guardrails">Content Guardrails</Label>
                <Textarea
                  id="guardrails"
                  placeholder="Specify any content restrictions or guidelines to follow"
                  rows={3}
                  value={formData.guardrails}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <Label htmlFor="content_vetting_agencies">Content Vetting Agencies</Label>
                <Input
                  id="content_vetting_agencies"
                  placeholder="List any applicable content vetting agencies"
                  value={formData.content_vetting_agencies}
                  onChange={handleChange}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-4 border-t pt-6">
          <Button variant="outline" asChild>
            <Link href="/brands">Cancel</Link>
          </Button>
          <Button 
            form="brand-form" 
            type="submit" 
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Brand'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 