import { Button } from "@/components/button";
import Link from "next/link";
import { requireAuth } from '@/lib/auth/server';

export const metadata = {
  title: 'Articles | MixerAI',
  description: 'Manage article content for your brands',
};

export default async function ArticleContentPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Manage long-form article content for your brands
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/content/new?type=Article">Create New Article</Link>
        </Button>
      </div>
      
      <div className="border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Article Content Management</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This page will display your articles with filters, search, and other customizations specific to article content.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/content/new?type=Article">Create Your First Article</Link>
        </Button>
      </div>
    </div>
  );
} 