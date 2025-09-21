'use client';

import * as React from 'react';
import { VirtualizedList } from './virtualized-list';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/lib/utils/performance';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VirtualizedDataTableColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: number | string;
  className?: string;
}

interface VirtualizedDataTableProps<T> {
  data: T[];
  columns: VirtualizedDataTableColumn<T>[];
  height?: number | string;
  rowHeight?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  headerClassName?: string;
  emptyMessage?: string;
}

/**
 * Virtualized data table for efficiently rendering large datasets
 */
export function VirtualizedDataTable<T extends Record<string, any>>({
  data,
  columns,
  height = 600,
  rowHeight = 48,
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Search...',
  onRowClick,
  className,
  headerClassName,
  emptyMessage = 'No data available',
}: VirtualizedDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchable || !debouncedSearchTerm || searchKeys.length === 0) {
      return data;
    }

    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
    return data.filter((row) => {
      return searchKeys.some((key) => {
        const value = row[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }, [data, debouncedSearchTerm, searchable, searchKeys]);

  // Render a table row
  const renderRow = React.useCallback(
    (row: T, index: number) => {
      return (
        <TableRow
          onClick={() => onRowClick?.(row, index)}
          className={cn(
            'border-b transition-colors',
            onRowClick && 'cursor-pointer hover:bg-muted/50'
          )}
          style={{ height: rowHeight }}
        >
          {columns.map((column) => {
            const value =
              typeof column.accessor === 'function'
                ? column.accessor(row)
                : row[column.accessor];

            return (
              <TableCell
                key={column.id}
                className={cn('py-0', column.className)}
                style={{ width: column.width }}
              >
                {value}
              </TableCell>
            );
          })}
        </TableRow>
      );
    },
    [columns, onRowClick, rowHeight]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border">
        {/* Fixed header */}
        <div className="overflow-hidden rounded-t-md">
          <Table>
            <TableHeader className={headerClassName}>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={column.className}
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          </Table>
        </div>

        {/* Virtualized body */}
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <VirtualizedList
            items={filteredData}
            height={height}
            itemHeight={rowHeight}
            renderItem={renderRow}
            className="border-t-0"
            overscan={5}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Example usage:
 * 
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   role: string;
 * }
 * 
 * const columns: VirtualizedDataTableColumn<User>[] = [
 *   { id: 'name', header: 'Name', accessor: 'name', width: '30%' },
 *   { id: 'email', header: 'Email', accessor: 'email', width: '40%' },
 *   { id: 'role', header: 'Role', accessor: 'role', width: '30%' },
 * ];
 * 
 * <VirtualizedDataTable
 *   data={users}
 *   columns={columns}
 *   height={600}
 *   searchable
 *   searchKeys={['name', 'email']}
 *   onRowClick={(user) => console.log('Clicked:', user)}
 * />
 */
