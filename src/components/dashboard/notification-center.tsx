'use client';

import * as React from 'react';
import { useState } from 'react';
import { NotificationsButton } from '@/components/dashboard/notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Settings, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * NotificationCenter component.
 * Currently acts as a simple wrapper for the NotificationsButton.
 * Future enhancements could include more complex logic or display here.
 */
export function NotificationCenter() {
  return (
    <div className="flex items-center gap-2">
      <NotificationsButton />
    </div>
  );
}

/**
 * NotificationSettings component.
 * Allows users to manage their notification preferences through a tabbed interface.
 * Note: Currently uses mock data and does not persist settings.
 */
export function NotificationSettings() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'content-mentions',
      name: 'Content mentions',
      description: 'Notify when someone mentions you in content',
      enabled: true
    },
    {
      id: 'workflow-updates',
      name: 'Workflow updates',
      description: 'Notify about workflow status changes',
      enabled: true
    },
    {
      id: 'content-approvals',
      name: 'Content approvals',
      description: 'Notify when content is approved or rejected',
      enabled: true
    },
    {
      id: 'system-updates',
      name: 'System updates',
      description: 'Notify about system updates and maintenance',
      enabled: false
    },
    {
      id: 'new-users',
      name: 'New users',
      description: 'Notify when new users join workspaces',
      enabled: true
    }
  ]);

  const toggleSetting = (id: string) => {
    setNotificationSettings(prevSettings => 
      prevSettings.map(setting => 
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSaveChanges = () => {
    alert('Save changes functionality not yet implemented.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Manage which notifications you receive and how you are notified.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="all">
              <Bell className="h-4 w-4 mr-2" />
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="content">
              <Clock className="h-4 w-4 mr-2" />
              Content Activity
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="h-4 w-4 mr-2" />
              System & Account
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {notificationSettings.map(setting => (
              <div key={setting.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="space-y-0.5">
                  <Label htmlFor={setting.id} className="text-base font-medium">{setting.name}</Label>
                  <p className="text-sm text-muted-foreground pr-2">{setting.description}</p>
                </div>
                <Switch
                  id={setting.id}
                  checked={setting.enabled}
                  onCheckedChange={() => toggleSetting(setting.id)}
                  aria-labelledby={`${setting.id}-label`}
                />
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            {notificationSettings
              .filter(s => ['content-mentions', 'content-approvals'].includes(s.id))
              .map(setting => (
                <div key={setting.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.id} className="text-base font-medium">{setting.name}</Label>
                    <p className="text-sm text-muted-foreground pr-2">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                    aria-labelledby={`${setting.id}-label`}
                  />
                </div>
              ))}
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            {notificationSettings
              .filter(s => ['workflow-updates', 'system-updates', 'new-users'].includes(s.id))
              .map(setting => (
                <div key={setting.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.id} className="text-base font-medium">{setting.name}</Label>
                    <p className="text-sm text-muted-foreground pr-2">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                    aria-labelledby={`${setting.id}-label`}
                  />
                </div>
              ))}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6">
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
} 