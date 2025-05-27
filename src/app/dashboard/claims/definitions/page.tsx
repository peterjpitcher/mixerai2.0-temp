'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClaimDefinitionForm, ClaimDefinitionData } from '@/components/dashboard/claims/ClaimDefinitionForm';
import { toast } from 'sonner';
import { Edit3, Trash2, PlusCircle } from 'lucide-react';
import { ALL_COUNTRIES_CODE, ALL_COUNTRIES_NAME } from "@/lib/constants/country-codes"; // Import new constants

// Define types for the data we expect to list
interface ClaimEntry extends ClaimDefinitionData { // Use ClaimDefinitionData for more complete type
  id: string; // Ensure id is always present for list items
  master_brand_name?: string; // Optional name field
  product_names?: string[];   // Optional name field
  ingredient_name?: string;   // Optional name field
  // claim_grouping_id might be present if fetched
}

export default function DefineClaimsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [claims, setClaims] = useState<ClaimEntry[]>([]);
  const [isFetchingClaims, setIsFetchingClaims] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ClaimEntry | null>(null); // State for claim being edited
  
  const formRef = useRef<HTMLDivElement>(null); // Ref for scrolling to form

  const fetchClaims = async () => {
    setIsFetchingClaims(true);
    try {
      const response = await fetch('/api/claims?includeProductNames=true&includeMasterBrandName=true&includeIngredientName=true');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch claims');
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setClaims(result.data.map((claim: any) => ({
          ...claim,
          // Ensure country_codes is always an array, as ClaimDefinitionForm expects it
          country_codes: Array.isArray(claim.country_codes) ? claim.country_codes : (claim.country_code ? [claim.country_code] : [])
        })));
      } else {
        setClaims([]);
        throw new Error(result.error || 'Unexpected data structure for claims');
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not fetch existing claims.');
      setClaims([]);
    } finally {
      setIsFetchingClaims(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleFormSubmit = async (data: ClaimDefinitionData) => {
    setIsLoading(true);
    const isEditing = !!editingClaim;
    const url = isEditing ? `/api/claims/${editingClaim.id}` : '/api/claims';
    const method = isEditing ? 'PUT' : 'POST';

    // For PUT requests, the current API /api/claims/[id] expects a flat country_code,
    // not an array. We'll send the first one if multiple are somehow selected,
    // or the original one if not changed. This part of the API might need enhancement
    // if editing multiple country versions of the *same base claim text/type/level*
    // under a single ID is desired through this form. For now, it implies editing one specific claim record.
    let submissionData = { ...data };
    if (isEditing && editingClaim) {
      // The PUT API for a single claim ID likely expects a single country_code if it's updatable.
      // If country_codes has multiple and it's an edit, this might be an issue for the current PUT.
      // For now, let's assume the PUT /api/claims/[id] handles what it can.
      // The API for PUT /api/claims/[id] currently expects only:
      // claim_text, claim_type, description, country_code (singular)
      // It does NOT update level or associated entities.
      submissionData = {
        claim_text: data.claim_text,
        claim_type: data.claim_type,
        description: data.description,
        // Send only the first country_code for PUT if multiple are present,
        // or if it's a single one from the form.
        // This depends on how the API handles country_code on PUT.
        // The existing PUT handler for /api/claims/[id] expects 'country_code' (singular).
        country_code: data.country_codes[0] || (editingClaim.country_codes && editingClaim.country_codes.length > 0 ? editingClaim.country_codes[0] : undefined),
      } as any; // Cast to any to bypass strict ClaimDefinitionData type for API specific payload
    }


    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
      
      const result = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'save'} claim (HTTP ${response.status})`);
      }
      
      toast.success(result.message || `Claim ${isEditing ? 'updated' : 'saved'} successfully!`);
      fetchClaims();
      setEditingClaim(null); // Clear editing state
      // Reset form via key change or a dedicated reset function in ClaimDefinitionForm if available
    } catch (error: any) {
      console.error('Submit Error:', error);
      toast.error(error.message || `An error occurred while ${isEditing ? 'updating' : 'saving'} the claim.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (claim: ClaimEntry) => {
    setEditingClaim(claim);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingClaim(null);
  };
  
  const handleDelete = async (claimId: string) => {
    if (!window.confirm("Are you sure you want to delete this claim? This might affect multiple entries if it's a Master claim used in overrides.")) {
        return;
    }
    setIsLoading(true); // Use general loading or a specific deleting state
    try {
        const response = await fetch(`/api/claims/${claimId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete claim');
        }
        toast.success('Claim deleted successfully');
        fetchClaims(); // Refresh list
    } catch (error: any) {
        toast.error(error.message || 'Failed to delete claim');
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div ref={formRef} className="flex items-center justify-between mb-6 scroll-mt-20"> {/* scroll-mt for when scrolling to form */}
        <Heading
          title={editingClaim ? "Edit Claim" : "Define New Claim"}
          description={editingClaim ? "Modify the details of the existing claim." : "Create Master and Market-specific claims."}
        />
         {editingClaim && (
          <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
            Cancel Edit
          </Button>
        )}
      </div>
      <Separator className="mb-6"/>
      
      <ClaimDefinitionForm 
        key={editingClaim ? editingClaim.id : 'new'} // Change key to force re-render and reset form state
        onSubmit={handleFormSubmit} 
        isLoading={isLoading}
        initialData={editingClaim}
        onCancel={editingClaim ? handleCancelEdit : undefined} 
      />

      <Separator className="my-8"/>
      <div className="flex items-center justify-between">
        <Heading title="Existing Claims" description="Manage current claims."/>
        <Button variant="outline" onClick={() => fetchClaims()} disabled={isFetchingClaims || isLoading}>
            {isFetchingClaims ? "Refreshing..." : "Refresh List"}
        </Button>
      </div>
      {isFetchingClaims && !claims.length ? ( // Show loading only if claims list is empty initially
        <p>Loading claims...</p>
      ) : !isFetchingClaims && claims.length === 0 ? (
        <p>No claims defined yet, or failed to load claims.</p>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Associated Entity</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim Text</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Markets</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{claim.level}</td>
                  <td className="px-4 py-3 whitespace-normal text-sm text-gray-500">
                    {claim.level === 'brand' && (claim.master_brand_name || claim.master_brand_id)}
                    {claim.level === 'product' && (claim.product_names?.join(', ') || claim.product_ids?.join(', '))}
                    {claim.level === 'ingredient' && (claim.ingredient_name || claim.ingredient_id)}
                  </td>
                  <td className="px-4 py-3 whitespace-normal text-sm text-gray-900">{claim.claim_text}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{claim.claim_type}</td>
                  <td className="px-4 py-3 whitespace-normal text-sm text-gray-500">
                    {claim.country_codes.map(cc => cc === ALL_COUNTRIES_CODE ? ALL_COUNTRIES_NAME : cc).join(', ')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(claim)} disabled={isLoading}>
                      <Edit3 className="h-4 w-4 mr-1"/> Edit
                    </Button>
                     <Button variant="ghost" size="sm" onClick={() => handleDelete(claim.id)} disabled={isLoading} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-1"/> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isFetchingClaims && claims.length > 0 && <p className="text-sm text-muted-foreground mt-2">Refreshing claims list...</p>}
    </div>
  );
} 