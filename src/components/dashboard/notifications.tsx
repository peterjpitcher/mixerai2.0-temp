'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, X, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/dialog';
import { ScrollArea } from '@/components/scroll-area';
import { Badge } from '@/components/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationsButton() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  useEffect(() => {
    // In a real implementation, we would fetch from an API
    const fetchNotifications = async () => {
      // Mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Content Approved',
          message: 'Your content "10 Tips for Sustainable Living" has been approved.',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          actionUrl: '/dashboard/content/3',
          actionLabel: 'View Content'
        },
        {
          id: '2',
          title: 'Workflow Update',
          message: 'A new step has been added to the "Content Approval" workflow.',
          type: 'info',
          isRead: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
          actionUrl: '/dashboard/workflows/1',
          actionLabel: 'View Workflow'
        },
        {
          id: '3',
          title: 'Review Required',
          message: 'Content "Premium Wireless Headphones Product Description" needs your review.',
          type: 'warning',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
          actionUrl: '/dashboard/content/2',
          actionLabel: 'Review Now'
        },
        {
          id: '4',
          title: 'New User Joined',
          message: 'Sarah Johnson has joined the workspace.',
          type: 'info',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
        {
          id: '5',
          title: 'Content Rejected',
          message: 'Your content "Email Marketing Strategy" has been rejected.',
          type: 'error',
          isRead: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
          actionUrl: '/dashboard/content/5',
          actionLabel: 'View Feedback'
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
    };
    
    fetchNotifications();
  }, []);
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
    setUnreadCount(0);
  };
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => {
      if (notification.id === id && !notification.isRead) {
        setUnreadCount(prev => prev - 1);
        return { ...notification, isRead: true };
      }
      return notification;
    }));
  };
  
  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
  };
  
  const handleActionClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            {notifications.length > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.` 
              : 'You have no notifications.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={cn(
                    "transition-all hover:bg-muted/50",
                    !notification.isRead && "border-l-4",
                    notification.type === 'success' && !notification.isRead && "border-l-green-500",
                    notification.type === 'info' && !notification.isRead && "border-l-blue-500",
                    notification.type === 'warning' && !notification.isRead && "border-l-amber-500",
                    notification.type === 'error' && !notification.isRead && "border-l-red-500",
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.createdAt)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        {notification.actionUrl && notification.actionLabel && (
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-sm"
                            onClick={() => handleActionClick(notification)}
                            asChild
                          >
                            <a href={notification.actionUrl}>{notification.actionLabel}</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 