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
import { useToast } from '@/components/toast-provider';
import { 
  ArrowLeft, 
  Save, 
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';

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

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
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
            toast({
              title: 'User not found',
              description: 'The requested user could not be found.',
              variant: 'destructive'
            });
            router.push('/dashboard/users');
            return;
          }
          
          throw new Error(`Failed to fetch user: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        
        if (!userData.success) {
          throw new Error(userData.error || 'Failed to fetch user');
        }
        
        // Fetch all brands
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success) {
          setBrands(brandsData.brands || []);
          
          // Initialize the selectedBrands state
          const brandPermissions: {[key: string]: {selected: boolean, role: string}} = {};
          
          // First, set all brands as unselected with default role of 'viewer'
          brandsData.brands.forEach((brand: Brand) => {
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
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user information. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router, toast]);
  
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
        toast({
          title: 'User updated',
          description: 'User information has been updated successfully.'
        });
        
        // Navigate back to the user details page
        router.push(`/dashboard/users/${user.id}`);
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
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
            <Link href={`/dashboard/users/${user.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit User: {user.full_name}</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList>
              <TabsTrigger value="profile">Profile Information</TabsTrigger>
              <TabsTrigger value="brands">Brand Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update user profile details</CardDescription>
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
                          {form.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={form.full_name}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="job_title">Job Title</Label>
                        <Input
                          id="job_title"
                          name="job_title"
                          value={form.job_title}
                          onChange={handleInputChange}
                          placeholder="e.g. Marketing Manager"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          name="company"
                          value={form.company}
                          onChange={handleInputChange}
                          placeholder="e.g. Acme Inc."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="role">Default Role</Label>
                        <Select value={form.role} onValueChange={handleRoleChange}>
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Editor">Editor</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          This is the default role. Specific permissions can be set per brand.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="brands">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Permissions</CardTitle>
                  <CardDescription>Manage which brands this user can access and their role for each</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {brands.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No brands available to assign.</p>
                      </div>
                    ) : (
                      brands.map(brand => (
                        <div key={brand.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox 
                              id={`brand-${brand.id}`}
                              checked={selectedBrands[brand.id]?.selected || false}
                              onCheckedChange={(checked) => 
                                handleBrandSelectionChange(brand.id, checked as boolean)
                              }
                            />
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                              style={{ backgroundColor: brand.brand_color || '#cbd5e1' }}
                            >
                              {brand.name.charAt(0).toUpperCase()}
                            </div>
                            <Label htmlFor={`brand-${brand.id}`} className="cursor-pointer">
                              {brand.name}
                            </Label>
                          </div>
                          
                          <Select 
                            value={selectedBrands[brand.id]?.role || 'viewer'} 
                            onValueChange={(value) => handleBrandRoleChange(brand.id, value)}
                            disabled={!selectedBrands[brand.id]?.selected}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Admin:</strong> Can manage brands, content, and users.<br />
                    <strong>Editor:</strong> Can create and edit content, but cannot manage users.<br />
                    <strong>Viewer:</strong> Can only view content.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" asChild>
              <Link href={`/dashboard/users/${user.id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 