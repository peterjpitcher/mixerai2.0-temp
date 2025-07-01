'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { announce } from '@/lib/utils/accessibility';

interface AccessibleDataTableProps<T> {
  data: T[];
  columns: {
    id: string;
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    headerScope?: 'col' | 'row';
  }[];
  caption?: string;
  summary?: string;
  onRowClick?: (item: T) => void;
  'aria-label'?: string;
}

/**
 * Accessible data table component with proper ARIA attributes
 * and keyboard navigation support
 */
export function AccessibleDataTable<T extends Record<string, any>>({
  data,
  columns,
  caption,
  summary,
  onRowClick,
  'aria-label': ariaLabel,
}: AccessibleDataTableProps<T>) {
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  // Announce changes to screen readers
  React.useEffect(() => {
    if (data.length > 0) {
      announce(`Table updated with ${data.length} rows`);
    }
  }, [data.length]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(Math.min(index + 1, data.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(Math.max(index - 1, 0));
        break;
      case 'Enter':
      case ' ':
        if (onRowClick) {
          event.preventDefault();
          onRowClick(data[index]);
        }
        break;
      case 'Home':
        event.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setSelectedIndex(data.length - 1);
        break;
    }
  };

  return (
    <div role="region" aria-label={ariaLabel || 'Data table'}>
      {summary && (
        <div className="sr-only" aria-live="polite">
          {summary}
        </div>
      )}
      
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}
        
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} scope={column.headerScope || 'col'}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                <p className="text-muted-foreground">No data available</p>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow
                key={index}
                data-state={selectedIndex === index ? 'selected' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick && onRowClick(item)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={onRowClick ? 'cursor-pointer' : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={onRowClick ? `Select row ${index + 1}` : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {column.cell
                      ? column.cell(item)
                      : column.accessorKey
                      ? String(item[column.accessorKey])
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}