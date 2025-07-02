'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';
import { apiFetch } from '@/lib/api-client';

interface User {
  id: string;
  full_name: string;
  email?: string;
  job_title?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
  last_sign_in_at?: string;
  brand_permissions?: {
    id: string;
    brand_id: string;
    role: string;
    brand?: {
      id: string;
      name: string;
    };
  }[];
}

interface UserProfileProps {
  user: User;
  isCurrentUser?: boolean;
  canEdit?: boolean;
  onUserUpdated?: (updatedUser: User) => void;
}

export function UserProfile({ user, isCurrentUser = false, canEdit = false, onUserUpdated }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: user.full_name || '',
    job_title: user.job_title || '',
    role: (user.role?.toLowerCase() || 'viewer') as 'admin' | 'editor' | 'viewer'
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return formatDateFns(date, 'MMM d, yyyy, HH:mm');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editForm.full_name.trim()) {
      toast.error('Error', {
        description: 'Name is required',
      });
      return;
    }
    
    if (!editForm.job_title.trim()) {
      toast.error('Error', {
        description: 'Job title is required',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: editForm.full_name,
          job_title: editForm.job_title,
          role: editForm.role
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsEditing(false);
        
        // Update the local user object
        const updatedUser = {
          ...user,
          full_name: editForm.full_name,
          job_title: editForm.job_title,
          role: editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1)
        };
        
        if (onUserUpdated) {
          onUserUpdated(updatedUser);
        }
        
        toast.success('Success', {
          description: 'Profile updated successfully'
        });
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error', {
        description: (error as Error).message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Profile</CardTitle>
            {(isCurrentUser || canEdit) && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
          <CardDescription>
            View and manage user information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="h-24 w-24">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              ) : (
                <AvatarFallback className="text-3xl">
                  <UserCircle className="h-12 w-12" />
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-bold">{user.full_name}</h2>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {user.role && (
                  <Badge variant={
                    user.role.toLowerCase() === 'admin' ? 'default' : 
                    user.role.toLowerCase() === 'editor' ? 'secondary' : 
                    'outline' // Default to outline for Viewer or other roles
                  }>
                    {user.role}
                  </Badge>
                )}
                
                {isCurrentUser && (
                  <Badge variant="outline">This is you</Badge>
                )}
              </div>
              
              {user.job_title && (
                <p className="text-muted-foreground">{user.job_title}</p>
              )}
              
              {user.email && (
                <p className="text-sm">{user.email}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Account Created</h3>
              <p>{formatDate(user.created_at)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Sign In</h3>
              <p>{formatDate(user.last_sign_in_at)}</p>
            </div>
          </div>
          
          {user.brand_permissions && user.brand_permissions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Brand Permissions</h3>
              <div className="space-y-2">
                {user.brand_permissions.map(permission => (
                  <div key={permission.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span>{permission.brand?.name || 'Unknown Brand'}</span>
                    <Badge variant={
                      permission.role === 'admin' ? 'default' : 
                      permission.role === 'editor' ? 'secondary' : 
                      'outline' // Default to outline for viewer
                    }>
                      {permission.role.charAt(0).toUpperCase() + permission.role.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to user profile information.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="job_title">Job Title <span className="text-destructive">*</span></Label>
              <Input
                id="job_title"
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                placeholder="Enter job title"
                required
              />
            </div>
            
            {canEdit && !isCurrentUser && (
              <div className="grid gap-2">
                <Label htmlFor="role">User Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as 'admin' | 'editor' | 'viewer' })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 
