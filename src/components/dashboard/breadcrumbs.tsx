/**
 * @deprecated Use BreadcrumbNav from '@/components/ui/breadcrumb-nav' instead
 * This file provides backward compatibility during migration
 */
"use client";

import { BreadcrumbNav, type BreadcrumbItem } from '@/components/ui/breadcrumb-nav';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// Legacy component wrapper for backward compatibility
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <BreadcrumbNav 
      items={items} 
      className={cn("mb-6", className)}
      showHome={false} // Legacy behavior didn't auto-add home
    />
  );
}

// Re-export types
export type { BreadcrumbItem }; 