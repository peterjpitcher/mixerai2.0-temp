"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { UnifiedClaimForm } from '@/components/dashboard/claims/UnifiedClaimForm';
import { apiFetch } from '@/lib/api-client';

export default function NewClaimPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    try {
      const res = await apiFetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        const msg = result?.error || 'Failed to create claim';
        toast.error('Failed to create claim', { description: msg });
        throw new Error(msg);
      }
      toast.success('Claim created successfully');
      router.push('/dashboard/claims');
    } catch (e) {
      // Already toasted above; rethrow to allow form to manage loading state if needed
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/claims"><ArrowLeft className="mr-2 h-4 w-4" />Back to Claims</Link>
        </Button>
      </div>
      <PageHeader title="Add New Claim" description="Define a new claim and its associations." />
      <UnifiedClaimForm onSubmit={handleSubmit} />
    </div>
  );
}

