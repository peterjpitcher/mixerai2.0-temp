'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Checkbox } from '@/components/checkbox';
import { 
  ArrowLeft, 
  Save, 
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import type { Metadata } from 'next';
import { toast } from 'sonner';
import { Separator } from '@/components/separator';

// Placeholder Breadcrumbs component
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </li>
      ))}
    </ol>
  </nav>
);

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
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  brand_permissions?: BrandPermission[];
  job_title?: string;
  company?: string;
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
    role: ''
  });
  const [selectedBrands, setSelectedBrands] = useState<{[key: string]: {selected: boolean, role: string}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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
          role: userData.user.role || 'Viewer'
        });
      } catch (error) {
        // console.error('Error loading data:', error);
        toast.error('Failed to load user information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle role change
  const handleRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, role: value }));
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
            id: existingPermission?.id, // Preserve the ID if it exists
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
          ...form,
          brand_permissions: brandPermissions
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast('User information has been updated successfully.');
        
        // Navigate back to the user details page
        router.push(`/dashboard/users/${user.id}`);
      } else {
        throw new Error(data.error || 'Failed to update user.');
      }
    } catch (error) {
      // console.error('Error updating user:', error);
      toast.error('Failed to update user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
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
        { label: user?.full_name || "User", href: user ? `/dashboard/users/${user.id}` : undefined }, // Link to view page if exists
        { label: "Edit" }
      ]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
            <p className="text-muted-foreground mt-1">
              Modify user profile details, roles, and brand permissions.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Update user details and brand permissions.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-right">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label htmlFor="job_title" className="text-right">
                  Job Title
                </Label>
                <Input
                  id="job_title"
                  name="job_title"
                  value={form.job_title}
                  onChange={handleInputChange}
                  placeholder="Marketing Manager"
                />
              </div>
              
              <div>
                <Label htmlFor="company" className="text-right">
                  Company
                </Label>
                <Input
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  placeholder="General Mills"
                />
              </div>
            </div>
            
            {/* Brand Permissions Section */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Brand Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Assign this user to specific brands and set their role for each.
              </p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2"> 
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
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
              </div>
            </div>
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
        </form>
      </Card>
    </div>
  );
} 