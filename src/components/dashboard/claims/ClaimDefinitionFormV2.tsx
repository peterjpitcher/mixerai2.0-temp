'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MultiSelectCheckboxCombobox, ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronRight, Info, Building2, Package, FlaskConical } from 'lucide-react';
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";
import { cn } from '@/lib/utils';

interface Entity {
  id: string;
  name: string;
  product_ids?: string[];
  country_codes: string[];
  master_brand_name?: string;
  product_names_concatenated?: string;
  ingredient_name?: string;
}

interface WorkflowResponse {
  id: string;
  name: string;
  brand_name?: string;
}

export interface ClaimDefinitionData {
  claim_grouping_id?: string;
  id?: string;
  claim_text: string;
  claim_type: string;
  level: 'brand' | 'product' | 'ingredient' | string;
  description?: string | null;
  master_brand_id?: string | null;
  ingredient_id?: string | null; // Deprecated, for backward compatibility
  ingredient_ids?: string[]; // New field for multiple ingredients
  product_ids?: string[];
  country_codes: string[];
  workflow_id?: string | null;
  master_brand_name?: string;
  ingredient_name?: string;
}

interface ClaimDefinitionFormProps {
  initialData?: ClaimDefinitionData | null; 
  onSubmit: (data: ClaimDefinitionData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

// Step indicator component
const StepIndicator = ({ step, title, isActive, isCompleted }: { step: number; title: string; isActive: boolean; isCompleted: boolean }) => (
  <div className={cn("flex items-center gap-3", isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground")}>
    <div className={cn(
      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
      isActive ? "border-primary bg-primary text-primary-foreground" : 
      isCompleted ? "border-green-600 bg-green-600 text-white" : 
      "border-muted-foreground"
    )}>
      {isCompleted ? "✓" : step}
    </div>
    <span className="text-sm font-medium">{title}</span>
  </div>
);

export const ClaimDefinitionFormV2: React.FC<ClaimDefinitionFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const isEditMode = useMemo(() => !!initialData && (!!initialData.id || !!initialData.claim_grouping_id), [initialData]);

  // Form state
  const [claimText, setClaimText] = useState('');
  const [claimType, setClaimType] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMasterBrand, setSelectedMasterBrand] = useState('');
  const [selectedIngredientValues, setSelectedIngredientValues] = useState<string[]>([]);
  const [selectedProductValues, setSelectedProductValues] = useState<string[]>([]);
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('none');

  // Options state
  const [masterBrandOptions, setMasterBrandOptions] = useState<ComboboxOption[]>([]);
  const [productOptions, setProductOptions] = useState<ComboboxOption[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<ComboboxOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<ComboboxOption[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<ComboboxOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Effect to populate form when initialData changes
  useEffect(() => {
    if (initialData) {
      setClaimText(initialData.claim_text || '');
      setClaimType(initialData.claim_type || '');
      setLevel(initialData.level || '');
      setDescription(initialData.description || '');
      setSelectedMasterBrand(initialData.master_brand_id || '');
      // Support both single ingredient_id (backward compatibility) and multiple ingredient_ids
      if (initialData.ingredient_id) {
        setSelectedIngredientValues([initialData.ingredient_id]);
      } else if (initialData.ingredient_ids) {
        setSelectedIngredientValues(initialData.ingredient_ids);
      } else {
        setSelectedIngredientValues([]);
      }
      setSelectedProductValues(initialData.product_ids || []);
      setSelectedCountryCodes(initialData.country_codes || []);
      setSelectedWorkflow(initialData.workflow_id || 'none');
    }
  }, [initialData]);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async (url: string, setter: React.Dispatch<React.SetStateAction<ComboboxOption[]>>, entityName: string) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const options = result.data.map((item: Entity | WorkflowResponse) => ({
              value: item.id,
              label: 'brand_name' in item && item.brand_name 
                ? `${item.name} (${item.brand_name})`
                : item.name,
            }));
            setter(options);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
      }
    };

    fetchData('/api/master-claim-brands', setMasterBrandOptions, 'master brands');
    fetchData('/api/products?limit=1000', setProductOptions, 'products'); // Increase limit to get all products
    fetchData('/api/ingredients?limit=1000', setIngredientOptions, 'ingredients'); // Increase limit to get all ingredients

  // Fetch claims workflows
    async function fetchClaimsWorkflows() {
      setIsLoadingWorkflows(true);
      try {
        const response = await fetch('/api/claims/workflows');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            const options = result.data.map((workflow: WorkflowResponse) => ({
              value: workflow.id,
              label: workflow.brand_name ? `${workflow.name} (${workflow.brand_name})` : workflow.name,
            }));
            setWorkflowOptions(options);
          }
        }
      } catch (error) {
        console.error('Error fetching claims workflows:', error);
      } finally {
        setIsLoadingWorkflows(false);
      }
    }

