import { requireAuth } from '@/lib/auth/server';

export default async function RetailerPDPContentPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-4">Retailer PDP Content</h1>
      <p>This is the dedicated page for Retailer PDP content type. Customise as needed.</p>
    </div>
  );
} 