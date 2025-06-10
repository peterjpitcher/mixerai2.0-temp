import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  items: AgedItem[];
}

const getAgeColor = (dateString: string): string => {
    const daysOld = differenceInDays(new Date(), new Date(dateString));
    if (daysOld > 30) return 'text-red-500 font-semibold';
    if (daysOld > 7) return 'text-yellow-600 dark:text-yellow-500 font-medium';
    return 'text-muted-foreground';
};

export function MostAgedContent({ items }: MostAgedContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stalled Content</CardTitle>
        <CardDescription>
          These items haven't been updated in a while and may need attention.
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
                    <Link href={`/dashboard/content/${item.id}`} className="font-semibold hover:underline">
                      {item.title}
                    </Link>
                    <div className={`text-sm ${getAgeColor(item.updated_at)}`}>
                      {item.brands?.name ? <Badge variant="outline" className="mr-2 -translate-y-px">{item.brands.name}</Badge> : null}
                      Last updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/content/${item.id}`}>View</Link>
                </Button>
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