'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useToast } from '@/components/toast-provider';
import { Checkbox } from '@/components/checkbox';

interface Brand {
  id: string;
  name: string;
}

export default function InviteUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    brand_id: ''
  });
  const [emailValid, setEmailValid] = useState(true);

  useEffect(() => {
    // Fetch brands for the brand selection dropdown
    const fetchBrands = async () => {
      try {
        setIsLoadingBrands(true);
        const response = await fetch('/api/brands');
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }
        const data = await response.json();
        if (data.success) {
          setBrands(data.brands || []);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast({
          title: 'Error',
          description: 'Failed to load brands. Default brand permissions may not be set.',
          variant: 'destructive'
        });
      } finally {
        setIsLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      // Basic email validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValid(emailPattern.test(value));
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!emailValid) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.role) {
      toast({
        title: 'Validation Error',
        description: 'Role is required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSending(true);
      
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully'
        });
        
        // Redirect back to users page
        router.push('/users');
      } else {
        throw new Error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to send invitation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="flex flex-col">
      {/* Full width header with background */}
      <div className="w-full bg-background border-b px-6 py-6">
        <div className="flex items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/users" className="text-muted-foreground hover:text-foreground">
                Users
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>Invite</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              asChild
            >
              <Link href="/users">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Back to Users
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <form onSubmit={handleSubmit}>
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Invite New User</CardTitle>
              <CardDescription>
                Send an invitation to a new user to join MixerAI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address<span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={!emailValid && formData.email ? 'border-red-500' : ''}
                />
                {!emailValid && formData.email && (
                  <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name (Optional)</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role<span className="text-red-500">*</span></Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {brands.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="brand">Assign to Brand (Optional)</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(value) => handleSelectChange('brand_id', value)}
                    disabled={isLoadingBrands}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBrands ? 'Loading brands...' : 'Select a brand'} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will automatically assign the user to the selected brand with the chosen role.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link href="/users">Cancel</Link>
              </Button>
              <Button 
                type="submit"
                disabled={isSending || (formData.email !== '' && !emailValid)}
              >
                {isSending ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </CardFooter>
          </Card>
        </form>
        
        <div className="max-w-xl space-y-4">
          <h2 className="text-xl font-semibold">About User Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Can manage users, brands, workflows, and all content. Full access to all features.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Can create and edit content, review content, and manage workflows.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Can view content and workflows but cannot create or edit anything.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 