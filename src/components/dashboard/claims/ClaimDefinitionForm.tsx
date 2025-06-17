'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Not used directly, can be removed if not planned
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MultiSelectCheckboxCombobox, ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";

// Static data for countries - will be mapped to ComboboxOption format
// This will be replaced by a state variable populated from API

interface Entity {
  id: string;
  name: string;
  product_ids?: string[];
  country_codes: string[];
  // Optional name fields that might come from the parent page (ClaimEntry)
  master_brand_name?: string;
  product_names_concatenated?: string; // If parent provides a concatenated string of product names
  ingredient_name?: string;
}

// More specific type for initialData and form submission data
export interface ClaimDefinitionData {
  claim_grouping_id?: string; // For edits, backend might expect this or id
  id?: string; // For edits if claim_grouping_id isn't used
  claim_text: string;
  claim_type: string;
  level: 'brand' | 'product' | 'ingredient' | string; // Keep string for initial empty state
  description?: string | null;
  master_brand_id?: string | null;
  ingredient_id?: string | null;
  product_ids?: string[];
  country_codes: string[];
  workflow_id?: string | null; // Add workflow support
  // Optional name fields that might come from the parent page (ClaimEntry) for display purposes in edit mode
  master_brand_name?: string;
  // product_names_concatenated?: string; // This might be complex to pass, product_ids is primary
  ingredient_name?: string;
}

