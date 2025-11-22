'use client';

import { useState, useEffect, useMemo } from 'react';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Package, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useBrandProducts, type BrandProductSummary } from '@/hooks/queries/use-brand-products';

interface ProductSelectProps {
  brandId: string | null;
  value: string | null; // For single-select
  onChange: (value: string | null) => void;
  isMultiSelect?: false; // For now, only handling single select
}

export function ProductSelect({ brandId, value, onChange }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const productsQuery = useBrandProducts({
    brandId,
    searchTerm: debouncedSearchTerm || undefined,
    limit: 200,
    enabled: Boolean(brandId),
  });

  const productList = useMemo(
    () => (productsQuery.data ?? []) as BrandProductSummary[],
    [productsQuery.data]
  );
  const { isPending, isError, refetch } = productsQuery;

  // Reset selection when brandId changes
  useEffect(() => {
    if (value !== null) {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]); // Only reset when brandId changes, not value

  const selectedProduct = useMemo(() => productList.find(p => p.id === value), [productList, value]);

  const renderContent = () => {
    if (!brandId) {
      return <CommandEmpty icon={AlertCircle}>Please select a brand first.</CommandEmpty>;
    }
    if (isPending) {
      return (
        <div className="p-4 flex items-center justify-center">
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading products...</span>
        </div>
      );
    }
    if (isError) {
      return (
        <div className="p-4 text-center text-destructive">
          <p>Failed to load products.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }
    if (productList.length === 0) {
      return <CommandEmpty icon={Package}>No products found for this brand.</CommandEmpty>;
    }
    return (
      <CommandGroup>
        {productList.map((product) => (
          <CommandItem
            key={product.id}
            value={product.name} // Command uses value for search, but we drive it via API
            onSelect={() => {
              onChange(product.id);
              setOpen(false);
            }}
          >
            {product.name}
            <Icons.check className={`ml-auto h-4 w-4 ${value === product.id ? 'opacity-100' : 'opacity-0'}`} />
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={!brandId}
        >
          {selectedProduct ? selectedProduct.name : 'Select product...'}
          <Icons.chevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            disabled={!brandId}
          />
          <CommandList>
            {renderContent()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 
