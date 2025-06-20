import { redirect } from 'next/navigation';

interface WorkflowDetailPageProps {
  params: {
    id: string;
  };
}

/**
 * WorkflowDetailPage redirects to the edit page.
 * The view and edit functionality have been consolidated into a single page.
 */
export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  redirect(`/dashboard/workflows/${params.id}/edit`);
} 