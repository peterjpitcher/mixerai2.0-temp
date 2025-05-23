'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ComboboxOption } from '@/components/ui/MultiSelectCheckboxCombobox';
import { EffectiveClaim, Claim, MarketClaimOverride, ClaimTypeEnum, ClaimLevelEnum } from '@/lib/claims-utils'; 
import { Heading } from '@/components/ui/heading';
import { PlusCircle, Edit3, XCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Base Entity interface
interface Entity {
  id: string;
  name: string;
}

// Product specific entity, can extend base Entity
interface ProductEntity extends Entity {
    brand_id?: string; 
    global_brand_id?: string; // Added to ensure we can capture this if API provides it
    // other product fields can be added here
}

const staticCountriesRaw = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

// Updated to match the enriched data from the API
interface UIMarketClaimOverride extends MarketClaimOverride {
  master_claim_text?: string; 
  master_claim_type?: ClaimTypeEnum;
  replacement_claim_text?: string;
  replacement_claim_type?: ClaimTypeEnum;
}

export default function MarketOverridesPage() {
  const [products, setProducts] = useState<ProductEntity[]>([]); 
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const countries: ComboboxOption[] = staticCountriesRaw.map(c => ({ value: c.code, label: c.name }));
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  
  const [masterClaimsForProduct, setMasterClaimsForProduct] = useState<Claim[]>([]);
  const [existingOverrides, setExistingOverrides] = useState<UIMarketClaimOverride[]>([]); // Will now hold enriched data
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isLoadingMasterClaims, setIsLoadingMasterClaims] = useState<boolean>(false);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState<boolean>(false);

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
          setProducts(apiResponse.data as ProductEntity[]); // Cast to ProductEntity array
        } else { toast.error('Could not load products.'); setProducts([]); }
      } catch (error) { console.error('Error fetching products:', error); toast.error('Error fetching products.'); setProducts([]); }
      finally { setIsLoadingProducts(false); }
    };
    fetchProducts();
  }, []);

  const fetchMasterClaimsAndOverrides = useCallback(async () => {
    if (!selectedProductId || !selectedCountryCode) return;
    setIsLoadingMasterClaims(true); setIsLoadingOverrides(true);
    // masterClaimsForProduct does not need existingOverrides data, so can be fetched/set independently first.
    const currentProduct = products.find(p => p.id === selectedProductId);
    try {
      const responseGlobal = await fetch(`/api/products/${selectedProductId}/stacked-claims?countryCode=__GLOBAL__`);
      if (!responseGlobal.ok) throw new Error('Failed to fetch master claims for product');
      const apiResponseGlobal = await responseGlobal.json();
      if (apiResponseGlobal.success && Array.isArray(apiResponseGlobal.data)) {
        const fetchedMasterClaims = apiResponseGlobal.data.filter((ec: EffectiveClaim) => 
            ec.source_claim_id && ec.original_claim_country_code === '__GLOBAL__' && // Use original_claim_country_code
            ec.source_level !== 'override' && ec.source_level !== 'none'
        ).map((m: EffectiveClaim) => {
            let claimEntityProps: Partial<Claim> = {};
            if (m.source_level === 'product' && m.source_entity_id) {
                claimEntityProps.product_id = m.source_entity_id;
            } else if (m.source_level === 'ingredient' && m.source_entity_id) {
                claimEntityProps.ingredient_id = m.source_entity_id;
            } else if (m.source_level === 'brand' && m.source_entity_id) {
                claimEntityProps.global_brand_id = m.source_entity_id;
            } else if (m.source_level === 'brand' && currentProduct?.global_brand_id) {
                // Fallback for brand level if source_entity_id wasn't directly on effective claim but on product
                claimEntityProps.global_brand_id = currentProduct.global_brand_id;
            }

            return {
                id: m.source_claim_id!,
                claim_text: m.claim_text, 
                claim_type: m.final_claim_type as ClaimTypeEnum, 
                level: m.source_level as ClaimLevelEnum, 
                country_code: '__GLOBAL__', // Master claims are always __GLOBAL__
                description: m.description,
                ...claimEntityProps
            } as Claim;
        });
        setMasterClaimsForProduct(fetchedMasterClaims);
      } else { toast.error(apiResponseGlobal.error || 'Could not load master claims.'); setMasterClaimsForProduct([]); }
    } catch (error: any) { console.error('Error fetching master claims:', error); toast.error(error.message || 'Error fetching master claims.'); setMasterClaimsForProduct([]); }
    finally { setIsLoadingMasterClaims(false); }

    try {
      const responseOverrides = await fetch(`/api/market-overrides?target_product_id=${selectedProductId}&market_country_code=${selectedCountryCode}`);
      if (!responseOverrides.ok) { 
        const errorData = await responseOverrides.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch existing market overrides');
      }
      const apiResponseOverrides = await responseOverrides.json();
      if (apiResponseOverrides.success && Array.isArray(apiResponseOverrides.data)) {
        // Data from API is now enriched, directly set it.
        setExistingOverrides(apiResponseOverrides.data as UIMarketClaimOverride[]);
      } else { toast.error(apiResponseOverrides.error ||'Could not load existing overrides.'); setExistingOverrides([]); }
    } catch (error: any) { console.error('Error fetching overrides:', error); toast.error(error.message || 'Error fetching overrides.'); setExistingOverrides([]); }
    finally { setIsLoadingOverrides(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, selectedCountryCode, products]);

  useEffect(() => {
    if (selectedProductId && selectedCountryCode) {
      fetchMasterClaimsAndOverrides();
    }
  }, [selectedProductId, selectedCountryCode, fetchMasterClaimsAndOverrides]);
  
  const handleSaveOverride = async () => {
    setIsLoading(true);
    let overridePayload: Partial<MarketClaimOverride> = {};
    let masterClaimContextId: string | undefined;
    let url: string;
    let method: 'POST' | 'PUT';
    
    const masterClaimDetails = isEditOverrideDialogOpen && currentOverrideToEdit ? 
        masterClaimsForProduct.find(mc => mc.id === currentOverrideToEdit.master_claim_id) :
        (isCreateOverrideDialogOpen && currentMasterClaimToOverride ? currentMasterClaimToOverride : null);

    if (!masterClaimDetails) {
        toast.error('Master claim context is missing.'); setIsLoading(false); return;
    }
    const originalMasterClaimLevel = masterClaimDetails.level;
    // Get the specific entity ID from the masterClaimDetails, which should now be correctly populated
    const masterClaimEntityId = masterClaimDetails.product_id || masterClaimDetails.global_brand_id || masterClaimDetails.ingredient_id;

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
                newClaimPayload.product_id = masterClaimDetails.product_id; // Use product_id from masterClaimDetails
            } else if (originalMasterClaimLevel === 'brand') {
                newClaimPayload.global_brand_id = masterClaimDetails.global_brand_id; // Use global_brand_id from masterClaimDetails
                 if (!newClaimPayload.global_brand_id) {
                    toast.error('Brand ID context missing for brand-level replacement claim.');
                    setIsLoading(false); return;
                }
            } else if (originalMasterClaimLevel === 'ingredient') {
                newClaimPayload.ingredient_id = masterClaimDetails.ingredient_id; // Use ingredient_id from masterClaimDetails
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
        } catch (error: any) {
            toast.error(`Error creating new replacement claim: ${error.message}`);
            setIsLoading(false); return;
        }
    }

    try {
        const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overridePayload) });
        const result = await response.json();
        if (!response.ok || !result.success) { throw new Error(result.error || `Failed to ${method === 'POST' ? 'create' : 'update'} override`); }
        toast.success(`Market override ${method === 'POST' ? 'created' : 'updated'} successfully!`);
        fetchMasterClaimsAndOverrides(); 
        setIsCreateOverrideDialogOpen(false); setIsEditOverrideDialogOpen(false);
    } catch (error: any) { console.error(`Error ${method === 'POST' ? 'creating' : 'updating'} override:`, error); toast.error(error.message || `Failed to ${method === 'POST' ? 'create' : 'update'} override.`); }
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
        fetchMasterClaimsAndOverrides(); 
        setIsConfirmDeleteDialogOpen(false); setOverrideToDelete(null);
    } catch (error: any) { console.error('Error deleting override:', error); toast.error(error.message || 'Failed to remove override.'); }
    finally { setIsLoading(false); setIsConfirmDeleteDialogOpen(false);}
  }
  
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
    const masterClaimContext = masterClaimsForProduct.find(mc => mc.id === override.master_claim_id);
    setCurrentMasterClaimToOverride(masterClaimContext || null); // For displaying master claim text
    setCurrentOverrideToEdit(override);
    const action = override.is_blocked && !override.replacement_claim_id ? 'block' : override.replacement_claim_id ? 'replace_existing' : 'block';
    setOverrideActionType(action);
    setReplacementClaimIdInput(override.replacement_claim_id || '');
    
    // Pre-fill new replacement fields based on existing replacement if available, else from master
    setNewReplacementClaimText(override.replacement_claim_text || masterClaimContext?.claim_text || ''); 
    setNewReplacementClaimType(override.replacement_claim_type || masterClaimContext?.claim_type || 'allowed');
    setNewReplacementClaimDescription(override.replacement_claim_text ? (override as any).description || '' : masterClaimContext?.description || ''); // If there is replacement_claim_text, its description should be fetched
    
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
                <p className="text-xs text-muted-foreground mt-1">Ensure this ID is a claim specific to the market: {countries.find(c=>c.value === selectedCountryCode)?.label || 'Selected Market'}.</p>
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
                <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select product"} />
                </SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="country-select">Market/Country</Label>
            <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode} disabled={isLoading}>
              <SelectTrigger id="country-select"><SelectValue placeholder="Select market" /></SelectTrigger>
              <SelectContent>{countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(isLoadingMasterClaims || isLoadingOverrides) && !isLoading && <p className="text-center py-4">Loading claims information...</p>}

      {selectedProductId && selectedCountryCode && !isLoadingMasterClaims && !isLoadingOverrides && (
        <div className="space-y-8">
          <Card> 
            <CardHeader>
              <CardTitle>Master (Global) Claims for "{products.find(p=>p.id === selectedProductId)?.name || 'Product'}"</CardTitle>
              <CardDescription>Override these for {countries.find(c=>c.value === selectedCountryCode)?.label || 'Selected Market'}.</CardDescription>
            </CardHeader>
            <CardContent>
              {masterClaimsForProduct.length === 0 && <p className="text-muted-foreground">No Master claims found for this product context.</p>}
              {masterClaimsForProduct.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Master Claim Text</TableHead><TableHead>Original Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {masterClaimsForProduct.map(masterClaim => {
                      const existingOverride = existingOverrides.find(ovr => ovr.master_claim_id === masterClaim.id);
                      return (
                        <TableRow key={masterClaim.id}>
                          <TableCell className="max-w-md break-words py-3">
                            {masterClaim.claim_text}
                            {existingOverride && existingOverride.replacement_claim_id && existingOverride.replacement_claim_text && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    ↳ Replaced by: "{existingOverride.replacement_claim_text}" ({existingOverride.replacement_claim_type?.toUpperCase()})
                                </p>
                            )}
                          </TableCell>
                          <TableCell><Badge variant={masterClaim.claim_type === 'allowed' ? 'default' : masterClaim.claim_type === 'disallowed' ? 'destructive' : 'secondary'}>{masterClaim.claim_type.toUpperCase()}</Badge></TableCell>
                          <TableCell className="space-x-1 text-right">
                            {existingOverride ? (
                              <>
                                {existingOverride.is_blocked && !existingOverride.replacement_claim_id && <Badge variant="destructive" className="mr-2">Blocked</Badge>}
                                {/* Replacement text now shown below master claim text */}
                                <Button variant="outline" size="sm" onClick={() => { openEditOverrideDialog(existingOverride); }} disabled={isLoading} className="h-8">
                                  <Edit3 className="h-3 w-3 mr-1"/> Edit
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openConfirmDeleteDialog(existingOverride)} title="Remove Override" disabled={isLoading} className="h-8 w-8">
                                  <Trash2 className="h-4 w-4"/>
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => openCreateOverrideDialog(masterClaim)} disabled={isLoading} className="h-8">
                                <PlusCircle className="h-3 w-3 mr-1"/> Override
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Create Override Dialog */}
          <Dialog open={isCreateOverrideDialogOpen} onOpenChange={setIsCreateOverrideDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Override</DialogTitle>
                <div className="text-sm text-muted-foreground pt-1">
                    <p>Master Claim: <strong>{currentMasterClaimToOverride?.claim_text}</strong> ({currentMasterClaimToOverride?.claim_type.toUpperCase()})</p>
                    <p>For Product: <strong>{products.find(p=>p.id === selectedProductId)?.name}</strong> in Market: <strong>{countries.find(c=>c.value === selectedCountryCode)?.label}</strong></p>
                </div>
              </DialogHeader>
              {renderOverrideDialogFields()}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
                <Button onClick={handleSaveOverride} disabled={isLoading || (overrideActionType === 'replace_existing' && !replacementClaimIdInput) || (overrideActionType === 'replace_new' && !newReplacementClaimText.trim())}>
                  {isLoading ? 'Saving...' : 'Save Override'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Override Dialog */}
          <Dialog open={isEditOverrideDialogOpen} onOpenChange={setIsEditOverrideDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Market Override</DialogTitle>
                 <div className="text-sm text-muted-foreground pt-1">
                    <p>Master Claim: <strong>{currentOverrideToEdit?.master_claim_text || 'Loading...'}</strong></p>
                    <p>For Product: <strong>{products.find(p=>p.id === selectedProductId)?.name}</strong> in Market: <strong>{countries.find(c=>c.value === selectedCountryCode)?.label}</strong></p>
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

          {/* Confirm Delete Override Dialog */}
          <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Removal</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to remove the override for master claim "<strong>{ overrideToDelete?.master_claim_text || 'this claim'}</strong>"?
                    </p>
                    <p className="text-sm text-muted-foreground pt-2">
                         This action will revert its behavior in {countries.find(c=>c.value === selectedCountryCode)?.label || 'the selected market'} for {products.find(p=>p.id === selectedProductId)?.name || 'the selected product'} to the Master claim's original status.
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
      )}
    </div>
  );
} 