'use client';

import { Checkbox } from '@/components/checkbox';
import { Label } from '@/components/label';
import { ProductSelectorOptions } from '@/types/template';

interface ProductSelectorOptionsProps {
  options: ProductSelectorOptions;
  onChange: (options: Partial<ProductSelectorOptions>) => void;
}

export function ProductSelectorOptionsComponent({ options, onChange }: ProductSelectorOptionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allowMultiple"
          checked={options.allowMultiple}
          onCheckedChange={(checked) => onChange({ allowMultiple: !!checked })}
        />
        <Label htmlFor="allowMultiple" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Allow multiple selections
        </Label>
      </div>
    </div>
  );
} 