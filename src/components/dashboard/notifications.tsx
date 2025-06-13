'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

/**
 * NotificationsButton component.
 * Displays a bell icon that, when clicked, opens a dialog listing user notifications.
 * Notifications are currently mock data and not persisted.
 */
export function NotificationsButton() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  useEffect(() => {
    // In a real implementation, we would fetch from an API
    const fetchNotifications = async () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Content Approved',
          message: 'Your content "10 Tips for Sustainable Living" has been approved.',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), 
          actionUrl: '/dashboard/content/3',
          actionLabel: 'View Content'
        },
        {
          id: '2',
          title: 'Workflow Update',
          message: 'A new step has been added to the "Content Approval" workflow.',
          type: 'info',
          isRead: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), 
          actionUrl: '/dashboard/workflows/1',
          actionLabel: 'View Workflow'
        },
        {
          id: '3',
          title: 'Review Required',
          message: 'Content "Premium Wireless Headphones Product Description" needs your review.',
          type: 'warning',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), 
          actionUrl: '/dashboard/content/2',
          actionLabel: 'Review Now'
        },
        {
          id: '4',
          title: 'New User Joined',
          message: 'Sarah Johnson has joined the workspace.',
          type: 'info',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), 
        },
        {
          id: '5',
          title: 'Content Rejected',
          message: 'Your content "Email Marketing Strategy" has been rejected.',
          type: 'error',
          isRead: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), 
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
    setNotifications(notifications.map(notification => ({ ...notification, isRead: true })));
    setUnreadCount(0);
    // TODO: API call to mark all as read on backend
  };
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => {
      if (notification.id === id && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1)); // Ensure count doesn't go below 0
        // TODO: API call to mark specific notification as read on backend
        return { ...notification, isRead: true };
      }
      return notification;
    }));
  };
  
  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
    // TODO: API call to clear all notifications on backend (or implement soft delete/archive)
  };
  
  const handleActionClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false); // Close dialog when action is clicked
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCheck className="h-5 w-5 text-success" />; // Use theme color
      case 'warning':
        return <Clock className="h-5 w-5 text-warning" />; // Use theme color
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />; // Use theme color
      default: // info
        return <Bell className="h-5 w-5 text-secondary" />; // Using secondary for info, can be themed differently
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="View notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-[16px] p-0.5 text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Notifications</DialogTitle>
            <div className="flex space-x-2">
              {notifications.length > 0 && unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-destructive">
                  Clear all
                </Button>
              )}
            </div>
          </div>
          {notifications.length > 0 && (
            <DialogDescription className="text-xs pt-1">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}.
            </DialogDescription>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-120px)] h-[400px]">
          <div className="p-4 space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={cn(
                    "transition-all hover:bg-muted/50",
                    !notification.isRead && "border-l-4",
                    notification.type === 'success' && !notification.isRead && "border-l-success",
                    notification.type === 'info' && !notification.isRead && "border-l-secondary",
                    notification.type === 'warning' && !notification.isRead && "border-l-warning",
                    notification.type === 'error' && !notification.isRead && "border-l-destructive",
                    notification.actionUrl ? "cursor-default" : "cursor-pointer"
                  )}
                  onClick={notification.actionUrl ? undefined : () => markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-sm font-medium truncate", !notification.isRead && "font-semibold")}>{notification.title}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatTimeAgo(notification.createdAt)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                        {notification.actionUrl && notification.actionLabel && (
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-sm text-primary hover:text-primary/80 mt-1"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleActionClick(notification);
                            }}
                            asChild
                          >
                            <Link href={notification.actionUrl}>{notification.actionLabel}</Link>
                          </Button>
                        )}
                      </div>
                       {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 self-start" aria-label="Unread mark"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No New Notifications</p>
                <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>
        {notifications.length > 0 && (
            <div className="p-4 border-t text-center">
                <Link href="/dashboard/account?tab=notifications" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setIsOpen(false)}>
                    Manage notification settings
                </Link>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 