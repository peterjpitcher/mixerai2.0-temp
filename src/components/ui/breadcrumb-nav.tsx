import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
  maxItems?: number;
}

export function BreadcrumbNav({
  items,
  className,
  separator = <ChevronRight className="h-4 w-4" />,
  showHome = true,
  maxItems
}: BreadcrumbNavProps) {
  // Add home if requested
  const allItems = showHome 
    ? [{ label: 'Dashboard', href: '/dashboard', icon: Home }, ...items]
    : items;

  // Truncate if needed
  let displayItems = allItems;
  
  if (maxItems && allItems.length > maxItems) {
    displayItems = [
      ...allItems.slice(0, 1),
      { label: '...', href: undefined },
      ...allItems.slice(-(maxItems - 2))
    ];
  }

  return (
    <nav 
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
    >
      <ol 
        className="flex items-center space-x-1"
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';
          const Icon = item.icon;

          return (
            <li 
              key={index}
              className="flex items-center"
              itemScope 
              itemType="https://schema.org/ListItem" 
              itemProp="itemListElement"
            >
              {index > 0 && (
                <span className="mx-1 text-muted-foreground/50">
                  {separator}
                </span>
              )}
              
              {isEllipsis ? (
                <span className="px-1">...</span>
              ) : isLast || !item.href ? (
                <span 
                  className={cn(
                    "flex items-center gap-1 font-medium text-foreground",
                    "max-w-[200px] truncate"
                  )}
                  itemProp="name"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 transition-colors hover:text-foreground",
                    "max-w-[200px] truncate"
                  )}
                  itemProp="item"
                >
                  <span itemProp="name">
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </span>
                </Link>
              )}
              
              {!isEllipsis && (
                <meta itemProp="position" content={String(index + 1)} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Mobile-friendly version with dropdown for long breadcrumbs
export function ResponsiveBreadcrumbNav(props: BreadcrumbNavProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block">
        <BreadcrumbNav {...props} />
      </div>
      
      {/* Mobile - show only last 2 items */}
      <div className="block sm:hidden">
        <BreadcrumbNav {...props} maxItems={2} />
      </div>
    </>
  );
}
