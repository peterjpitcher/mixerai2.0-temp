'use client';

import React from 'react';
import { ClaimDefinitionFormV2 } from '@/components/dashboard/claims/ClaimDefinitionFormV2';

export interface UnifiedClaimFormProps {
  initialData?: Parameters<typeof ClaimDefinitionFormV2>[0]['initialData'];
  onSubmit: Parameters<typeof ClaimDefinitionFormV2>[0]['onSubmit'];
  isLoading?: boolean;
  onCancel?: () => void;
}

export function UnifiedClaimForm(props: UnifiedClaimFormProps) {
  return <ClaimDefinitionFormV2 {...props} />;
}

