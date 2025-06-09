"use client";

import { useEffect, useState, useCallback } from "react";
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
import { DeleteBrandDialog } from "@/components/dashboard/brand/delete-brand-dialog";

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

const ErrorState = ({ error, onRetry }: { error: string | null; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
    <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
    <h3 className="text-xl font-bold mb-2">Failed to load brands</h3>
    <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
    <PackageOpen className="mb-4 h-16 w-16 text-muted-foreground" />
    <h3 className="text-xl font-bold mb-2">No Brands Available</h3>
    <p className="text-muted-foreground mb-4 text-center max-w-md">
      You currently do not have access to any brands, or no brands have been created in the system.
    </p>
    <Button asChild>
      <Link href="/brands/new">Add Brand</Link>
    </Button>
  </div>
);

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/brands');
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Fetched brands data:', data.data);
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
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSuccessfulDelete = (deletedBrandId: string) => {
    setBrands(prevBrands => prevBrands.filter(b => b.id !== deletedBrandId));
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
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
        <ErrorState error={error} onRetry={fetchBrands} />
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
                      <DeleteBrandDialog brand={brand} onSuccess={handleSuccessfulDelete}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </DeleteBrandDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 