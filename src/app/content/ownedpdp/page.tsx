import { Button } from "@/components/button";
import Link from "next/link";

export const metadata = {
  title: 'Owned PDP | MixerAI',
  description: 'Manage owned product description pages for your brands',
};

export default function OwnedPDPPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owned Product Pages</h1>
          <p className="text-muted-foreground">
            Manage product description content for your own e-commerce platforms
          </p>
        </div>
        <Button asChild>
          <Link href="/content/new?type=Owned%20PDP">Create New PDP</Link>
        </Button>
      </div>
      
      <div className="border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Owned PDP Management</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This page will display your product description pages with filters, search, and other customizations specific to PDP content.
        </p>
        <Button variant="outline" asChild>
          <Link href="/content/new?type=Owned%20PDP">Create Your First PDP</Link>
        </Button>
      </div>
    </div>
  );
} 