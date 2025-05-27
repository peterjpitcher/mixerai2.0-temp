'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Heading } from '@/components/ui/heading';
import { Loader2 } from 'lucide-react';
import { ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";

// Function to generate country options for the combobox
const generateCountryOptions = (): ComboboxOption[] => {
  const options: ComboboxOption[] = [
    { value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME }, // Use new constants
  ];
  return options;
};

interface MasterClaimBrandEntity {
  id: string;
  name: string;
  // mixerai_brand_id?: string; // Potentially useful if we need to display linked MixerAI brand
}

interface CountryOptionAPI { // Renamed to avoid conflict if ComboboxOption is different
    code: string;
    name: string;
}

export default function BrandClaimsReviewPage() {
  const [masterClaimBrands, setMasterClaimBrands] = useState<MasterClaimBrandEntity[]>([]);
  const [selectedMasterClaimBrandId, setSelectedMasterClaimBrandId] = useState<string>('');
  const [availableCountries, setAvailableCountries] = useState<ComboboxOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [aiBrandReview, setAiBrandReview] = useState<string | null>(null);
  const [productsReviewedCount, setProductsReviewedCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingBrands(true);
      setIsLoadingCountries(true);
      try {
        const [brandsResponse, countriesResponse] = await Promise.all([
            fetch('/api/master-claim-brands'),
            fetch('/api/countries')
        ]);

        if (!brandsResponse.ok) throw new Error('Failed to fetch master claim brands');
        const brandsApi = await brandsResponse.json();
        if (brandsApi.success && Array.isArray(brandsApi.data)) {
          setMasterClaimBrands(brandsApi.data);
        } else {
          toast.error('Could not load master claim brands.');
          setMasterClaimBrands([]);
        }

        if (!countriesResponse.ok) throw new Error('Failed to fetch countries');
        const countriesApi = await countriesResponse.json();
        if (countriesApi.success && Array.isArray(countriesApi.data)) {
            const countryOptions = countriesApi.data.map((country: CountryOptionAPI) => ({ value: country.code, label: country.name }));
            setAvailableCountries([{value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME}, ...countryOptions]);
        } else {
          toast.error('Could not load countries for selection.');
          setAvailableCountries([{value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME}]); // Fallback with just ALL_COUNTRIES
        }

      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Error fetching initial data for page.');
        setAvailableCountries([{value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME}]);
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingCountries(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleFetchBrandReview = async () => {
    if (!selectedMasterClaimBrandId || !selectedCountryCode) {
      toast.error('Please select both a Master Claim Brand and a Market.');
      return;
    }
    setIsLoading(true);
    setAiBrandReview(null);
    setProductsReviewedCount(null);
    try {
      const response = await fetch(`/api/ai/master-claim-brands/${selectedMasterClaimBrandId}/review-claims?countryCode=${selectedCountryCode}`);
      
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
      <Heading title="Brand-Wide Claims Review (AI)" description="Select a Master Claim Brand and a Market to get an AI-powered strategic review of its effective claims across all its products." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selection</CardTitle>
          <CardDescription>Choose a Master Claim Brand and a target Market (Country).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-0 md:flex md:space-x-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1">Master Claim Brand</label>
            <Select 
                value={selectedMasterClaimBrandId} 
                onValueChange={setSelectedMasterClaimBrandId} 
                disabled={isLoadingBrands || isLoading}
            >
              <SelectTrigger id="brand-select">
                <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select brand"} />
              </SelectTrigger>
              <SelectContent>
                {masterClaimBrands.length > 0 ? (
                  masterClaimBrands.map(brand => (
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
                disabled={isLoading || isLoadingCountries}
            >
              <SelectTrigger id="country-select">
                <SelectValue placeholder={isLoadingCountries ? "Loading markets..." : "Select market/country"} />
              </SelectTrigger>
              <SelectContent>
                {availableCountries.map(country => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleFetchBrandReview} 
            disabled={isLoading || !selectedMasterClaimBrandId || !selectedCountryCode} 
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