/**
 * @deprecated Use BreadcrumbNav from '@/components/ui/breadcrumb-nav' instead
 * This file provides backward compatibility during migration
 */

import { BreadcrumbNav, type BreadcrumbItem } from './breadcrumb-nav';

// Re-export the new component with old name for backward compatibility
export const Breadcrumbs = BreadcrumbNav;

// Re-export types
export type { BreadcrumbItem };

// Legacy default export
export default BreadcrumbNav;