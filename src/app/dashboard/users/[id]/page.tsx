'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  Edit,
  Loader2,
  UserCircle2,
  MoreVertical,
  UserX,
  UserCheck,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  GitPullRequest,
  LogIn
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { touchFriendly } from '@/lib/utils/touch-target';
import { BrandIcon } from '@/components/features/brands/brand-icon';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format as formatDateFns } from 'date-fns';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

interface Brand {
  id: string;
  name: string;
  brand_color?: string;
  logo_url?: string | null;
}

interface BrandPermission {
  id: string;
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
  user_status?: string;
}

const formatBrandRole = (role: string): string => {
  if (role === 'admin') return 'Admin';
  if (role === 'editor') return 'Editor';
  if (role === 'viewer') return 'Viewer';
  // Capitalize first letter as a fallback for unknown roles
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * UserDetailPage displays comprehensive details for a specific user account.
 * This includes their profile information (name, email, company, job title, role, avatar),
 * account activity (creation date, last sign-in), and a list of brands they have 
 * permissions for, along with their role for each brand.
 * It also provides actions to edit or delete the user.
 */
export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  useEffect(() => {
    if (!params?.id) return;

    (async () => {
      setIsLoading(true);
      setIsLoadingActivity(true);
      try {
        // Fetch user, brands, and activity in parallel
        const [userRes, brandsRes, actRes] = await Promise.all([
          apiFetch(`/api/users/${params.id}`),
          apiFetch('/api/brands?limit=all'),
          apiFetch(`/api/users/${params.id}/activity`)
        ]);

        // Handle user response
        if (!userRes.ok) {
          if (userRes.status === 404) {
            toast.error('User Not Found: The requested user could not be found.');
            router.push('/dashboard/users');
            return;
          }
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }

        const userData = await userRes.json();
        const brandsData = await brandsRes.json();
        const actData = await actRes.json();

        if (!userData.success) {
          throw new Error(userData.error || 'Failed to fetch user.');
        }

        // Enhance brand permissions with brand details
        if (brandsData.success && Array.isArray(brandsData.data) && userData.user.brand_permissions?.length > 0) {
          userData.user.brand_permissions = userData.user.brand_permissions.map((permission) => {
            const brand = brandsData.data.find((b: Brand) => b.id === permission.brand_id);
            return {
              ...permission,
              brand: brand || undefined
            };
          });
        }

        setUser(userData.user);
        setActivities(actData?.success ? (actData.activities ?? []) : []);
        setActivityStats(actData?.success ? (actData.stats ?? null) : null);
      } catch (e) {
        console.error('User/Activity fetch error:', e);
        setUser(null);
        setActivities([]);
        setActivityStats(null);
        toast.error('Failed to load user details. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingActivity(false);
      }
    })();
  }, [params?.id, router]);

  const handleDeactivate = async () => {
    if (!user) return;
    setIsDeactivating(true);
    const res = await apiFetch(`/api/users/${user.id}/deactivate`, { method: 'POST' });
    const data = await res.json();
    setIsDeactivating(false);
    if (!data.success) return toast.error(data.error || 'Failed to deactivate');
    toast.success('User deactivated');
    router.refresh();
    setShowDeactivateDialog(false);
  };

  const handleReactivate = async () => {
    if (!user) return;
    const res = await apiFetch(`/api/users/${user.id}/reactivate`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) return toast.error(data.error || 'Failed to reactivate');
    toast.success('User reactivated');
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!params || !user) {
      toast.error("Cannot delete user: Invalid user or parameters.");
      return;
    }

    setIsDeleting(true);

    try {
      // Call the API route to handle user deletion
      const response = await apiFetch(`/api/users/${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast('User deleted successfully');
        setShowDeleteDialog(false);
        router.push('/dashboard/users');
      } else {
        throw new Error(data.error || 'An unknown error occurred during deletion');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    // Standard 4.6: Use MMMM d, yyyy format
    return formatDateFns(date, 'MMMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Minimal header for loading state */}
        <div className="flex items-center mb-4">
          <Button variant="outline" size="icon" asChild className="mr-3">
            <Link href="/dashboard/users" aria-label="Back to Users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Loading User Details...</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Users", href: "/dashboard/users" },
          { label: "User Not Found" }
        ]} />
        <div className="flex items-center mb-4">
          <Button variant="outline" size="icon" asChild className="mr-3">
            <Link href="/dashboard/users" aria-label="Back to Users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">User Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-semibold">User Not Found</p>
            <p className="text-muted-foreground mb-4">The requested user could not be found or loaded.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/users">Back to Users List</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = params?.id;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Users", href: "/dashboard/users" },
        { label: user.full_name || user.email || "User Details" }
      ]} />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users" aria-label="Back to Users List">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {user && (
            <div className="relative h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name || 'User avatar'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full text-xl font-semibold text-primary bg-muted-foreground/20">
                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{user.full_name || user.email}</h1>
              {user?.user_status === 'inactive' && <Badge variant="secondary">Deactivated</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">
              Details for {user.email}.
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={touchFriendly('tableAction')}>
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/users/${userId}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit User
                  </Link>
                </DropdownMenuItem>

                {user?.user_status !== 'inactive' ? (
                  <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)}>
                    <UserX className="mr-2 h-4 w-4" /> Deactivate User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleReactivate}>
                    <UserCheck className="mr-2 h-4 w-4" /> Reactivate User
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle2 className="mr-2 h-5 w-5 text-primary" /> Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div><Label className="text-sm text-muted-foreground">Full Name</Label><p className="font-medium">{user.full_name || '-'}</p></div>
            <div><Label className="text-sm text-muted-foreground">Email</Label><p className="font-medium">{user.email}</p></div>
            <div><Label className="text-sm text-muted-foreground">System Role</Label><Badge variant={user.role?.toLowerCase().includes('admin') ? 'default' : 'secondary'}>{user.role || 'member'}</Badge></div>
            <div><Label className="text-sm text-muted-foreground">Joined</Label><p className="font-medium">{formatDate(user.created_at)}</p></div>
            <div><Label className="text-sm text-muted-foreground">Last Sign In</Label><p className="font-medium">{formatDate(user.last_sign_in_at)}</p></div>
            {user.company && <div><Label className="text-sm text-muted-foreground">Company</Label><p className="font-medium">{user.company}</p></div>}
            {user.job_title && <div><Label className="text-sm text-muted-foreground">Job Title</Label><p className="font-medium">{user.job_title}</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Brand Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Permissions</CardTitle>
          <CardDescription>Brands this user has access to and their role within each.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.brand_permissions && user.brand_permissions.length > 0 ? (
            <ul className="space-y-3">
              {user.brand_permissions.map(permission => (
                <li key={permission.id || permission.brand_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <BrandIcon
                      name={permission.brand?.name || 'Unknown Brand'}
                      color={permission.brand?.brand_color || '#cccccc'}
                      logoUrl={permission.brand?.logo_url}
                    />
                    <span className="font-medium">{permission.brand?.name || 'Unknown Brand'}</span>
                  </div>
                  <Badge variant={permission.role === 'admin' ? 'default' : 'secondary'}>
                    {formatBrandRole(permission.role)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">This user has no specific brand permissions assigned.</p>
          )}
        </CardContent>
      </Card>

      {/* User Activity Log Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" /> User Activity Log
          </CardTitle>
          <CardDescription>Activity from the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {/* Activity Stats */}
              {activityStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{activityStats.totalActivities}</p>
                    <p className="text-sm text-muted-foreground">Total Activities</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{activityStats.contentCreated}</p>
                    <p className="text-sm text-muted-foreground">Content Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{activityStats.contentUpdated}</p>
                    <p className="text-sm text-muted-foreground">Content Updated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{activityStats.templatesModified}</p>
                    <p className="text-sm text-muted-foreground">Templates Modified</p>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.slice(0, 20).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-1">
                      {activity.type === 'content' && <FileText className="h-4 w-4 text-blue-500" />}
                      {activity.type === 'workflow' && activity.action === 'approve' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.type === 'workflow' && activity.action === 'reject' && <XCircle className="h-4 w-4 text-red-500" />}
                      {activity.type === 'workflow' && activity.action === 'request_changes' && <GitPullRequest className="h-4 w-4 text-yellow-500" />}
                      {activity.type === 'template' && <FileText className="h-4 w-4 text-purple-500" />}
                      {activity.type === 'auth' && <LogIn className="h-4 w-4 text-gray-500" />}
                      {!['content', 'workflow', 'template', 'auth'].includes(activity.type) && <Activity className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      {activity.metadata?.comments && (
                        <p className="text-xs text-muted-foreground mt-1">Comment: {activity.metadata.comments}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateFns(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {activities.length > 20 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Showing 20 of {activities.length} activities
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No activity in the last 30 days</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              This will immediately sign the user out and block access until reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>Cancel</Button>
            <Button onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deactivating…</>) : 'Deactivate User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
            <DialogDescription>
              This action will permanently delete the user &quot;{user.full_name || user.email}&quot; and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
