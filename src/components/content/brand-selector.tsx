'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandDisplay } from '@/components/ui/brand-display';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  logo_url?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
  language?: string | null;
  country?: string | null;
}

interface BrandSelectorProps {
  brands: Brand[];
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function BrandSelector({ 
  brands, 
  selectedBrand, 
  onBrandChange, 
  disabled = false,
  isLoading = false 
}: BrandSelectorProps) {
  const selectedBrandData = brands.find(b => b.id === selectedBrand);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="brand">Brand *</Label>
      <Select 
        value={selectedBrand} 
        onValueChange={onBrandChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="brand" className="w-full">
          <SelectValue placeholder={isLoading ? "Loading brands..." : "Select a brand"}>
            {selectedBrandData && (
              <BrandDisplay
                brand={{
                  id: selectedBrandData.id,
                  name: selectedBrandData.name,
                  brand_color: selectedBrandData.brand_color,
                  logo_url: selectedBrandData.logo_url
                }}
                variant="inline"
                size="sm"
              />
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              <BrandDisplay
                brand={{
                  id: brand.id,
                  name: brand.name,
                  brand_color: brand.brand_color,
                  logo_url: brand.logo_url
                }}
                variant="inline"
                size="sm"
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedBrandData && (
        <div className="text-sm text-muted-foreground">
          Language: {selectedBrandData.language || 'Not set (defaulting to English)'} | 
          Country: {selectedBrandData.country || 'Not set (defaulting to US)'}
        </div>
      )}
    </div>
  );
}