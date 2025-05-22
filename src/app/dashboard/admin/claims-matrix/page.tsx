"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { 
  Loader2, AlertTriangle, Search, FileText, Edit3, XOctagon, CornerDownRight, Info, CheckCircle2, MinusCircle, ShieldQuestion, Settings2, Trash2, Undo2, Replace, Save, Sparkles
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { COUNTRY_CODES, GLOBAL_COUNTRY_CODE, GLOBAL_COUNTRY_NAME } from "@/lib/constants/country-codes";
import { Claim, ClaimTypeEnum, GlobalClaimBrand as GlobalBrand, Product } from "@/lib/claims-utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// Types for AI Suggestions (matching API)
interface AISuggestion {
  claim_text: string;
  claim_type: ClaimTypeEnum;
  reasoning?: string;
}

// Updated types from API
interface MarketClaimOverrideInfo {
  overrideId: string;
  isBlocked: boolean;
  masterClaimIdItOverrides: string;
  replacementClaimId?: string | null;
  replacementClaimText?: string | null;
  replacementClaimType?: ClaimTypeEnum | null;
}

interface MatrixCellData {
  effectiveClaim: Claim | null;
  sourceMasterClaim?: Claim | null;
  activeOverride?: MarketClaimOverrideInfo | null;
}

interface MatrixProductRow {
  id: string;
  name: string;
  claims: Record<string, MatrixCellData | null>; 
}

interface ClaimsMatrixData {
  products: MatrixProductRow[];
  uniqueClaimTexts: string[];
}

const claimTypeDisplayInfo: Record<ClaimTypeEnum, { icon: JSX.Element, text: string, className: string, badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  allowed: { icon: <CheckCircle2 className="h-4 w-4" />, text: "Allowed", className: "text-green-700 bg-green-100 border-green-300", badgeVariant: "outline"},
  disallowed: { icon: <MinusCircle className="h-4 w-4" />, text: "Disallowed", className: "text-red-700 bg-red-100 border-red-300", badgeVariant: "outline"},
  mandatory: { icon: <ShieldQuestion className="h-4 w-4" />, text: "Mandatory", className: "text-blue-700 bg-blue-100 border-blue-300", badgeVariant: "outline"},
};

interface ModalContext {
  product: { id: string; name: string };
  claimText: string;
  sourceMasterClaim?: Claim | null; 
  existingOverride?: MarketClaimOverrideInfo | null; 
}

