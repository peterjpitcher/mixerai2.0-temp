'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { useToast } from '@/components/toast-provider';
import { 
  Plus, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'full_name' | 'role' | 'email' | 'company' | 'created_at'>('role');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Fetch users and brands data
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
          setBrands(brandsData.brands || []);
          
          // Merge brand data with user permissions
          const usersWithBrands = usersData.users.map((user: User) => {
            if (user.brand_permissions && user.brand_permissions.length > 0) {
              user.brand_permissions = user.brand_permissions.map(permission => {
                const brand = brandsData.brands.find((b: Brand) => b.id === permission.brand_id);
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
          setUsers(usersData.users || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
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
  const handleSort = (field: 'full_name' | 'role' | 'email' | 'company' | 'created_at') => {
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
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove user from the list
        setUsers(users.filter(user => user.id !== userToDelete.id));
        
        toast({
          title: 'User deleted',
          description: `${userToDelete.full_name} has been removed.`,
        });
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
      setUserToDelete(null);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
          const color = brand?.brand_color || '#cbd5e1';
          const initial = brand?.name?.charAt(0).toUpperCase() || '?';
          
          return (
            <div 
              key={`${permission.brand_id}-${index}`}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: color }}
              title={`${brand?.name || 'Unknown brand'} (${permission.role})`}
            >
              {initial}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <Button asChild>
          <Link href="/dashboard/users/invite">
            <Plus className="mr-2 h-4 w-4" /> Invite User
          </Link>
        </Button>
      </div>
      
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
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No users found</h3>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[180px] cursor-pointer" onClick={() => handleSort('full_name')}>
                  <div className="flex items-center">
                    Name
                    <SortIndicator field="full_name" />
                  </div>
                </TableHead>
                <TableHead className="w-[180px] cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center">
                    Email
                    <SortIndicator field="email" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('role')}>
                  <div className="flex items-center">
                    Role
                    <SortIndicator field="role" />
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Brands</TableHead>
                <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('company')}>
                  <div className="flex items-center">
                    Company
                    <SortIndicator field="company" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Job Title</TableHead>
                <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">
                    Joined
                    <SortIndicator field="created_at" />
                  </div>
                </TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map(user => (
                <TableRow key={user.id} className={user.role?.toLowerCase().includes('admin') ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <div className="relative h-8 w-8 rounded-full bg-primary/10 overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || 'User'}
                          className="object-cover w-full h-full"
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role?.toLowerCase().includes('admin') 
                        ? 'bg-primary/20 text-primary'
                        : user.role?.toLowerCase().includes('editor')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{renderBrandIcons(user)}</TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>{user.job_title || '-'}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/users/${user.id}`} title="View User">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/users/${user.id}/edit`} title="Edit User">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      title="Delete User"
                      onClick={() => setUserToDelete(user)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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