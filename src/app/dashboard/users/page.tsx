'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Pencil, 
  UserX, 
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
import { apiFetch, apiFetchJson } from '@/lib/api-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl, getNameInitials } from '@/lib/utils/avatar';
import { useCurrentUser } from '@/hooks/use-common-data';

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
  email: string | null;
  avatar_url: string;
  role: string;
  global_role?: string | null;
  highest_brand_role?: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  brand_permissions?: Array<{
    brand_id: string;
    role: string;
    brand?: Brand;
  }>;
  job_title?: string;
  company?: string;
  invitation_status?: string | null;
  invitation_expires_at?: string | null;
  user_status?: string;
  is_current_user?: boolean;
}

/**
 * UsersPage displays a list of all users in the system.
 * It allows for searching, sorting, and managing users, including inviting new users
 * and deleting existing ones. User roles and brand permissions are also displayed.
 */
const PAGE_SIZE = 25;

export default function UsersPage() {
  const { data: currentUser, isLoading: isLoadingUser, error: currentUserError } = useCurrentUser();
  const isAllowedToAccess = currentUser?.user_metadata?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<'full_name' | 'role' | 'email' | 'company' | 'last_sign_in_at'>('role');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingInviteToUserId, setResendingInviteToUserId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState<boolean>(false);

  const sessionErrorMessage = useMemo(() => {
    if (!currentUserError) return null;
    if (currentUserError instanceof Error) return currentUserError.message;
    if (typeof currentUserError === 'string') return currentUserError;
    try {
      return JSON.stringify(currentUserError);
    } catch {
      return 'Failed to load user session.';
    }
  }, [currentUserError]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [showInactive]);

  const fetchUsers = useCallback(
    async (search: string, signal?: AbortSignal) => {
      if (!isAllowedToAccess) {
        setUsers([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        if (search) {
          const params = new URLSearchParams({
            query: search,
            limit: String(PAGE_SIZE),
            page: String(page),
          });
          if (showInactive) params.set('includeInactive', 'true');

          const response = await apiFetchJson<{
            success: boolean;
            users: User[];
            error?: string;
            pagination?: { total?: number };
          }>(`/api/users/search?${params.toString()}`, { signal });

          if (!response.success) {
            throw new Error(response.error || 'Failed to search users.');
          }

          setUsers(response.users ?? []);
          setTotalCount(response.pagination?.total ?? (response.users?.length ?? 0));
        } else {
          const params = new URLSearchParams({
            page: String(page),
            pageSize: String(PAGE_SIZE),
          });
          if (showInactive) params.set('includeInactive', 'true');

          const response = await apiFetchJson<{
            success: boolean;
            data: User[];
            error?: string;
            pagination?: { total?: number };
          }>(`/api/users?${params.toString()}`, { signal });

          if (!response.success) {
            throw new Error(response.error || 'Failed to load users.');
          }

          setUsers(response.data ?? []);
          setTotalCount(response.pagination?.total ?? (response.data?.length ?? 0));
        }
      } catch (error) {
        if (signal?.aborted) return;
        console.error('[UsersPage] Failed to load users:', error);
        const message = error instanceof Error ? error.message : 'Failed to load users.';
        setLoadError(message);
        toast.error('Failed to load users. Please try again.');
        setUsers([]);
        setTotalCount(0);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [isAllowedToAccess, page, showInactive]
  );

  useEffect(() => {
    if (isLoadingUser) return;

    if (!isAllowedToAccess) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    void fetchUsers(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [fetchUsers, debouncedSearch, isAllowedToAccess, isLoadingUser]);
  
  // Search filter
  const visibleUsers = showInactive
    ? users
    : users.filter(u => u.user_status !== 'inactive');

  // Sort users based on sort field and direction
  const sortedUsers = [...visibleUsers].sort((a, b) => {
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  
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
  
  // Deactivate user functionality
  const handleDeactivateUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/users/${userToDelete.id}/deactivate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`User ${userToDelete.full_name} deactivated successfully.`);
        await fetchUsers(debouncedSearch);
      } else {
        toast.error(data.error || 'Failed to deactivate user.');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('An error occurred while deactivating the user.');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  // Reactivate user functionality
  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await apiFetch(`/api/users/${userId}/deactivate`, {
        method: 'DELETE', // DELETE method in our API reactivates the user
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User reactivated successfully.');
        await fetchUsers(debouncedSearch);
      } else {
        toast.error(data.error || 'Failed to reactivate user.');
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('An error occurred while reactivating the user.');
    }
  };

  const handleResendInvite = async (userId: string, email: string | null) => {
    if (!email) {
      toast.error('Cannot resend invite – email address is missing.');
      return;
    }
    setResendingInviteToUserId(userId);
    try {
      const response = await apiFetch('/api/users/resend-invite', {
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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return formatDateFns(date, 'MMMM d, yyyy');
  };

  const getUserStatus = (user: User) => {
    if (user.user_status === 'inactive') {
      return { label: 'Inactive', variant: 'outline' as const };
    }
    if (user.invitation_status === 'pending' || (!user.last_sign_in_at && user.invitation_status !== 'accepted')) {
      return { label: 'Invited', variant: 'secondary' as const };
    }
    if (user.user_status === 'expired' || user.invitation_status === 'expired') {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    if (user.last_sign_in_at) {
      return { label: 'Active', variant: 'default' as const };
    }
    return { label: 'Pending', variant: 'secondary' as const };
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
  if (isLoadingUser) {
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

  if (sessionErrorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-theme(spacing.12))] py-10">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive-foreground">Error loading user data: {sessionErrorMessage}</p>
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInactive(s => !s)}
            >
              {showInactive ? 'Hide Inactive Users' : 'Show Inactive Users'}
            </Button>
            <Button asChild>
              <Link href="/dashboard/users/invite">
                <Plus className="mr-2 h-4 w-4" /> Invite User
              </Link>
            </Button>
          </div>
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

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{loadError}</span>
        </div>
      )}
      
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
            {debouncedSearch ? 'No results match your search criteria. Try a different search term.' : 'No users have been created yet. Invite your first user to get started.'}
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
                <TableHead scope="col" className="w-[100px]">Status</TableHead>
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
                <TableRow key={user.id} className={`${user.role?.toLowerCase().includes('admin') ? 'bg-primary/5' : ''} ${user.user_status === 'inactive' ? 'opacity-60' : ''}`}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {getAvatarUrl(user.id, user.avatar_url) ? (
                        <AvatarImage src={getAvatarUrl(user.id, user.avatar_url)} alt={user.full_name || 'User'} />
                      ) : (
                        <AvatarFallback className="text-xs font-semibold">
                          {getNameInitials(user.full_name) || (user.full_name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
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
                  <TableCell>
                    <Badge variant={getUserStatus(user).variant}>
                      {getUserStatus(user).label}
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
                        {user.user_status === 'inactive' ? (
                          <DropdownMenuItem
                            onClick={() => handleReactivateUser(user.id)}
                            className="text-green-600"
                          >
                            <Users2 className="mr-2 h-4 w-4" /> Reactivate User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setUserToDelete(user)}
                            disabled={isDeleting && userToDelete?.id === user.id}
                            className="text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" /> Deactivate User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} • Showing {users.length} of {totalCount} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Deactivate User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm User Deactivation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {userToDelete?.full_name}? They will no longer be able to access the system.
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
              onClick={handleDeactivateUser}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deactivating...' : 'Deactivate User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
