'use client';

import React, { useState } from 'react';
import { ClaimDefinitionForm, ClaimDefinitionData } from '@/components/dashboard/claims/ClaimDefinitionForm';
import { toast } from 'sonner';

export default function DefineClaimsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (data: ClaimDefinitionData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || `Failed to save claim (HTTP ${response.status})`);
      }
      
      toast.success(result.message || 'Claim saved successfully!');
      // Reset form by re-rendering with new key
      window.location.reload();
    } catch (error: unknown) {
      console.error('Submit Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while saving the claim.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Define New Claim</h1>
        <p className="text-muted-foreground mt-2">
          Create Master and Market-specific claims.
        </p>
      </div>
      
      <ClaimDefinitionForm 
        onSubmit={handleFormSubmit} 
        isLoading={isLoading}
      />
    </div>
  );
}