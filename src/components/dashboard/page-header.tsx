'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * PageHeader component.
 * Displays a standard header for dashboard pages, including a title, 
 * an optional description, and optional action buttons or other elements.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader; 