interface ClaimDefinitionFormProps {
  initialData?: ClaimDefinitionData | null; 
  onSubmit: (data: ClaimDefinitionData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void; // New onCancel prop
}

export const ClaimDefinitionForm: React.FC<ClaimDefinitionFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false, // Default value
  onCancel,
}) => {
  const isEditMode = useMemo(() => !!initialData && (!!initialData.id || !!initialData.claim_grouping_id), [initialData]);

  const [claimText, setClaimText] = useState('');
  const [claimType, setClaimType] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMasterBrand, setSelectedMasterBrand] = useState(''); // Renamed from selectedBrand
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [selectedProductValues, setSelectedProductValues] = useState<string[]>([]);
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([]); // Renamed for clarity
  const [selectedWorkflow, setSelectedWorkflow] = useState(''); // Add workflow state

  const [masterBrandOptions, setMasterBrandOptions] = useState<ComboboxOption[]>([]); // Renamed
  const [productOptions, setProductOptions] = useState<ComboboxOption[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<ComboboxOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<ComboboxOption[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<ComboboxOption[]>([]); // Add workflow options
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true); // Add workflow loading state

  // Effect to populate form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setClaimText(initialData.claim_text || '');
      setClaimType(initialData.claim_type || '');
      setLevel(initialData.level || '');
      setDescription(initialData.description || '');
      setSelectedMasterBrand(initialData.master_brand_id || ''); // Renamed
      setSelectedIngredient(initialData.ingredient_id || '');
      setSelectedProductValues(initialData.product_ids || []);
      setSelectedCountryCodes(initialData.country_codes || []); // Renamed
      setSelectedWorkflow(initialData.workflow_id || ''); // Add workflow
    } else {
      // Reset form if initialData is null (e.g. switching from edit to create)
      resetFormFields();
    }
  }, [initialData]);

  // Fetch data for selectors (runs once on mount)
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
            // Do not toast here, let the page handle generic load errors if necessary
        }
        setter(sourceArray.map(item => ({ value: item.id, label: item.name })));
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        // toast.error(`Error fetching ${entityName}.`); // Avoid excessive toasting from form component
        setter([]);
      }
    };

    fetchData('/api/master-claim-brands', setMasterBrandOptions, 'master brands');
    fetchData('/api/products', setProductOptions, 'products');
    fetchData('/api/ingredients', setIngredientOptions, 'ingredients');

    // Fetch claims workflows
    async function fetchClaimsWorkflows() {
      setIsLoadingWorkflows(true);
      try {
        const response = await fetch('/api/claims/workflows');
        if (!response.ok) throw new Error('Failed to fetch claims workflows');
        const apiResponse = await response.json();
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          const workflows = apiResponse.data.map((w: any) => ({ 
            value: w.id, 
            label: w.brand_name ? `${w.name} (${w.brand_name})` : w.name 
          }));
          setWorkflowOptions(workflows);
        } else {
          console.warn("Could not load claims workflows for form selection.");
          setWorkflowOptions([]);
        }
      } catch (error) {
        console.error("Error fetching claims workflows for form:", error);
        setWorkflowOptions([]);
      } finally {
        setIsLoadingWorkflows(false);
      }
    }
    fetchClaimsWorkflows();

    // Fetch countries
    async function fetchCountries() {
      setIsLoadingCountries(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Failed to fetch countries');
        const apiResponse = await response.json();
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          const fetchedCountryOptions = apiResponse.data.map((c: {code: string, name: string}) => ({ value: c.code, label: c.name}));
          setCountryOptions([
            { value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME }, 
            ...fetchedCountryOptions
          ]);
        } else {
          toast.error("Could not load countries for form selection.");
          setCountryOptions([{ value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME }]);
        }
      } catch (error) {
        console.error("Error fetching countries for form:", error);
        toast.error("Error fetching countries for form.");
        setCountryOptions([{ value: ALL_COUNTRIES_CODE, label: ALL_COUNTRIES_NAME }]);
      } finally {
        setIsLoadingCountries(false);
      }
    }
    fetchCountries();

  }, []);

  // Effect to update form fields if initialData changes
  // This ensures that even if options load after initialData is set, the display value is correct for disabled fields.
  useEffect(() => {
    if (initialData) {
      setClaimText(initialData.claim_text || '');
      setClaimType(initialData.claim_type || '');
      setLevel(initialData.level || '');
      setDescription(initialData.description || '');
      setSelectedCountryCodes(initialData.country_codes || []);
      setSelectedWorkflow(initialData.workflow_id || ''); // Add workflow

      if (isEditMode) {
        // For Brand
        if (initialData.level === 'brand' && initialData.master_brand_id) {
          setSelectedMasterBrand(initialData.master_brand_id);
          // Ensure the option exists for display, especially if disabled
          if (initialData.master_brand_name && !masterBrandOptions.find(opt => opt.value === initialData.master_brand_id)) {
            setMasterBrandOptions(prevOpts => [...prevOpts, { value: initialData.master_brand_id!, label: initialData.master_brand_name! }]);
          }
        }
        // For Ingredient
        if (initialData.level === 'ingredient' && initialData.ingredient_id) {
          setSelectedIngredient(initialData.ingredient_id);
          if (initialData.ingredient_name && !ingredientOptions.find(opt => opt.value === initialData.ingredient_id)) {
            setIngredientOptions(prevOpts => [...prevOpts, { value: initialData.ingredient_id!, label: initialData.ingredient_name! }]);
          }
        }
        // For Products (MultiSelect) - its display is usually handled by the component if values are set.
        setSelectedProductValues(initialData.product_ids || []);
      } else {
        // For create mode, or if not specifically brand/ingredient level when editing (though level is disabled)
        setSelectedMasterBrand(initialData.master_brand_id || '');
        setSelectedIngredient(initialData.ingredient_id || '');
        setSelectedProductValues(initialData.product_ids || []);
      }
    } else {
      resetFormFields();
    }
  }, [initialData, isEditMode, masterBrandOptions, ingredientOptions]); // Add options to dependencies

  const resetFormFields = () => {
    setClaimText('');
    setClaimType('');
    setLevel('');
    setDescription('');
    setSelectedMasterBrand(''); // Renamed
    setSelectedIngredient('');
    setSelectedProductValues([]);
    setSelectedCountryCodes([]); // Renamed
    setSelectedWorkflow(''); // Reset workflow
  };

  const handleCountrySelection = (countryCode: string, checked: boolean | 'indeterminate') => {
    setSelectedCountryCodes(prev => 
        checked === true ? [...prev, countryCode] : prev.filter(c => c !== countryCode)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!level) {
        toast.error('Please select a Claim Level.'); return;
    }
    if (level === 'brand' && !selectedMasterBrand) { // Renamed
        toast.error('Please select a brand for brand-level claims.'); return;
    }
    if (level === 'product' && selectedProductValues.length === 0) {
        toast.error('Please select at least one product for product-level claims.'); return;
    }
    if (level === 'ingredient' && !selectedIngredient) {
        toast.error('Please select an ingredient for ingredient-level claims.'); return;
    }
     if (!claimText) {
        toast.error('Please fill in Claim Text.'); return;
    }
    if (!claimType) {
        toast.error('Please select a Claim Type.'); return;
    }
    if (selectedCountryCodes.length === 0) { // Renamed
        toast.error('Please select at least one target market/country (or Master).'); return;
    }
    if (!selectedWorkflow) {
        toast.error('Please select an approval workflow.'); return;
    }

    const submissionData: ClaimDefinitionData = {
      claim_text: claimText,
      claim_type: claimType,
      level: level as ClaimDefinitionData['level'], 
      description: description || null,
      master_brand_id: level === 'brand' ? selectedMasterBrand : null, // Renamed
      ingredient_id: level === 'ingredient' ? selectedIngredient : null,
      product_ids: level === 'product' ? selectedProductValues : [],
      country_codes: selectedCountryCodes, // Renamed
      workflow_id: selectedWorkflow || null, // Add workflow
    };

    if (isEditMode && initialData) {
      // Include ID for updates, prioritize claim_grouping_id if available
      submissionData.id = initialData.id;
      submissionData.claim_grouping_id = initialData.claim_grouping_id;
    }

    await onSubmit(submissionData);
    // Parent component is responsible for resetting/hiding form after successful submission if needed
    // if (!isEditMode) resetFormFields(); // Only reset for create mode if desired here
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-3 sm:p-4 rounded-lg shadow-sm bg-card">
      {/* 1. Claim Level */}
      <div>
        <Label htmlFor="level">Claim Level <span className="text-destructive">*</span></Label>
        <Select value={level} onValueChange={setLevel} required disabled={isEditMode}>
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

      {/* 2. Associated Entity (Conditional) */}
      {level === 'brand' && (
        <div>
          <Label htmlFor="selectedMasterBrand">Brand <span className="text-destructive">*</span></Label>
          <Select value={selectedMasterBrand} onValueChange={setSelectedMasterBrand} required={level === 'brand'} disabled={isEditMode}>
            <SelectTrigger id="selectedMasterBrand">
              <SelectValue placeholder="Select master brand" />
            </SelectTrigger>
            <SelectContent>
              {masterBrandOptions.length === 0 && <div className="py-2 px-3 text-sm text-muted-foreground">{isLoading ? "Loading..." : "No master brands"}</div>}
              {masterBrandOptions.map(brand => (
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
            disabled={isEditMode}
          />
        </div>
      )}

      {level === 'ingredient' && (
        <div>
          <Label htmlFor="selectedIngredient">Ingredient <span className="text-destructive">*</span></Label>
          <Select value={selectedIngredient} onValueChange={setSelectedIngredient} required={level === 'ingredient'} disabled={isEditMode}>
            <SelectTrigger id="selectedIngredient">
              <SelectValue placeholder="Select ingredient" />
            </SelectTrigger>
            <SelectContent>
              {ingredientOptions.length === 0 && <div className="py-2 px-3 text-sm text-muted-foreground">{isLoading ? "Loading..." : "No ingredients"}</div>}
              {ingredientOptions.map(ingredient => (
                <SelectItem key={ingredient.value} value={ingredient.value}>{ingredient.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* 3. Claim Text */}
      <div>
        <Label htmlFor="claimText">Claim Text <span className="text-destructive">*</span></Label>
        <Textarea
          id="claimText"
          value={claimText}
          onChange={e => setClaimText(e.target.value)}
          placeholder="Enter the claim text..."
          required
          rows={3}
        />
      </div>

      {/* 4. Claim Type */}
      <div>
        <Label htmlFor="claimType">Claim Type <span className="text-destructive">*</span></Label>
        <Select value={claimType} onValueChange={setClaimType} required>
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

      {/* 5. Approval Workflow */}
      <div>
        <Label htmlFor="workflow">Approval Workflow <span className="text-destructive">*</span></Label>
        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow} required>
          <SelectTrigger id="workflow">
            <SelectValue placeholder={isLoadingWorkflows ? "Loading workflows..." : "Select workflow"} />
          </SelectTrigger>
          <SelectContent>
            {workflowOptions.length === 0 && <div className="py-2 px-3 text-sm text-muted-foreground">{isLoadingWorkflows ? "Loading..." : "No workflows available"}</div>}
            {workflowOptions.map(workflow => (
              <SelectItem key={workflow.value} value={workflow.value}>{workflow.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Select a workflow for claim approval process.
          {workflowOptions.length === 0 && !isLoadingWorkflows && (
            <> <a href="/dashboard/claims/workflows/new" className="text-primary hover:underline">Create a claims workflow</a> to enable approval processes.</>
          )}
        </p>
      </div>

      {/* 6. Target Markets / Countries */}
      <div>
        <Label htmlFor="countries">Target Markets / Countries <span className="text-destructive">*</span></Label>
        {isLoadingCountries ? (
          <div className="text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2 inline"/>Loading markets...</div>
        ) : (
          <ScrollArea className="h-40 w-full rounded-md border p-2">
            <div className="space-y-1">
              {countryOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`country-${option.value}`}
                    checked={selectedCountryCodes.includes(option.value)}
                    onCheckedChange={(checked) => handleCountrySelection(option.value, checked)}
                  />
                  <Label htmlFor={`country-${option.value}`} className="text-sm font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* 7. Description (Optional) */}
      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Enter optional notes or context for the claim..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
            </Button>
        )}
        <Button type="submit" disabled={isLoading} className="min-w-[120px]">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEditMode ? 'Update Definition' : 'Create Definition'}
        </Button>
      </div>
    </form>
  );
}; 