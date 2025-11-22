
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, FileText, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { useBrands } from '@/contexts/brand-context';
import { deriveRoleFlags } from '@/components/features/navigation/unified-navigation-v2';

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ElementType;
  show?: boolean;
}

export function BottomMobileNavigation() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { isGlobalAdmin, hasBrandPermission } = usePermissions();
  const { brands } = useBrands();

  const { isAuthenticatedUser, isViewer, isPlatformAdmin, isScopedAdmin } = useMemo(
    () =>
      deriveRoleFlags({
        user,
        isGlobalAdmin,
        brands,
        hasBrandPermission,
      }),
    [user, isGlobalAdmin, brands, hasBrandPermission]
  );

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'mobile-home', href: '/dashboard', label: 'Home', icon: Home, show: isAuthenticatedUser },
      { id: 'mobile-tasks', href: '/dashboard/my-tasks', label: 'Tasks', icon: ListChecks, show: isAuthenticatedUser },
      {
        id: 'mobile-content',
        href: '/dashboard/content',
        label: 'Content',
        icon: FileText,
        show: isAuthenticatedUser && !isViewer,
      },
      {
        id: 'mobile-tools',
        href: '/dashboard/tools/metadata-generator',
        label: 'Tools',
        icon: Wrench,
        show: isAuthenticatedUser && !isViewer && (isPlatformAdmin || isScopedAdmin),
      },
    ],
    [isAuthenticatedUser, isViewer, isPlatformAdmin, isScopedAdmin]
  );

  if (!isAuthenticatedUser || isLoading) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block border-t border-border bg-background p-1 shadow-top lg:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems
          .filter((item) => item.show !== false)
          .map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center rounded-md p-2 text-xs font-medium transition-colors w-1/3',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-primary',
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
