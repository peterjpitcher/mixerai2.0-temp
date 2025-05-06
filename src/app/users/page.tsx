'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Input } from '@/components/input';
import { useToast } from '@/components/toast-provider';
import { Badge } from '@/components/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/dialog';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';

interface User {
  id: string;
  full_name: string;
  email?: string;
  job_title?: string;
  company?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
  last_sign_in_at?: string;
  brand_permissions?: {
    id: string;
    brand_id: string;
    role: 'admin' | 'editor' | 'viewer';
  }[];
}

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
}

interface Workflow {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: number;
  name: string;
  role: string;
  assignees: {
    id?: string;
    email: string;
  }[];
}

interface GroupedUsers {
  admins: User[];
  byBrand: {
    [brandId: string]: {
      brandName: string;
      brandColor?: string;
      users: User[];
    }
  };
  noBrands: User[];
}

// Add a function to generate random pastel colors for user avatars
const getInitialsAndColor = (name: string) => {
  // Create a hash of the user's name for consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate pastel colors (lighter, softer colors)
  const hue = hash % 360;
  const saturation = 60 + (hash % 20); // 60-80%
  const lightness = 65 + (hash % 15);  // 65-80%
  
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const textColor = `hsl(${hue}, ${saturation}%, 25%)`; // Darker text for contrast
  
  // Get up to two initials from the name
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
  
  return { initials, backgroundColor: color, textColor };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [groupedUsers, setGroupedUsers] = useState<GroupedUsers>({ admins: [], byBrand: {}, noBrands: [] });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Add state for edit and delete dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    job_title: '',
    company: '',
    role: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setUsers(data.users);
          setFilteredUsers(data.users);
        } else {
          throw new Error(data.error || 'Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError((error as Error).message || 'Failed to load users');
        toast({
          title: 'Error',
          description: 'Failed to load users. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands');
        
        if (!response.ok) {
          throw new Error('Failed to fetch brands');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBrands(data.brands);
        } else {
          throw new Error(data.error || 'Failed to fetch brands');
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
        toast({
          title: 'Error',
          description: 'Failed to load brands. Brand grouping may be affected.',
          variant: 'destructive'
        });
      }
    };
    
    const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows');
        
        if (!response.ok) {
          throw new Error('Failed to fetch workflows');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setWorkflows(data.workflows);
        } else {
          throw new Error(data.error || 'Failed to fetch workflows');
        }
      } catch (error) {
        console.error('Error fetching workflows:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workflow data. User grouping may be affected.',
          variant: 'destructive'
        });
      }
    };
    
    fetchUsers();
    fetchBrands();
    fetchWorkflows();
  }, [toast]);
  
  // Group users by role and workflow brand assignments
  useEffect(() => {
    const getGroupedUsers = (usersList: User[]): GroupedUsers => {
      const result: GroupedUsers = {
        admins: [],
        byBrand: {},
        noBrands: []
      };
      
      // First, identify admins
      usersList.forEach(user => {
        if (user.role === 'Admin') {
          result.admins.push(user);
        }
      });
      
      // Map users to brands via workflow assignments
      const userBrandMap = new Map<string, Set<string>>();
      
      // Process workflows to find user assignments to brands
      workflows.forEach(workflow => {
        if (!workflow.steps) return;
        
        workflow.steps.forEach(step => {
          if (!step.assignees) return;
          
          step.assignees.forEach(assignee => {
            if (!assignee.id) return; // Skip assignees without an ID
            
            // Add brand to this user's set of brands
            if (!userBrandMap.has(assignee.id)) {
              userBrandMap.set(assignee.id, new Set());
            }
            userBrandMap.get(assignee.id)?.add(workflow.brand_id);
          });
        });
      });
      
      // Now assign users to their brand groups
      usersList.forEach(user => {
        // Skip admins as they're already added
        if (user.role === 'Admin') return;
        
        const userBrands = userBrandMap.get(user.id);
        
        if (userBrands && userBrands.size > 0) {
          // This user is assigned to at least one brand through workflows
          userBrands.forEach(brandId => {
            const brand = brands.find(b => b.id === brandId);
            
            if (!brand) return;
            
            if (!result.byBrand[brandId]) {
              result.byBrand[brandId] = {
                brandName: brand.name,
                brandColor: brand.brand_color,
                users: []
              };
            }
            
            // Check if user is already in this brand group
            if (!result.byBrand[brandId].users.some(u => u.id === user.id)) {
              result.byBrand[brandId].users.push(user);
            }
          });
        } else {
          // User not assigned to any brand through workflows
          result.noBrands.push(user);
        }
      });
      
      return result;
    };
    
    if (filteredUsers.length > 0 && workflows.length > 0 && brands.length > 0) {
      setGroupedUsers(getGroupedUsers(filteredUsers));
    }
  }, [filteredUsers, workflows, brands]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.full_name.toLowerCase().includes(query) || 
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.role && user.role.toLowerCase().includes(query)) ||
      (user.company && user.company.toLowerCase().includes(query))
    );
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };
  
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      job_title: user.job_title || '',
      company: user.company || '',
      role: (user.role?.toLowerCase() || 'viewer') as 'admin' | 'editor' | 'viewer'
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: editForm.full_name,
          job_title: editForm.job_title,
          company: editForm.company,
          role: editForm.role
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the user in the local state
        setUsers(users.map(u => 
          u.id === selectedUser.id 
            ? { 
                ...u, 
                full_name: editForm.full_name,
                job_title: editForm.job_title,
                company: editForm.company,
                role: editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1)
              } 
            : u
        ));
        
        // Update filtered users too
        setFilteredUsers(filteredUsers.map(u => 
          u.id === selectedUser.id 
            ? { 
                ...u, 
                full_name: editForm.full_name,
                job_title: editForm.job_title,
                company: editForm.company,
                role: editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1)
              } 
            : u
        ));
        
        toast({
          title: 'Success',
          description: 'User updated successfully'
        });
        
        setIsEditDialogOpen(false);
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to update user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the user from the local state
        setUsers(users.filter(u => u.id !== selectedUser.id));
        setFilteredUsers(filteredUsers.filter(u => u.id !== selectedUser.id));
        
        toast({
          title: 'Success',
          description: 'User deleted successfully'
        });
        
        setIsDeleteDialogOpen(false);
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to delete user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render user table row
  const renderUserRow = (user: User) => (
    <tr key={user.id} className="border-b hover:bg-muted/50">
      <td className="py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
            {(() => {
              const { initials, backgroundColor, textColor } = getInitialsAndColor(user.full_name);
              return (
                <div 
                  className="w-full h-full flex items-center justify-center font-medium"
                  style={{ backgroundColor, color: textColor }}
                >
                  {initials}
                </div>
              );
            })()}
          </div>
          <span>{user.full_name}</span>
        </div>
      </td>
      <td className="py-3 text-muted-foreground">{user.email}</td>
      <td className="py-3 text-muted-foreground">{user.job_title || '—'}</td>
      <td className="py-3 text-muted-foreground">{user.company || '—'}</td>
      <td className="py-3">
        {user.role === 'Admin' ? (
          <Badge variant="default" className="bg-blue-100 hover:bg-blue-100 text-blue-800 hover:text-blue-800">Admin</Badge>
        ) : user.role === 'Editor' ? (
          <Badge variant="default" className="bg-green-100 hover:bg-green-100 text-green-800 hover:text-green-800">Editor</Badge>
        ) : (
          <Badge variant="default" className="bg-gray-100 hover:bg-gray-100 text-gray-800 hover:text-gray-800">Viewer</Badge>
        )}
      </td>
      <td className="py-3 text-muted-foreground">
        {formatDate(user.last_sign_in_at)}
      </td>
      <td className="py-3">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>Edit</Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(user)}>Delete</Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col">
      {/* Full width header with background */}
      <div className="w-full bg-background border-b px-6 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <Button asChild>
            <Link href="/users/invite">Invite User</Link>
          </Button>
        </div>
      </div>
      
      <div className="container py-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="max-w-sm w-full">
            <Input 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-10 flex justify-center items-center min-h-[300px]">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Failed to load users</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {error}
            </p>
            <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7l3-3.3" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7l-3 3.3" />
              </svg>
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't added any users to the system yet. Invite users to start collaborating.
            </p>
            <Button size="lg" asChild>
              <Link href="/users/invite">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Invite First User
              </Link>
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              {searchQuery && (
                <CardDescription>
                  Showing results for "{searchQuery}"
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No users match your search criteria</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left pb-3 font-medium">Name</th>
                        <th className="text-left pb-3 font-medium">Email</th>
                        <th className="text-left pb-3 font-medium">Job Title</th>
                        <th className="text-left pb-3 font-medium">Company</th>
                        <th className="text-left pb-3 font-medium">Role</th>
                        <th className="text-left pb-3 font-medium">Last Login</th>
                        <th className="text-left pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Admin Users Section */}
                      {groupedUsers.admins.length > 0 && (
                        <>
                          <tr className="bg-muted/30">
                            <td colSpan={7} className="py-2 px-3 font-medium">
                              Administrators ({groupedUsers.admins.length})
                            </td>
                          </tr>
                          {groupedUsers.admins.map(renderUserRow)}
                        </>
                      )}
                      
                      {/* Users By Brand Section */}
                      {Object.entries(groupedUsers.byBrand).map(([brandId, brandGroup]) => {
                        if (brandGroup.users.length === 0) return null;
                        
                        return (
                          <React.Fragment key={brandId}>
                            <tr className="bg-muted/30">
                              <td colSpan={7} className="py-2 px-3 font-medium">
                                <div className="flex items-center gap-2">
                                  {brandGroup.brandColor && (
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: brandGroup.brandColor }}
                                    ></div>
                                  )}
                                  <span>{brandGroup.brandName} ({brandGroup.users.length})</span>
                                </div>
                              </td>
                            </tr>
                            {brandGroup.users.map(renderUserRow)}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Users Without Brand Assignments */}
                      {groupedUsers.noBrands.length > 0 && groupedUsers.noBrands.some(user => user.role !== 'Admin') && (
                        <>
                          <tr className="bg-muted/30">
                            <td colSpan={7} className="py-2 px-3 font-medium">
                              Users Without Brand Assignments ({groupedUsers.noBrands.filter(u => u.role !== 'Admin').length})
                            </td>
                          </tr>
                          {groupedUsers.noBrands.filter(user => user.role !== 'Admin').map(renderUserRow)}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleEditSubmit(e);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  placeholder="Job title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as 'admin' | 'editor' | 'viewer' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admin: Full access to all features | Editor: Can create and edit content | Viewer: Read-only access
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="submit" onClick={handleDeleteConfirm}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 