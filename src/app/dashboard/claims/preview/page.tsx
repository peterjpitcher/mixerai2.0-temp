"use client";

import React, { useEffect, useState, useCallback } from "react";
// import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Loader2, AlertTriangle, Search, FileText, Edit3, XOctagon, CornerDownRight, Info, CheckCircle2, MinusCircle, ShieldQuestion, Settings2, Trash2, Undo2, Replace, Save, Sparkles, Maximize, Minimize
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes";
import { Claim, ClaimTypeEnum, MasterClaimBrand as GlobalBrand, EffectiveClaim, FinalClaimTypeEnum } from "@/lib/claims-utils";
// import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Types for AI Suggestions (matching API)
interface AISuggestion {
  claim_text: string;
  claim_type: ClaimTypeEnum;
  reasoning?: string;
}

// NEW API Response Structure Types
interface ApiProductInfo {
  id: string;
  name: string;
}

interface ApiClaimTextInfo {
  text: string;
}

interface MarketClaimOverrideInfo {
  overrideId: string;
  isBlocked: boolean;
  masterClaimIdItOverrides: string;
  replacementClaimId?: string | null;
  replacementClaimText?: string | null;
  replacementClaimType?: ClaimTypeEnum | null;
}

interface MatrixCell {
  effectiveStatus: FinalClaimTypeEnum;
  effectiveClaimSourceLevel?: EffectiveClaim['source_level'];
  sourceMasterClaimId?: string | null;
  isActuallyMaster: boolean;
  activeOverride?: MarketClaimOverrideInfo | null;
  description?: string | null;
  isBlockedOverride?: boolean;
  isReplacementOverride?: boolean;
  originalMasterClaimIdIfOverridden?: string | null;
  originalEffectiveClaimDetails?: EffectiveClaim | null;
}

interface ClaimsMatrixApiResponseData {
  claimTextsAsRows: ApiClaimTextInfo[];
  productsAsCols: ApiProductInfo[];
  cellData: Record<string, Record<string, MatrixCell | null>>;
}
// End of NEW API Response Structure Types

// Updated claimTypeDisplayInfo for bolder, non-gradient colors
const claimTypeDisplayInfo: Record<FinalClaimTypeEnum, { 
  icon: JSX.Element; 
  text: string; 
  cellBgClassName: string; 
}> = {
  allowed: { 
    icon: <CheckCircle2 className="text-green-700" />, // Darker icon color
    text: "Allowed", 
    cellBgClassName: "bg-green-200 hover:bg-green-300", // Bolder base, slightly darker hover
  },
  disallowed: { 
    icon: <MinusCircle className="text-red-700" />, 
    text: "Disallowed", 
    cellBgClassName: "bg-red-200 hover:bg-red-300",
  },
  mandatory: { 
    icon: <ShieldQuestion className="text-blue-700" />, 
    text: "Mandatory", 
    cellBgClassName: "bg-blue-200 hover:bg-blue-300",
  },
  conditional: { // Added entry for conditional
    icon: <AlertTriangle className="text-yellow-700" />, // Example icon
    text: "Conditional", 
    cellBgClassName: "bg-yellow-200 hover:bg-yellow-300", // Example style
  },
  none: { // For N/A or explicitly blocked without replacement
    icon: <XOctagon className="text-gray-600" />, 
    text: "None/Blocked", 
    cellBgClassName: "bg-gray-200 hover:bg-gray-300", 
  },
};

interface ModalContext {
  product: ApiProductInfo;
  claimTextInfo: ApiClaimTextInfo;
  cellData: MatrixCell | null;
}

// Define MatrixDisplayCell component outside or above ClaimsPreviewPage
interface MatrixDisplayCellProps {
  product: ApiProductInfo;
  claimTextInfo: ApiClaimTextInfo;
  cell: MatrixCell | null;
  selectedCountry: string; // Pass selectedCountry as a prop
  onOpenModal: (product: ApiProductInfo, claimTextInfo: ApiClaimTextInfo, cell: MatrixCell | null) => void; // Pass handler
  getCountryName: (countryCode: string) => string; // Add new prop for the helper function
}

