"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from '@/lib/utils/date';
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
import { Trash2, PlusCircle, Search, AlertTriangle, Package, Building2, Loader2, Pencil, MoreVertical } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Product as defined in the API (src/app/api/products/route.ts)
interface Product {
  id: string;
  name: string;
  description: string | null;
  master_brand_id: string;
  created_at?: string;
  updated_at?: string;
  // Potentially fetched or joined data for display
  master_brand_name?: string;
}

// Minimal MasterClaimBrand for fetching the list for display names
interface MasterClaimBrand {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const productsResponse = await fetch('/api/products');
        if (!productsResponse.ok) {
          const errorData = await productsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch products');
        }
        const productsData = await productsResponse.json();
        let fetchedProducts: Product[] = [];
        if (productsData.success && Array.isArray(productsData.data)) {
          fetchedProducts = productsData.data;
        } else {
          throw new Error(productsData.error || 'Failed to parse products data');
        }

        const brandsResponse = await fetch('/api/master-claim-brands');
        if (!brandsResponse.ok) {
          const errorData = await brandsResponse.json().catch(() => ({}));
          // Log this error but don't block products from loading
          console.error('Failed to fetch master claim brands:', errorData.error || 'Unknown error');
          toast.warning("Could not fetch brand names.", { description: "Product brand names may not be displayed."});
        }
        let fetchedMasterBrands: MasterClaimBrand[] = [];
        if (brandsResponse.ok) { // only process if brandsResponse was ok
            const brandsData = await brandsResponse.json();
            if (brandsData.success && Array.isArray(brandsData.data)) {
              fetchedMasterBrands = brandsData.data;
              setMasterBrands(fetchedMasterBrands); // Set state for potential other uses
            }
        }

        const productsWithBrandNames = fetchedProducts.map(product => ({
          ...product,
          master_brand_name: fetchedMasterBrands.find(b => b.id === product.master_brand_id)?.name || 'Unknown Brand'
        }));

        setProducts(productsWithBrandNames);

      } catch (err) {
        const errorMessage = (err as Error).message || 'An unexpected error occurred';
        console.error('Error fetching data:', errorMessage);
        setError(errorMessage);
        toast.error("Failed to load Products.", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Product deleted successfully");
        setProducts(prevProducts => prevProducts.filter(p => p.id !== itemToDelete.id));
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete Product");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      console.error('Error deleting Product:', errorMessage);
      toast.error("Failed to delete Product.", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (product: Product) => {
    setItemToDelete(product);
    setShowDeleteDialog(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.master_brand_name && product.master_brand_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
      <p className="text-muted-foreground mb-4">
        Get started by adding a new product.
      </p>
      <Button asChild>
        <Link href="/dashboard/claims/products/new">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
        </Link>
      </Button>
    </div>
  );

  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center mt-4 rounded-md">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Products Match Your Search</h3>
        <p className="text-muted-foreground mb-4">Try a different search term or clear your search.</p>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Products"
        description="View, add, edit, and delete products within your brands."
        actions={
          <Button asChild>
            <Link href="/dashboard/claims/products/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Link>
          </Button>
        }
      />

      {(products.length > 0 || searchTerm) && (
        <div className="flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or brand..."
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
            <p className="text-muted-foreground">Loading Products...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : products.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : (
        <>
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableCaption className="py-4">
                {filteredProducts.length === 0 && searchTerm
                    ? "No products match your search criteria."
                    : `A list of your products. Total: ${filteredProducts.length}`
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Product Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium truncate" title={product.name}>
                        <Link href={`/dashboard/claims/products/${product.id}/edit`} className="hover:underline text-primary">
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                          <Building2 className="h-3.5 w-3.5" />
                          {product.master_brand_name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.created_at ? formatDate(product.created_at) : "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.updated_at ? formatDate(product.updated_at) : "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/claims/products/${product.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteDialog(product)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>
          </div>
          {filteredProducts.length === 0 && searchTerm && <NoResultsState />}
        </>
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product: <strong>{itemToDelete.name}</strong>.
                This may also affect any claims or ingredient associations linked to this product.
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