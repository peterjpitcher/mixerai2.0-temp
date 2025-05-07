import { requireAuth } from '@/lib/auth/server';

export default async function OwnedPDPContentPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-4">Owned PDP Content</h1>
      <p>This is the dedicated page for Owned PDP content type. Customise as needed.</p>
    </div>
  );
} 