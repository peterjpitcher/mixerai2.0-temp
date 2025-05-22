"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui button
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Assuming shadcn/ui card
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui input
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Assuming shadcn/ui alert-dialog
import { Trash2, Edit3, PlusCircle, Search, AlertTriangle, PackageOpen, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";

interface GlobalClaimBrand {
  id: string;
  name: string;
  mixerai_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function GlobalClaimBrandsPage() {
  const [brands, setBrands] = useState<GlobalClaimBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GlobalClaimBrand | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchGlobalClaimBrands() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/global-claim-brands');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch global claim brands');
        }
        const data = await response.json();
        if (data.success) {
          setBrands(Array.isArray(data.data) ? data.data : []);
        } else {
          throw new Error(data.error || 'Failed to fetch global claim brands');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || 'An unexpected error occurred';
        console.error('Error fetching global claim brands:', errorMessage);
        setError(errorMessage);
        toast.error("Failed to load Global Claim Brands.", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchGlobalClaimBrands();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/global-claim-brands/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Global Claim Brand deleted successfully");
        setBrands(prevBrands => prevBrands.filter(b => b.id !== itemToDelete.id));
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete Global Claim Brand");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      console.error('Error deleting Global Claim Brand:', errorMessage);
      toast.error("Failed to delete Global Claim Brand.", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (brand: GlobalClaimBrand) => {
    setItemToDelete(brand);
    setShowDeleteDialog(true);
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.mixerai_brand_id && brand.mixerai_brand_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-xl font-bold mb-2">Failed to Load Data</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
      <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold mb-2">No Global Claim Brands Found</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm ? "No brands match your search criteria." : "Get started by adding a new Global Claim Brand."}
      </p>
      <Button asChild>
        <Link href="/dashboard/admin/global-claim-brands/new">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Brand
        </Link>
      </Button>
    </div>
  );
  
  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold mb-2">No Brands Found</h3>
        <p className="text-muted-foreground mb-4">No Global Claim Brands match your search criteria.</p>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader 
        title="Global Claim Brands"
        description="Manage global brand entities used for claim association."
        actions={
          <Button asChild>
            <Link href="/dashboard/admin/global-claim-brands/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Brand
            </Link>
          </Button>
        }
      />

      {(brands.length > 0 || searchTerm) && ( // Show search if there are brands or if a search term is entered
        <div className="flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or MixerAI Brand ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading Global Claim Brands...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : brands.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : filteredBrands.length === 0 && searchTerm ? (
        <NoResultsState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate" title={brand.name}>{brand.name}</CardTitle>
                {brand.mixerai_brand_id && (
                  <CardDescription className="truncate" title={brand.mixerai_brand_id}>
                    MixerAI ID: {brand.mixerai_brand_id}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Future content for the card can go here if needed */}
                <p className="text-xs text-muted-foreground">
                  Created: {brand.created_at ? new Date(brand.created_at).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated: {brand.updated_at ? new Date(brand.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/admin/global-claim-brands/${brand.id}/edit`}>
                    <Edit3 className="mr-1 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(brand)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the Global Claim Brand: <strong>{itemToDelete.name}</strong>.
                Any claims associated with this global brand might also be affected or orphaned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 