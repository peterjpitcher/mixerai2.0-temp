'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useWindowVirtualization } from './virtualized-list';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  itemHeight: number | ((item: T, index: number) => number);
  className?: string;
  containerClassName?: string;
}

/**
 * Virtualized grid component for rendering large collections of cards/items
 * Uses window scrolling for better mobile performance
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 16,
  itemHeight,
  className,
  containerClassName,
}: VirtualizedGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = React.useState(1);

  // Calculate responsive column count
  React.useEffect(() => {
    const updateColumns = () => {
      if (typeof columns === 'number') {
        setColumnCount(columns);
        return;
      }

      const width = window.innerWidth;
      if (width >= 1280 && columns.xl) {
        setColumnCount(columns.xl);
      } else if (width >= 1024 && columns.lg) {
        setColumnCount(columns.lg);
      } else if (width >= 768 && columns.md) {
        setColumnCount(columns.md);
      } else if (columns.sm) {
        setColumnCount(columns.sm);
      } else {
        setColumnCount(1);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns]);

  // Group items into rows
  const rows = React.useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columnCount) {
      result.push(items.slice(i, i + columnCount));
    }
    return result;
  }, [items, columnCount]);

  // Calculate row heights
  const getRowHeight = React.useCallback(
    (row: T[], rowIndex: number) => {
      if (typeof itemHeight === 'number') {
        return itemHeight + gap;
      }
      
      // Find max height in row
      let maxHeight = 0;
      row.forEach((item, colIndex) => {
        const index = rowIndex * columnCount + colIndex;
        const height = itemHeight(item, index);
        maxHeight = Math.max(maxHeight, height);
      });
      
      return maxHeight + gap;
    },
    [itemHeight, columnCount, gap]
  );

  // Use window virtualization
  const visibleRange = useWindowVirtualization(rows, getRowHeight);

  // Calculate total height for spacer
  const totalHeight = React.useMemo(() => {
    return rows.reduce((sum, row, index) => sum + getRowHeight(row, index), 0);
  }, [rows, getRowHeight]);

  // Calculate offset for visible items
  const offsetTop = React.useMemo(() => {
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += getRowHeight(rows[i], i);
    }
    return offset;
  }, [visibleRange.start, rows, getRowHeight]);

  return (
    <div ref={containerRef} className={containerClassName}>
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible rows container */}
        <div
          style={{
            transform: `translateY(${offsetTop}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {rows.slice(visibleRange.start, visibleRange.end + 1).map((row, rowIndex) => {
            const actualRowIndex = visibleRange.start + rowIndex;
            
            return (
              <div
                key={actualRowIndex}
                className={cn(
                  'grid',
                  gap && `gap-${gap / 4}`,
                  className
                )}
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  marginBottom: rowIndex < rows.length - 1 ? gap : 0,
                }}
              >
                {row.map((item, colIndex) => {
                  const actualIndex = actualRowIndex * columnCount + colIndex;
                  return (
                    <div key={actualIndex}>
                      {renderItem(item, actualIndex)}
                    </div>
                  );
                })}
                {/* Empty cells for incomplete rows */}
                {row.length < columnCount &&
                  Array.from({ length: columnCount - row.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Infinite scroll virtualized grid
 */
interface InfiniteVirtualizedGridProps<T> extends VirtualizedGridProps<T> {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading?: boolean;
  loadingIndicator?: React.ReactNode;
}

export function InfiniteVirtualizedGrid<T>({
  loadMore,
  hasMore,
  isLoading,
  loadingIndicator,
  ...props
}: InfiniteVirtualizedGridProps<T>) {
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasMore || loadingRef.current || isLoading) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          try {
            await loadMore();
          } finally {
            loadingRef.current = false;
          }
        }
      },
      { rootMargin: '100px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  return (
    <>
      <VirtualizedGrid {...props} />
      {hasMore && (
        <div ref={sentinelRef} className="h-1" />
      )}
      {isLoading && loadingIndicator && (
        <div className="flex justify-center p-4">
          {loadingIndicator}
        </div>
      )}
    </>
  );
}

/**
 * Example usage:
 * 
 * interface Product {
 *   id: string;
 *   name: string;
 *   image: string;
 *   price: number;
 * }
 * 
 * <VirtualizedGrid
 *   items={products}
 *   renderItem={(product) => (
 *     <Card>
 *       <img src={product.image} alt={product.name} />
 *       <h3>{product.name}</h3>
 *       <p>${product.price}</p>
 *     </Card>
 *   )}
 *   columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
 *   itemHeight={300}
 *   gap={16}
 * />
 */