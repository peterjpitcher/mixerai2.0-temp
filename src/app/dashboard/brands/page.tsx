"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { BrandIcon } from "@/components/brand-icon";
import { COUNTRIES, LANGUAGES } from "@/lib/constants";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Trash2, PackageOpen, AlertTriangle, FileUp, FileDown, Eye, Edit3 } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";

interface Brand {
  id: string;
  name: string;
  country: string;
  language: string;
  content_count: number;
  brand_color?: string;
}

interface BrandsPageClientProps {
  initialBrands: Brand[];
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requiresCascade, setRequiresCascade] = useState(false);
  const [contentCount, setContentCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands');
        
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBrands(Array.isArray(data.data) ? data.data : []);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        setError((error as Error).message || 'Failed to load brands');
        toast.error("Failed to load brands. Please try again.", {
          description: "Error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBrands();
  }, []);

  const handleDeleteBrand = async (cascade: boolean = false) => {
    if (!brandToDelete) return;
    
    setIsDeleting(true);
    try {
      const url = new URL(`/api/brands/${brandToDelete.id}`, window.location.origin);
      if (cascade) {
        url.searchParams.append('deleteCascade', 'true');
      }
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast("Brand deleted successfully", {
          description: data.message || "Success",
        });
        // Remove the brand from the state
        setBrands(prevBrands => prevBrands.filter(b => b.id !== brandToDelete.id));
        setShowDeleteDialog(false);
        setBrandToDelete(null);
        setRequiresCascade(false);
        setContentCount(data.contentCount || 0);
        setWorkflowCount(data.workflowCount || 0);
      } else if (data.requiresCascade) {
        setRequiresCascade(true);
        setContentCount(data.contentCount || 0);
        setWorkflowCount(data.workflowCount || 0);
      } else {
        toast.error(data.error || "Failed to delete brand", {
          description: "Error",
        });
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error("An unexpected error occurred", {
        description: "Error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Group brands by country
  const groupBrandsByCountry = (brands: Brand[]) => {
    const groupedBrands: Record<string, { countryName: string, brands: Brand[] }> = {};
    
    brands.forEach(brand => {
      if (!brand.country) {
        // Handle brands with no country
        if (!groupedBrands['unknown']) {
          groupedBrands['unknown'] = {
            countryName: 'Unknown',
            brands: []
          };
        }
        groupedBrands['unknown'].brands.push(brand);
        return;
      }
      
      if (!groupedBrands[brand.country]) {
        const countryName = COUNTRIES.find(c => c.value === brand.country)?.label || brand.country;
        groupedBrands[brand.country] = {
          countryName,
          brands: []
        };
      }
      
      groupedBrands[brand.country].brands.push(brand);
    });
    
    // Sort by country name
    return Object.entries(groupedBrands)
      .sort((a, b) => a[1].countryName.localeCompare(b[1].countryName));
  };
  
  // Filter brands based on search term
  const filteredBrands = (Array.isArray(brands) ? brands : []).filter(brand => 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (COUNTRIES.find(c => c.value === brand.country)?.label || brand.country)
      .toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group brands by country after filtering
  const groupedBrands = groupBrandsByCountry(filteredBrands);

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-xl font-bold mb-2">Failed to load brands</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
      <div className="mb-4 text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      </div>
      <h3 className="text-xl font-bold mb-2">No brands yet</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        Get started by creating your first brand to manage content for.
      </p>
      <Button asChild>
        <Link href="/brands/new">Add Your First Brand</Link>
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
          <div className="max-w-sm w-full">
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
      ) : filteredBrands.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
          <h3 className="text-xl font-bold mb-2">No brands found</h3>
          <p className="text-muted-foreground mb-4">No brands match your search criteria.</p>
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedBrands.map(([countryCode, { countryName, brands }]) => (
            <div key={countryCode} className="space-y-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold">{countryName}</h2>
                <div className="ml-3 px-2 py-1 bg-muted rounded-full text-xs font-medium">
                  {brands.length} brand{brands.length !== 1 ? 's' : ''}
                </div>
                <div className="h-px flex-1 bg-border ml-4"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brand) => (
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
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(Number(brand.content_count) * 5, 100)}%`,
                            backgroundColor: brand.brand_color || '#3498db'
                          }}
                        ></div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {brand.content_count} content item{brand.content_count !== 1 ? 's' : ''}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-between">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/brands/${brand.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/brands/${brand.id}/edit`} className="flex items-center">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setBrandToDelete(brand);
                          setShowDeleteDialog(true);
                          setRequiresCascade(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {requiresCascade
                ? "Delete brand and associated items?" 
                : "Are you sure you want to delete this brand?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {requiresCascade 
                ? `This will delete the brand "${brandToDelete?.name}" along with ${contentCount} content item${contentCount !== 1 ? 's' : ''} and ${workflowCount} workflow${workflowCount !== 1 ? 's' : ''}.`
                : `This action will permanently delete the brand "${brandToDelete?.name}" and cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {requiresCascade ? (
              <AlertDialogAction
                onClick={() => handleDeleteBrand(true)}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => handleDeleteBrand()}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 