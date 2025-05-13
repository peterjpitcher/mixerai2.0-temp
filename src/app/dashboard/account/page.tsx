'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Switch } from '@/components/switch';
import { createBrowserClient } from '@supabase/ssr';
import { Spinner } from '@/components/spinner';
import type { Metadata } from 'next';
import { toast } from 'sonner';

// Page metadata should ideally be exported from a server component or the page file if it's RSC.
// For client components, this is more of a placeholder for what should be set.
// export const metadata: Metadata = {
//   title: 'Account Settings | MixerAI 2.0',
//   description: 'Manage your MixerAI profile, password, and notification settings.',
// };

/**
 * AccountPage component.
 * Allows authenticated users to manage their profile information (name, company, job title),
 * change their password, and configure notification preferences.
 * Uses tabs for different settings sections.
 */
export default function AccountPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '', // Email is typically not changed by the user directly here
    company: '',
    jobTitle: '',
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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          window.location.href = '/auth/login'; // Redirect if not logged in
          return;
        }
        
        const userId = session.user.id;
        const userEmail = session.user.email || '';

        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('full_name, company, job_title') // Only select fields that can be missing from auth
          .eq('id', userId)
          .single();
        
        if (userError && userError.code !== 'PGRST116') throw userError;
        
        // Auth user data is the source of truth for email and potentially some metadata fallbacks
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        setProfileData({
          fullName: userData?.full_name || authUser?.user_metadata?.full_name || '',
          email: userEmail, // Use email from active session
          company: userData?.company || authUser?.user_metadata?.company || '',
          jobTitle: userData?.job_title || authUser?.user_metadata?.job_title || '',
        });
        
        // TODO: Fetch actual notification settings for the user from an API
        // setNotificationSettings(fetchedSettings || defaultNotificationSettings);
        
      } catch (error: any) {
        // console.error removed
        toast.error(
          error?.message || 'Failed to load your profile data. Please try again later.',
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
    } catch (error: any) {
      // console.error removed
      toast.error(error?.message || 'Failed to update your profile. Please try again.', { description: 'Profile Update Error' });
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
    } catch (error: any) {
      // console.error removed
      toast.error(error?.message || 'Failed to update your password. Please try again.', { description: 'Password Update Error' });
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
    } catch (error: any) {
      // console.error removed
      toast.error(error?.message || 'Failed to save your notification preferences.', { description: 'Save Error' });
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
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, password, and notification preferences.
        </p>
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
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
                    {profileData.fullName ? profileData.fullName.split(' ').map(name => name[0]).join('').toUpperCase() : (profileData.email ? profileData.email[0]?.toUpperCase() : '?')}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{profileData.fullName || 'User'}</h2>
                    <p className="text-sm text-muted-foreground">{profileData.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={profileData.fullName} onChange={handleProfileChange} placeholder="e.g. Jane Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={profileData.email} disabled readOnly title="Your email address cannot be changed using this form." />
                    <p className="text-xs text-muted-foreground mt-1">Your email address is used for logging in and cannot be changed here.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={profileData.company} onChange={handleProfileChange} placeholder="e.g. MixerAI Ltd"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" value={profileData.jobTitle} onChange={handleProfileChange} placeholder="e.g. Content Strategist"/>
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
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" name="current-password" type="password" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" name="new-password" type="password" required minLength={6} placeholder="Minimum 6 characters"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
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