/**
 * @deprecated Use BreadcrumbNav from '@/components/ui/breadcrumb-nav' instead
 * This file provides backward compatibility during migration
 */

import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

// Legacy component wrapper for backward compatibility
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <BreadcrumbNav 
      items={items} 
      className={cn("mb-4")}
      showHome={false} // Legacy behavior didn't auto-add home
      separator="/" // Legacy used forward slash
    />
  );
}

// Re-export types
export type { BreadcrumbItem };