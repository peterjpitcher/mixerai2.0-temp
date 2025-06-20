import { redirect } from 'next/navigation';

interface BrandDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function BrandDetailsPage({ params }: BrandDetailsPageProps) {
  // Always redirect to the edit page
  redirect(`/dashboard/brands/${params.id}/edit`);
}