    fetchClaimsWorkflows();

    // Fetch active countries from API
    (async () => {
      try {
        const response = await fetch('/api/countries');
        const result = await response.json();
        if (response.ok && result.success && Array.isArray(result.countries)) {
          const options = result.countries.map((c: { code: string; name: string }) => ({ value: c.code, label: c.name })) as ComboboxOption[];
          setCountryOptions(options);
        } else if (result.data && Array.isArray(result.data)) {
          // Legacy shape fallback
          const options = result.data.map((c: { code: string; name: string }) => ({ value: c.code, label: c.name })) as ComboboxOption[];
          setCountryOptions(options);
        } else {
          setCountryOptions([]);
        }
      } catch (e) {
        setCountryOptions([]);
      } finally {
        setIsLoadingCountries(false);
      }
    })();
  }, []);

  // Form validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!level;
      case 2:
        if (level === 'brand') return !!selectedMasterBrand;
        if (level === 'product') return selectedProductValues.length > 0;
        if (level === 'ingredient') return selectedIngredientValues.length > 0;
        return false;
      case 3:
        return !!claimText && !!claimType;
      case 4:
        return selectedCountryCodes.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      toast.error('Please complete all required fields before proceeding');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: ClaimDefinitionData = {
      claim_text: claimText,
      claim_type: claimType,
      level,
      description: description || null,
      master_brand_id: level === 'brand' ? selectedMasterBrand : null,
      ingredient_ids: level === 'ingredient' ? selectedIngredientValues : undefined,
      product_ids: level === 'product' ? selectedProductValues : undefined,
      country_codes: selectedCountryCodes,
      workflow_id: selectedWorkflow && selectedWorkflow !== 'none' ? selectedWorkflow : null,
    };

    if (isEditMode && initialData) {
      if (initialData.id) formData.id = initialData.id;
      if (initialData.claim_grouping_id) formData.claim_grouping_id = initialData.claim_grouping_id;
    }

    await onSubmit(formData);
  };

  const steps = [
    { number: 1, title: "Choose Level" },
    { number: 2, title: "Select Entity" },
    { number: 3, title: "Claim Details" },
    { number: 4, title: "Target Markets" },
    { number: 5, title: "Additional Info" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {steps.map((step) => (
          <React.Fragment key={step.number}>
            <StepIndicator
              step={step.number}
              title={step.title}
              isActive={currentStep === step.number}
              isCompleted={currentStep > step.number}
            />
            {step.number < steps.length && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Choose Level */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Choose Claim Level</CardTitle>
            <CardDescription>
              Select the scope of your claim. This determines what entity the claim will be associated with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="level">Claim Level <span className="text-red-500">*</span></Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select claim level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-medium">Brand Level</div>
                        <div className="text-xs text-muted-foreground">Applies to all products under a brand</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="product">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-medium">Product Level</div>
                        <div className="text-xs text-muted-foreground">Applies to specific products only</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="ingredient">
                    <div className="flex items-start gap-2">
                      <FlaskConical className="h-4 w-4 mt-0.5" />
                      <div>
                        <div className="font-medium">Ingredient Level</div>
                        <div className="text-xs text-muted-foreground">Applies to products containing this ingredient</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Choosing the right level:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Brand:</strong> Use for claims that apply universally across a brand</li>
                    <li><strong>Product:</strong> Use for product-specific benefits or features</li>
                    <li><strong>Ingredient:</strong> Use for ingredient-related claims across multiple products</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Entity */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select {level === 'brand' ? 'Brand' : level === 'product' ? 'Products' : 'Ingredients'}</CardTitle>
            <CardDescription>
              Choose the specific {level} this claim will be associated with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {level === 'brand' && (
              <div className="space-y-2">
                <Label htmlFor="brand">Master Brand <span className="text-red-500">*</span></Label>
                <Select value={selectedMasterBrand} onValueChange={setSelectedMasterBrand}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Select master brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterBrandOptions.map(brand => (
                      <SelectItem key={brand.value} value={brand.value}>{brand.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {level === 'product' && (
              <div className="space-y-2">
                <Label>Products <span className="text-red-500">*</span></Label>
                <MultiSelectCheckboxCombobox
                  options={productOptions}
                  selectedValues={selectedProductValues}
                  onChange={setSelectedProductValues}
                  placeholder="Select products"
                  searchPlaceholder="Search products..."
                />
              </div>
            )}

            {level === 'ingredient' && (
              <div className="space-y-2">
                <Label>Ingredients <span className="text-red-500">*</span></Label>
                <MultiSelectCheckboxCombobox
                  options={ingredientOptions}
                  selectedValues={selectedIngredientValues}
                  onChange={setSelectedIngredientValues}
                  placeholder="Select ingredients"
                  searchPlaceholder="Search ingredients..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Claim Details */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Claim Details</CardTitle>
            <CardDescription>
              Define the claim text, type, and approval workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claimText">Claim Text <span className="text-red-500">*</span></Label>
              <Textarea
                id="claimText"
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Enter the claim text (e.g., 'Contains vitamin C', 'Organic certified')"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Be specific and factual. This text will appear in your content.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimType">Claim Type <span className="text-red-500">*</span></Label>
              <Select value={claimType} onValueChange={setClaimType}>
                <SelectTrigger id="claimType">
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowed">
                    <div>
                      <div className="font-medium text-green-600">Allowed</div>
                      <div className="text-xs text-muted-foreground">Can be used freely in content</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="disallowed">
                    <div>
                      <div className="font-medium text-red-600">Disallowed</div>
                      <div className="text-xs text-muted-foreground">Cannot be used in content</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow">Approval Workflow</Label>
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow} disabled={isLoadingWorkflows}>
                <SelectTrigger id="workflow">
                  <SelectValue placeholder={isLoadingWorkflows ? "Loading workflows..." : "Select workflow (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No workflow</SelectItem>
                  {workflowOptions.map(workflow => (
                    <SelectItem key={workflow.value} value={workflow.value}>{workflow.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If selected, this claim will go through the approval process before becoming active.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Target Markets */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Target Markets</CardTitle>
            <CardDescription>
              Select the countries where this claim is valid and can be used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Target Countries <span className="text-red-500">*</span></Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedCountryCodes.length === countryOptions.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCountryCodes(countryOptions.map(opt => opt.value));
                      } else {
                        setSelectedCountryCodes([]);
                      }
                    }}
                  />
                  <Label htmlFor="selectAll" className="font-medium">
                    Select All Countries
                  </Label>
                </div>
                
                <MultiSelectCheckboxCombobox
                  options={countryOptions}
                  selectedValues={selectedCountryCodes}
                  onChange={setSelectedCountryCodes}
                  placeholder="Select target countries"
                  searchPlaceholder="Search countries..."
                  disabled={isLoadingCountries}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Claims will only be available for use in the selected countries.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Additional Information */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Additional Information</CardTitle>
            <CardDescription>
              Provide any additional context or notes about this claim (optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any additional context, legal notes, or usage guidelines..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This information is for internal reference only.
              </p>
            </div>

            {/* Summary of selections */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Summary</h4>
              <div className="text-xs space-y-1">
                <p><strong>Level:</strong> {level}</p>
                <p><strong>Claim:</strong> {claimText || <em>Not set</em>}</p>
                <p><strong>Type:</strong> {claimType || <em>Not set</em>}</p>
                <p><strong>Markets:</strong> {selectedCountryCodes.length} countries selected</p>
                {selectedWorkflow && <p><strong>Workflow:</strong> Selected</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          
          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!validateStep(currentStep) || isLoading}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !validateStep(currentStep)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Claim' : 'Create Claim'
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};
