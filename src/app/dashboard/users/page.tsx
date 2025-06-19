'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Users2,
  Mail,
  MoreVertical
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from "@/components/dashboard/page-header";
import { touchFriendly } from '@/lib/utils/touch-target';
import { format as formatDateFns } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { BrandIcon } from '@/components/brand-icon';

// export const metadata: Metadata = {
//   title: 'Manage Users | MixerAI 2.0',
//   description: 'View, search, sort, and manage users in your MixerAI workspace.',
// };

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  logo_url?: string | null;
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
  invitation_status?: string | null;
  invitation_expires_at?: string | null;
  user_status?: string;
}

// Define UserSessionData interface
interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string; 
    full_name?: string;
  };
  // brand_permissions not strictly needed for this page's top-level access check, but good for consistency
}

/**
 * UsersPage displays a list of all users in the system.
 * It allows for searching, sorting, and managing users, including inviting new users
 * and deleting existing ones. User roles and brand permissions are also displayed.
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'full_name' | 'role' | 'email' | 'company' | 'last_sign_in_at'>('role');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingInviteToUserId, setResendingInviteToUserId] = useState<string | null>(null);

  // RBAC State
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // For user session loading
  const [userSessionError, setUserSessionError] = useState<string | null>(null); // Renamed to avoid conflict with page-level error
  const [isAllowedToAccess, setIsAllowedToAccess] = useState<boolean>(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState<boolean>(true);

  // Fetch current user for RBAC
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoadingUser(true);
      setUserSessionError(null);
      try {
        const response = await fetch('/api/me');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user session' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          setUserSessionError(data.error || 'User data not found in session.');
        }
      } catch (error) {
        console.error('[UsersPage] Error fetching current user:', error);
        setCurrentUser(null);
        setUserSessionError((error as Error).message || 'An unexpected error occurred.');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Check permissions
  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      setIsCheckingPermissions(true);
      if (currentUser.user_metadata?.role === 'admin') {
        setIsAllowedToAccess(true);
      } else {
        setIsAllowedToAccess(false);
      }
      setIsCheckingPermissions(false);
    } else if (!isLoadingUser && !currentUser) {
      setIsAllowedToAccess(false);
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isLoadingUser]);

  // Fetch users and brands data - only if allowed
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch users
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        
        if (!usersData.success) {
          throw new Error(usersData.error || 'Failed to fetch users');
        }
        
        // Fetch brands to get their colors
        const brandsResponse = await fetch('/api/brands');
        const brandsData = await brandsResponse.json();
        
        if (brandsData.success) {
          const fetchedBrands = brandsData.data || [];
          
          // Merge brand data with user permissions
          const usersWithBrands = (usersData.data || []).map((user: User) => {
            if (user.brand_permissions && user.brand_permissions.length > 0) {
              user.brand_permissions = user.brand_permissions.map(permission => {
                const brand = fetchedBrands.find((b: Brand) => b.id === permission.brand_id);
                return {
                  ...permission,
                  brand: brand || undefined
                };
              });
            }
            return user;
          });
          
          setUsers(usersWithBrands);
        } else {
          // Just set users without brand data
          setUsers(usersData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAllowedToAccess && !isLoadingUser && !isCheckingPermissions) {
      fetchData();
    } else if (!isLoadingUser && !isCheckingPermissions && !isAllowedToAccess) {
      setIsLoading(false); // Stop main loading indicator if access is denied
    }
  }, [isAllowedToAccess, isLoadingUser, isCheckingPermissions]);
  
  // Filter users based on search term
  const filteredUsers = searchTerm.trim() === '' 
    ? users 
    : users.filter(user => 
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.job_title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
  
  // Sort users based on sort field and direction
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // First, priority sort by role (Admin at top)
    if (sortField === 'role') {
      // Sort by role with admins at the top
      const roleA = a.role?.toLowerCase() || '';
      const roleB = b.role?.toLowerCase() || '';
      
      // Admin roles should be at the top regardless of sort direction
      if (roleA.includes('admin') && !roleB.includes('admin')) return -1;
      if (!roleA.includes('admin') && roleB.includes('admin')) return 1;
      
      // Then apply normal sort for other roles
      const comparison = roleA.localeCompare(roleB);
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    
    // For other fields
    const valueA = a[sortField]?.toString().toLowerCase() || '';
    const valueB = b[sortField]?.toString().toLowerCase() || '';
    
    const comparison = valueA.localeCompare(valueB);
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Handle sort change
  const handleSort = (field: 'full_name' | 'role' | 'email' | 'company' | 'last_sign_in_at') => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending (so admins are at top for role)
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Delete user functionality
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        toast.success(`User ${userToDelete.full_name} deleted successfully.`);
      } else {
        toast.error(data.error || 'Failed to delete user.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('An error occurred while deleting the user.');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleResendInvite = async (userId: string, email: string) => {
    setResendingInviteToUserId(userId);
    try {
      const response = await fetch('/api/users/resend-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }), // API expects email
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Invitation resent to ${email}.`);
      } else {
        toast.error(data.error || 'Failed to resend invitation.');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('An error occurred while resending the invitation.');
    } finally {
      setResendingInviteToUserId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return formatDateFns(date, 'MMMM d, yyyy');
  };

  // Helper to render sort indicator
  const SortIndicator = ({ field }: { field: typeof sortField }) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };
  
  // Helper function to render brand icons
  const renderBrandIcons = (user: User) => {
    if (!user.brand_permissions || user.brand_permissions.length === 0) {
      return <span className="text-muted-foreground text-xs">No brands</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {user.brand_permissions.map((permission, index) => {
          const brand = permission.brand;
          
          return (
            <BrandIcon
              key={`${permission.brand_id}-${index}`}
              name={brand?.name}
              color={brand?.brand_color}
              logoUrl={brand?.logo_url}
              size="sm"
            />
          );
        })}
      </div>
    );
  };

  // --- Loading and Access Denied States ---
  if (isLoadingUser || isCheckingPermissions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" /> {/* Breadcrumbs skeleton */}
        <PageHeader
          title="Manage Users"
          description="Loading user management..."
          actions={<Skeleton className="h-10 w-32" />}
        />
        <Skeleton className="h-10 w-full mb-4" /> {/* Search/Filter bar skeleton */}
        <Skeleton className="h-64 w-full" /> {/* Table skeleton */}
      </div>
    );
  }

  if (userSessionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive-foreground">Error loading user data: {userSessionError}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  if (!isAllowedToAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" /> {/* Changed icon to AlertTriangle for consistency */}
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground text-center mb-6">You do not have permission to manage users.</p>
        <Link href="/dashboard" passHref>
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }
  // --- Main Page Content (shown if allowed and not loading users/brands) ---

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]} />
      <PageHeader
        title="Users"
        description="View, search, sort, and manage users in your workspace."
        actions={
          <Button asChild>
            <Link href="/dashboard/users/invite">
              <Plus className="mr-2 h-4 w-4" /> Invite User
            </Link>
          </Button>
        }
      />
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search users..." 
          className="pl-10 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Users2 size={40} className="text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {searchTerm ? 'No results match your search criteria. Try a different search term.' : 'No users have been created yet. Invite your first user to get started.'}
          </p>
          {!searchTerm && (
            <Button size="lg" asChild>
              <Link href="/dashboard/users/invite">
                <Plus className="mr-2 h-4 w-4" /> Invite First User
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-[40px]"></TableHead>
                <TableHead scope="col" className="w-[180px] cursor-pointer" onClick={() => handleSort('full_name')}>
                  <div className="flex items-center">
                    Name
                    <SortIndicator field="full_name" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="w-[180px] cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center">
                    Email
                    <SortIndicator field="email" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="w-[100px] cursor-pointer" onClick={() => handleSort('role')}>
                  <div className="flex items-center">
                    Role
                    <SortIndicator field="role" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="w-[120px]">Brands</TableHead>
                <TableHead scope="col" className="w-[120px] cursor-pointer hidden lg:table-cell" onClick={() => handleSort('company')}>
                  <div className="flex items-center">
                    Company
                    <SortIndicator field="company" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="w-[100px] hidden lg:table-cell">Job Title</TableHead>
                <TableHead scope="col" className="w-[100px] cursor-pointer hidden sm:table-cell" onClick={() => handleSort('last_sign_in_at')}>
                  <div className="flex items-center">
                    Last Login
                    <SortIndicator field="last_sign_in_at" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map(user => (
                <TableRow key={user.id} className={user.role?.toLowerCase().includes('admin') ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <div className="relative h-8 w-8 rounded-full bg-primary/10 overflow-hidden">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.full_name || 'User'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full text-sm font-semibold text-primary">
                          {(user.full_name || 'U').charAt(0)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      user.role?.toLowerCase().includes('admin') ? 'default' : 
                      user.role?.toLowerCase().includes('editor') ? 'secondary' : 
                      'outline'
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderBrandIcons(user)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{user.company || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{user.job_title || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className={touchFriendly('tableAction')}>
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(!user.last_sign_in_at || user.user_status === 'expired') && (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(user.id, user.email)}
                            disabled={resendingInviteToUserId === user.id}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            {resendingInviteToUserId === user.id ? 'Sending...' : 
                              (user.user_status === 'expired' ? 'Resend Expired Invite' : 'Resend Invite')
                            }
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/users/${user.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit User
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setUserToDelete(user)}
                          disabled={isDeleting && userToDelete?.id === user.id}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.full_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
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