export default function ClaimsMatrixPage() {
  const [matrixData, setMatrixData] = useState<ClaimsMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCountry, setSelectedCountry] = useState<string>(GLOBAL_COUNTRY_CODE);
  const [availableBrands, setAvailableBrands] = useState<GlobalBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'new_initial' | 'new_block' | 'new_replace' | 'edit_override' | null>(null);
  const [modalContext, setModalContext] = useState<ModalContext | null>(null);
  
  const [marketSpecificClaims, setMarketSpecificClaims] = useState<Claim[]>([]);
  const [isLoadingMarketClaims, setIsLoadingMarketClaims] = useState(false);
  const [selectedReplacementClaimId, setSelectedReplacementClaimId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editIsBlocked, setEditIsBlocked] = useState(true);

  // State for AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Admin", href: "/dashboard/admin" }, // Assuming an admin root page exists
    { label: "Claims Matrix" },
  ];

  const fetchMatrixData = useCallback(async (showToast = false) => {
    if (!selectedCountry) return;
    setIsLoading(true); setError(null);
    try {
      let apiUrl = `/api/claims/matrix?countryCode=${selectedCountry}`;
      if (selectedBrandId !== "all") apiUrl += `&globalBrandId=${selectedBrandId}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch claims matrix data.");
      }
      const result = await response.json();
      if (result.success && result.data) {
        setMatrixData(result.data);
        if(showToast) toast.success("Matrix data refreshed!")
      } else { throw new Error(result.error || "Failed to parse claims matrix data."); }
    } catch (err) {
      const msg = (err as Error).message || "An unexpected error occurred.";
      setError(msg); setMatrixData(null); toast.error("Failed to load Claims Matrix.", { description: msg });
    } finally { setIsLoading(false); }
  }, [selectedCountry, selectedBrandId]);

  useEffect(() => { fetchMatrixData(); }, [fetchMatrixData]);
  useEffect(() => { 
    async function fetchBrands() {
      setIsLoadingBrands(true);
      try {
        const response = await fetch('/api/global-claim-brands');
        if (!response.ok) throw new Error("Failed to fetch brands for filter.");
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setAvailableBrands(result.data);
        } else { throw new Error(result.error || "Could not parse brands data."); }
      } catch (err) {
        toast.error("Failed to load brands for filter.", { description: (err as Error).message });
      } finally {
        setIsLoadingBrands(false);
      }
    }
    fetchBrands();
  }, []);

  const fetchMarketSpecificClaimsForReplacement = async (marketCountryCode: string) => {
    if (marketCountryCode === GLOBAL_COUNTRY_CODE) {
        toast.error("Cannot select replacements from __GLOBAL__ claims."); setMarketSpecificClaims([]); return;
    }
    setIsLoadingMarketClaims(true); setMarketSpecificClaims([]);
    try {
      const response = await fetch(`/api/claims?countryCode=${marketCountryCode}&excludeGlobal=true`);
      if (!response.ok) throw new Error('Failed to fetch market-specific claims.');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setMarketSpecificClaims(result.data.filter((claim: Claim) => claim.country_code === marketCountryCode));
      } else { throw new Error(result.error || 'Could not parse market claims.'); }
    } catch (err) {
      toast.error('Failed to load market-specific claims.', { description: (err as Error).message });
    } finally { setIsLoadingMarketClaims(false); }
  };

  const handleFetchAISuggestions = async () => {
    if (!modalContext?.sourceMasterClaim || !selectedCountry || selectedCountry === GLOBAL_COUNTRY_CODE || !modalContext.product.id) {
        toast.error("Cannot fetch AI suggestions: Missing context (master claim, market, or product).");
        return;
    }
    setIsLoadingAISuggestions(true);
    setAiSuggestions([]);
    try {
        const payload = {
            masterClaimText: modalContext.sourceMasterClaim.claim_text,
            masterClaimType: modalContext.sourceMasterClaim.claim_type,
            targetMarketCountryCode: selectedCountry,
            productId: modalContext.product.id,
            maxSuggestions: 3 
        };
        const response = await fetch('/api/ai/suggest-replacement-claims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok && result.success && result.suggestions) {
            setAiSuggestions(result.suggestions);
            if (result.suggestions.length === 0) {
                toast.info("AI Suggestions", { description: "No replacement suggestions were generated. You can try again or select manually."});
            } else {
                toast.success("AI Suggestions Loaded", { description: `Received ${result.suggestions.length} suggestion(s).`});
            }
        } else {
            throw new Error(result.error || "Failed to fetch AI suggestions.");
        }
    } catch (err) {
        toast.error("AI Suggestion Error", { description: (err as Error).message || "Could not get AI suggestions." });
    } finally {
        setIsLoadingAISuggestions(false);
    }
  };

  const handleOpenModalForNew = (product: {id: string, name: string}, claimText: string, sourceMasterClaim: Claim) => {
    if (selectedCountry === GLOBAL_COUNTRY_CODE) {
      toast.info("Overrides are Market-Specific", { description: "Please select a specific market to apply an override." }); return;
    }
    setModalContext({ product, claimText, sourceMasterClaim });
    setModalMode('new_initial');
    setIsModalOpen(true);
    setAiSuggestions([]); // Clear previous AI suggestions
  };

  const handleOpenModalForEdit = (product: {id: string, name: string}, claimText: string, existingOverride: MarketClaimOverrideInfo, sourceMasterClaim?: Claim | null) => {
    setModalContext({ product, claimText, existingOverride, sourceMasterClaim });
    setEditIsBlocked(existingOverride.isBlocked);
    setSelectedReplacementClaimId(existingOverride.replacementClaimId || '');
    if (existingOverride.replacementClaimId && selectedCountry !== GLOBAL_COUNTRY_CODE) {
      fetchMarketSpecificClaimsForReplacement(selectedCountry); 
    }
    setModalMode('edit_override');
    setIsModalOpen(true);
    setAiSuggestions([]); // Clear previous AI suggestions, not applicable in edit mode directly
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); setModalMode(null); setModalContext(null);
    setSelectedReplacementClaimId(''); setMarketSpecificClaims([]);
    setAiSuggestions([]); setIsLoadingAISuggestions(false); // Reset AI suggestion state
  };

  const handleSubmitNewOverride = async (isReplacing: boolean) => {
    if (!modalContext?.sourceMasterClaim || !selectedCountry || selectedCountry === GLOBAL_COUNTRY_CODE) return;
    if (isReplacing && !selectedReplacementClaimId) { toast.error("Select a replacement claim."); return; }
    setIsSubmitting(true);
    const payload: any = {
      master_claim_id: modalContext.sourceMasterClaim.id,
      target_product_id: modalContext.product.id,
      market_country_code: selectedCountry,
      is_blocked: true,
      replacement_claim_id: isReplacing ? selectedReplacementClaimId : null,
    };
    try {
      const response = await fetch('/api/market-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to apply override.');
      toast.success('New Override Applied');
      handleCloseModal(); fetchMatrixData(true);
    } catch (err) { toast.error('Failed to Apply Override', { description: (err as Error).message }); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateExistingOverride = async () => {
    if (!modalContext?.existingOverride || !selectedCountry || selectedCountry === GLOBAL_COUNTRY_CODE) return;
    if(!editIsBlocked && !selectedReplacementClaimId) {
        handleDeleteExistingOverride();
        return;
    }
    setIsSubmitting(true);
    const payload = {
      is_blocked: editIsBlocked, 
      replacement_claim_id: selectedReplacementClaimId || null,
    };
    if (payload.replacement_claim_id && !payload.is_blocked) {
        payload.is_blocked = true; 
    }
    try {
      const response = await fetch(`/api/market-overrides/${modalContext.existingOverride.overrideId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to update override.');
      toast.success('Override Updated');
      handleCloseModal(); fetchMatrixData(true);
    } catch (err) { toast.error('Failed to Update Override', { description: (err as Error).message }); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteExistingOverride = async () => {
    if (!modalContext?.existingOverride) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/market-overrides/${modalContext.existingOverride.overrideId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to delete override.');
      toast.success('Override Removed (Unblocked)');
      handleCloseModal(); fetchMatrixData(true);
    } catch (err) { toast.error('Failed to Remove Override', { description: (err as Error).message }); }
    finally { setIsSubmitting(false); }
  };

  const renderCellContent = (product: {id: string, name: string}, claimText: string, cellData: MatrixCellData | null) => {
    if (!cellData || !cellData.effectiveClaim && !cellData.activeOverride) return <span className="text-gray-400 text-xs">N/A</span>;
    let displayClaim = cellData.effectiveClaim;
    let iconAction = <Settings2 className="h-3.5 w-3.5" />;
    let actionHandler = () => {};
    let isInteractable = false;
    let badgeClassName = "";
    let titleText = displayClaim?.claim_text || "Manage Override";

    if (cellData.activeOverride) {
      iconAction = <Edit3 className="h-3.5 w-3.5 text-orange-600" />;
      titleText = `Override Active: ${cellData.activeOverride.isBlocked ? 'Blocked' : ''} ${cellData.activeOverride.replacementClaimText ? (cellData.activeOverride.isBlocked ? ' & Replaced by ' : 'Replaced by ') + `"${cellData.activeOverride.replacementClaimText}"` : ''}`;
      actionHandler = () => handleOpenModalForEdit(product, claimText, cellData.activeOverride!, cellData.sourceMasterClaim);
      isInteractable = true;
      badgeClassName = "border-orange-400 bg-orange-50"; 
      if (cellData.activeOverride.replacementClaimId && cellData.effectiveClaim) {
        const typeInfo = claimTypeDisplayInfo[cellData.effectiveClaim.claim_type];
        badgeClassName = `${typeInfo.className} border-dashed border-orange-500`; 
      } else if (cellData.activeOverride.isBlocked) {
        badgeClassName = "text-gray-500 bg-gray-100 border-gray-300 border-dashed";
        displayClaim = { ...(cellData.sourceMasterClaim || {id: 'blocked', claim_text: 'Blocked'} as any), claim_type: 'disallowed' }; 
      }
    } else if (cellData.sourceMasterClaim && cellData.sourceMasterClaim.country_code === GLOBAL_COUNTRY_CODE && selectedCountry !== GLOBAL_COUNTRY_CODE) {
      actionHandler = () => handleOpenModalForNew(product, claimText, cellData.sourceMasterClaim!);
      isInteractable = true;
      titleText = `Override Global Claim: "${cellData.sourceMasterClaim.claim_text}"`;
    }
    const currentClaimForBadge = displayClaim || cellData.sourceMasterClaim;
    const typeInfo = currentClaimForBadge ? claimTypeDisplayInfo[currentClaimForBadge.claim_type] : null;

    let buttonIcon = <FileText className="h-4 w-4" />;
    let buttonText = "View Details (N/A)";
    let buttonVariant: "outline" | "secondary" | "default" | "ghost" = "ghost";
    let cellBorderClass = "";

    if (cellData?.activeOverride) {
      buttonIcon = <Settings2 className="h-4 w-4" />;
      buttonText = "Manage Override";
      actionHandler = () => handleOpenModalForEdit(product, claimText, cellData.activeOverride!, cellData.sourceMasterClaim);
      cellBorderClass = "border-orange-400 ring-1 ring-orange-400";
    } else if (cellData?.sourceMasterClaim && selectedCountry !== GLOBAL_COUNTRY_CODE) {
      buttonIcon = <Settings2 className="h-4 w-4" />;
      buttonText = "Override Global Claim";
      actionHandler = () => handleOpenModalForNew(product, claimText, cellData.sourceMasterClaim!);
      cellBorderClass = "border-blue-300 hover:border-blue-500";
    } else if (cellData?.effectiveClaim) {
      // ... existing logic for effective claim ...
    }

    return (
      <TableCell key={claimText} className={`p-1 text-center border ${cellBorderClass}`}>
        {cellData?.effectiveClaim ? (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button variant={buttonVariant} size="sm" onClick={actionHandler} className="w-full h-full text-xs flex-col p-1 items-center justify-center">
                  <div className="flex items-center">
                    {claimTypeDisplayInfo[cellData.effectiveClaim.claim_type].icon}
                    <span className="ml-1 font-semibold">{claimTypeDisplayInfo[cellData.effectiveClaim.claim_type].text}</span>
                  </div>
                  {cellData.activeOverride && <span className="text-xs text-orange-600">(Overridden)</span>}
                  {/* <span className="mt-0.5 text-muted-foreground text-[10px] truncate max-w-[80px]">{claimText}</span> */}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                <p className="font-semibold">{claimText}</p>
                <p>Status: {claimTypeDisplayInfo[cellData.effectiveClaim.claim_type].text}</p>
                {cellData.activeOverride ? (
                  <p className="text-orange-600">This is actively overridden in {getCountryName(selectedCountry)}.</p>
                ) : cellData.sourceMasterClaim ? (
                  <p className="text-blue-600">This is a Global claim. Click to manage for {getCountryName(selectedCountry)}.</p>
                ) : (
                  <p>This is a Market-specific claim for {getCountryName(cellData.effectiveClaim.country_code)}.</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : cellData?.sourceMasterClaim && selectedCountry !== GLOBAL_COUNTRY_CODE ? (
          // Cell for a global claim in a market context where it *could* be overridden but currently isn't
          // and there's no *effective* market-specific version of this claim text.
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => handleOpenModalForNew(product, claimText, cellData.sourceMasterClaim!)} className="w-full h-full text-xs flex-col p-1 items-center justify-center hover:bg-blue-50">
                  <Settings2 className="h-5 w-5 text-blue-500 mb-0.5" />
                   <span className="text-blue-600 text-[10px]">Override Global</span> 
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                <p className="font-semibold">Global: {claimText}</p>
                <p>Click to manage this Global claim for {getCountryName(selectedCountry)}.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground text-xs">N/A</span>
        )}
      </TableCell>
    );
  };

  const pageTitle = selectedBrandId === 'all' ? "Claims Matrix (All Brands)" : 
                    `Claims Matrix (${availableBrands.find(b => b.id === selectedBrandId)?.name || 'Selected Brand'})`;
  const pageDescription = `View effective claims for products in ${COUNTRY_CODES.find(c=>c.code === selectedCountry)?.name || selectedCountry}. Select a specific market to manage overrides.`;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Breadcrumbs items={breadcrumbItems} />
      <PageHeader title={pageTitle} description={pageDescription} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Options</CardTitle>
          <CardDescription>Select a country and optionally a brand. Overrides can only be managed for specific markets.</CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <Label htmlFor="matrix_country_code">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger id="matrix_country_code"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GLOBAL_COUNTRY_CODE}>{GLOBAL_COUNTRY_NAME} ({GLOBAL_COUNTRY_CODE})</SelectItem>
                  {COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="matrix_brand_filter">Brand</Label>
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId} disabled={isLoadingBrands}>
                <SelectTrigger id="matrix_brand_filter"><SelectValue placeholder={isLoadingBrands ? "Loading..." : "All Brands"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {availableBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && ( <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-10 w-10 animate-spin text-primary mb-3" /><p>Loading Claims Matrix...</p></div> )}
          {!isLoading && error && ( <div className="flex flex-col items-center justify-center py-12 text-red-600"><AlertTriangle className="h-10 w-10 mb-3" /><p className="font-semibold">Error: {error}</p><Button variant="outline" size="sm" onClick={()=>fetchMatrixData(true)} className="mt-4">Try Again</Button></div> )}
          {!isLoading && !error && matrixData && matrixData.products.length === 0 && ( <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Search className="h-10 w-10 mb-3 opacity-50" /><p>No products found for the selected filters.</p></div> )}
          {!isLoading && !error && matrixData && matrixData.products.length > 0 && matrixData.uniqueClaimTexts.length === 0 && ( <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mb-3 opacity-50" /><p>No claims found for any products.</p></div> )}
          
          {!isLoading && !error && matrixData && matrixData.products.length > 0 && matrixData.uniqueClaimTexts.length > 0 && (
            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader><TableRow>
                  <TableHead className="sticky left-0 bg-muted/95 z-20 p-2 text-xs sm:text-sm font-semibold text-muted-foreground min-w-[150px] sm:min-w-[200px] border">Product</TableHead>
                  {matrixData.uniqueClaimTexts.map(text => <TableHead key={text} className="p-2 text-xs sm:text-sm font-semibold text-muted-foreground min-w-[150px] sm:min-w-[180px] text-center whitespace-normal break-words border">{text}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {matrixData.products.map(productRow => (
                    <TableRow key={productRow.id}>
                      <TableCell className="sticky left-0 bg-background hover:bg-muted/50 z-20 p-2 text-xs sm:text-sm font-medium min-w-[150px] sm:min-w-[200px] whitespace-nowrap truncate border" title={productRow.name}>{productRow.name}</TableCell>
                      {matrixData.uniqueClaimTexts.map(claimText => (
                        <TableCell key={`${productRow.id}-${claimText}`} className="p-0.5 text-center min-w-[150px] sm:min-w-[180px] border h-[60px]">
                          {renderCellContent({id: productRow.id, name: productRow.name}, claimText, productRow.claims[claimText])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 mr-1.5 shrink-0" />Hover over cells in a specific market to see override options. Orange border indicates an active override.</CardFooter>
      </Card>

      {isModalOpen && modalContext && (
        <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {modalMode === 'edit_override' ? 'Manage Existing Market Override' : 'Create New Market Override'}
              </DialogTitle>
              <DialogDescription>
                Product: <span className="font-semibold">{modalContext.product.name}</span><br />
                Market: <span className="font-semibold">{COUNTRY_CODES.find(c => c.code === selectedCountry)?.name || selectedCountry}</span><br />
                Claim Text: "<span className="font-semibold">{modalContext.claimText}</span>"
                {modalMode === 'edit_override' && modalContext.existingOverride && 
                  <span className="text-xs block mt-1 text-muted-foreground">Override ID: {modalContext.existingOverride.overrideId}</span>}
                {modalMode !== 'edit_override' && modalContext.sourceMasterClaim &&
                   <span className="text-xs block mt-1 text-muted-foreground">Master Claim ID: {modalContext.sourceMasterClaim.id}</span>}
              </DialogDescription>
            </DialogHeader>
            
            {modalMode === 'new_initial' && (
              <div className="space-y-3 py-4">
                <p>This is a Global claim. How do you want to manage it for this market?</p>
                <Button onClick={() => setModalMode('new_block')} className="w-full"><XOctagon className="mr-2 h-4 w-4"/>Block this Global Claim</Button>
                <Button 
                  onClick={() => { 
                    fetchMarketSpecificClaimsForReplacement(selectedCountry); 
                    setModalMode('new_replace');
                    setAiSuggestions([]); // Clear previous suggestions when entering replace mode
                  }} 
                  className="w-full"
                >
                  <Replace className="mr-2 h-4 w-4"/>Block and Replace
                </Button>
              </div>
            )}
            {modalMode === 'new_block' && (
              <div className="space-y-3 py-4">
                <p>Confirm blocking "<span className="font-semibold">{modalContext.claimText}</span>" for "<span className="font-semibold">{modalContext.product.name}</span>" in {selectedCountry} market?</p>
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button onClick={() => handleSubmitNewOverride(false)} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Block</Button>
                  <Button variant="outline" onClick={() => setModalMode('new_initial')}>Back</Button>
                </DialogFooter>
              </div>
            )}
            {modalMode === 'new_replace' && (
              <div className="space-y-4 py-4">
                <p>Select a market-specific claim for <span className="font-semibold">{selectedCountry}</span> to replace "<span className="font-semibold">{modalContext.claimText}</span>". Or, get AI suggestions.</p>
                
                <div className="my-4 space-y-3 p-3 border rounded-md bg-muted/30">
                    <Button onClick={handleFetchAISuggestions} disabled={isLoadingAISuggestions} variant="outline" className="w-full text-sm">
                        <Sparkles className="mr-2 h-4 w-4 text-purple-500" /> 
                        {isLoadingAISuggestions ? "Getting Suggestions..." : "Get AI Suggestions for Replacement"}
                    </Button>
                    {isLoadingAISuggestions && <div className="flex items-center justify-center text-sm text-muted-foreground p-2"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading AI suggestions...</div>}
                    {!isLoadingAISuggestions && aiSuggestions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">AI Suggestions (for guidance):</p>
                            <ul className="list-disc list-inside space-y-1.5 text-xs max-h-40 overflow-y-auto p-2 rounded bg-background border">
                                {aiSuggestions.map((s, idx) => (
                                    <li key={idx}>
                                        <span className="font-medium">"{s.claim_text}"</span> ({s.claim_type})
                                        {s.reasoning && <span className="block text-gray-600 italic ml-3">- {s.reasoning}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {!isLoadingAISuggestions && aiSuggestions.length === 0 && !isLoadingMarketClaims && marketSpecificClaims.length === 0 && (
                        <p className="text-xs text-center text-muted-foreground p-2">No AI suggestions yet. Click button above to generate.</p>
                    )}
                </div>

                {isLoadingMarketClaims && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading existing market claims...</div>}
                {!isLoadingMarketClaims && marketSpecificClaims.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                        No existing market-specific claims found for {selectedCountry} to select as a replacement.
                        <br />You can create one, or use AI suggestions for guidance.
                    </p>
                )}
                {!isLoadingMarketClaims && marketSpecificClaims.length > 0 && (
                  <div>
                    <Label htmlFor="newReplacementClaimSelect">Select Existing Replacement Claim</Label>
                    <Select value={selectedReplacementClaimId} onValueChange={setSelectedReplacementClaimId}>
                      <SelectTrigger id="newReplacementClaimSelect"><SelectValue placeholder="Select replacement..." /></SelectTrigger>
                      <SelectContent>{marketSpecificClaims.map(c => <SelectItem key={c.id} value={c.id}>{c.claim_text} ({claimTypeDisplayInfo[c.claim_type].text})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter className="gap-2 sm:justify-start">
                   <Button onClick={() => handleSubmitNewOverride(true)} disabled={isSubmitting || !selectedReplacementClaimId || isLoadingMarketClaims}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Replace with Selected</Button>
                   <Button variant="outline" onClick={() => setModalMode('new_initial')}>Back</Button>
                </DialogFooter>
              </div>
            )}

            {modalMode === 'edit_override' && modalContext.existingOverride && (
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="editIsBlockedCheckbox" checked={editIsBlocked} onCheckedChange={(checkedState) => setEditIsBlocked(Boolean(checkedState))} />
                    <Label htmlFor="editIsBlockedCheckbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Master Claim is Blocked
                    </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                    If unchecked and no replacement is chosen, the override will be removed (master claim unblocked).
                    If a replacement is chosen, the master claim will be considered blocked.
                </p>

                <div>
                  <Label htmlFor="editReplacementClaimSelect">Replacement Claim (Optional)</Label>
                  <Select value={selectedReplacementClaimId} onValueChange={setSelectedReplacementClaimId} disabled={isLoadingMarketClaims}>
                    <SelectTrigger id="editReplacementClaimSelect"><SelectValue placeholder="None (or select replacement...)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (Block-only or Unblock if master not blocked)</SelectItem>
                      {marketSpecificClaims.map(c => <SelectItem key={c.id} value={c.id}>{c.claim_text} ({claimTypeDisplayInfo[c.claim_type].text})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isLoadingMarketClaims && <div className="flex items-center text-xs"><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Loading market claims...</div>}
                </div>
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 pt-2">
                    <Button onClick={handleDeleteExistingOverride} variant="destructive" className="w-full sm:w-auto order-2 sm:order-1" disabled={isSubmitting}>
                        {isSubmitting && modalContext.product.id === 'TODELETE' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4"/>}
                        Unblock (Delete Override)
                    </Button>
                    <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={handleCloseModal} className="w-full">Cancel</Button>
                        <Button onClick={handleUpdateExistingOverride} className="w-full" disabled={isSubmitting || isLoadingMarketClaims 
                           // !(modalContext.existingOverride.isBlocked === editIsBlocked && (modalContext.existingOverride.replacementClaimId || '') === (selectedReplacementClaimId || ''))
                        }>
                        {isSubmitting && modalContext.product.id !== 'TODELETE' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                        Save Changes
                        </Button>
                    </div>
                </DialogFooter>
              </div>
            )}
            {(modalMode !== 'new_initial' && modalMode !== 'new_block' && modalMode !== 'new_replace' && modalMode !== 'edit_override') && (
                 <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Fallback for overall page if something is really wrong after loading is complete */}
      {/* This error is if the main matrixData state is null AFTER loading AND there's a top-level error string */}
      {error && !matrixData && !isLoading && (
         <Card className="mt-6 bg-red-50 border-red-200">
            <CardHeader>
            <CardTitle className="text-red-700 flex items-center"><AlertTriangle className="mr-2" />Matrix Unavailable</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={() => fetchMatrixData(false)} className="mt-4">Try Again</Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

function getCountryName(countryCode: string): string {
  if (countryCode === GLOBAL_COUNTRY_CODE) return GLOBAL_COUNTRY_NAME;
  const country = COUNTRY_CODES.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
} 