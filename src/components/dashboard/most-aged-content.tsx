import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Hourglass, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { BrandDisplay } from '@/components/ui/brand-display';

interface AgedItem {
  id: string;
  title: string;
  updated_at: string;
  status: string;
  brands: { 
    name: string;
    brand_color?: string | null;
    logo_url?: string | null;
  } | null;
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
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 ${getAgeColor(item.updated_at)}`}>
                    <Hourglass className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/content/${item.id}`} className="font-medium hover:underline block truncate">
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      {item.brands?.name && (
                        <div className="flex items-center gap-1.5">
                          <BrandDisplay 
                            brand={{
                              name: item.brands.name,
                              brand_color: item.brands.brand_color,
                              logo_url: item.brands.logo_url
                            }}
                            variant="compact"
                            size="sm"
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-sm text-muted-foreground">{item.brands.name}</span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={`text-sm ${getAgeColor(item.updated_at)}`}>
                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Badge variant={item.status === 'draft' ? 'secondary' : 'outline'} className="mt-2 text-xs">
                      {item.status === 'draft' ? 'Draft' : 'Pending Review'}
                    </Badge>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/content/${item.id}`} 
                  className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p>No stalled content found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 