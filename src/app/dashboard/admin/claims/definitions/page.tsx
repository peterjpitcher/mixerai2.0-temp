'use client';

import React, { useState, useEffect } from 'react';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClaimDefinitionForm } from '@/components/dashboard/claims/ClaimDefinitionForm'; // Adjusted path
import { toast } from 'sonner'; // Assuming sonner for notifications

// Define types for the data we expect to list (simplified)
interface ClaimEntry {
  id: string;
  claim_text: string;
  claim_type: string;
  level: string;
  country_code: string;
  // Add other relevant fields for display
}

export default function DefineClaimsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [claims, setClaims] = useState<ClaimEntry[]>([]); // State to hold existing claims
  const [isFetchingClaims, setIsFetchingClaims] = useState(false);

  const fetchClaims = async () => {
    setIsFetchingClaims(true);
    try {
      const response = await fetch('/api/claims'); // Assuming GET /api/claims fetches all claims
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch claims');
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setClaims(result.data);
      } else {
        setClaims([]);
        throw new Error(result.error || 'Unexpected data structure for claims');
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not fetch existing claims.');
      setClaims([]); // Clear claims on error
    } finally {
      setIsFetchingClaims(false);
    }
  };

  // Fetch claims when component mounts
  useEffect(() => {
    fetchClaims();
  }, []);

  const handleDefineClaimSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json(); // Always parse JSON to get error details if any

      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || `Failed to save claim (HTTP ${response.status})`);
      }
      
      toast.success(result.message || 'Claim(s) saved successfully!');
      fetchClaims(); // Refresh the list of claims after successful submission
      // Optionally, you might want to reset the form fields here if the form component doesn't handle it.
    } catch (error: any) {
      console.error('Submit Error:', error);
      toast.error(error.message || 'An error occurred while saving the claim.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <Heading
          title="Define New Claim"
          description="Create Master and Market-specific claims."
        />
        {/* Button for navigating to a list view or other actions can be added here */}
      </div>
      <Separator className="mb-6"/>
      
      <ClaimDefinitionForm 
        onSubmit={handleDefineClaimSubmit} 
        isLoading={isLoading} 
      />

      <Separator className="my-8"/>
      <Heading title="Existing Claims" description="Manage current claims."/>
      {isFetchingClaims ? (
        <p>Loading claims...</p>
      ) : claims.length === 0 ? (
        <p>No claims defined yet, or failed to load claims.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim Text</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market</th>
                {/* Add more headers as needed */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{claim.claim_text}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.claim_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.level}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.country_code === '__GLOBAL__' ? 'Master (Global)' : claim.country_code}</td>
                  {/* Add more cells for other claim data */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 