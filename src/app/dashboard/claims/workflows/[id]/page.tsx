// DEPRECATION NOTICE: The claims dashboard section is slated for removal; avoid referencing or extending it.
import { redirect } from 'next/navigation';

interface ClaimWorkflowDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * ClaimWorkflowDetailPage redirects to the edit page.
 * The view and edit functionality have been consolidated into a single page.
 */
export default function ClaimWorkflowDetailPage({ params }: ClaimWorkflowDetailPageProps) {
  redirect(`/dashboard/claims/workflows/${params.id}/edit`);
}
