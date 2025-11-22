'use client';

import { useState, useEffect, useCallback, useRef, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { validatePassword } from '@/lib/auth/session-config';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [profileError, setProfileError] = useState<string | null>(null);

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
  const [notificationVersion, setNotificationVersion] = useState<string | null>(null);
  const syncNotificationVersion = useCallback((response: Response, payload?: { version?: string | null }) => {
    const etag = response.headers.get('etag');
    const nextVersion = etag ?? (payload?.version ?? null);
    setNotificationVersion(nextVersion);
  }, []);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const profileStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notificationSaveStatus, setNotificationSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const notificationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationSettingsRef = useRef(notificationSettings);
  const lastSyncedNotificationSettingsRef = useRef(notificationSettings);
  const notificationVersionRef = useRef<string | null>(notificationVersion);
  const notificationSavePromiseRef = useRef<Promise<void> | null>(null);
  const pendingNotificationAutoSaveRef = useRef(false);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    notificationVersionRef.current = notificationVersion;
  }, [notificationVersion]);

  const scheduleProfileStatusReset = useCallback(() => {
    if (profileStatusResetRef.current) {
      clearTimeout(profileStatusResetRef.current);
    }
    profileStatusResetRef.current = setTimeout(() => {
      setProfileSaveStatus('idle');
      profileStatusResetRef.current = null;
    }, 2500);
  }, []);

  const scheduleNotificationStatusReset = useCallback(() => {
    if (notificationStatusResetRef.current) {
      clearTimeout(notificationStatusResetRef.current);
    }
    notificationStatusResetRef.current = setTimeout(() => {
      setNotificationSaveStatus('idle');
      notificationStatusResetRef.current = null;
    }, 2000);
  }, []);

  const refreshNotificationSettings = useCallback(async () => {
    try {
      const response = await apiFetch('/api/user/notification-settings', { cache: 'no-store' });
      if (!response.ok) {
        setNotificationVersion(null);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (payload?.success) {
        setNotificationSettings(payload.data);
        lastSyncedNotificationSettingsRef.current = payload.data;
        setNotificationSaveStatus('idle');
        syncNotificationVersion(response, payload);
      }
    } catch (error) {
      console.error('Failed to refresh notification settings', error);
    }
  }, [syncNotificationVersion]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      try {
        const response = await apiFetch('/api/user/profile', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          toast.error('Your session expired. Please log in again.', { description: 'Authentication required' });
          router.push('/auth/login');
          return;
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load profile data.');
        }

        const profile = payload.profile as {
          id: string;
          email: string;
          fullName: string;
          company: string;
          jobTitle: string;
          avatarUrl: string;
        };

        setUserId(profile.id ?? '');
        setProfileData({
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          company: profile.company ?? '',
          jobTitle: profile.jobTitle ?? '',
          avatarUrl: profile.avatarUrl ?? '',
        });
        setProfileError(null);

        await refreshNotificationSettings();
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Failed to load your profile data.';
        setProfileError(message);
        toast.error(message, { description: 'Error Loading Profile' });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [refreshNotificationSettings, router]);

  useEffect(() => {
    return () => {
      if (profileStatusResetRef.current) {
        clearTimeout(profileStatusResetRef.current);
      }
      if (notificationDebounceRef.current) {
        clearTimeout(notificationDebounceRef.current);
      }
      if (notificationStatusResetRef.current) {
        clearTimeout(notificationStatusResetRef.current);
      }
    };
  }, []);

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({ ...prev, [id]: value }));
  };

  const persistNotificationSettings = useCallback(
    async (mode: 'auto' | 'manual' = 'auto'): Promise<void> => {
      if (notificationSavePromiseRef.current) {
        if (mode === 'auto') {
          pendingNotificationAutoSaveRef.current = true;
          return;
        }

        await notificationSavePromiseRef.current;
      }

      const savePromise = (async () => {
        if (mode === 'manual') {
          setIsSubmitting(true);
        }
        setNotificationSaveStatus('saving');

        const snapshot = notificationSettingsRef.current;
        const fallback = lastSyncedNotificationSettingsRef.current;

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const versionForRequest = notificationVersionRef.current;
        if (versionForRequest) {
          headers['If-Match'] = versionForRequest;
        }

        try {
          const response = await apiFetch('/api/user/notification-settings', {
            method: 'PATCH',
            headers,
            body: JSON.stringify(snapshot),
          });

          const payload = await response.json().catch(() => ({ success: response.ok }));

          if (!response.ok || !payload?.success) {
            if (response.status === 412 || response.status === 428) {
              setNotificationVersion(null);
              await refreshNotificationSettings();
              setNotificationSaveStatus('error');
              scheduleNotificationStatusReset();
              toast.error('Notification preferences changed in another session. We reloaded the latest settings.', {
                description: 'Version conflict',
              });
            } else {
              setNotificationSettings(fallback);
              lastSyncedNotificationSettingsRef.current = fallback;
              setNotificationSaveStatus('error');
              scheduleNotificationStatusReset();
              throw new Error(payload?.error || 'Failed to update notification setting');
            }
            return;
          }

          const nextSettings = payload?.data ?? snapshot;
          setNotificationSettings(nextSettings);
          lastSyncedNotificationSettingsRef.current = nextSettings;
          syncNotificationVersion(response, payload);
          setNotificationSaveStatus('saved');
          scheduleNotificationStatusReset();

          if (mode === 'manual') {
            toast('Your notification preferences have been updated.', { description: 'Preferences Saved' });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update notification settings.';
          setNotificationSaveStatus('error');
          scheduleNotificationStatusReset();

          if (mode === 'manual') {
            toast.error('Failed to save your notification preferences.', { description: message });
          } else {
            toast.error('Failed to update notification preference', { description: message });
          }
          setNotificationSettings(fallback);
          lastSyncedNotificationSettingsRef.current = fallback;
        } finally {
          if (mode === 'manual') {
            setIsSubmitting(false);
          }
        }
      })();

      notificationSavePromiseRef.current = savePromise;
      try {
        await savePromise;
      } finally {
        notificationSavePromiseRef.current = null;
        if (pendingNotificationAutoSaveRef.current) {
          pendingNotificationAutoSaveRef.current = false;
          void persistNotificationSettings('auto');
        }
      }
    },
    [refreshNotificationSettings, scheduleNotificationStatusReset, syncNotificationVersion]
  );

  const handleNotificationChange = (id: keyof typeof notificationSettings, checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [id]: checked }));
    setNotificationSaveStatus('saving');

    if (notificationDebounceRef.current) {
      clearTimeout(notificationDebounceRef.current);
    }

    notificationDebounceRef.current = setTimeout(() => {
      notificationDebounceRef.current = null;
      void persistNotificationSettings('auto');
    }, 400);
  };

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!profileData.fullName.trim()) {
      toast.error('Full name is required and cannot be empty.', { description: 'Validation Error' });
      return;
    }

    setIsSubmitting(true);
    setProfileSaveStatus('saving');
    if (profileStatusResetRef.current) {
      clearTimeout(profileStatusResetRef.current);
      profileStatusResetRef.current = null;
    }
    try {
      if (!userId) {
        throw new Error('User information is still loading. Please try again in a moment.');
      }

      const response = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileData.fullName.trim(),
          company: profileData.company.trim(),
          jobTitle: profileData.jobTitle.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update your profile.');
      }

      const updatedProfile = payload.profile ?? {};
      setProfileData(prev => ({
        ...prev,
        fullName: updatedProfile.fullName ?? prev.fullName,
        email: updatedProfile.email ?? prev.email,
        company: updatedProfile.company ?? prev.company,
        jobTitle: updatedProfile.jobTitle ?? prev.jobTitle,
        avatarUrl: updatedProfile.avatarUrl ?? prev.avatarUrl,
      }));

      setProfileError(null);
      toast('Your profile information has been successfully updated.', { description: 'Profile Updated' });
      setProfileSaveStatus('success');
      scheduleProfileStatusReset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage || 'Failed to update your profile. Please try again.', { description: 'Profile Update Error' });
      setProfileSaveStatus('error');
      scheduleProfileStatusReset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem('current-password') as HTMLInputElement)?.value;
    const newPassword = (form.elements.namedItem('new-password') as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem('confirm-password') as HTMLInputElement)?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please complete all password fields.', { description: 'Missing Fields' });
      return;
    }

    // Validate new password against policy
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      toast.error('Password does not meet requirements', {
        description: validation.errors[0]
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Your new password and confirmation password do not match.', { description: 'Password Mismatch' });
      return;
    }

    setIsSubmitting(true);
    try {
      const reauthResponse = await apiFetch('/api/auth/check-reauthentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'change-password' }),
      });

      const reauthData = await reauthResponse.json();
      if (!reauthResponse.ok || !reauthData?.success) {
        throw new Error(reauthData?.error || 'Unable to verify session state for password change.');
      }

      if (reauthData.requiresReauthentication) {
        toast.error('For security reasons, please log in again before changing your password.', {
          description: 'Re-authentication Required',
        });
        router.push(`/auth/login?from=${encodeURIComponent('/dashboard/account?tab=password')}`);
        return;
      }

      const changeResponse = await apiFetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const changeData = await changeResponse.json().catch(() => ({}));
      if (!changeResponse.ok || !changeData?.success) {
        throw new Error(changeData?.error || 'Failed to change your password.');
      }

      try {
        await apiFetch('/api/auth/clear-lockout', { method: 'POST' });
      } catch (lockoutError) {
        console.warn('[account/password] Failed to clear login attempts after password change', lockoutError);
      }
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

  const handleNotificationSettingsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (notificationDebounceRef.current) {
      clearTimeout(notificationDebounceRef.current);
      notificationDebounceRef.current = null;
    }
    await persistNotificationSettings('manual');
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

  if (profileError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account Settings" }]} />
        <Card>
          <CardHeader>
            <CardTitle>Unable to load account settings</CardTitle>
            <CardDescription>
              {profileError || 'An unexpected error occurred while loading your profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.refresh()}>Try again</Button>
          </CardContent>
        </Card>
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
          href="/dashboard/help#account"
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
                    userId={userId}
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
                      <Input id="company" value={profileData.company} onChange={handleProfileChange} placeholder="General Mills" />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <Label htmlFor="jobTitle" className="col-span-12 sm:col-span-3 text-left sm:text-right">Job Title</Label>
                    <div className="col-span-12 sm:col-span-9">
                      <Input id="jobTitle" value={profileData.jobTitle} onChange={handleProfileChange} placeholder="e.g. Content Strategist" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6 flex justify-start">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}Update Profile
                  </Button>
                  {profileSaveStatus === 'saving' && (
                    <span className="text-sm text-muted-foreground">Saving changes…</span>
                  )}
                  {profileSaveStatus === 'success' && (
                    <span className="text-sm text-emerald-600">All changes saved</span>
                  )}
                  {profileSaveStatus === 'error' && (
                    <span className="text-sm text-destructive">Unable to save changes</span>
                  )}
                </div>
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
                <div className="grid grid-cols-12 gap-4 items-start">
                  <Label htmlFor="new-password" className="col-span-12 sm:col-span-3 text-left sm:text-right mt-2">New Password <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9 space-y-2">
                    <Input id="new-password" name="new-password" type="password" required minLength={12} placeholder="Enter a strong password" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Password must contain:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>At least 12 characters</li>
                        <li>Uppercase and lowercase letters</li>
                        <li>At least one number</li>
                        <li>At least one special character</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <Label htmlFor="confirm-password" className="col-span-12 sm:col-span-3 text-left sm:text-right">Confirm Password <span className="text-destructive">*</span></Label>
                  <div className="col-span-12 sm:col-span-9">
                    <Input id="confirm-password" name="confirm-password" type="password" required minLength={12} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6 flex justify-start">
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
              <CardFooter className="pt-6 flex justify-start">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}Save Preferences
                  </Button>
                  {notificationSaveStatus === 'saving' && (
                    <span className="text-sm text-muted-foreground">Saving preferences…</span>
                  )}
                  {notificationSaveStatus === 'saved' && (
                    <span className="text-sm text-emerald-600">Preferences saved</span>
                  )}
                  {notificationSaveStatus === 'error' && (
                    <span className="text-sm text-destructive">Could not save preferences</span>
                  )}
                </div>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
