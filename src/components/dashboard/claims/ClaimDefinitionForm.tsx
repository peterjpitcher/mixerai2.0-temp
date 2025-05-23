'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Not used directly, can be removed if not planned
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MultiSelectCheckboxCombobox, ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';

// Static data for countries - will be mapped to ComboboxOption format
const staticCountriesRaw = [
  { code: '__GLOBAL__', name: 'Master (Global)' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  // Add more countries as needed or make this dynamic if required
];

interface Entity {
  id: string;
  name: string;
}

interface ClaimDefinitionFormProps {
  initialData?: any; 
  onSubmit: (data: any) => Promise<void>; // Changed to Promise for async submissions
  isLoading?: boolean;
  // onFormReset?: () => void; // Optional callback to trigger form reset from parent
}

export const ClaimDefinitionForm: React.FC<ClaimDefinitionFormProps> = ({
  initialData,
  onSubmit,
  isLoading,
}) => {
  const [claimText, setClaimText] = useState(initialData?.claimText || '');
  const [claimType, setClaimType] = useState(initialData?.claimType || '');
  const [level, setLevel] = useState(initialData?.level || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedBrand, setSelectedBrand] = useState(initialData?.global_brand_id || '');
  const [selectedIngredient, setSelectedIngredient] = useState(initialData?.ingredient_id || '');
  const [selectedProductValues, setSelectedProductValues] = useState<string[]>(initialData?.product_ids || []);
  const [selectedCountryValues, setSelectedCountryValues] = useState<string[]>(initialData?.country_codes || []);

  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [productOptions, setProductOptions] = useState<ComboboxOption[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<ComboboxOption[]>([]);
  const countryOptions: ComboboxOption[] = staticCountriesRaw.map(c => ({ value: c.code, label: c.name }));

  // Fetch data for selectors
  useEffect(() => {
    const fetchData = async (url: string, setter: React.Dispatch<React.SetStateAction<ComboboxOption[]>>, entityName: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${entityName}`);
        const apiResponse = await response.json();
        let sourceArray: Entity[] = [];
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
            sourceArray = apiResponse.data;
        } else if (Array.isArray(apiResponse)) { // Direct array response
            sourceArray = apiResponse;
        } else {
            console.warn(`Unexpected data structure for ${entityName}:`, apiResponse);
            toast.error(`Could not load ${entityName} data.`);
        }
        setter(sourceArray.map(item => ({ value: item.id, label: item.name })));
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        toast.error(`Error fetching ${entityName}.`);
        setter([]);
      }
    };

    fetchData('/api/global-claim-brands', setBrandOptions, 'global brands');
    fetchData('/api/products', setProductOptions, 'products');
    fetchData('/api/ingredients', setIngredientOptions, 'ingredients');
    // Countries are static for now
  }, []);

  const resetFormFields = () => {
    setClaimText('');
    setClaimType('');
    setLevel('');
    setDescription('');
    setSelectedBrand('');
    setSelectedIngredient('');
    setSelectedProductValues([]);
    setSelectedCountryValues([]);
    // if (onFormReset) onFormReset(); // Call parent reset if needed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!claimText || !claimType || !level) {
        toast.error('Please fill in all required fields: Claim Text, Type, and Level.');
        return;
    }
    if (level === 'brand' && !selectedBrand) {
        toast.error('Please select a brand for brand-level claims.');
        return;
    }
    if (level === 'product' && selectedProductValues.length === 0) {
        toast.error('Please select at least one product for product-level claims.');
        return;
    }
    if (level === 'ingredient' && !selectedIngredient) {
        toast.error('Please select an ingredient for ingredient-level claims.');
        return;
    }
    if (selectedCountryValues.length === 0) {
        toast.error('Please select at least one target market/country (or Master).');
        return;
    }

    await onSubmit({
      claim_text: claimText,
      claim_type: claimType,
      level,
      description,
      global_brand_id: level === 'brand' ? selectedBrand : null,
      ingredient_id: level === 'ingredient' ? selectedIngredient : null,
      product_ids: level === 'product' ? selectedProductValues : [],
      country_codes: selectedCountryValues,
    });
    // Consider resetting form here or let parent handle it via a callback
    // For now, we can add a simple reset after successful submission indication (parent will show toast)
    // resetFormFields(); // Or parent can call this via a ref / prop after successful API call
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="claimText">Claim Text <span className="text-destructive">*</span></Label>
        <Textarea
          id="claimText"
          value={claimText}
          onChange={e => setClaimText(e.target.value)}
          placeholder="Enter the claim text..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="claimType">Claim Type <span className="text-destructive">*</span></Label>
          <Select value={claimType} onValueChange={setClaimType}>
            <SelectTrigger id="claimType">
              <SelectValue placeholder="Select claim type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allowed">Allowed</SelectItem>
              <SelectItem value="disallowed">Disallowed</SelectItem>
              <SelectItem value="mandatory">Mandatory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="level">Claim Level <span className="text-destructive">*</span></Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger id="level">
              <SelectValue placeholder="Select claim level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="ingredient">Ingredient</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {level === 'brand' && (
        <div>
          <Label htmlFor="selectedBrand">Brand <span className="text-destructive">*</span></Label>
          <Select value={selectedBrand} onValueChange={setSelectedBrand} >
            <SelectTrigger id="selectedBrand">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.length === 0 && <SelectItem value="" disabled>Loading brands...</SelectItem>}
              {brandOptions.map(brand => (
                <SelectItem key={brand.value} value={brand.value}>{brand.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {level === 'product' && (
        <div>
          <Label>Applicable Products <span className="text-destructive">*</span></Label>
          <MultiSelectCheckboxCombobox
            options={productOptions}
            selectedValues={selectedProductValues}
            onChange={setSelectedProductValues}
            placeholder="Select products..."
            searchPlaceholder="Search products..."
            className="w-full"
          />
        </div>
      )}

      {level === 'ingredient' && (
        <div>
          <Label htmlFor="selectedIngredient">Ingredient <span className="text-destructive">*</span></Label>
          <Select value={selectedIngredient} onValueChange={setSelectedIngredient} >
            <SelectTrigger id="selectedIngredient">
              <SelectValue placeholder="Select ingredient" />
            </SelectTrigger>
            <SelectContent>
              {ingredientOptions.length === 0 && <SelectItem value="" disabled>Loading ingredients...</SelectItem>}
              {ingredientOptions.map(ingredient => (
                <SelectItem key={ingredient.value} value={ingredient.value}>{ingredient.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div>
        <Label>Target Markets/Countries <span className="text-destructive">*</span></Label>
        <MultiSelectCheckboxCombobox
            options={countryOptions}
            selectedValues={selectedCountryValues}
            onChange={setSelectedCountryValues}
            placeholder="Select markets/countries..."
            searchPlaceholder="Search markets..."
            className="w-full"
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Enter optional notes or context for the claim..."
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
        {isLoading ? 'Saving Claim...' : 'Save Claim'}
      </Button>
    </form>
  );
}; 