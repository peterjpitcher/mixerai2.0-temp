import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface RecentItem {
  id: string;
  title: string;
  updated_at: string;
  brands: { name: string } | null;
}

interface JumpBackInProps {
  items: RecentItem[];
}

export function JumpBackIn({ items }: JumpBackInProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jump Back In</CardTitle>
        <CardDescription>
          Continue where you left off. Here are the items you&apos;ve recently worked on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <Link href={`/dashboard/content/${item.id}/edit`} className="font-semibold hover:underline">
                      {item.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {item.brands?.name ? <Badge variant="outline" className="mr-2">{item.brands.name}</Badge> : null}
                      Edited {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/content/${item.id}/edit`}>Edit</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p>No recent activity found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 