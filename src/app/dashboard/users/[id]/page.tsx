'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Mail, 
  Building, 
  Briefcase, 
  Calendar, 
  Clock, 
  Shield, 
  AlertCircle,
  ChevronLeft,
  Edit,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import type { Metadata } from 'next';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/alert-dialog";
import { Badge } from '@/components/badge';
import { BrandIcon } from '@/components/brand-icon';
import { PageHeader } from '@/components/dashboard/page-header';
import { Label } from '@/components/label';

// export const metadata: Metadata = {
//   title: 'User Details | MixerAI 2.0',
//   description: 'View detailed information and brand permissions for a specific user.',
// };

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  brand_permissions?: {
    id: string;
    brand_id: string;
    role: string;
    brand?: Brand;
  }[];
  job_title?: string;
  company?: string;
}

/**
 * UserDetailPage displays comprehensive details for a specific user account.
 * This includes their profile information (name, email, company, job title, role, avatar),
 * account activity (creation date, last sign-in), and a list of brands they have 
 * permissions for, along with their role for each brand.
 * It also provides actions to edit or delete the user.
 */
export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    async function fetchUserData() {
      if (!params) {
        toast.error("User ID not found in URL.");
        setIsLoading(false);
        return;
      }
      const userId = params.id;
      setIsLoading(true);
      
      try {
        // Fetch user details
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('User Not Found: The requested user could not be found.');
            router.push('/dashboard/users');
            return;
          }
          
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch user.');
        }
        
        // Fetch brands to get extra information
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success && Array.isArray(brandsData.data) && data.user.brand_permissions?.length > 0) {
          // Enhance brand permissions with brand details
          data.user.brand_permissions = data.user.brand_permissions.map((permission: any) => {
            const brand = brandsData.data.find((b: Brand) => b.id === permission.brand_id);
            return {
              ...permission,
              brand: brand || undefined
            };
          });
        }
        
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (params?.id) {
      fetchUserData();
    }
  }, [params, router]);
  
  const handleConfirmDelete = async () => {
    if (!params || !user) {
      toast.error("Cannot delete user: Invalid user or parameters.");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Call the API route to handle user deletion
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();

      if (data.success) {
        toast('User deleted successfully');
        setShowDeleteDialog(false);
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'An unknown error occurred during deletion');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <PageHeader title="User Details" actions={null} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <PageHeader title="User Not Found" actions={
          <Link href="/dashboard/users">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        } />
        <Card>
          <CardContent className="pt-6">
            <p>The requested user could not be found or loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const userId = params?.id;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader 
        title={user.full_name || 'User Details'}
        description={`Details for ${user.email}`}
        actions={
          <div className="flex space-x-2">
            <Link href="/dashboard/users">
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </Link>
            {userId && (
              <>
                <Link href={`/dashboard/users/${userId}/edit`}>
                  <Button>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit User
                  </Button>
                </Link>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Full Name</Label><p>{user.full_name || '-'}</p></div>
            <div><Label>Email</Label><p>{user.email}</p></div>
            <div><Label>Role</Label><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role || 'member'}</Badge></div>
            <div><Label>Joined</Label><p>{new Date(user.created_at).toLocaleDateString()}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Permissions</CardTitle>
          <CardDescription>Brands this user has access to and their role within each.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.brand_permissions && user.brand_permissions.length > 0 ? (
            <ul className="space-y-3">
              {user.brand_permissions.map(perm => (
                <li key={perm.brand_id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <BrandIcon name={perm.brand?.name || 'Unknown Brand'} color={perm.brand?.brand_color || '#cbd5e1'} size="sm" />
                    <span>{perm.brand?.name || 'Unknown Brand'}</span>
                  </div>
                  <Badge variant={perm.role === 'admin' ? 'outline' : 'secondary'}>{perm.role}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">This user has no specific brand permissions assigned.</p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
            <DialogDescription>
              This action will permanently delete the user "{user.full_name || user.email}" and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 