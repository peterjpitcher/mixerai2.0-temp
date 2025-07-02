'use client';

import { useState } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Brand {
  id: string;
  name: string;
}

interface DeleteBrandDialogProps {
  brand: Brand;
  onSuccess: (deletedBrandId: string) => void;
  children: React.ReactNode;
}

export function DeleteBrandDialog({ brand, onSuccess, children }: DeleteBrandDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requiresCascade, setRequiresCascade] = useState(false);
  const [contentCount, setContentCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);

  const handleDeleteBrand = async (cascade: boolean = false) => {
    setIsDeleting(true);
    try {
      const url = new URL(`/api/brands/${brand.id}`, window.location.origin);
      if (cascade) {
        url.searchParams.append('deleteCascade', 'true');
      }
      
      const response = await apiFetch(url.toString(), {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast("Brand deleted successfully", {
          description: data.message || "Success",
        });
        onSuccess(brand.id);
        setIsOpen(false);
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when dialog is closed
      setRequiresCascade(false);
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {requiresCascade
              ? "Delete brand and associated items?" 
              : "Are you sure you want to delete this brand?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {requiresCascade 
              ? `This will delete the brand "${brand?.name}" along with ${contentCount} content item${contentCount !== 1 ? 's' : ''} and ${workflowCount} workflow${workflowCount !== 1 ? 's' : ''}.`
              : `This action will permanently delete the brand "${brand?.name}" and cannot be undone.`}
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
  );
} 