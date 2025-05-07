import { Button } from "@/components/button";
import Link from "next/link";

export const metadata = {
  title: 'Retailer PDP | MixerAI',
  description: 'Manage retailer product description pages for your brands',
};

export default function RetailerPDPPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retailer Product Pages</h1>
          <p className="text-muted-foreground">
            Manage product description content for third-party retailer platforms
          </p>
        </div>
        <Button asChild>
          <Link href="/content/new?type=Retailer%20PDP">Create New Retailer PDP</Link>
        </Button>
      </div>
      
      <div className="border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Retailer PDP Management</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This page will display your retailer product description pages with filters, search, and other customizations specific to retailer content.
        </p>
        <Button variant="outline" asChild>
          <Link href="/content/new?type=Retailer%20PDP">Create Your First Retailer PDP</Link>
        </Button>
      </div>
    </div>
  );
} 