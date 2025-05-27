'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Heading } from '@/components/ui/heading';
import { Loader2 } from 'lucide-react';
// ComboboxOption might still be needed if we use a combobox for countries/products later
// import { ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox'; 
// ALL_COUNTRIES_CODE and ALL_COUNTRIES_NAME might not be needed if countries are purely dynamic
// import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes"; 
import { fetchCountries, fetchProducts, fetchClaims } from '@/lib/api-utils';

interface CountryAPI {
    code: string;
    name: string;
}

interface ProductAPI {
    id: string;
    name: string;
}

// This interface represents a single styled claim item (both allowed and disallowed)
interface StyledClaim {
    id: string; 
    text: string;
}

const ProductClaimsOutputPage = () => {
  const [countries, setCountries] = useState<CountryAPI[]>([]);
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  
  // New state variables for the API response
  const [productNameForDisplay, setProductNameForDisplay] = useState<string>('');
  const [countryNameForDisplay, setCountryNameForDisplay] = useState<string>('');
  const [styledAllowedClaims, setStyledAllowedClaims] = useState<StyledClaim[]>([]);
  const [styledDisallowedClaims, setStyledDisallowedClaims] = useState<StyledClaim[]>([]);
  
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isGeneratingClaims, setIsGeneratingClaims] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false); // Track if generation has been attempted

  useEffect(() => {
    const loadCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const countriesData = await fetchCountries(); 
        if (countriesData && countriesData.success && Array.isArray(countriesData.data)) {
          setCountries(countriesData.data);
        } else {
          toast.error("Could not load countries. " + (countriesData?.error || ''));
          setCountries([]);
        }
      } catch (error: any) {
        console.error("Error fetching countries:", error);
        toast.error("Failed to fetch countries: " + error.message);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const productsData = await fetchProducts(); 
        if (productsData && productsData.success && Array.isArray(productsData.data)) {
          setProducts(productsData.data);
        } else {
          toast.error("Could not load products. " + (productsData?.error || ''));
          setProducts([]);
        }
      } catch (error: any) {
        console.error("Error fetching products:", error);
        toast.error("Failed to fetch products: " + error.message);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadCountries();
    loadProducts();
  }, []);

  const handleGenerateClaims = async () => {
    if (!selectedCountry || !selectedProduct) {
      toast.error('Please select both a country and a product.');
      return;
    }
    setIsGeneratingClaims(true);
    setHasGenerated(true); // Mark that generation has been attempted
    // Reset previous results
    setStyledAllowedClaims([]);
    setStyledDisallowedClaims([]);
    setProductNameForDisplay('');
    setCountryNameForDisplay('');

    try {
      const claimsResponse = await fetchClaims(selectedProduct, selectedCountry);

      if (claimsResponse && claimsResponse.success && Array.isArray(claimsResponse.data)) {
        const rawClaims = claimsResponse.data;
        if (rawClaims.length === 0) {
          toast.info("No raw claims found for the selected product and country. AI styling will not proceed.");
          // Still fetch product/country names for context even if no raw claims
          const productInfo = products.find(p => p.id === selectedProduct);
          const countryInfo = countries.find(c => c.code === selectedCountry);
          setProductNameForDisplay(productInfo?.name || selectedProduct);
          setCountryNameForDisplay(countryInfo?.name || selectedCountry);
          setIsGeneratingClaims(false);
          return;
        }

        const openAIStylingResponse = await fetch('/api/ai/style-product-claims', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claims: rawClaims, productId: selectedProduct, countryCode: selectedCountry }),
        });

        if (!openAIStylingResponse.ok) {
          const errorResult = await openAIStylingResponse.json().catch(() => ({ error: "Failed to process claims. Invalid server response." }));
          throw new Error(errorResult.error || 'Failed to process claims with AI styling service.');
        }

        const styledResult = await openAIStylingResponse.json();
        if (styledResult.success) {
          setProductNameForDisplay(styledResult.productName || selectedProduct);
          setCountryNameForDisplay(styledResult.countryName || selectedCountry);
          setStyledAllowedClaims(Array.isArray(styledResult.styledAllowedClaims) ? styledResult.styledAllowedClaims : []);
          setStyledDisallowedClaims(Array.isArray(styledResult.styledDisallowedClaims) ? styledResult.styledDisallowedClaims : []);
          
          if (styledResult.styledAllowedClaims.length === 0 && styledResult.styledDisallowedClaims.length === 0 && rawClaims.length > 0) {
             toast.info("AI returned no styled claims, though raw claims were present.");
          } else if (styledResult.styledAllowedClaims.length > 0 || styledResult.styledDisallowedClaims.length > 0) {
            toast.success('Claims processed and styled successfully!');
          }
        } else {
          toast.error(styledResult.error || 'Could not retrieve styled claims.');
        }
      } else {
        toast.error(claimsResponse?.error || 'Could not fetch raw claims for the product.');
      }
    } catch (error: any) {
      console.error('Error generating claims:', error);
      toast.error(error.message || 'An error occurred while generating claims.');
    } finally {
      setIsGeneratingClaims(false);
    }
  };

  const renderClaimsList = (claims: StyledClaim[], title: string) => {
    if (claims.length === 0) {
      return <p className="text-sm text-muted-foreground">No {title.toLowerCase()} to display.</p>;
    }
    return (
      <div className="prose prose-sm max-w-none">
        <h3 className="text-md font-semibold mb-2">{title}</h3>
        <ul className="list-disc pl-5 space-y-1">
          {claims.map((claim) => (
            <li key={claim.id}>{claim.text}</li> 
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Heading title="Product Claims Output" description="Select a product and country to generate a styled list of applicable claims, categorized by allowed/disallowed status." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product and Market Selection</CardTitle>
          <CardDescription>Choose a product and the target market (country) for which to generate claims.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="country-select" className="block text-sm font-medium text-gray-700 mb-1">Market/Country</label>
              <Select 
                value={selectedCountry} 
                onValueChange={setSelectedCountry} 
                disabled={isLoadingCountries || isGeneratingClaims}
              >
                <SelectTrigger id="country-select">
                  <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCountries ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : countries.length > 0 ? (
                    countries.map(country => (
                      <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <Select 
                value={selectedProduct} 
                onValueChange={setSelectedProduct} 
                disabled={isLoadingProducts || isGeneratingClaims}
              >
                <SelectTrigger id="product-select">
                  <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select product"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingProducts ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : products.length > 0 ? (
                    products.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-products" disabled>No products available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateClaims} 
            disabled={isGeneratingClaims || isLoadingCountries || isLoadingProducts || !selectedCountry || !selectedProduct} 
            className="w-full mt-4"
          >
            {isGeneratingClaims ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Claims...
              </>
            ) : (
              'Generate Styled Claims'
            )}
          </Button>
        </CardContent>
      </Card>

      {isGeneratingClaims && (
        <div className="flex justify-center items-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Generating claims, please wait...</p>
        </div>
      )}

      {hasGenerated && !isGeneratingClaims && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Styled Product Claims Output</CardTitle>
            {productNameForDisplay && countryNameForDisplay && (
              <CardDescription>
                Showing claims for product: <strong>{productNameForDisplay}</strong> in market: <strong>{countryNameForDisplay}</strong>.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              {renderClaimsList(styledAllowedClaims, "Allowed Claims")}
            </div>
            <div>
              {renderClaimsList(styledDisallowedClaims, "Disallowed Claims")}
            </div>
            {(styledAllowedClaims.length === 0 && styledDisallowedClaims.length === 0) && (
                 <p className="text-center text-muted-foreground">
                    No styled claims were returned by the AI for this selection.
                 </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback message if generation hasn't been attempted yet, or if selectors are reset */}
      {!hasGenerated && !isGeneratingClaims && (
         <Card className="mt-6">
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                    Please select a product and country, then click "Generate Styled Claims".
                </p>
            </CardContent>
         </Card>
      )}
    </div>
  );
};

export default ProductClaimsOutputPage; 