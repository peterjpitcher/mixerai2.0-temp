'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';
import { Claim, MarketClaimOverride, ClaimTypeEnum } from '@/lib/claims-utils'; 
import { Heading } from '@/components/ui/heading';
import { Edit3, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// import { } from "@/lib/constants/country-codes"; // Removed - empty import

// Base Entity interface
interface Entity {
  id: string;
  name: string;
}

// Product specific entity, can extend base Entity
interface ProductEntity extends Entity {
    brand_id?: string;
    master_brand_id?: string;
    // other product fields can be added here
}

interface CountryOption { // For API response
  code: string;
  name: string;
}

// Updated to match the enriched data from the API
interface UIMarketClaimOverride extends MarketClaimOverride {
  master_claim_text?: string; 
  master_claim_type?: ClaimTypeEnum;
  replacement_claim_text?: string;
  replacement_claim_type?: ClaimTypeEnum;
}

export default function MarketOverridesPage() {
  const [products, setProducts] = useState<ProductEntity[]>([]); 
  const [selectedProductId, setSelectedProductId] = useState<string>('all'); // Default to 'all'
  const [availableCountries, setAvailableCountries] = useState<ComboboxOption[]>([]); 
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true); 
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('all'); // Default to 'all'
  
  // No longer fetching masterClaimsForProduct, directly fetch and display overrides
  // const [masterClaimsForProduct, setMasterClaimsForProduct] = useState<Claim[]>([]);
  const [marketOverrides, setMarketOverrides] = useState<UIMarketClaimOverride[]>([]); 
  
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for save/delete actions
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  // const [isLoadingMasterClaims, setIsLoadingMasterClaims] = useState<boolean>(false); // Removed
  const [isLoadingOverrides, setIsLoadingOverrides] = useState<boolean>(false); // For fetching the list of overrides

  const [isCreateOverrideDialogOpen, setIsCreateOverrideDialogOpen] = useState(false);
  const [isEditOverrideDialogOpen, setIsEditOverrideDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  
  const [currentMasterClaimToOverride, setCurrentMasterClaimToOverride] = useState<Claim | null>(null);
  const [currentOverrideToEdit, setCurrentOverrideToEdit] = useState<UIMarketClaimOverride | null>(null);
  const [overrideToDelete, setOverrideToDelete] = useState<UIMarketClaimOverride | null>(null);
  
  const [overrideActionType, setOverrideActionType] = useState<'block' | 'replace_new' | 'replace_existing'>('block');
  const [replacementClaimIdInput, setReplacementClaimIdInput] = useState<string>('');
  const [newReplacementClaimText, setNewReplacementClaimText] = useState('');
  const [newReplacementClaimType, setNewReplacementClaimType] = useState<ClaimTypeEnum>('allowed');
  const [newReplacementClaimDescription, setNewReplacementClaimDescription] = useState('');

  useEffect(() => { 
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch('/api/products'); 
        if (!response.ok) throw new Error('Failed to fetch products');
        const apiResponse = await response.json();
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          setProducts(apiResponse.data as ProductEntity[]); 
        } else { toast.error('Could not load products.'); setProducts([]); }
      } catch (error) { console.error('Error fetching products:', error); toast.error('Error fetching products.'); setProducts([]); }
      finally { setIsLoadingProducts(false); }
    };
    fetchProducts();

    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Failed to fetch countries');
        const apiResponse = await response.json();
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          const countryOptions = apiResponse.data.map((country: CountryOption) => ({ value: country.code, label: country.name }));
          setAvailableCountries(countryOptions);
        } else {
          toast.error('Could not load countries for selection.');
          setAvailableCountries([]);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
        toast.error('Error fetching countries.');
        setAvailableCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Renamed and modified function
  const fetchMarketOverrides = useCallback(async () => {
    // Do not fetch if no filter is selected, or handle as show all? For now, let's assume we can show all if both are 'all'
    // if (selectedProductId === 'all' && selectedCountryCode === 'all') {
    //   setMarketOverrides([]); // Or fetch all overrides, which could be large
    //   return;
    // }
    setIsLoadingOverrides(true);
    setMarketOverrides([]); // Clear previous results

    let queryString = '/api/market-overrides?';
    const params: string[] = [];
    if (selectedProductId && selectedProductId !== 'all') {
      params.push(`target_product_id=${selectedProductId}`);
    }
    if (selectedCountryCode && selectedCountryCode !== 'all') {
      params.push(`market_country_code=${selectedCountryCode}`);
    }
    queryString += params.join('&');

    try {
      const responseOverrides = await fetch(queryString);
      if (!responseOverrides.ok) { 
        const errorData = await responseOverrides.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch market overrides');
      }
      const apiResponseOverrides = await responseOverrides.json();
      if (apiResponseOverrides.success && Array.isArray(apiResponseOverrides.data)) {
        setMarketOverrides(apiResponseOverrides.data as UIMarketClaimOverride[]);
      } else { 
        toast.error(apiResponseOverrides.error ||'Could not load market overrides.'); 
        setMarketOverrides([]); 
      }
    } catch (error: unknown) { 
      console.error('Error fetching market overrides:', error); 
      toast.error(error instanceof Error ? error.message : 'Error fetching market overrides.'); 
      setMarketOverrides([]); 
    }
    finally { setIsLoadingOverrides(false); }
  }, [selectedProductId, selectedCountryCode]);

  useEffect(() => {
    // Fetch overrides whenever selectedProductId or selectedCountryCode changes
    fetchMarketOverrides();
  }, [selectedProductId, selectedCountryCode, fetchMarketOverrides]);
  
  const handleSaveOverride = async () => {
    setIsLoading(true);
    let overridePayload: Partial<MarketClaimOverride> = {};
    let masterClaimContextId: string | undefined;
    let url: string;
    let method: 'POST' | 'PUT';
    
    const masterClaimDetails = isEditOverrideDialogOpen && currentOverrideToEdit ? 
        currentMasterClaimToOverride :
        (isCreateOverrideDialogOpen && currentMasterClaimToOverride ? currentMasterClaimToOverride : null);

    if (!masterClaimDetails) {
        toast.error('Master claim context is missing.'); setIsLoading(false); return;
    }
    const originalMasterClaimLevel = masterClaimDetails.level;
    // Get the specific entity ID from the masterClaimDetails, which should now be correctly populated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const masterClaimEntityId = masterClaimDetails.product_id || masterClaimDetails.master_brand_id || masterClaimDetails.ingredient_id;

    if (isEditOverrideDialogOpen && currentOverrideToEdit) {
        url = `/api/market-overrides/${currentOverrideToEdit.id}`;
        method = 'PUT';
        overridePayload = {
            is_blocked: overrideActionType === 'block',
            replacement_claim_id: overrideActionType === 'replace_existing' && replacementClaimIdInput ? replacementClaimIdInput : null,
        };
        masterClaimContextId = currentOverrideToEdit.master_claim_id;
    } else if (isCreateOverrideDialogOpen && currentMasterClaimToOverride) {
        url = '/api/market-overrides';
        method = 'POST';
        overridePayload = {
            master_claim_id: currentMasterClaimToOverride.id,
            target_product_id: selectedProductId,
            market_country_code: selectedCountryCode,
            is_blocked: overrideActionType === 'block',
            replacement_claim_id: overrideActionType === 'replace_existing' && replacementClaimIdInput ? replacementClaimIdInput : null,
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        masterClaimContextId = currentMasterClaimToOverride.id;
    } else {
        toast.error('Invalid state for saving override.'); setIsLoading(false); return;
    }
    
    if (overrideActionType === 'replace_new') {
        if (!newReplacementClaimText.trim()) {
            toast.error('New replacement claim text is required.');
            setIsLoading(false); return;
        }
        try {
            const newClaimPayload: Partial<Claim> = {
                claim_text: newReplacementClaimText,
                claim_type: newReplacementClaimType,
                description: newReplacementClaimDescription,
                level: originalMasterClaimLevel, 
                country_code: selectedCountryCode, 
            };

            if (originalMasterClaimLevel === 'product') {
                newClaimPayload.product_id = masterClaimDetails.product_id;
            } else if (originalMasterClaimLevel === 'brand') {
                newClaimPayload.master_brand_id = masterClaimDetails.master_brand_id;
                 if (!newClaimPayload.master_brand_id) {
                    toast.error('Brand ID context missing for brand-level replacement claim.');
                    setIsLoading(false); return;
                }
            } else if (originalMasterClaimLevel === 'ingredient') {
                newClaimPayload.ingredient_id = masterClaimDetails.ingredient_id;
                if (!newClaimPayload.ingredient_id) {
                    toast.error('Ingredient ID context missing for ingredient-level replacement claim. This feature is limited.');
                    setIsLoading(false); return;
                }
            }

            const claimResponse = await fetch('/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClaimPayload)
            });
            const claimResult = await claimResponse.json();
            if (!claimResponse.ok || !claimResult.success || !claimResult.data?.id) {
                throw new Error(claimResult.error || 'Failed to create new replacement claim.');
            }
            overridePayload.replacement_claim_id = claimResult.data.id;
            overridePayload.is_blocked = false; 
        } catch (error: unknown) {
            toast.error(`Error creating new replacement claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsLoading(false); return;
        }
    }

    try {
        const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overridePayload) });
        const result = await response.json();
        if (!response.ok || !result.success) { throw new Error(result.error || `Failed to ${method === 'POST' ? 'create' : 'update'} override`); }
        toast.success(`Market override ${method === 'POST' ? 'created' : 'updated'} successfully!`);
        fetchMarketOverrides(); 
        setIsCreateOverrideDialogOpen(false); setIsEditOverrideDialogOpen(false);
    } catch (error: unknown) { console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} override:`, error); toast.error(error instanceof Error ? error.message : `Failed to ${method === 'POST' ? 'create' : 'update'} override.`); }
    finally { setIsLoading(false); }
  };

  const handleDeleteOverride = async () => { 
    if (!overrideToDelete) return;
    setIsLoading(true); 
    try {
        const response = await fetch(`/api/market-overrides/${overrideToDelete.id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok || !result.success) { throw new Error(result.error || 'Failed to delete override');}
        toast.success('Market override removed successfully!');
        fetchMarketOverrides(); 
        setIsConfirmDeleteDialogOpen(false); setOverrideToDelete(null);
    } catch (error: unknown) { console.error('Error deleting override:', error); toast.error(error instanceof Error ? error.message : 'Failed to remove override.'); }
    finally { setIsLoading(false); setIsConfirmDeleteDialogOpen(false);}
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openCreateOverrideDialog = (masterClaim: Claim) => {
    setCurrentMasterClaimToOverride(masterClaim);
    setCurrentOverrideToEdit(null); 
    setOverrideActionType('block'); 
    setReplacementClaimIdInput('');
    setNewReplacementClaimText(masterClaim.claim_text);
    setNewReplacementClaimType(masterClaim.claim_type);
    setNewReplacementClaimDescription(masterClaim.description || '');
    setIsCreateOverrideDialogOpen(true);
    setIsEditOverrideDialogOpen(false);
  };

  const openEditOverrideDialog = (override: UIMarketClaimOverride) => {
    // Construct a partial Claim object for dialog display purposes
    const masterClaimContextForDialog: Partial<Claim> = {
        id: override.master_claim_id, // Essential for context if any action relies on master_claim_id
        claim_text: override.master_claim_text,
        claim_type: override.master_claim_type,
        // level and country_code (of the master claim) are not directly in UIMarketClaimOverride
        // but might not be strictly needed for dialog display if text/type are sufficient
    };
    setCurrentMasterClaimToOverride(masterClaimContextForDialog as Claim); // Cast if needed, ensure type compatibility

    setCurrentOverrideToEdit(override);
    const action = override.is_blocked && !override.replacement_claim_id ? 'block' : override.replacement_claim_id ? 'replace_existing' : 'block';
    setOverrideActionType(action);
    setReplacementClaimIdInput(override.replacement_claim_id || '');
    
    setNewReplacementClaimText(override.replacement_claim_text || override.master_claim_text || ''); 
    setNewReplacementClaimType(override.replacement_claim_type || override.master_claim_type || 'allowed');
    // Description for a new replacement claim should probably be empty or from override.replacement_claim_description if we add that to UIMarketClaimOverride
    setNewReplacementClaimDescription(override.replacement_claim_text && (override as unknown as Record<string, unknown>).replacement_claim_description ? (override as unknown as Record<string, unknown>).replacement_claim_description as string : ''); 
    
    setIsEditOverrideDialogOpen(true);
    setIsCreateOverrideDialogOpen(false);
  };

  const openConfirmDeleteDialog = (override: UIMarketClaimOverride) => { 
    setOverrideToDelete(override);
    setIsConfirmDeleteDialogOpen(true);
  }

  const renderOverrideDialogFields = () => { 
    return (
    <div className="py-4 space-y-4">
        <div>
            <Label htmlFor="overrideActionType">Override Action</Label>
            <Select value={overrideActionType} onValueChange={(v) => setOverrideActionType(v as typeof overrideActionType)}>
                <SelectTrigger id="overrideActionType"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="block">Block this Master Claim</SelectItem>
                    <SelectItem value="replace_existing">Replace with EXISTING Market Claim ID</SelectItem>
                    <SelectItem value="replace_new">Replace with NEW Market-Specific Claim</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {overrideActionType === 'block' && (
            <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">The Master claim will be blocked for this product in this market.</p>
        )}
        {overrideActionType === 'replace_existing' && (
            <div>
                <Label htmlFor="replacementClaimIdInput">Existing Market Claim ID for Replacement</Label>
                <Input id="replacementClaimIdInput" value={replacementClaimIdInput} onChange={e => setReplacementClaimIdInput(e.target.value)} placeholder="Enter UUID of market-specific claim"/>
                <p className="text-xs text-muted-foreground mt-1">Ensure this ID is a claim specific to the market: {availableCountries.find(c=>c.value === selectedCountryCode)?.label || 'Selected Market'}.</p>
            </div>
        )}
        {overrideActionType === 'replace_new' && (
            <div className="space-y-3 p-4 border rounded-md bg-slate-50">
                <h4 className="font-medium text-slate-700">Define New Replacement Claim Details</h4>
                <div>
                    <Label htmlFor="newReplacementClaimText">New Claim Text</Label>
                    <Textarea id="newReplacementClaimText" value={newReplacementClaimText} onChange={e => setNewReplacementClaimText(e.target.value)} placeholder="Enter text for the new market-specific claim"/>
                </div>
                <div>
                    <Label htmlFor="newReplacementClaimType">New Claim Type</Label>
                    <Select value={newReplacementClaimType} onValueChange={v => setNewReplacementClaimType(v as ClaimTypeEnum)}>
                        <SelectTrigger id="newReplacementClaimType"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="allowed">Allowed</SelectItem>
                            <SelectItem value="disallowed">Disallowed</SelectItem>
                            <SelectItem value="mandatory">Mandatory</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="newReplacementClaimDescription">New Claim Description (Optional)</Label>
                    <Textarea id="newReplacementClaimDescription" value={newReplacementClaimDescription} onChange={e => setNewReplacementClaimDescription(e.target.value)} placeholder="Optional description for the new claim"/>
                </div>
            </div>
        )}
    </div>
  )};

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Heading title="Manage Market Claim Overrides" description="Block or replace Master (Global) claims for specific products in selected markets." />
      <Card className="mb-6"> 
        <CardHeader><CardTitle>Context Selection</CardTitle><CardDescription>Choose a product and a target market to manage its overrides.</CardDescription></CardHeader>
        <CardContent className="space-y-4 md:space-y-0 md:flex md:space-x-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="product-select">Product</Label>
            <Select 
                value={selectedProductId} 
                onValueChange={setSelectedProductId} 
                disabled={isLoadingProducts || isLoading}
            >
              <SelectTrigger id="product-select">
                <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select product or All Products"} /> 
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem> 
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="country-select">Market/Country</Label>
            <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode} disabled={isLoadingCountries || isLoading}>
              <SelectTrigger id="country-select"><SelectValue placeholder={isLoadingCountries ? "Loading markets..." : "Select market or All Markets"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem> 
                {availableCountries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Remove isLoadingMasterClaims, rely on isLoadingOverrides */}
      {isLoadingOverrides && <p className="text-center py-4">Loading market overrides...</p>}

      {/* Display Overrides Table */}
      {!isLoadingOverrides && (
        <Card>
          <CardHeader>
            <CardTitle>Market Claim Overrides</CardTitle>
            <CardDescription>
              Displaying overrides based on selection: 
              Product: {selectedProductId === 'all' ? 'All' : products.find(p=>p.id === selectedProductId)?.name || selectedProductId}, 
              Market: {selectedCountryCode === 'all' ? 'All' : availableCountries.find(c=>c.value === selectedCountryCode)?.label || selectedCountryCode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketOverrides.length === 0 ? (
              <p className="text-muted-foreground">No market overrides found for the current selection.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Master Claim Text</TableHead>
                    <TableHead>Override Status</TableHead>
                    <TableHead>Replacement Claim</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketOverrides.map(override => {
                    // Need to fetch product name if selectedProductId is 'all'
                    const productName = selectedProductId === 'all' 
                                        ? products.find(p => p.id === override.target_product_id)?.name 
                                        : products.find(p => p.id === selectedProductId)?.name;
                    // Need to fetch market name if selectedCountryCode is 'all'
                    const marketName = selectedCountryCode === 'all'
                                       ? availableCountries.find(c => c.value === override.market_country_code)?.label
                                       : availableCountries.find(c => c.value === selectedCountryCode)?.label;

                    return (
                      <TableRow key={override.id}>
                        <TableCell>{productName || override.target_product_id}</TableCell>
                        <TableCell>{marketName || override.market_country_code}</TableCell>
                        <TableCell className="max-w-xs break-words">{override.master_claim_text || 'N/A'}</TableCell>
                        <TableCell>
                          {override.is_blocked ? (
                            <Badge variant="destructive">Blocked</Badge>
                          ) : override.replacement_claim_id ? (
                            <Badge variant="secondary">Replaced</Badge>
                          ) : (
                            <Badge variant="outline">No Action</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs break-words">
                          {override.replacement_claim_id ? `${override.replacement_claim_text || 'N/A'} (${override.replacement_claim_type?.toUpperCase() || 'N/A'})` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditOverrideDialog(override)} disabled={isLoading} className="h-8 mr-1">
                            <Edit3 className="h-3 w-3 mr-1"/> Edit
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openConfirmDeleteDialog(override)} title="Remove Override" aria-label="Remove Override" disabled={isLoading} className="h-8 w-8">
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs (Create/Edit/Delete) - These need careful review as their context relied on selected Master Claim */}
      {/* For Create: We can't create an override without a master claim context. This flow needs to change. */}
      {/* Maybe remove Create dialog from this page, or add a step to select a master claim first if a product/market is chosen? */}
      {/* For Edit: Dialog needs master_claim_text. The override data from API has it. */}

      {/* Edit Override Dialog - Ensure currentOverrideToEdit has master_claim_text from the fetched override data */}
      <Dialog open={isEditOverrideDialogOpen} onOpenChange={setIsEditOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Market Override</DialogTitle>
             <div className="text-sm text-muted-foreground pt-1">
                {/* Display master_claim_text from currentOverrideToEdit */}
                <p>Master Claim: <strong>{currentOverrideToEdit?.master_claim_text || (currentMasterClaimToOverride?.claim_text || 'Loading...')}</strong></p>
                <p>For Product: <strong>{products.find(p=>p.id === currentOverrideToEdit?.target_product_id)?.name || 'Selected Product'}</strong></p>
                <p>In Market: <strong>{availableCountries.find(c=>c.value === currentOverrideToEdit?.market_country_code)?.label || 'Selected Market'}</strong></p>
                <p className="text-xs mt-1">Override ID: {currentOverrideToEdit?.id}</p>
            </div>
          </DialogHeader>
          {renderOverrideDialogFields()} 
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
            <Button onClick={handleSaveOverride} disabled={isLoading || (overrideActionType === 'replace_existing' && !replacementClaimIdInput) || (overrideActionType === 'replace_new' && !newReplacementClaimText.trim())}>
              {isLoading ? 'Saving...' : 'Update Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Override Dialog - This needs significant re-thinking. How to select a master claim? */}
      {/* Option 1: Remove create from this page. Overrides are created from a master claim list elsewhere. */}
      {/* Option 2: If a product & market are selected, show a list of that product's master claims, then allow override. */}
      {/* For now, let's hide the direct create dialog trigger from main table, edit still viable */}

      {/* Confirm Delete Override Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Confirm Removal</DialogTitle>
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to remove the override for master claim &quot;<strong>{ overrideToDelete?.master_claim_text || 'this claim'}</strong>&quot;?
                </p>
                <p className="text-sm text-muted-foreground pt-2">
                     This action will revert its behavior in {availableCountries.find(c=>c.value === selectedCountryCode)?.label || 'the selected market'} for {products.find(p=>p.id === selectedProductId)?.name || 'the selected product'} to the Master claim&apos;s original status.
                </p>
            </DialogHeader>
            <DialogFooter className="sm:justify-end pt-4">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
                <Button type="button" variant="destructive" onClick={handleDeleteOverride} disabled={isLoading}>
                    {isLoading ? 'Removing...' : 'Yes, Remove Override'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 