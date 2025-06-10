import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { FilePlus, Send, CheckCircle, Edit3, UserPlus, Milestone } from 'lucide-react';

export type ActivityType =
  | 'content_created'
  | 'content_submitted'
  | 'content_approved'
  | 'content_updated'
  | 'user_invited'
  | 'brand_created';

interface ActivityItem {
  id: string;
  type: ActivityType;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  target: {
    id: string;
    name: string;
    type: 'content' | 'brand' | 'user';
  } | null;
}

const activityConfig: { [key in ActivityType]: { icon: React.ReactNode; bgColor: string; } } = {
  content_created: {
    icon: <FilePlus className="h-5 w-5" />,
    bgColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  },
  content_submitted: {
    icon: <Send className="h-5 w-5" />,
    bgColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  },
  content_approved: {
    icon: <CheckCircle className="h-5 w-5" />,
    bgColor: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  },
  content_updated: {
    icon: <Edit3 className="h-5 w-5" />,
    bgColor: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
  },
  user_invited: {
    icon: <UserPlus className="h-5 w-5" />,
    bgColor: 'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400',
  },
  brand_created: {
    icon: <Milestone className="h-5 w-5" />,
    bgColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400',
  },
};

const getActivityMessage = (item: ActivityItem): React.ReactNode => {
  const userName = <strong>{item.user?.full_name || 'A user'}</strong>;
  const targetLink = item.target ? (
    <Link href={`/dashboard/${item.target.type}/${item.target.id}`} className="font-semibold hover:underline">
      {item.target.name}
    </Link>
  ) : 'an item';

  switch (item.type) {
    case 'content_created':
      return <>{userName} created the content {targetLink}.</>;
    case 'content_submitted':
      return <>{userName} submitted {targetLink} for review.</>;
    case 'content_approved':
      return <>{userName} approved {targetLink}.</>;
    case 'content_updated':
        return <>{userName} updated {targetLink}.</>;
    case 'user_invited':
        return <>{userName} invited a new user.</>;
    case 'brand_created':
        return <>{userName} created the brand {targetLink}.</>;
    default:
      return 'An unknown action occurred.';
  }
};

export function TeamActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Activity</CardTitle>
        <CardDescription>A live feed of recent events across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-6">
            {activities.map((item) => {
              const config = activityConfig[item.type] || activityConfig.content_updated;
              return (
                <div key={item.id} className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                      {config.icon}
                  </div>
                  <div className="flex-grow">
                    <div className="text-sm">
                      {getActivityMessage(item)}
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No recent activity to display.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 