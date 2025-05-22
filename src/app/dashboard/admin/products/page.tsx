"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, Edit3, PlusCircle, Search, AlertTriangle, PackageOpen, Loader2, Package, Building2 } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";

// Product as defined in the API (src/app/api/products/route.ts)
interface Product {
  id: string;
  name: string;
  description: string | null;
  global_brand_id: string; 
  created_at?: string;
  updated_at?: string;
  // Potentially fetched or joined data for display
  global_brand_name?: string; 
}

// Minimal GlobalClaimBrand for fetching the list for display names
interface GlobalClaimBrand {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [globalBrands, setGlobalBrands] = useState<GlobalClaimBrand[]>([]);
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
        // Fetch all products
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

        // Fetch all global claim brands to map names
        const brandsResponse = await fetch('/api/global-claim-brands');
        if (!brandsResponse.ok) {
          const errorData = await brandsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch global claim brands');
        }
        const brandsData = await brandsResponse.json();
        let fetchedGlobalBrands: GlobalClaimBrand[] = [];
        if (brandsData.success && Array.isArray(brandsData.data)) {
          fetchedGlobalBrands = brandsData.data;
          setGlobalBrands(fetchedGlobalBrands);
        }
        // Even if brands fail to load, we can still show products, just without brand names

        // Combine product data with brand names
        const productsWithBrandNames = fetchedProducts.map(product => ({
          ...product,
          global_brand_name: fetchedGlobalBrands.find(b => b.id === product.global_brand_id)?.name || 'Unknown Brand'
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
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.global_brand_name && product.global_brand_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold mb-2">No Products Found</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm ? "No products match your search criteria." : "Get started by adding a new product."}
      </p>
      <Button asChild>
        <Link href="/dashboard/admin/products/new">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
        </Link>
      </Button>
    </div>
  );
  
  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold mb-2">No Products Found</h3>
        <p className="text-muted-foreground mb-4">No products match your search criteria.</p>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader 
        title="Products"
        description="Manage products, their ingredients, and associated claims."
        actions={
          <Button asChild>
            <Link href="/dashboard/admin/products/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Link>
          </Button>
        }
      />

      {(products.length > 0 || searchTerm) && (
        <div className="flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, description, or brand..."
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
            <p className="text-muted-foreground">Loading Products...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : products.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : filteredProducts.length === 0 && searchTerm ? (
        <NoResultsState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate" title={product.name}>{product.name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="flex items-center w-fit">
                    <Building2 className="mr-1 h-3 w-3" /> 
                    {product.global_brand_name || 'N/A'}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {product.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3" title={product.description}>
                    {product.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    Created: {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated: {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/admin/products/${product.id}/edit`}>
                    <Edit3 className="mr-1 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(product)}>
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