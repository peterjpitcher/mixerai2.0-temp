"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Edit3, PlusCircle, Search, AlertTriangle, Loader2, GripHorizontal, Globe, Pencil } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MasterClaimBrand { 
  id: string;
  name: string;
  mixerai_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function MasterClaimBrandsPage() { 
  const [brands, setBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MasterClaimBrand | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchMasterClaimBrands() { 
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/master-claim-brands'); 
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch master claim brands');
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setBrands(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse master claim brands data');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || 'An unexpected error occurred';
        console.error('Error fetching master claim brands:', errorMessage);
        setError(errorMessage);
        toast.error("Failed to load Master Claim Brands.", { 
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMasterClaimBrands();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/master-claim-brands/${itemToDelete.id}`, { 
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Master Claim Brand deleted successfully"); 
        setBrands(prevBrands => prevBrands.filter(b => b.id !== itemToDelete.id));
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete Master Claim Brand");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      console.error('Error deleting Master Claim Brand:', errorMessage);
      toast.error("Failed to delete Master Claim Brand.", { 
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (brand: MasterClaimBrand) => {
    setItemToDelete(brand);
    setShowDeleteDialog(true);
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.mixerai_brand_id && brand.mixerai_brand_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center rounded-md">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-xl font-semibold mb-2">Failed to Load Data</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
      <Button onClick={() => window.location.reload()}>Try Again</Button>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center rounded-md">
      <Globe className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No Master Claim Brands Found</h3> 
      <p className="text-muted-foreground mb-4">
        Get started by adding a new Master Claim Brand.
      </p>
      <Button asChild>
        <Link href="/dashboard/claims/brands/new"> {/* Updated path */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Brand
        </Link>
      </Button>
    </div>
  );

  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center mt-4 rounded-md">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Brands Match Your Search</h3>
        <p className="text-muted-foreground mb-4">No Master Claim Brands match your search criteria.</p> 
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Master Claim Brands" 
        description="Manage master brand entities for claim association." 
        actions={
          <Button asChild>
            <Link href="/dashboard/claims/brands/new"> {/* Updated path */}
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Brand
            </Link>
          </Button>
        }
      />

      {(brands.length > 0 || searchTerm) && (
        <div className="flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or MixerAI Brand ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading Master Claim Brands...</p> 
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : brands.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : (
        <>
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableCaption className="py-4">
                {filteredBrands.length === 0 && searchTerm 
                    ? "No Master Claim Brands match your search criteria." 
                    : `A list of your Master Claim Brands. Total: ${filteredBrands.length}` 
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Brand Name</TableHead>
                  <TableHead>MixerAI Brand ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.length > 0 ? (
                  filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium truncate" title={brand.name}>
                        <Link href={`/dashboard/claims/brands/${brand.id}/edit`} className="hover:underline text-primary">
                          {brand.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{brand.mixerai_brand_id || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{brand.created_at ? new Date(brand.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{brand.updated_at ? new Date(brand.updated_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild title="Edit Brand" aria-label="Edit Brand">
                          <Link href={`/dashboard/claims/brands/${brand.id}/edit`} >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title="Delete Brand"
                          aria-label="Delete Brand"
                          onClick={() => openDeleteDialog(brand)}
                          // disabled={isDeleting && itemToDelete?.id === brand.id} 
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>
          </div>
          {filteredBrands.length === 0 && searchTerm && <NoResultsState />}
        </>
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the Master Claim Brand: <strong>{itemToDelete.name}</strong>. 
                Any claims associated with this master brand might also be affected or orphaned.
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