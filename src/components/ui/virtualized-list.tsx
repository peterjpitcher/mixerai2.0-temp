'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/lib/utils/performance';

interface VirtualizedListProps<T> {
  items: T[];
  height: number | string;
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

/**
 * Virtualized list component for rendering large datasets efficiently
 * Only renders visible items plus a buffer (overscan)
 */
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualizedListProps<T>) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Calculate item heights
  const getItemHeight = React.useCallback(
    (index: number) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(items[index], index);
      }
      return itemHeight;
    },
    [itemHeight, items]
  );

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = React.useMemo(() => {
    let total = 0;
    const positions: number[] = [];

    for (let i = 0; i < items.length; i++) {
      positions.push(total);
      total += getItemHeight(i);
    }

    return { totalHeight: total, itemPositions: positions };
  }, [items.length, getItemHeight]);

  // Calculate visible range
  const visibleRange = React.useMemo(() => {
    const start = Math.max(
      0,
      itemPositions.findIndex((pos) => pos + getItemHeight(itemPositions.indexOf(pos)) > scrollTop) - overscan
    );
    const end = Math.min(
      items.length - 1,
      itemPositions.findIndex((pos) => pos > scrollTop + containerHeight) + overscan
    );

    return { start, end: end === -1 ? items.length - 1 : end };
  }, [scrollTop, containerHeight, itemPositions, getItemHeight, items.length, overscan]);

  // Handle scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if end reached
    if (onEndReached) {
      const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onEndReached, endReachedThreshold]);

  // Update container height on resize
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Render visible items
  const visibleItems = React.useMemo(() => {
    const visibleElements: React.ReactNode[] = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const item = items[i];
      if (!item) continue;

      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        top: itemPositions[i],
        left: 0,
        right: 0,
        height: getItemHeight(i),
      };

      visibleElements.push(
        <div key={i} style={itemStyle}>
          {renderItem(item, i)}
        </div>
      );
    }

    return visibleElements;
  }, [visibleRange, items, itemPositions, getItemHeight, renderItem]);

  return (
    <div
      ref={scrollContainerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * Virtualized list with infinite scroll support
 */
interface InfiniteVirtualizedListProps<T> extends Omit<VirtualizedListProps<T>, 'onEndReached'> {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading?: boolean;
  loadingIndicator?: React.ReactNode;
}

export function InfiniteVirtualizedList<T>({
  loadMore,
  hasMore,
  isLoading,
  loadingIndicator,
  ...props
}: InfiniteVirtualizedListProps<T>) {
  const loadingRef = React.useRef(false);

  const handleEndReached = React.useCallback(async () => {
    if (!hasMore || loadingRef.current || isLoading) return;

    loadingRef.current = true;
    try {
      await loadMore();
    } finally {
      loadingRef.current = false;
    }
  }, [loadMore, hasMore, isLoading]);

  // Add loading indicator to items if loading
  const itemsWithLoader = React.useMemo(() => {
    if (isLoading && loadingIndicator) {
      return [...props.items, Symbol('loader') as any];
    }
    return props.items;
  }, [props.items, isLoading, loadingIndicator]);

  // Wrap render function to handle loader
  const renderItemWithLoader = React.useCallback(
    (item: T, index: number) => {
      if (index === itemsWithLoader.length - 1 && isLoading && loadingIndicator) {
        return loadingIndicator;
      }
      return props.renderItem(item, index);
    },
    [props.renderItem, itemsWithLoader.length, isLoading, loadingIndicator]
  );

  return (
    <VirtualizedList
      {...props}
      items={itemsWithLoader}
      renderItem={renderItemWithLoader}
      onEndReached={handleEndReached}
    />
  );
}

/**
 * Hook for window-based virtualization (full page lists)
 */
export function useWindowVirtualization<T>(
  items: T[],
  itemHeight: number | ((item: T, index: number) => number),
  options?: {
    overscan?: number;
    rootMargin?: string;
  }
) {
  const { overscan = 3, rootMargin = '100px' } = options || {};
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 10 });

  React.useEffect(() => {
    const calculateVisibleRange = () => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;

      let currentTop = 0;
      let start = 0;
      let end = items.length - 1;

      // Find start index
      for (let i = 0; i < items.length; i++) {
        const height = typeof itemHeight === 'function' ? itemHeight(items[i], i) : itemHeight;
        
        if (currentTop + height > scrollTop - overscan * height) {
          start = i;
          break;
        }
        currentTop += height;
      }

      // Find end index
      currentTop = 0;
      for (let i = 0; i < items.length; i++) {
        const height = typeof itemHeight === 'function' ? itemHeight(items[i], i) : itemHeight;
        
        if (currentTop > scrollTop + viewportHeight + overscan * height) {
          end = i;
          break;
        }
        currentTop += height;
      }

      setVisibleRange({ start: Math.max(0, start), end: Math.min(items.length - 1, end) });
    };

    calculateVisibleRange();

    const handleScroll = () => {
      requestAnimationFrame(calculateVisibleRange);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [items, itemHeight, overscan]);

  return visibleRange;
}