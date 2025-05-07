'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useToast } from '@/components/toast-provider';
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
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";

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

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user details
        const response = await fetch(`/api/users/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: 'User not found',
              description: 'The requested user could not be found.',
              variant: 'destructive'
            });
            router.push('/dashboard/users');
            return;
          }
          
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch user');
        }
        
        // Fetch brands to get extra information
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success && data.user.brand_permissions?.length > 0) {
          // Enhance brand permissions with brand details
          data.user.brand_permissions = data.user.brand_permissions.map((permission: any) => {
            const brand = brandsData.brands.find((b: Brand) => b.id === permission.brand_id);
            return {
              ...permission,
              brand: brand || undefined
            };
          });
        }
        
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user information. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [params.id, router, toast]);
  
  const handleDelete = async () => {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'User deleted',
          description: `${user.full_name} has been removed.`
        });
        
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading user information...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested user could not be found or may have been deleted.</p>
        <Button asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{user.full_name}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/users/${user.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit User
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete User
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>User information and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="relative h-32 w-32 rounded-full bg-primary/10 overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-4xl font-semibold text-primary">
                      {user.full_name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{user.email}</p>
                  </div>
                </div>
                
                {user.company && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p>{user.company}</p>
                    </div>
                  </div>
                )}
                
                {user.job_title && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                      <p>{user.job_title}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs mr-2 ${
                        user.role?.toLowerCase().includes('admin') 
                          ? 'bg-primary/20 text-primary'
                          : user.role?.toLowerCase().includes('editor')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                    <p>{formatDate(user.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Sign In</p>
                    <p>{user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Tabs defaultValue="brands">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="brands">Brand Permissions</TabsTrigger>
            </TabsList>
            <TabsContent value="brands" className="p-0 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Permissions</CardTitle>
                  <CardDescription>User's access rights to brands</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!user.brand_permissions || user.brand_permissions.length === 0) ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">This user doesn't have access to any brands.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {user.brand_permissions.map((permission) => {
                        const brand = permission.brand;
                        const color = brand?.brand_color || '#cbd5e1';
                        
                        return (
                          <div key={permission.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                                style={{ backgroundColor: color }}
                              >
                                {(brand?.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-medium">{brand?.name || 'Unknown Brand'}</h3>
                                <p className="text-sm text-muted-foreground">Brand ID: {permission.brand_id}</p>
                              </div>
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                permission.role.toLowerCase() === 'admin' 
                                  ? 'bg-primary/20 text-primary'
                                  : permission.role.toLowerCase() === 'editor'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}>
                                {permission.role.charAt(0).toUpperCase() + permission.role.slice(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/users/${user.id}/edit`}>
                      Manage Brand Permissions
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {user.full_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 