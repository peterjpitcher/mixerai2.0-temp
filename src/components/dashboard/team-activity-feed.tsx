import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
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
  const userName = <span className="font-semibold">{item.user?.full_name || 'A user'}</span>;
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

export function TeamActivityFeed({ initialActivity, condensed = false }: { initialActivity: ActivityItem[]; condensed?: boolean }) {
  const activities = initialActivity;
  return (
    <Card className={condensed ? "h-full overflow-hidden flex flex-col" : ""}>
      <CardHeader className={condensed ? "py-2 px-4" : ""}>
        <CardTitle className={condensed ? "text-base" : ""}>Team Activity</CardTitle>
        {!condensed && <CardDescription>A live feed of recent events across the platform.</CardDescription>}
      </CardHeader>
      <CardContent className={condensed ? "flex-1 overflow-y-auto px-4 py-2" : ""}>
        {activities && activities.length > 0 ? (
          <div className={condensed ? "space-y-2" : "space-y-4"}>
            {activities.map((item) => {
              const config = activityConfig[item.type] || activityConfig.content_updated;
              return (
                <div key={item.id} className={condensed ? "flex items-start gap-2" : "flex items-start gap-3"}>
                  <div className={`flex ${condensed ? "h-6 w-6" : "h-8 w-8"} shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                      {condensed ? (
                        <div className="scale-50">{config.icon}</div>
                      ) : (
                        <div className="scale-75">{config.icon}</div>
                      )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className={condensed ? "text-xs line-clamp-2" : "text-sm"}>
                      {getActivityMessage(item)}
                    </div>
                    <time className={condensed ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>
                      {format(new Date(item.created_at), 'MMMM d, yyyy')}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`text-center text-muted-foreground ${condensed ? "py-4" : "py-8"}`}>
            <p className={condensed ? "text-sm" : ""}>No recent activity to display.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 