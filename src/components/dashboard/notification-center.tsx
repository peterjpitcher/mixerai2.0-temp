'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { NotificationsButton } from '@/components/dashboard/notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Bell, Settings, Clock } from 'lucide-react';
import { Switch } from '@/components/switch';
import { Label } from '@/components/label';

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function NotificationCenter() {
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
    setNotificationSettings(notificationSettings.map(setting => {
      if (setting.id === id) {
        return { ...setting, enabled: !setting.enabled };
      }
      return setting;
    }));
  };

  return (
    <div className="flex items-center gap-2">
      <NotificationsButton />
    </div>
  );
}

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
    setNotificationSettings(notificationSettings.map(setting => {
      if (setting.id === id) {
        return { ...setting, enabled: !setting.enabled };
      }
      return setting;
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Manage which notifications you receive</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              <Bell className="h-4 w-4 mr-2" />
              All
            </TabsTrigger>
            <TabsTrigger value="content">
              <Clock className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {notificationSettings.map(setting => (
              <div key={setting.id} className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor={setting.id} className="text-base">{setting.name}</Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <Switch
                  id={setting.id}
                  checked={setting.enabled}
                  onCheckedChange={() => toggleSetting(setting.id)}
                />
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            {notificationSettings
              .filter(s => ['content-mentions', 'content-approvals'].includes(s.id))
              .map(setting => (
                <div key={setting.id} className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.id} className="text-base">{setting.name}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
                </div>
              ))}
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            {notificationSettings
              .filter(s => ['workflow-updates', 'system-updates', 'new-users'].includes(s.id))
              .map(setting => (
                <div key={setting.id} className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.id} className="text-base">{setting.name}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
                </div>
              ))}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6">
          <Button>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  );
} 