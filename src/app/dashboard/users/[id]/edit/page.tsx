'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

// export const metadata: Metadata = {
//   title: 'Edit User | MixerAI 2.0',
//   description: 'Modify user profile details, roles, and brand permissions.',
// };

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

interface BrandPermission {
  id?: string;
  brand_id: string;
  role: string;
  brand?: Brand;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string; // This is the highest brand role, can be kept for display if needed
  globalRole?: string; // For the actual global role from user_metadata
  created_at: string;
  last_sign_in_at?: string;
  brand_permissions?: BrandPermission[];
  job_title?: string;
  company?: string;
}

// Define UserSessionData interface
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
}

/**
 * EditUserPage allows administrators to modify details for an existing user.
 * This includes updating their full name, job title, company, and default system role.
 * It also provides an interface to manage brand-specific permissions, allowing assignment
 * of users to brands with specific roles (Admin, Editor, Viewer) for each brand.
 */
export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    job_title: '',
    company: '',
    globalRole: '' // New state for the global role dropdown
  });
  const [selectedBrands, setSelectedBrands] = useState<{[key: string]: {selected: boolean, role: string}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // RBAC State
  const [currentUserSession, setCurrentUserSession] = useState<UserSessionData | null>(null);
  const [isLoadingUserSession, setIsLoadingUserSession] = useState(true);
  const [userSessionError, setUserSessionError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  // Fetch current user for RBAC
  useEffect(() => {
    const fetchCurrentUserSession = async () => {
      setIsLoadingUserSession(true);
      setUserSessionError(null);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUserSession(data.user);
        } else {
          setCurrentUserSession(null);
          setUserSessionError(data.error || 'User data not found in session.');
        }
      } catch (error) {
        console.error('[EditUserPage] Error fetching current user session:', error);
        setCurrentUserSession(null);
        setUserSessionError((error as Error).message || 'An unexpected error occurred.');
      } finally {
        setIsLoadingUserSession(false);
      }
    };
    fetchCurrentUserSession();
  }, []);

  // Check permissions
  useEffect(() => {
    if (!isLoadingUserSession && currentUserSession) {
      setIsCheckingPermissions(true);
      if (currentUserSession.user_metadata?.role === 'admin') {
        setIsAllowedToAccess(true);
      } else {
        setIsAllowedToAccess(false);
      }
      setIsCheckingPermissions(false);
    } else if (!isLoadingUserSession && !currentUserSession) {
      setIsAllowedToAccess(false);
      setIsCheckingPermissions(false);
    }
  }, [currentUserSession, isLoadingUserSession]);

  // Fetch user and brands data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user details
        const userResponse = await fetch(`/api/users/${params.id}`);
        
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            toast.error('User not found: The requested user could not be found.');
            router.push('/dashboard/users');
            return;
          }
          
          throw new Error(`Failed to fetch user: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        
        if (!userData.success) {
          throw new Error(userData.error || 'Failed to fetch user.');
        }
        
        // Fetch all brands
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success) {
          const currentBrands = Array.isArray(brandsData.data) ? brandsData.data : [];
          setBrands(currentBrands);
          
          // Initialize the selectedBrands state
          const brandPermissions: {[key: string]: {selected: boolean, role: string}} = {};
          
          // First, set all brands as unselected with default role of 'viewer'
          currentBrands.forEach((brand: Brand) => {
            brandPermissions[brand.id] = { selected: false, role: 'viewer' };
          });
          
          // Then, update with the user's actual permissions
          if (userData.user.brand_permissions && userData.user.brand_permissions.length > 0) {
            userData.user.brand_permissions.forEach((permission: BrandPermission) => {
              if (permission.brand_id) {
                brandPermissions[permission.brand_id] = { 
                  selected: true, 
                  role: permission.role || 'viewer' 
                };
              }
            });
          }
          
          setSelectedBrands(brandPermissions);
        }
        
        // Set user data
        setUser(userData.user);
        
        // Initialize form values
        setForm({
          full_name: userData.user.full_name || '',
          job_title: userData.user.job_title || '',
          company: userData.user.company || '',
          globalRole: userData.user.globalRole || 'viewer' // Initialize globalRole
        });
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load user information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAllowedToAccess && !isLoadingUserSession && !isCheckingPermissions) {
      fetchData();
    } else if (!isLoadingUserSession && !isCheckingPermissions && !isAllowedToAccess) {
      setIsLoading(false); // Stop main data loading if access denied
    }
  }, [params.id, router, isAllowedToAccess, isLoadingUserSession, isCheckingPermissions]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle global role change
  const handleGlobalRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, globalRole: value }));
  };
  
  // Handle brand selection changes
  const handleBrandSelectionChange = (brandId: string, checked: boolean) => {
    setSelectedBrands(prev => ({
      ...prev,
      [brandId]: { ...prev[brandId], selected: checked }
    }));
  };
  
  // Handle brand role changes
  const handleBrandRoleChange = (brandId: string, role: string) => {
    setSelectedBrands(prev => ({
      ...prev,
      [brandId]: { ...prev[brandId], role }
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Prepare the brand permissions for the update
      const brandPermissions: BrandPermission[] = [];
      
      Object.entries(selectedBrands).forEach(([brandId, { selected, role }]) => {
        if (selected) {
          // Find if this permission already exists in the user's data
          const existingPermission = user.brand_permissions?.find(
            p => p.brand_id === brandId
          );
          
          brandPermissions.push({
            brand_id: brandId,
            role
          });
        }
      });
      
      // Send the update to the API
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: form.full_name || null,
          job_title: form.job_title || null,
          company: form.company || null,
          role: form.globalRole || null, // Send globalRole as 'role' in the payload
          brand_permissions: brandPermissions.length > 0 ? brandPermissions : null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast('User information has been updated successfully.');
        
        // Navigate back to the user details page
        router.push(`/dashboard/users/${user.id}`);
      } else {
        console.error('Update failed:', data);
        throw new Error(data.error || 'Failed to update user.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- Loading and Access Denied States ---
  if (isLoadingUserSession || isCheckingPermissions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" /> {/* Breadcrumbs skeleton */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-1/2" /> {/* Page title skeleton */}
          <Skeleton className="h-10 w-24" /> {/* Save button skeleton */}
        </div>
        <Skeleton className="h-12 w-full mb-4" /> {/* Tabs skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (userSessionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive-foreground">Error loading your user session: {userSessionError}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  if (!isAllowedToAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to edit users.</p>
        <Link href="/dashboard/users" passHref>
          <Button variant="outline">Back to Users List</Button>
        </Link>
      </div>
    );
  }
  // --- Main Page Content (shown if allowed and not loading user data) ---
  if (isLoading) { // This is for the user (to edit) data loading
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Users", href: "/dashboard/users" },
        { label: user?.full_name || "User", href: user ? `/dashboard/users/${user.id}` : undefined },
        { label: "Edit" }
      ]} />
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push(user ? `/dashboard/users/${user.id}` : '/dashboard/users')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {user ? 'User Details' : 'Users'}
      </Button>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar Display for the user being edited */}
          {user && (
            <div className="relative h-12 w-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name || 'User avatar'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full text-lg font-semibold text-primary bg-muted-foreground/20">
                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit User {user?.full_name ? `- ${user.full_name}` : (user?.email ? `- ${user.email}`: '' )}</h1>
            <p className="text-muted-foreground mt-1">
              Modify user profile details, roles, and brand permissions.
            </p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Update the user&apos;s basic information and global system role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="full_name" name="full_name" value={form.full_name} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={user?.email || ''} disabled />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input id="job_title" name="job_title" value={form.job_title} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" value={form.company} onChange={handleInputChange} />
              </div>
            </div>
            <div>
              <Label htmlFor="globalRole">Global Role <span className="text-destructive">*</span></Label>
              <Select name="globalRole" value={form.globalRole} onValueChange={handleGlobalRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a global role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Determines the user&apos;s base level of access across the system.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Permissions</CardTitle>
            <CardDescription>Assign this user to specific brands and set their role for each.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={selectedBrands[brand.id]?.selected || false}
                    onCheckedChange={(checked) => 
                      handleBrandSelectionChange(brand.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`brand-${brand.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {brand.name}
                  </label>
                </div>
                <Select
                  value={selectedBrands[brand.id]?.role || 'viewer'}
                  onValueChange={(value) => handleBrandRoleChange(brand.id, value)}
                  disabled={!selectedBrands[brand.id]?.selected}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            {brands.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No brands available to assign.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => router.push(user ? `/dashboard/users/${user.id}` : '/dashboard/users')} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} 
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 