'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandIcon } from '@/components/brand-icon';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  logo_url?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
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
    <div>
      <Label htmlFor="brand">Brand *</Label>
      <Select 
        value={selectedBrand} 
        onValueChange={onBrandChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="brand" className="w-full">
          <SelectValue placeholder={isLoading ? "Loading brands..." : "Select a brand"}>
            {selectedBrandData && (
              <div className="flex items-center gap-2">
                <BrandIcon 
                  name={selectedBrandData.name} 
                  color={selectedBrandData.brand_color}
                  logoUrl={selectedBrandData.logo_url}
                  size="sm"
                />
                <span>{selectedBrandData.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              <div className="flex items-center gap-2">
                <BrandIcon 
                  name={brand.name} 
                  color={brand.brand_color}
                  logoUrl={brand.logo_url}
                  size="sm"
                />
                <span>{brand.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}