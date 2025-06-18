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
import { Trash2, PlusCircle, Search, AlertTriangle, Loader2, Sprout, Pencil, MoreVertical } from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        if (data.success && Array.isArray(data.data)) {
          setIngredients(data.data);
        } else {
          throw new Error(data.error || 'Failed to parse ingredients data');
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
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      <Sprout className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No Ingredients Found</h3>
      <p className="text-muted-foreground mb-4">
        Get started by adding a new ingredient.
      </p>
      <Button asChild>
        <Link href="/dashboard/claims/ingredients/new"> {/* Updated path */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Ingredient
        </Link>
      </Button>
    </div>
  );

  const NoResultsState = () => (
     <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center mt-4 rounded-md">
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Ingredients Match Your Search</h3>
        <p className="text-muted-foreground mb-4">Try a different search term or clear your search.</p>
        <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear Search
        </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Ingredients"
        description="View, add, edit, and delete ingredients for product composition."
        actions={
          <Button asChild>
            <Link href="/dashboard/claims/ingredients/new"> {/* Updated path */}
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Ingredient
            </Link>
          </Button>
        }
      />

      {(ingredients.length > 0 || searchTerm) && (
        <div className="flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
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
            <p className="text-muted-foreground">Loading Ingredients...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState />
      ) : ingredients.length === 0 && !searchTerm ? (
        <EmptyState />
      ) : (
        <>
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableCaption className="py-4">
                {filteredIngredients.length === 0 && searchTerm 
                    ? "No ingredients match your search criteria."
                    : `A list of your ingredients. Total: ${filteredIngredients.length}`
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Ingredient Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.length > 0 ? (
                  filteredIngredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium truncate" title={ingredient.name}>
                        <Link href={`/dashboard/claims/ingredients/${ingredient.id}/edit`} className="hover:underline text-primary">
                          {ingredient.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ingredient.created_at ? formatDate(ingredient.created_at) : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ingredient.updated_at ? formatDate(ingredient.updated_at) : '-'}</TableCell>
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
                              <Link href={`/dashboard/claims/ingredients/${ingredient.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteDialog(ingredient)} className="text-destructive">
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
          {filteredIngredients.length === 0 && searchTerm && <NoResultsState />}
        </>
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