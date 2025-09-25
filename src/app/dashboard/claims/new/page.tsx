"use client";

import Link from 'next/link';
import { ArrowLeft, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PRODUCT_CLAIMS_DEPRECATION_MESSAGE } from '@/lib/constants/claims';

export default function NewClaimPage() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/claims"><ArrowLeft className="mr-2 h-4 w-4" />Back to Claims</Link>
        </Button>
      </div>
      <PageHeader
        title="Add New Claim (Deprecated)"
        description="Product Claims have been deprecated. New claims can no longer be created."
      />
      <Alert variant="destructive">
        <AlertOctagon className="h-4 w-4" />
        <AlertTitle>Product Claims Creation Disabled</AlertTitle>
        <AlertDescription>{PRODUCT_CLAIMS_DEPRECATION_MESSAGE}</AlertDescription>
      </Alert>
    </div>
  );
}
