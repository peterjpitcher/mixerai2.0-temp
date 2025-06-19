'use client';

import React, { useState } from 'react';
import { ClaimDefinitionFormV2, ClaimDefinitionData } from '@/components/dashboard/claims/ClaimDefinitionFormV2';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { PageHeader } from '@/components/dashboard/page-header';

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
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Define New Claim" }
      ]} />
      
      <PageHeader
        title="Define New Claim"
        description="Create claims that can be used across your products and markets. Follow the guided steps to ensure all required information is provided."
      />
      
      <ClaimDefinitionFormV2 
        onSubmit={handleFormSubmit} 
        isLoading={isLoading}
      />
    </div>
  );
}