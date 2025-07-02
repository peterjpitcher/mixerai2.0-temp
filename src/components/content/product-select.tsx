'use client';

import { useState, useEffect, useMemo } from 'react';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Package, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import useSWR from 'swr';

interface ProductSelectProps {
  brandId: string | null;
  value: string | null; // For single-select
  onChange: (value: string | null) => void;
  isMultiSelect?: false; // For now, only handling single select
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ProductSelect({ brandId, value, onChange }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const apiUrl = useMemo(() => {
    if (!brandId) return null;
    const params = new URLSearchParams();
    if (debouncedSearchTerm) {
      params.append('q', debouncedSearchTerm);
    }
    // Increase limit to fetch more products (default is 20)
    params.append('limit', '200');
    return `/api/brands/${brandId}/products?${params.toString()}`;
  }, [brandId, debouncedSearchTerm]);

  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false, // Avoid re-fetching on window focus
    shouldRetryOnError: false, // We'll provide a manual retry button
  });

  // Reset selection when brandId changes
  useEffect(() => {
    if (value !== null) {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]); // Only reset when brandId changes, not value
  
  const products = useMemo(() => {
    const productList = data?.products || [];
    return [...productList].sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.products]);
  const selectedProduct = useMemo(() => products.find(p => p.id === value), [products, value]);

  const renderContent = () => {
    if (!brandId) {
      return <CommandEmpty icon={AlertCircle}>Please select a brand first.</CommandEmpty>;
    }
    if (isLoading) {
      return (
        <div className="p-4 flex items-center justify-center">
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading products...</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 text-center text-destructive">
          <p>Failed to load products.</p>
          {/* In a real app, a retry button would trigger a re-fetch */}
        </div>
      );
    }
    if (products.length === 0) {
      return <CommandEmpty icon={Package}>No products found for this brand.</CommandEmpty>;
    }
    return (
      <CommandGroup>
        {products.map((product) => (
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