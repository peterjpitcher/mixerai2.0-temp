'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Heading } from '@/components/ui/heading';
import { Loader2 } from 'lucide-react';
import { ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';

// Static data for countries - consider moving to a shared location if used elsewhere
const staticCountriesRaw = [
  { code: '__GLOBAL__', name: 'Master (Global)' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  // Add more relevant markets
];

interface GlobalClaimBrandEntity {
  id: string;
  name: string;
  // mixerai_brand_id?: string; // Potentially useful if we need to display linked MixerAI brand
}

export default function BrandClaimsReviewPage() {
  const [globalClaimBrands, setGlobalClaimBrands] = useState<GlobalClaimBrandEntity[]>([]);
  const [selectedGlobalClaimBrandId, setSelectedGlobalClaimBrandId] = useState<string>('');
  const countries: ComboboxOption[] = staticCountriesRaw.map(c => ({ value: c.code, label: c.name }));
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [aiBrandReview, setAiBrandReview] = useState<string | null>(null);
  const [productsReviewedCount, setProductsReviewedCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchGlobalClaimBrands = async () => {
      setIsLoadingBrands(true);
      try {
        const response = await fetch('/api/global-claim-brands');
        if (!response.ok) throw new Error('Failed to fetch global claim brands');
        const api = await response.json();
        if (api.success && Array.isArray(api.data)) {
          setGlobalClaimBrands(api.data);
        } else {
          toast.error('Could not load global claim brands.');
          setGlobalClaimBrands([]);
        }
      } catch (error) {
        console.error('Error fetching global claim brands:', error);
        toast.error('Error fetching global claim brands for page.');
      } finally {
        setIsLoadingBrands(false);
      }
    };
    fetchGlobalClaimBrands();
  }, []);

  const handleFetchBrandReview = async () => {
    if (!selectedGlobalClaimBrandId || !selectedCountryCode) {
      toast.error('Please select both a Global Claim Brand and a Market.');
      return;
    }
    setIsLoading(true);
    setAiBrandReview(null);
    setProductsReviewedCount(null);
    try {
      const response = await fetch(`/api/ai/global-claim-brands/${selectedGlobalClaimBrandId}/review-claims?countryCode=${selectedCountryCode}`);
      
      const result = await response.json(); // Always parse JSON first

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch brand claims review');
      }
      
      if (result.success) {
        setAiBrandReview(result.analysis);
        setProductsReviewedCount(result.productsReviewed || 0);
        if (result.analysis === "No products found for this brand to review claims." || result.analysis === "No effective claims found across any products for this brand in the selected market."){
            toast.info(result.analysis);
        } else {
            toast.success('AI brand review generated.');
        }
      } else {
        toast.error(result.error || 'Could not load AI brand review data.');
      }
    } catch (error: any) {
      console.error('Error fetching AI brand review:', error);
      toast.error(error.message || 'Error fetching AI brand review.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Heading title="Brand-Wide Claims Review (AI)" description="Select a Global Claim Brand and a Market to get an AI-powered strategic review of its effective claims across all its products." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selection</CardTitle>
          <CardDescription>Choose a Global Claim Brand and a target Market (Country).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-0 md:flex md:space-x-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1">Global Claim Brand</label>
            <Select 
                value={selectedGlobalClaimBrandId} 
                onValueChange={setSelectedGlobalClaimBrandId} 
                disabled={isLoadingBrands || isLoading}
            >
              <SelectTrigger id="brand-select">
                <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select brand"} />
              </SelectTrigger>
              <SelectContent>
                {globalClaimBrands.length > 0 ? (
                  globalClaimBrands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {isLoadingBrands ? "Loading..." : "No brands found"}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="country-select" className="block text-sm font-medium text-gray-700 mb-1">Market/Country</label>
            <Select 
                value={selectedCountryCode} 
                onValueChange={setSelectedCountryCode} 
                disabled={isLoading}
            >
              <SelectTrigger id="country-select">
                <SelectValue placeholder="Select market/country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(country => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleFetchBrandReview} 
            disabled={isLoading || !selectedGlobalClaimBrandId || !selectedCountryCode} 
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Review...
              </>
            ) : (
              'Get AI Brand Review'
            )}
          </Button>
        </CardContent>
      </Card>

      {aiBrandReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI-Generated Brand Review</CardTitle>
            {productsReviewedCount !== null && (
                 <CardDescription>
                    Review based on {productsReviewedCount} product(s) for the selected brand and market.
                 </CardDescription>
            )}
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            {aiBrandReview.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p> // Using non-breaking space for empty lines
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 