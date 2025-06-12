'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Switch } from '@/components/switch';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

export default function AccountPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    company: '',
    jobTitle: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    contentUpdates: true,
    newComments: true,
    taskReminders: false,
    marketingEmails: false,
  });
  
  // Load user data
  useEffect(() => {
    async function loadUserData() {
      try {
        setIsLoading(true);
        
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            setProfileData({
              fullName: profile.full_name || session.user.user_metadata?.full_name || '',
              email: session.user.email || '',
              company: profile.company || session.user.user_metadata?.company || '',
              jobTitle: profile.job_title || session.user.user_metadata?.job_title || '',
            });
          } else {
            // If no profile, use user metadata from auth
            setProfileData({
              fullName: session.user.user_metadata?.full_name || '',
              email: session.user.email || '',
              company: session.user.user_metadata?.company || '',
              jobTitle: session.user.user_metadata?.job_title || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load user profile data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUserData();
  }, [supabase, toast]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleNotificationChange = (id: string, checked: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: profileData.fullName,
          company: profileData.company,
          job_title: profileData.jobTitle,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Also update user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName,
          job_title: profileData.jobTitle,
          company: profileData.company
        }
      });
      
      toast('Your profile has been updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const currentPassword = formData.get('current-password') as string;
    const newPassword = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast('Your password has been updated successfully.');
      
      // Reset the form
      form.reset();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Update user metadata with notification preferences
      const { error } = await supabase.auth.updateUser({
        data: {
          notification_preferences: notificationSettings
        }
      });
      
      if (error) throw error;
      
      toast('Your notification preferences have been saved.');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
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
                  Update your account information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                    {profileData.fullName ? profileData.fullName.split(' ').map(name => name[0]).join('') : '?'}
                  </div>
                  <div>
                    <Button variant="outline" type="button">
                      Change Avatar
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={profileData.fullName}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profileData.email}
                      onChange={handleProfileChange}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      value={profileData.company}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input 
                      id="jobTitle" 
                      value={profileData.jobTitle}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <form onSubmit={handlePasswordSubmit}>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to maintain account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" name="current-password" type="password" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" name="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" name="confirm-password" type="password" />
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside">
                    <li>Minimum 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <form onSubmit={handleNotificationSubmit}>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications" 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">Notification Types</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="contentUpdates">Content Updates</Label>
                        <Switch 
                          id="contentUpdates" 
                          checked={notificationSettings.contentUpdates}
                          onCheckedChange={(checked) => handleNotificationChange('contentUpdates', checked)}
                          disabled={!notificationSettings.emailNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="newComments">New Comments</Label>
                        <Switch 
                          id="newComments" 
                          checked={notificationSettings.newComments}
                          onCheckedChange={(checked) => handleNotificationChange('newComments', checked)}
                          disabled={!notificationSettings.emailNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="taskReminders">Task Reminders</Label>
                        <Switch 
                          id="taskReminders" 
                          checked={notificationSettings.taskReminders}
                          onCheckedChange={(checked) => handleNotificationChange('taskReminders', checked)}
                          disabled={!notificationSettings.emailNotifications}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">Marketing</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketingEmails">Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new features and promotions
                        </p>
                      </div>
                      <Switch 
                        id="marketingEmails" 
                        checked={notificationSettings.marketingEmails}
                        onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 