const MatrixDisplayCell = React.memo<MatrixDisplayCellProps>(({ 
  product, 
  claimTextInfo, 
  cell, 
  selectedCountry, 
  onOpenModal, 
  getCountryName
}) => {
  const effectiveStatus = cell?.effectiveStatus || 'none';
  const displayConfig = claimTypeDisplayInfo[effectiveStatus];

  let tooltipText = `${claimTextInfo.text} - ${displayConfig.text}`;
  let cellInteractionClass = "cursor-default";
  let canOpenModal = false;
  let cellBgClassName = displayConfig.cellBgClassName;
  let cellBorderClassName = "border";

  if (cell?.activeOverride) {
    tooltipText = `Overridden: ${cell.activeOverride.isBlocked ? 'Blocked' : ''}${cell.activeOverride.replacementClaimText ? (cell.activeOverride.isBlocked ? ' & Replaced by "' + cell.activeOverride.replacementClaimText + '"' : 'Replaced by "' + cell.activeOverride.replacementClaimText + '"') : ''}. Click to edit.`;
    cellInteractionClass = "cursor-pointer";
    canOpenModal = true;
    cellBorderClassName = "border-2 border-orange-500 ring-2 ring-orange-500 ring-offset-1";
  } else if (cell?.sourceMasterClaimId && selectedCountry !== ALL_COUNTRIES_CODE) {
    tooltipText = `Master Claim: ${claimTextInfo.text}. Effective status: ${displayConfig.text}. Click to override for ${getCountryName(selectedCountry)}.`;
    cellInteractionClass = "cursor-pointer";
    canOpenModal = true;
    cellBorderClassName = "border-2 border-blue-400";
  } else if (cell?.effectiveStatus !== 'none') {
     tooltipText = `Market Specific: ${claimTextInfo.text}. Status: ${displayConfig.text}.`;
  }
  if (effectiveStatus === 'none' && !cell?.activeOverride && !cell?.sourceMasterClaimId) {
      cellBgClassName = "bg-gray-50";
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              `w-full h-full flex items-center justify-center p-1 relative`, 
              cellInteractionClass, 
              cellBgClassName, 
              cellBorderClassName
            )}
            onClick={() => canOpenModal && onOpenModal(product, claimTextInfo, cell)}
          >
            {displayConfig ? 
              React.cloneElement(displayConfig.icon, { 
                className: cn(displayConfig.icon.props.className, 'h-5 w-5') 
              }) : 
              <MinusCircle className="h-5 w-5 text-gray-400"/>}
            {cell?.activeOverride && (
              <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full" title="Overridden"></div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <p className="font-semibold">{claimTextInfo.text}</p>
          <p>Product: {product.name}</p>
          <p>Status: {displayConfig?.text || 'N/A'}</p>
          <p className="text-muted-foreground text-xs mt-1">{tooltipText}</p>
          {cell?.description && <p className="text-xs italic mt-1">Note: {cell.description}</p>}
          {cell?.originalEffectiveClaimDetails && cell.originalEffectiveClaimDetails.source_level && 
            <p className="text-xs mt-1">Source: {cell.originalEffectiveClaimDetails.source_level} 
              {cell.originalEffectiveClaimDetails.original_claim_country_code === ALL_COUNTRIES_CODE && cell.originalEffectiveClaimDetails.source_level !== 'override' && " (Master)"}
            </p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
MatrixDisplayCell.displayName = 'MatrixDisplayCell'; // For better debugging

// ----- OverrideModalContent Component -----
interface OverrideModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  // onSubmit will now be called with all necessary data collected within this modal
  onSubmitOverride: (data: {
    product: ApiProductInfo;
    claimTextInfo: ApiClaimTextInfo;
    cellData: MatrixCell | null;
    isBlocked: boolean;
    replacementText?: string;
    replacementType?: ClaimTypeEnum;
    isReplacingWithNewText: boolean;
    existingOverrideId?: string | null; // For updates
    masterClaimIdToOverride: string | null; // For new overrides
  }) => Promise<void>; 
  onDeleteOverride: (overrideId: string) => Promise<void>;
  modalContextData: ModalContext | null;
  selectedCountry: string;
  getCountryName: (countryCode: string) => string;
}

interface CountryOption { code: string; name: string; }

const OverrideModalContent: React.FC<OverrideModalContentProps> = ({ 
  isOpen, onClose, onSubmitOverride, onDeleteOverride, modalContextData, selectedCountry, getCountryName
}) => {
  const [isBlocked, setIsBlocked] = useState(true);
  const [isReplacingWithNewText, setIsReplacingWithNewText] = useState(false);
  const [newReplacementText, setNewReplacementText] = useState("");
  const [newReplacementType, setNewReplacementType] = useState<ClaimTypeEnum>('allowed');
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);

  useEffect(() => {
    if (modalContextData) {
      const { cellData, claimTextInfo } = modalContextData;
      if (cellData?.activeOverride) { // Editing existing override
        setIsBlocked(cellData.activeOverride.isBlocked);
        if (cellData.activeOverride.replacementClaimText) {
          setIsReplacingWithNewText(true);
          setNewReplacementText(cellData.activeOverride.replacementClaimText);
          setNewReplacementType(cellData.activeOverride.replacementClaimType || 'allowed');
        } else {
          setIsReplacingWithNewText(false);
          setNewReplacementText("");
        }
      } else if (cellData?.sourceMasterClaimId) { // New override for a master claim
        setIsBlocked(true);
        setIsReplacingWithNewText(false);
        setNewReplacementText(cellData.originalEffectiveClaimDetails?.claim_text || claimTextInfo.text || "");
        const originalType = cellData.originalEffectiveClaimDetails?.final_claim_type;
        setNewReplacementType((originalType && originalType !== 'none' ? originalType : 'allowed') as ClaimTypeEnum);
      } else { // Fallback / No specific context to prefill from, user might have clicked generic add
        setIsBlocked(true);
        setIsReplacingWithNewText(false);
        setNewReplacementText(claimTextInfo.text); // Use current claim text as a base
        setNewReplacementType('allowed');
      }
    } else { // Reset if no context (e.g. modal closed and re-opened without context yet)
        setIsBlocked(true);
        setIsReplacingWithNewText(false);
        setNewReplacementText("");
        setNewReplacementType('allowed');
    }
  }, [modalContextData]);

  const handleSubmit = async () => {
    if (!modalContextData) return;
    setIsSubmittingInternal(true);
    await onSubmitOverride({
      ...modalContextData,
      isBlocked,
      replacementText: isReplacingWithNewText ? newReplacementText : undefined,
      replacementType: isReplacingWithNewText ? newReplacementType : undefined,
      isReplacingWithNewText,
      existingOverrideId: modalContextData.cellData?.activeOverride?.overrideId,
      masterClaimIdToOverride: modalContextData.cellData?.sourceMasterClaimId || modalContextData.cellData?.activeOverride?.masterClaimIdItOverrides || null
    });
    setIsSubmittingInternal(false);
    // Parent (ClaimsPreviewPage) will call onClose if submit is successful via its own logic
  };

  const handleDelete = async () => {
    if (!modalContextData?.cellData?.activeOverride) return;
    setIsSubmittingInternal(true);
    await onDeleteOverride(modalContextData.cellData.activeOverride.overrideId);
    setIsSubmittingInternal(false);
    // Parent will call onClose
  };
  
  if (!isOpen || !modalContextData) return null;

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
           {modalContextData.cellData?.activeOverride ? 'Manage Market Override' : 'Create New Market Override'}
        </DialogTitle>
        <DialogDescription>
            Product: <span className="font-semibold">{modalContextData.product.name}</span><br />
            Market: <span className="font-semibold">{getCountryName(selectedCountry)}</span><br />
            Claim Text: &quot;<span className="font-semibold">{modalContextData.claimTextInfo.text}</span>&quot;
            {modalContextData.cellData?.activeOverride && 
              <span className="text-xs block mt-1 text-muted-foreground">Override ID: {modalContextData.cellData.activeOverride.overrideId}</span>}
            {modalContextData?.cellData?.sourceMasterClaimId && 
               <span className="text-xs block mt-1 text-muted-foreground">Master Claim ID: {modalContextData.cellData.sourceMasterClaimId}</span>}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="is_blocked_modal_checkbox" 
            checked={isBlocked} 
            onCheckedChange={(checkedState) => {
                const newBlockedState = !!checkedState;
                setIsBlocked(newBlockedState);
                if (isReplacingWithNewText && !newBlockedState) {
                    // If user unchecks block while wanting to replace with new text, force block back on
                    // Or, reconsider this interaction: maybe they want to add a new market claim without blocking master (not standard override)
                    setIsBlocked(true);
                    toast.info("Replacing with new text implies the original Master Claim is blocked.");
                }
            }}
            disabled={isSubmittingInternal || (isReplacingWithNewText)} 
          />
          <Label htmlFor="is_blocked_modal_checkbox">Block this Master Claim in this Market</Label>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
           <Checkbox
               id="is_replacing_with_new_text_modal_checkbox"
               checked={isReplacingWithNewText}
               onCheckedChange={(checkedState) => {
                   const newReplacingState = !!checkedState;
                   setIsReplacingWithNewText(newReplacingState);
                   if (newReplacingState) {
                       setIsBlocked(true); 
                       if (!modalContextData.cellData?.activeOverride?.replacementClaimText) {
                           setNewReplacementText(modalContextData.claimTextInfo.text + (modalContextData.cellData?.sourceMasterClaimId ? " (Market Specific)" : ""));
                           const originalType = modalContextData.cellData?.originalEffectiveClaimDetails?.final_claim_type;
                           setNewReplacementType((originalType && originalType !== 'none' ? originalType : 'allowed') as ClaimTypeEnum);
                       }
                   } 
               }}
               disabled={isSubmittingInternal}
           />
           <Label htmlFor="is_replacing_with_new_text_modal_checkbox">
               Replace with NEW custom text
           </Label>
        </div>

        {isReplacingWithNewText && (
          <div className="space-y-2 pt-2">
            <div>
              <Label htmlFor="modal_new_replacement_text">New Replacement Claim Text</Label>
              <Input 
                id="modal_new_replacement_text" 
                value={newReplacementText} 
                onChange={(e) => setNewReplacementText(e.target.value)} 
                placeholder="Enter new market-specific claim text" 
                disabled={isSubmittingInternal}
              />
            </div>
            <div>
               <Label htmlFor="modal_new_replacement_type">New Claim Type</Label>
               <Select value={newReplacementType} onValueChange={(v) => setNewReplacementType(v as ClaimTypeEnum)} disabled={isSubmittingInternal}>
                 <SelectTrigger><SelectValue placeholder="Select new claim type" /></SelectTrigger>
                 <SelectContent>
                   {(Object.keys(claimTypeDisplayInfo) as FinalClaimTypeEnum[]).filter(t => t !== 'none').map(type => (
                      <SelectItem key={type} value={type}>{claimTypeDisplayInfo[type].text}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          </div>
        )}
        {/* Removed selection of existing market claims to simplify, as per request to remove AI suggestions and streamline */}
      </div>
      <DialogFooter className="mt-6">
        {modalContextData.cellData?.activeOverride && (
          <Button variant="destructive" onClick={handleDelete} disabled={isSubmittingInternal}>
            <Trash2 className="mr-2 h-4 w-4"/> Remove Override
          </Button>
        )}
        <Button variant="outline" onClick={onClose} disabled={isSubmittingInternal}>Cancel</Button>
        <Button onClick={handleSubmit} 
          disabled={isSubmittingInternal || 
                    (isReplacingWithNewText && !newReplacementText.trim()) || 
                    // Disable submit if editing, unblocked, and not providing new text (should use Delete button)
                    (!!modalContextData.cellData?.activeOverride && !isBlocked && !isReplacingWithNewText)
                  }>
          {isSubmittingInternal ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/> }
          {modalContextData.cellData?.activeOverride ? 'Update Override' : 'Apply Override'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
OverrideModalContent.displayName = 'OverrideModalContent';
// ----- End OverrideModalContent Component -----

export default function ClaimsPreviewPage() {
  const [matrixData, setMatrixData] = useState<ClaimsMatrixApiResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCountry, setSelectedCountry] = useState<string>(ALL_COUNTRIES_CODE);
  const [availableBrands, setAvailableBrands] = useState<GlobalBrand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<ModalContext | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [marketSpecificClaims, setMarketSpecificClaims] = useState<Claim[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingMarketClaims, setIsLoadingMarketClaims] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedReplacementClaimId, setSelectedReplacementClaimId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editIsBlocked, setEditIsBlocked] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);

  const [isFullScreen, setIsFullScreen] = useState(false);

  // Helper function to get country name, moved inside component to access state
  const getCountryName = useCallback((countryCode: string): string => {
    if (countryCode === ALL_COUNTRIES_CODE) {
      return ALL_COUNTRIES_NAME;
    }
    const country = availableCountries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  }, [availableCountries]);

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Claims Preview & Matrix" },
  ];

  const fetchMatrixData = useCallback(async (showToast = false) => {
    if (!selectedCountry) return;
    setIsLoading(true); setError(null);
    try {
      let apiUrl = `/api/claims/matrix?countryCode=${selectedCountry}`;
      if (selectedBrandId !== "all") apiUrl += `&masterBrandId=${selectedBrandId}`;
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
    async function fetchInitialData() {
      setIsLoadingBrands(true);
      setIsLoadingCountries(true);
      try {
        const [brandsRes, countriesRes] = await Promise.all([
          fetch('/api/master-claim-brands'),
          fetch('/api/countries')
        ]);

        if (!brandsRes.ok) throw new Error("Failed to fetch brands for filter.");
        const brandsResult = await brandsRes.json();
        if (brandsResult.success && Array.isArray(brandsResult.data)) {
          setAvailableBrands(brandsResult.data);
        } else { throw new Error(brandsResult.error || "Could not parse brands data."); }

        if (!countriesRes.ok) throw new Error("Failed to fetch countries for filter.");
        const countriesResult = await countriesRes.json();
        if (countriesResult.success && Array.isArray(countriesResult.data)) {
          setAvailableCountries(countriesResult.data);
        } else { throw new Error(countriesResult.error || "Could not parse countries data."); }

      } catch (err) {
        toast.error("Failed to load initial filter data.", { description: (err as Error).message });
      } finally {
        setIsLoadingBrands(false);
        setIsLoadingCountries(false);
      }
    }
    fetchInitialData();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMarketSpecificClaimsForReplacement = async (marketCountryCode: string) => {
    if (marketCountryCode === ALL_COUNTRIES_CODE) {
        toast.error("Cannot select replacements from __ALL COUNTRIES__ claims."); setMarketSpecificClaims([]); return;
    }
    setIsLoadingMarketClaims(true); setMarketSpecificClaims([]);
    try {
      const response = await fetch(`/api/claims?countryCode=${marketCountryCode}&level=product&level=ingredient&level=brand&excludeGlobal=true`);
      if (!response.ok) throw new Error('Failed to fetch market-specific claims.');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setMarketSpecificClaims(result.data.filter((claim: Claim) => claim.country_code === marketCountryCode));
      } else { throw new Error(result.error || 'Could not parse market claims.'); }
    } catch (err) {
      toast.error('Failed to load market-specific claims.', { description: (err as Error).message });
    } finally { setIsLoadingMarketClaims(false); }
  };

  const handleOpenModal = (product: ApiProductInfo, claimTextInfo: ApiClaimTextInfo, cell: MatrixCell | null) => {
    if (selectedCountry === ALL_COUNTRIES_CODE && !(cell?.activeOverride)) {
        toast.info("Overrides are Market-Specific", { description: "Please select a specific market to apply an override." });
        return;
    }
    setModalContext({ product, claimTextInfo, cellData: cell });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); 
    setModalContext(null);
  };

  const handleSubmitOverrideFromModal = async (dataFromModal: {
    product: ApiProductInfo;
    claimTextInfo: ApiClaimTextInfo;
    cellData: MatrixCell | null;
    isBlocked: boolean;
    replacementText?: string;
    replacementType?: ClaimTypeEnum;
    isReplacingWithNewText: boolean;
    existingOverrideId?: string | null;
    masterClaimIdToOverride: string | null;
  }) => {
    const { product, cellData, isBlocked, replacementText, replacementType, isReplacingWithNewText, existingOverrideId, masterClaimIdToOverride } = dataFromModal;
    
    if (!masterClaimIdToOverride && !isReplacingWithNewText && !existingOverrideId) {
        if (!masterClaimIdToOverride){
             toast.error("Master claim context is missing to create an override.");
      return;
        }
    }
    if (isReplacingWithNewText && (!replacementText || !replacementText.trim())){
        toast.error("New replacement claim text cannot be empty."); return;
    }

    setIsSubmitting(true); 
    let actualReplacementClaimId: string | null = null;

    if (isReplacingWithNewText && replacementText && replacementText.trim()) {
        try {
            const originalMasterClaimDetails = cellData?.originalEffectiveClaimDetails;
            let inferredLevel: ClaimTypeEnum | 'product' | 'brand' | 'ingredient' = 'product';
            let associatedIdField: Record<string, unknown> = { product_ids: [product.id] };

            if (originalMasterClaimDetails && originalMasterClaimDetails.source_level !== 'override' && originalMasterClaimDetails.source_level !== 'none') {
                inferredLevel = originalMasterClaimDetails.source_level;
                if (inferredLevel === 'brand' && originalMasterClaimDetails.source_entity_id) {
                    associatedIdField = { master_brand_id: originalMasterClaimDetails.source_entity_id };
                } else if (inferredLevel === 'ingredient' && originalMasterClaimDetails.source_entity_id) {
                    associatedIdField = { ingredient_id: originalMasterClaimDetails.source_entity_id };
                } else {
                    inferredLevel = 'product';
                    associatedIdField = { product_ids: [product.id] };
                }
            }

            const newClaimPayload = {
                claim_text: replacementText.trim(),
                claim_type: replacementType || 'allowed',
                level: inferredLevel,
                country_codes: [selectedCountry],
                description: originalMasterClaimDetails?.description || null,
                ...associatedIdField
            };
            console.log("Submitting new claim payload to /api/claims:", JSON.stringify(newClaimPayload, null, 2));
            const claimResponse = await fetch('/api/claims', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(newClaimPayload) 
            });
            const claimResult = await claimResponse.json();
            console.log("Received response from /api/claims:", JSON.stringify(claimResult, null, 2));
            if (!claimResponse.ok || !claimResult.success || !claimResult.claims?.[0]?.id) {
                throw new Error(claimResult.error || claimResult.details?.body?._errors?.join(', ') || claimResult.details?.formErrors?.fieldErrors || "Failed to create new replacement claim.");
            }
            actualReplacementClaimId = claimResult.claims[0].id;
            toast.success("New replacement claim created.");
        } catch (claimError) {
            toast.error("Error creating new replacement claim", { description: (claimError as Error).message });
            setIsSubmitting(false);
            return;
        }
    }

    const isEditing = !!existingOverrideId;
    const url = isEditing ? `/api/market-overrides/${existingOverrideId}` : '/api/market-overrides';
    const method = isEditing ? 'PUT' : 'POST';

    const finalOverridePayload: Record<string, unknown> = {
      target_product_id: product.id,
      market_country_code: selectedCountry,
      is_blocked: isBlocked, 
      replacement_claim_id: actualReplacementClaimId,
    };

    if (!isEditing) {
        if (!masterClaimIdToOverride) {
             toast.error("Cannot create new override: Master claim ID is missing.");
             setIsSubmitting(false);
             return;
        }
        finalOverridePayload.master_claim_id = masterClaimIdToOverride;
    }
    
    if (actualReplacementClaimId && !finalOverridePayload.is_blocked) {
        finalOverridePayload.is_blocked = true;
    }
    if (!finalOverridePayload.is_blocked && !actualReplacementClaimId && isEditing) { 
        await handleDeleteExistingOverride(existingOverrideId); 
        setIsSubmitting(false);
        return;
    }
     if (!finalOverridePayload.is_blocked && finalOverridePayload.replacement_claim_id) {
      finalOverridePayload.replacement_claim_id = null;
    }

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalOverridePayload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'apply'} override.`);
      toast.success(`Override ${isEditing ? 'Updated' : 'Applied'}`);
      handleCloseModal(); 
      fetchMatrixData(true);
    } catch (err) { 
      toast.error(`Failed to ${isEditing ? 'Update' : 'Apply'} Override`, { description: (err as Error).message }); 
    }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteExistingOverride = async (overrideIdToDelete?: string) => {
    const idToDelete = overrideIdToDelete || modalContext?.cellData?.activeOverride?.overrideId;
    if (!idToDelete) {
        toast.error("No override selected or identified for deletion.");
        return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/market-overrides/${idToDelete}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to delete override.');
      toast.success('Override Removed (Unblocked)');
      handleCloseModal(); 
      fetchMatrixData(true);
    } catch (err) { toast.error('Failed to Remove Override', { description: (err as Error).message }); }
    finally { setIsSubmitting(false); }
  };
  
  const pageTitle = selectedBrandId === 'all' ? "Claims Preview & Matrix (All Brands)" : 
                    `Claims Preview & Matrix (${availableBrands.find(b => b.id === selectedBrandId)?.name || 'Selected Brand'})`;
  const pageDescription = `View and manage claim overrides for products in ${selectedCountry === ALL_COUNTRIES_CODE ? ALL_COUNTRIES_NAME : getCountryName(selectedCountry)}${selectedBrandId === 'all' ? ' (All Brands)' : availableBrands.find(b => b.id === selectedBrandId) ? ` (${availableBrands.find(b => b.id === selectedBrandId)?.name})` : ''}.`; 

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling when in full screen
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = ''; // Cleanup on unmount
    };
  }, [isFullScreen]);

  return (
    <div className={cn(
      "flex flex-col h-screen", // Ensure the main div can take full screen height
      isFullScreen ? "fixed inset-0 bg-background z-50 p-4" : "space-y-0 p-y-0 sm:py-0.5 lg:py-1 relative" 
    )}> 
      <div className={cn("flex-shrink-0", isFullScreen && "hidden")}> 
        <Breadcrumbs items={breadcrumbItems} /> 
        <PageHeader title={pageTitle} description={pageDescription} /> 
      </div>
      
      <div className={cn("mb-2 flex items-center gap-4", isFullScreen && "hidden")}> 
        <div className="flex items-center gap-2"> 
          <Label htmlFor="matrix_country_code" className="text-sm">Country:</Label> 
          <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isLoadingCountries}>
            <SelectTrigger id="matrix_country_code" className="h-9 w-[200px]"><SelectValue /></SelectTrigger> 
            <SelectContent>
              <SelectItem value={ALL_COUNTRIES_CODE}>{ALL_COUNTRIES_NAME} ({ALL_COUNTRIES_CODE})</SelectItem> 
              {availableCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)} 
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2"> 
          <Label htmlFor="matrix_brand_filter" className="text-sm">Brand:</Label> 
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId} disabled={isLoadingBrands}> 
            <SelectTrigger id="matrix_brand_filter" className="h-9 w-[200px]"><SelectValue placeholder={isLoadingBrands ? "Loading..." : "All Brands"} /></SelectTrigger> 
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem> 
              {availableBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)} 
            </SelectContent>
          </Select>
        </div> 
      </div>

      {/* This button is for non-fullscreen mode, appears next to filters */}
      {!isFullScreen && (
        <div className="mb-2 flex justify-end">
            <Button onClick={toggleFullScreen} variant="outline" size="icon" className="h-8 w-8">
                <Maximize className="h-4 w-4" />
                <span className="sr-only">Enter Fullscreen</span>
            </Button>
        </div>
      )}

      <div 
        className={cn(
          "flex-grow overflow-auto border rounded-md relative",
          isFullScreen ? "h-full w-full" : "h-[calc(100vh-300px)]" // Adjusted height to account for header and filters
        )}
      >
        {/* This button is for fullscreen mode, absolutely positioned */}
        {isFullScreen && (
            <Button 
                onClick={toggleFullScreen} 
                variant="outline" 
                size="icon" 
                className="absolute top-2 right-2 z-50 bg-background/80 hover:bg-background h-8 w-8"
                title="Exit Fullscreen"
            >
                <Minimize className="h-4 w-4" />
                <span className="sr-only">Exit Fullscreen</span>
            </Button>
        )}

        {isLoading && ( <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Loader2 className="h-10 w-10 animate-spin text-primary mb-3" /><p>Loading Claims Matrix...</p></div> )}
        {!isLoading && error && ( <div className="flex flex-col items-center justify-center h-full text-red-600"><AlertTriangle className="h-10 w-10 mb-3" /><p className="font-semibold">Error: {error}</p><Button variant="outline" size="sm" onClick={()=>fetchMatrixData(true)} className="mt-4">Try Again</Button></div> )}
        {!isLoading && !error && matrixData && matrixData.productsAsCols.length === 0 && ( <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Search className="h-10 w-10 mb-3 opacity-50" /><p>No products found.</p></div> )}
        {!isLoading && !error && matrixData && matrixData.productsAsCols.length > 0 && matrixData.claimTextsAsRows.length === 0 && ( <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><FileText className="h-10 w-10 mb-3 opacity-50" /><p>No claims found.</p></div> )}
        
        {!isLoading && !error && matrixData && matrixData.productsAsCols.length > 0 && matrixData.claimTextsAsRows.length > 0 && (
            <Table className="min-w-full border-collapse h-full">
              <TableHeader className={cn("sticky top-0 z-20 shadow-sm", isFullScreen ? "bg-background" : "bg-white")}>
                <TableRow>
                  <TableHead 
                    className={cn(
                        "sticky left-0 z-30 p-2 text-sm font-semibold text-muted-foreground min-w-[200px] sm:min-w-[250px] border",
                        isFullScreen ? "bg-background" : "bg-white"
                    )}
                  >
                    Claim Text
                  </TableHead>
                  {matrixData.productsAsCols.map(product => (
                    <TableHead 
                      key={product.id} 
                      className={cn(
                        "p-2 text-sm font-semibold text-muted-foreground min-w-[120px] sm:min-w-[140px] text-center whitespace-normal break-words border",
                        isFullScreen ? "bg-background" : "bg-white"
                        )}
                      title={product.name}
                    >
                      {product.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.claimTextsAsRows.map(claimTextInfo => (
                  <TableRow key={claimTextInfo.text}>
                    <TableCell 
                      className={cn(
                        "sticky left-0 z-10 p-1 text-xs font-medium min-w-[160px] sm:min-w-[200px] whitespace-normal break-words border",
                        isFullScreen ? "bg-background hover:bg-muted/30" : "bg-background hover:bg-muted/50"
                      )}
                      title={claimTextInfo.text}
                    >
                      {claimTextInfo.text}
                    </TableCell>
                    {matrixData.productsAsCols.map(product => {
                      const cell = matrixData.cellData[claimTextInfo.text]?.[product.id] || null;
                      return (
                        <td key={`${claimTextInfo.text}-${product.id}`} className="p-0 border h-[36px]">
                          <MatrixDisplayCell 
                            product={product} 
                            claimTextInfo={claimTextInfo} 
                            cell={cell} 
                            selectedCountry={selectedCountry} 
                            onOpenModal={handleOpenModal} 
                            getCountryName={getCountryName}
                          />
                        </td>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </div> 

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <OverrideModalContent 
            isOpen={isModalOpen} 
            onClose={handleCloseModal} 
            onSubmitOverride={handleSubmitOverrideFromModal} 
            onDeleteOverride={handleDeleteExistingOverride} 
            modalContextData={modalContext} 
            selectedCountry={selectedCountry}
            getCountryName={getCountryName}
          />
        </Dialog>
      )}
    </div>
  );
} 