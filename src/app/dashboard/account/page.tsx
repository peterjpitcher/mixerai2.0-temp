'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { createBrowserClient } from '@supabase/ssr';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { AvatarUpload } from '@/components/ui/avatar-upload';

// Page metadata should ideally be exported from a server component or the page file if it's RSC.
// For client components, this is more of a placeholder for what should be set.
// export const metadata: Metadata = {
//   title: 'Account Settings | MixerAI 2.0',
//   description: 'Manage your MixerAI profile, password, and notification settings.',
// };

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

/**
 * AccountPage component.
 * Allows authenticated users to manage their profile information (name, company, job title),
 * change their password, and configure notification preferences.
 * Uses tabs for different settings sections.
 */
export default function AccountPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '', // Email is typically not changed by the user directly here
    company: '',
    jobTitle: '',
    avatarUrl: '',
  });

  // Mock notification settings - this should be fetched and saved via an API
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    contentUpdates: true,
    newComments: true,
    taskReminders: false,
    marketingEmails: false,
  });

  useEffect(() => {
    async function fetchUserData() {
      setIsLoading(true); // Ensure loading is true at the start of fetch
      try {
        const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!userSession) {
          window.location.href = '/auth/login'; // Redirect if not logged in
          return;
        }
        setSession(userSession as unknown as Record<string, unknown>);
        
        const userId = userSession.user.id;
        const userEmail = userSession.user.email || '';

        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('full_name, company, job_title, avatar_url') // Include avatar_url
          .eq('id', userId)
          .single();
        
        if (userError && userError.code !== 'PGRST116') throw userError;
        
        // If no profile exists, create one
        let profileData = userData;
        if (!userData) {
          const newProfileData = {
            id: userId,
            full_name: userSession.user.user_metadata?.full_name || userEmail,
            email: userEmail,
            company: userSession.user.user_metadata?.company || '',
            job_title: userSession.user.user_metadata?.job_title || ''
          };
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert(newProfileData);
          
          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            // Use the newly created profile data
            profileData = {
              full_name: newProfileData.full_name,
              company: newProfileData.company,
              job_title: newProfileData.job_title,
              avatar_url: null
            };
          }
        }
        
        // Auth user data is the source of truth for email and potentially some metadata fallbacks
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        setProfileData({
          fullName: profileData?.full_name || authUser?.user_metadata?.full_name || '',
          email: userEmail, // Use email from active session
          company: profileData?.company || authUser?.user_metadata?.company || '',
          jobTitle: profileData?.job_title || authUser?.user_metadata?.job_title || '',
          avatarUrl: profileData?.avatar_url || '',
        });
        
        // TODO: Fetch actual notification settings for the user from an API
        // setNotificationSettings(fetchedSettings || defaultNotificationSettings);
        
      } catch (error: unknown) {
        // console.error removed
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        toast.error(
          errorMessage || 'Failed to load your profile data. Please try again later.',
          { description: 'Error Loading Profile' }
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserData();
  }, [supabase]); // supabase.auth might be too broad, consider specific dependencies if issues arise

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({ ...prev, [id]: value }));
  };

  const handleNotificationChange = (id: keyof typeof notificationSettings, checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [id]: checked }));
    // TODO: Add API call here to persist individual notification setting changes if desired (debounced or on blur)
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate full name is not empty
    if (!profileData.fullName.trim()) {
      toast.error('Full name is required and cannot be empty.', { description: 'Validation Error' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated. Please log in again.');
      const userId = session.user.id;
      
      const profileUpdates = {
        id: userId,
        full_name: profileData.fullName.trim(),
        company: profileData.company.trim(),
        job_title: profileData.jobTitle.trim(),
        updated_at: new Date().toISOString()
      };
      const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates).eq('id', userId);
      if (profileError) throw profileError;
      
      const userMetadataUpdates = {
        full_name: profileData.fullName.trim(),
        company: profileData.company.trim(),
        job_title: profileData.jobTitle.trim()
      };
      // Only update metadata if there are actual changes to avoid unnecessary calls
      if (Object.values(userMetadataUpdates).some(val => val !== (session.user.user_metadata?.[Object.keys(userMetadataUpdates)[Object.values(userMetadataUpdates).indexOf(val)]] || ''))) {
        const { error: metadataError } = await supabase.auth.updateUser({ data: userMetadataUpdates });
        if (metadataError) throw metadataError;
      }
      
      toast('Your profile information has been successfully updated.', { description: 'Profile Updated' });
    } catch (error: unknown) {
      // console.error removed
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage || 'Failed to update your profile. Please try again.', { description: 'Profile Update Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const currentPassword = (form.elements.namedItem('current-password') as HTMLInputElement)?.value;
    const newPassword = (form.elements.namedItem('new-password') as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem('confirm-password') as HTMLInputElement)?.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please complete all password fields.', { description: 'Missing Fields' });
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.', { description: 'Password Too Short' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Your new password and confirmation password do not match.', { description: 'Password Mismatch' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Supabase updateUser for password doesn't require currentPassword if user is already authenticated.
      // However, asking for it is a good security practice to prevent session hijacking leading to password change.
      // For true verification of currentPassword, a custom server-side check would be needed.
      // Here we rely on the fact that this action is performed by an authenticated user.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast('Your password has been changed successfully.', { description: 'Password Updated' });
      form.reset();
    } catch (error: unknown) {
      // console.error removed
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage || 'Failed to update your password. Please try again.', { description: 'Password Update Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to save notificationSettings for the current user.
      // Example: await fetch('/api/user/notification-settings', { method: 'POST', body: JSON.stringify(notificationSettings) });
      await new Promise(resolve => setTimeout(resolve, 750)); // Simulate API delay
      toast('Your notification preferences have been updated.', { description: 'Preferences Saved' });
    } catch (error: unknown) {
      // console.error removed
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage || 'Failed to save your notification preferences.', { description: 'Save Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"> {/* Adjusted min-height */}
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">Loading your account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account Settings" }]} />
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, password, and notification preferences.
          </p>
        </div>
        <Link 
          href="/dashboard/help?article=12-account" 
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need help?
        </Link>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <form onSubmit={handleProfileSubmit}>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details. Your email address cannot be changed here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-6">
                  <AvatarUpload
                    currentAvatarUrl={profileData.avatarUrl}
                    onAvatarChange={(url) => setProfileData(prev => ({ ...prev, avatarUrl: url }))}
                    userId={((session as Record<string, unknown>)?.user as Record<string, unknown>)?.id as string || ''}
                    fullName={profileData.fullName}
                    email={profileData.email}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <Label htmlFor="fullName" className="col-span-12 sm:col-span-3 text-left sm:text-right">Full Name <span className="text-destructive">*</span></Label>
                    <div className="col-span-12 sm:col-span-9">
                      <Input id="fullName" value={profileData.fullName} onChange={handleProfileChange} placeholder="e.g. Jane Doe" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <Label htmlFor="email" className="col-span-12 sm:col-span-3 text-left sm:text-right">Email Address</Label>
                    <div className="col-span-12 sm:col-span-9">
                      <Input id="email" type="email" value={profileData.email} disabled readOnly title="Your email address cannot be changed using this form." />
                      <p className="text-xs text-muted-foreground mt-1">Your email address is used for logging in and cannot be changed here.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <Label htmlFor="company" className="col-span-12 sm:col-span-3 text-left sm:text-right">Company</Label>
                    <div className="col-span-12 sm:col-span-9">
                      <Input id="company" value={profileData.company} onChange={handleProfileChange} placeholder="General Mills"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <Label htmlFor="jobTitle" className="col-span-12 sm:col-span-3 text-left sm:text-right">Job Title</Label>
                    <div className="col-span-12 sm:col-span-9">
                      <Input id="jobTitle" value={profileData.jobTitle} onChange={handleProfileChange} placeholder="e.g. Content Strategist"/>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}Update Profile
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <form onSubmit={handlePasswordSubmit}>
              <CardHeader>
                <CardTitle>Change Your Password</CardTitle>
                <CardDescription>
                  Choose a strong new password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <Label htmlFor="current-password" className="col-span-12 sm:col-span-3 text-left sm:text-right">Current Password <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Input id="current-password" name="current-password" type="password" required />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <Label htmlFor="new-password" className="col-span-12 sm:col-span-3 text-left sm:text-right">New Password <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Input id="new-password" name="new-password" type="password" required minLength={6} placeholder="Minimum 6 characters"/>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <Label htmlFor="confirm-password" className="col-span-12 sm:col-span-3 text-left sm:text-right">Confirm Password <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Input id="confirm-password" name="confirm-password" type="password" required minLength={6} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}Set New Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <form onSubmit={handleNotificationSettingsSubmit}>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications and updates from MixerAI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications" className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important account activity and updates.
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                    aria-label="Toggle email notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="contentUpdates" className="font-medium">Content Activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about status changes for content with which you are involved.
                    </p>
                  </div>
                  <Switch
                    id="contentUpdates"
                    checked={notificationSettings.contentUpdates}
                    onCheckedChange={(checked) => handleNotificationChange('contentUpdates', checked)}
                    aria-label="Toggle content activity notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="newComments" className="font-medium">New Comments & Mentions</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new comments or when you are mentioned.
                    </p>
                  </div>
                  <Switch
                    id="newComments"
                    checked={notificationSettings.newComments}
                    onCheckedChange={(checked) => handleNotificationChange('newComments', checked)}
                    aria-label="Toggle new comments and mentions notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="taskReminders" className="font-medium">Task Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Be reminded about upcoming tasks, reviews, and deadlines.
                    </p>
                  </div>
                  <Switch
                    id="taskReminders"
                    checked={notificationSettings.taskReminders}
                    onCheckedChange={(checked) => handleNotificationChange('taskReminders', checked)}
                    aria-label="Toggle task reminder notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketingEmails" className="font-medium">Product News & Offers</Label> {/* Changed from Marketing Emails */}
                    <p className="text-sm text-muted-foreground">
                      Receive occasional emails about new features, tips, and special offers.
                    </p>
                  </div>
                  <Switch
                    id="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                    aria-label="Toggle product news and offers emails"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}Save Preferences
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 