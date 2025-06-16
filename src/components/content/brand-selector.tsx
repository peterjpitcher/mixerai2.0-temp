'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
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
  return (
    <div>
      <Label htmlFor="brand">Brand *</Label>
      <Select 
        value={selectedBrand} 
        onValueChange={onBrandChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="brand" className="w-full">
          <SelectValue placeholder={isLoading ? "Loading brands..." : "Select a brand"} />
        </SelectTrigger>
        <SelectContent>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}