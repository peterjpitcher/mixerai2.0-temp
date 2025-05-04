"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { COUNTRIES, LANGUAGES } from "@/lib/constants";

interface Brand {
  id: string;
  name: string;
  country: string;
  language: string;
  content_count: number;
  brand_color?: string;
  brand_summary?: string;
}

interface GroupedBrands {
  [key: string]: {
    country: string;
    countryLabel: string;
    brands: Brand[];
    isExpanded: boolean;
  };
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [groupedBrands, setGroupedBrands] = useState<GroupedBrands>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchBrands = async () => {
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
  };

  useEffect(() => {
    fetchBrands();
  }, [toast]);

  // Group brands by country whenever brands array changes
  useEffect(() => {
    const grouped: GroupedBrands = {};
    
    brands.forEach(brand => {
      const countryCode = brand.country || 'Unknown';
      const countryLabel = COUNTRIES.find(c => c.value === countryCode)?.label || countryCode;
      
      if (!grouped[countryCode]) {
        grouped[countryCode] = {
          country: countryCode,
          countryLabel: countryLabel,
          brands: [],
          isExpanded: true
        };
      }
      
      grouped[countryCode].brands.push(brand);
    });
    
    // Sort brands within each country by name
    Object.values(grouped).forEach(group => {
      group.brands.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    setGroupedBrands(grouped);
  }, [brands]);

  // Filter brands based on search term
  const filteredGroupedBrands = Object.entries(groupedBrands).reduce((acc, [country, group]) => {
    if (searchTerm) {
      const filteredBrands = group.brands.filter(brand => 
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.brand_summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredBrands.length > 0) {
        acc[country] = {
          ...group,
          brands: filteredBrands
        };
      }
    } else {
      acc[country] = group;
    }
    
    return acc;
  }, {} as GroupedBrands);

  // Toggle country group expansion
  const toggleCountryExpansion = (country: string) => {
    setGroupedBrands(prev => ({
      ...prev,
      [country]: {
        ...prev[country],
        isExpanded: !prev[country].isExpanded
      }
    }));
  };

  // Handle delete brand
  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError("");

      const response = await fetch(`/api/brands/${brandToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Brand deleted successfully",
        });
        // Refresh the brands list
        fetchBrands();
      } else {
        setDeleteError(data.error || "Failed to delete brand");
        toast({
          title: "Error",
          description: data.error || "Failed to delete brand",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setDeleteError(error.message || "An error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Brand Card component
  const BrandCard = ({ brand }: { brand: Brand }) => (
    <Card key={brand.id}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{brand.name}</CardTitle>
            <CardDescription>
              {LANGUAGES.find(l => l.value === brand.language)?.label || brand.language}
            </CardDescription>
          </div>
          <BrandIcon 
            name={brand.name} 
            color={brand.brand_color} 
            size="md"
          />
        </div>
      </CardHeader>
      <CardContent>
        {brand.brand_summary ? (
          <p className="text-sm text-muted-foreground line-clamp-3">{brand.brand_summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No brand summary available</p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <div className="flex gap-2">
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
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            setBrandToDelete(brand);
            setShowDeleteConfirm(true);
          }}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
        <Button asChild>
          <Link href="/brands/new">Add Brand</Link>
        </Button>
      </div>

      {/* Search input for brands */}
      {brands.length > 0 && (
        <div className="flex items-center">
          <div className="max-w-sm">
            <Input 
              placeholder="Search brands..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
        <div className="space-y-8">
          {Object.entries(filteredGroupedBrands).length === 0 && searchTerm ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No brands found matching "{searchTerm}"</p>
            </div>
          ) : (
            Object.entries(filteredGroupedBrands)
              .sort(([, groupA], [, groupB]) => groupA.countryLabel.localeCompare(groupB.countryLabel))
              .map(([countryCode, group]) => (
                <div key={countryCode} className="space-y-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer border-b pb-2"
                    onClick={() => toggleCountryExpansion(countryCode)}
                  >
                    <h2 className="text-xl font-semibold">{group.countryLabel} ({group.brands.length})</h2>
                    <Button variant="ghost" size="sm">
                      {group.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {group.isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.brands.map(brand => (
                        <BrandCard key={brand.id} brand={brand} />
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {brandToDelete && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Brand"
          description={
            deleteError ? (
              <div className="text-destructive my-2">
                {deleteError}
              </div>
            ) : (
              <div>
                <p>Are you sure you want to delete the brand <strong>{brandToDelete.name}</strong>?</p>
                <p className="mt-2">This action cannot be undone and will delete all brand information.</p>
                <p className="mt-2">Note: Brands with existing content cannot be deleted.</p>
              </div>
            )
          }
          verificationText={brandToDelete.name}
          verificationRequired={true}
          onConfirm={handleDeleteBrand}
          confirmText={isDeleting ? "Deleting..." : "Delete Brand"}
          cancelText="Cancel"
          variant="destructive"
        />
      )}
    </div>
  );
} 