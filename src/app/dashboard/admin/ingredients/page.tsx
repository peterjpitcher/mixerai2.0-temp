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
import { Trash2, Edit3, PlusCircle, Search, AlertTriangle, PackageOpen, Loader2, Sprout } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";

interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Ingredient | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchIngredients() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ingredients');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch ingredients');
        }
        const data = await response.json();
        if (data.success) {
          setIngredients(Array.isArray(data.data) ? data.data : []);
        } else {
          throw new Error(data.error || 'Failed to fetch ingredients');
        }
      } catch (err) {
        const errorMessage = (err as Error).message || 'An unexpected error occurred';
        console.error('Error fetching ingredients:', errorMessage);
        setError(errorMessage);
        toast.error("Failed to load Ingredients.", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchIngredients();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ingredients/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Ingredient deleted successfully");
        setIngredients(prevIngredients => prevIngredients.filter(i => i.id !== itemToDelete.id));
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete Ingredient");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      console.error('Error deleting Ingredient:', errorMessage);
      toast.error("Failed to delete Ingredient.", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (ingredient: Ingredient) => {
    setItemToDelete(ingredient);
    setShowDeleteDialog(true);
  };

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ingredient.description && ingredient.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <Sprout className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold mb-2">No Ingredients Found</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm ? "No ingredients match your search criteria." : "Get started by adding a new ingredient."}
      </p>
      <Button asChild>
        <Link href="/dashboard/admin/ingredients/new">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Ingredient
        </Link>
      </Button>
    </div>
  );
  
  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold mb-2">No Ingredients Found</h3>
        <p className="text-muted-foreground mb-4">No ingredients match your search criteria.</p>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );


  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader 
        title="Ingredients"
        description="Manage ingredients used for product composition and claim association."
        actions={
          <Button asChild>
            <Link href="/dashboard/admin/ingredients/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Ingredient
            </Link>
          </Button>
        }
      />

      {(ingredients.length > 0 || searchTerm) && (
        <div className="flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
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
            <p className="text-muted-foreground">Loading Ingredients...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : ingredients.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : filteredIngredients.length === 0 && searchTerm ? (
        <NoResultsState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredIngredients.map((ingredient) => (
            <Card key={ingredient.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate" title={ingredient.name}>{ingredient.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                {ingredient.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3" title={ingredient.description}>
                    {ingredient.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    Created: {ingredient.created_at ? new Date(ingredient.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated: {ingredient.updated_at ? new Date(ingredient.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/admin/ingredients/${ingredient.id}/edit`}>
                    <Edit3 className="mr-1 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(ingredient)}>
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
                This action cannot be undone. This will permanently delete the ingredient: <strong>{itemToDelete.name}</strong>.
                This may also affect any products or claims associated with this ingredient.
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