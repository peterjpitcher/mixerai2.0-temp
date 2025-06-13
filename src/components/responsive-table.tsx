'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Column<T = Record<string, unknown>> {
  header: string;
  accessorKey: string;
  cell?: (value: unknown, row: T) => React.ReactNode;
}

interface ResponsiveTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  className?: string;
}

export function ResponsiveTable<T = Record<string, unknown>>({ data, columns, className }: ResponsiveTableProps<T>) {
  return (
    <div className={cn('w-full overflow-hidden', className)}>
      {/* Desktop view */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th
                  key={column.accessorKey}
                  className="text-left p-3 font-medium text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {columns.map((column) => (
                  <td key={column.accessorKey} className="p-3">
                    {column.cell
                      ? column.cell(row[column.accessorKey], row)
                      : row[column.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {data.map((row, rowIndex) => (
          <div key={rowIndex} className="bg-card rounded-lg border p-3 space-y-2">
            {columns.map((column) => (
              <div key={column.accessorKey} className="flex justify-between">
                <span className="font-medium text-sm text-muted-foreground">{column.header}</span>
                <div className="text-sm">
                  {column.cell
                    ? column.cell(row[column.accessorKey], row)
                    : row[column.accessorKey]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 