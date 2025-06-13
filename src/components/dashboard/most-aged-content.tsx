import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

interface AgedItem {
  id: string;
  title: string;
  updated_at: string;
  status: string;
  brands: { name: string } | null;
}

interface MostAgedContentProps {
  initialContent: AgedItem[];
}

const getAgeColor = (dateString: string): string => {
    const daysOld = differenceInDays(new Date(), new Date(dateString));
    if (daysOld > 30) return 'text-red-500';
    if (daysOld > 7) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-muted-foreground';
};

export function MostAgedContent({ initialContent }: MostAgedContentProps) {
  const items = initialContent;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stalled Content</CardTitle>
        <CardDescription>
          These items haven&apos;t been updated in a while and may need attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Hourglass className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <Link href={`/dashboard/content/${item.id}`} className="text-sm font-medium hover:underline">
                      {item.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      <span className={getAgeColor(item.updated_at)}>
                        {item.brands?.name ? <Badge variant="outline" className="mr-2 -translate-y-px">{item.brands.name}</Badge> : null}
                        Last updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/content/${item.id}`} className="text-sm hover:underline">View</Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No stalled content found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 