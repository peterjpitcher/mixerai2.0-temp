"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { useToast } from "@/components/toast-provider";

interface Brand {
  id: string;
  name: string;
  country: string;
  language: string;
  content_count: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands');
        
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBrands(data.brands);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        setError((error as Error).message || 'Failed to load brands');
        toast({
          title: "Error",
          description: "Failed to load brands. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBrands();
  }, [toast]);

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
          <line x1="8" y1="16" x2="8.01" y2="16" />
          <line x1="8" y1="20" x2="8.01" y2="20" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
          <line x1="12" y1="22" x2="12.01" y2="22" />
          <line x1="16" y1="16" x2="16.01" y2="16" />
          <line x1="16" y1="20" x2="16.01" y2="20" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">No brands found</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        You haven't added any brands yet. Create your first brand to start managing content.
      </p>
      <Button size="lg" asChild>
        <Link href="/brands/new">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add Your First Brand
        </Link>
      </Button>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Failed to load brands</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {error || "An error occurred while loading your brands. Please try again."}
      </p>
      <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7l3-3.3" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7l-3 3.3" />
        </svg>
        Retry
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
        <Button asChild>
          <Link href="/brands/new">Add Brand</Link>
        </Button>
      </div>

      {/* Always show search and export buttons, even when empty */}
      {brands.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="max-w-sm">
            <Input placeholder="Search brands..." />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect width="8" height="4" x="4" y="8" rx="1" />
                <path d="M4 16v1a2 2 0 0 0 2 2h2" />
                <path d="M16 4h1a2 2 0 0 1 2 2v2" />
                <path d="M16 20h1a2 2 0 0 0 2-2v-2" />
                <path d="M8 4H7a2 2 0 0 0-2 2v2" />
                <rect width="8" height="4" x="12" y="12" rx="1" />
              </svg>
              Export
            </Button>
            <Button variant="outline" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Import
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading brands...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : brands.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{brand.name}</CardTitle>
                    <CardDescription>{brand.country}, {brand.language}</CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {brand.name.charAt(0)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-3">
                  <span>Content pieces</span>
                  <span className="font-medium">{brand.content_count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(Number(brand.content_count) * 5, 100)}%` }}></div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/brands/${brand.id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/brands/${brand.id}/edit`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 