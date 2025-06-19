'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Heading } from '@/components/ui/heading';
import { Loader2, Copy, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchCountries, fetchProducts } from '@/lib/api-utils';

// Types
interface SelectOption {
    id: string;
    name: string;
}

interface CountryOption {
    code: string;
    name: string;
}

interface MandatoryClaim {
  text: string;
  level: string;
}

interface GroupedClaims {
  level: string;
  allowed_claims: string[];
  disallowed_claims: string[];
}

interface StyledClaimsData {
  introductory_sentence: string;
  mandatory_claims: MandatoryClaim[];
  grouped_claims: GroupedClaims[];
}

interface RawClaimForAI {
  text: string;
  type: string;
  level: string;
  market: string;
}

const BrandClaimsOutputPage = () => {
    const router = useRouter();
    
    // State
    const [brands, setBrands] = useState<SelectOption[]>([]);
    const [products, setProducts] = useState<SelectOption[]>([]);
    const [countries, setCountries] = useState<CountryOption[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<string>('all');
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const [brandNameForDisplay, setBrandNameForDisplay] = useState<string>('');
    const [styledClaims, setStyledClaims] = useState<StyledClaimsData | null>(null);
    const [rawClaimsForAI, setRawClaimsForAI] = useState<RawClaimForAI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [hasGenerated, setHasGenerated] = useState<boolean>(false);

    // Effects
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [brandsRes, productsRes, countriesRes] = await Promise.all([
                    fetch('/api/master-claim-brands'),
                    fetchProducts(),
                    fetchCountries()
                ]);
                const brandsData = await brandsRes.json();
                if (brandsData.success) setBrands(brandsData.data); else toast.error('Could not load brands.');
                if (productsRes.success) setProducts(productsRes.data); else toast.error('Could not load products.');
                if (countriesRes.success) setCountries(countriesRes.data); else toast.error('Could not load countries.');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_error) {
                toast.error('Failed to fetch initial page data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Handlers
    const handleGenerate = async () => {
        if (!selectedBrand) {
            toast.error('Please select a brand.');
            return;
        }
        setIsGenerating(true);
        setHasGenerated(true);
        setStyledClaims(null);
        setRawClaimsForAI([]);
        setBrandNameForDisplay('');

        try {
            const response = await fetch('/api/ai/style-brand-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterClaimBrandId: selectedBrand,
                    productId: selectedProduct === 'all' ? null : selectedProduct,
                    countryCode: selectedCountry === 'all' ? null : selectedCountry,
                }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate styled claims.');
            
            const result = await response.json();

            if (result.success) {
                setBrandNameForDisplay(result.brandName);
                setStyledClaims(result.styledClaims || null);
                setRawClaimsForAI(result.rawClaimsForAI || []);
                toast.success('Styled claims generated successfully!');
                if (!result.styledClaims || (result.styledClaims.mandatory_claims.length === 0 && result.styledClaims.grouped_claims.every((g: GroupedClaims) => g.allowed_claims.length === 0 && g.disallowed_claims.length === 0))) {
                   toast.info("No claims found for the selected criteria.");
                }
            } else {
                toast.error(result.error || 'Could not generate styled claims.');
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!styledClaims) return;
        
        const productName = selectedProduct === 'all' ? 'All Products' : products.find(p => p.id === selectedProduct)?.name;
        const countryName = selectedCountry === 'all' ? 'All Markets' : countries.find(c => c.code === selectedCountry)?.name;

        let claimsText = `Claims for: ${brandNameForDisplay}\n`;
        if (productName) claimsText += `Product: ${productName}\n`;
        if (countryName) claimsText += `Market: ${countryName}\n\n`;
        
        claimsText += `${styledClaims.introductory_sentence}\n\n`;

        if (styledClaims.mandatory_claims.length > 0) {
            claimsText += '--- Mandatory Claims ---\n';
            styledClaims.mandatory_claims.forEach(claim => claimsText += `- ${claim.text} (${claim.level})\n`);
            claimsText += '\n';
        }

        styledClaims.grouped_claims.forEach(group => {
            if (group.allowed_claims.length > 0 || group.disallowed_claims.length > 0) {
                claimsText += `--- ${group.level} Claims ---\n`;
                if (group.allowed_claims.length > 0) {
                    claimsText += 'Allowed:\n';
                    group.allowed_claims.forEach(claim => claimsText += `- ${claim}\n`);
                }
                if (group.disallowed_claims.length > 0) {
                    claimsText += 'Disallowed:\n';
                    group.disallowed_claims.forEach(claim => claimsText += `- ${claim}\n`);
                }
                claimsText += '\n';
            }
        });
        
        claimsText += '---\nDisclaimer: This content has been exported from MixerAI and is now uncontrolled. For the most accurate and up-to-date information, please refer to the live database.';

        navigator.clipboard.writeText(claimsText).then(() => {
            toast.success('Styled claims copied to clipboard!');
        }, () => {
            toast.error('Failed to copy claims.');
        });
    };
    
    // Render Functions
    const renderClaimsList = (claims: string[], listType: 'allowed' | 'disallowed') => (
        <ul className={`list-disc pl-5 ${listType === 'disallowed' ? 'text-red-600' : ''}`}>
            {claims.map((claim, index) => <li key={index} className="mb-1">{claim}</li>)}
        </ul>
    );

    const renderOutput = () => {
        if (!hasGenerated) return null;
        if (isGenerating) return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
        if (!styledClaims) return <p className="text-center">No claims were generated for the selected criteria.</p>;

        const productName = selectedProduct === 'all' ? '' : products.find(p => p.id === selectedProduct)?.name;
        const countryName = selectedCountry === 'all' ? '' : countries.find(c => c.code === selectedCountry)?.name;

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Styled Claims Output</CardTitle>
                        <CardDescription>
                            For: {brandNameForDisplay} {productName && `(${productName})`} {countryName && `- ${countryName}`}
                        </CardDescription>
                    </div>
                    <Button onClick={handleCopy} size="sm" variant="outline"><Copy className="mr-2 h-4 w-4" />Copy</Button>
                </CardHeader>
                <CardContent>
                    <p className="mb-6 text-sm text-gray-600 italic">{styledClaims.introductory_sentence}</p>
                    
                    {styledClaims.mandatory_claims.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-2">Mandatory Claims</h3>
                            <ul className="list-disc pl-5">
                                {styledClaims.mandatory_claims.map((claim, index) => (
                                    <li key={index} className="mb-1">
                                        {claim.text}
                                        <span className="ml-2 text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-full">
                                            {claim.level}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Accordion type="multiple" defaultValue={styledClaims.grouped_claims.map(g => g.level)}>
                        {styledClaims.grouped_claims.map((group) => (
                             (group.allowed_claims.length > 0 || group.disallowed_claims.length > 0) && (
                                <AccordionItem value={group.level} key={group.level}>
                                    <AccordionTrigger className="text-lg">{group.level} Claims</AccordionTrigger>
                                    <AccordionContent>
                                        {group.allowed_claims.length > 0 && (
                                            <div className="mb-3">
                                                <h4 className="font-semibold mb-1">Allowed Claims</h4>
                                                {renderClaimsList(group.allowed_claims, 'allowed')}
                                            </div>
                                        )}
                                        {group.disallowed_claims.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-1 text-red-700">Disallowed Claims</h4>
                                                {renderClaimsList(group.disallowed_claims, 'disallowed')}
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                             )
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard/claims')}
                className="mb-4"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Claims
            </Button>
            
            <Heading title="Brand Claims Styler" description="Select a brand, and optionally a product and market, to generate a styled list of claims." />

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Selection Criteria</CardTitle>
                    <CardDescription>Choose the brand, and optionally refine by product and market.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <Select value={selectedBrand} onValueChange={setSelectedBrand} disabled={isLoading || isGenerating}>
                            <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                            <SelectContent>{brands.map(brand => (<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={isLoading || isGenerating}>
                            <SelectTrigger><SelectValue placeholder="Select a Product" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoading || isGenerating}>
                            <SelectTrigger><SelectValue placeholder="Select a Market" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Markets</SelectItem>
                                {countries.map(c => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={isGenerating || isLoading || !selectedBrand} className="w-full mt-4">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Styled Claims'}
                    </Button>
                </CardContent>
            </Card>

            {renderOutput()}
            
            {rawClaimsForAI.length > 0 && !isGenerating && (
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium">View Raw Claims Sent to AI</summary>
                    <Card className="mt-2">
                        <CardContent className="p-4">
                            <pre className="text-xs whitespace-pre-wrap">
                                {JSON.stringify(rawClaimsForAI, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </details>
            )}
        </div>
    );
};

export default BrandClaimsOutputPage; 