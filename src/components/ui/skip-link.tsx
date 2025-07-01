'use client';

import { skipLink } from '@/lib/utils/accessibility';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

/**
 * Skip link component for keyboard navigation
 * Allows users to skip repetitive navigation and jump to main content
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a href={href} className={skipLink}>
      {children}
    </a>
  );
}