'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { useToast } from '@/components/toast-provider';

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [brand, setBrand] = useState({
    name: '',
    website_url: '',
    country: '',
    language: '',
    brand_identity: '',
    tone_of_voice: '',
    guardrails: '',
    content_vetting_agencies: ''
  });
  
  // Placeholder: In a real app, fetch the brand data
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setBrand({
        name: 'Demo Brand',
        website_url: 'https://example.com',
        country: 'United States',
        language: 'English',
        brand_identity: 'A sample brand identity description.',
        tone_of_voice: 'Professional but approachable.',
        guardrails: 'No negative language about competitors.',
        content_vetting_agencies: 'Sample Agency A, Sample Agency B'
      });
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [id]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrand(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Placeholder: In a real app, send the update to the API
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Success',
        description: 'Brand updated successfully',
      });
      router.push(`/brands/${id}`);
    }, 1000);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading brand details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
        <Button variant="outline" asChild>
          <Link href={`/brands/${id}`}>Cancel</Link>
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Brand Information</CardTitle>
            <CardDescription>
              Update your brand's basic information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={brand.name} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input 
                  id="website_url" 
                  name="website_url" 
                  type="url"
                  value={brand.website_url} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input 
                  id="country" 
                  name="country" 
                  value={brand.country} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input 
                  id="language" 
                  name="language" 
                  value={brand.language} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand_identity">Brand Identity</Label>
              <Textarea 
                id="brand_identity" 
                name="brand_identity" 
                value={brand.brand_identity} 
                onChange={handleInputChange} 
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tone_of_voice">Tone of Voice</Label>
              <Textarea 
                id="tone_of_voice" 
                name="tone_of_voice" 
                value={brand.tone_of_voice} 
                onChange={handleInputChange} 
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="guardrails">Content Guardrails</Label>
              <Textarea 
                id="guardrails" 
                name="guardrails" 
                value={brand.guardrails} 
                onChange={handleInputChange} 
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content_vetting_agencies">Content Vetting Agencies</Label>
              <Input 
                id="content_vetting_agencies" 
                name="content_vetting_agencies" 
                value={brand.content_vetting_agencies} 
                onChange={handleInputChange} 
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.push(`/brands/${id}`)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 