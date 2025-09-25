"use client";

import { Megaphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PRODUCT_CLAIMS_STATUS_MESSAGE } from '@/lib/constants/claims';

interface ProductClaimsAnnouncementProps {
  className?: string;
}

export function ProductClaimsAnnouncement({ className }: ProductClaimsAnnouncementProps) {
  return (
    <Alert className={cn('border-primary/30 bg-primary/5 text-foreground', className)}>
      <Megaphone className="h-4 w-4" />
      <AlertTitle>Product Claims Update</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {PRODUCT_CLAIMS_STATUS_MESSAGE}
      </AlertDescription>
    </Alert>
  );
}
