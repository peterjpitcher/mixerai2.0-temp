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
  Send, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/skeleton";
import { AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

/**
 * InviteUserPage provides a form to invite new users to the platform.
 * Administrators can specify the user's email, full name, job title, company,
 * default system role, and optionally assign them to an initial brand.
 * On submission, an invitation is sent to the specified email address.
 */
export default function InviteUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    job_title: '',
    company: '',
    role: 'Viewer',
    brand_ids: [] as string[]
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // RBAC State
  const [currentUserSession, setCurrentUserSession] = useState<UserSessionData | null>(null);
  const [isLoadingUserSession, setIsLoadingUserSession] = useState(true);
  const [userSessionError, setUserSessionError] = useState<string | null>(null);
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  // Define UserSessionData interface (minimal for this page's access check)
  interface UserSessionData {
    id: string;
    user_metadata?: {
      role?: string;
    };
  }

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
      } catch (error: any) {
        console.error('[InviteUserPage] Error fetching current user session:', error);
        setCurrentUserSession(null);
        setUserSessionError(error.message || 'An unexpected error occurred.');
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

  // Fetch brands data - only if allowed
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/brands');
        const data = await response.json();
        
        if (data.success) {
          setBrands(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        toast.error('Failed to load brands. You may not be able to assign the user to a brand.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAllowedToAccess && !isLoadingUserSession && !isCheckingPermissions) {
      fetchBrands();
    } else if (!isLoadingUserSession && !isCheckingPermissions && !isAllowedToAccess) {
      setIsLoading(false);
    }
  }, [isAllowedToAccess, isLoadingUserSession, isCheckingPermissions]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle role change
  const handleRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, role: value }));
  };
  
  // Handle brand change
  const handleBrandCheckboxChange = (brandId: string, isChecked: boolean) => {
    setForm(prev => {
      const currentBrandIds = prev.brand_ids || [];
      if (isChecked) {
        return { ...prev, brand_ids: [...currentBrandIds, brandId] };
      } else {
        return { ...prev, brand_ids: currentBrandIds.filter(id => id !== brandId) };
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.email) {
      toast.error('Email is required.');
      return;
    }
    
    try {
      setIsSending(true);
      
      // Send invitation request
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.data?.warning) {
          // Handle partial success (e.g., invite sent, brand assignment failed)
          toast.warning(data.data.message || 'Invitation sent with warnings', {
            description: data.data.warning,
          });
        } else {
          // Handle full success
          toast.success(data.data?.message || `Invitation has been sent to ${form.email}.`);
        }
        
        // Navigate back to the users list
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'Failed to send invitation.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  // --- Loading and Access Denied States ---
  if (isLoadingUserSession || isCheckingPermissions) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-1/2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-28" />
          </CardFooter>
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
        <p className="text-muted-foreground text-center mb-6">You do not have permission to invite users.</p>
        <Link href="/dashboard/users" passHref>
          <Button variant="outline">Back to Users List</Button>
        </Link>
      </div>
    );
  }
  // --- Main Page Content (shown if allowed) ---
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Users", href: "/dashboard/users" },
        { label: "Invite User" }
      ]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Users">
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details below to send an invitation to a new user.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>New User Invitation</CardTitle>
          <CardDescription>Send an invitation to join the platform.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-right">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="user@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  An invitation will be sent to this email address.
                </p>
              </div>
              
              <div>
                <Label htmlFor="full_name" className="text-right">
                  Full Name
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
              
              <div>
                <Label htmlFor="role" className="text-right">
                  User Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.role}
                  onValueChange={handleRoleChange}
                  required
                >
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
                  <strong>Admin:</strong> Can manage brands, content, and users.<br />
                  <strong>Editor:</strong> Can create and edit content, but cannot manage users.<br />
                  <strong>Viewer:</strong> Can only view content.
                </p>
              </div>
              
              <div>
                <Label htmlFor="brand_id" className="text-right">
                  Assign to Brand
                </Label>
                {isLoading && <p className="text-sm text-muted-foreground">Loading brands...</p>}
                {!isLoading && brands.length === 0 && <p className="text-sm text-muted-foreground">No brands available to assign.</p>}
                {!isLoading && brands.length > 0 && (
                  <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
                    {brands.map(brand => (
                      <div key={brand.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand.id}`}
                          checked={form.brand_ids.includes(brand.id)}
                          onCheckedChange={(checked) => handleBrandCheckboxChange(brand.id, !!checked)}
                        />
                        <Label htmlFor={`brand-${brand.id}`} className="font-normal cursor-pointer">
                          {brand.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  You can assign this user to additional brands later.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/users')} disabled={isSending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending} className="flex items-center gap-2">
              {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 