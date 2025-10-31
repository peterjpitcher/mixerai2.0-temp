import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDebounce,
  useThrottle,
  useStableCallback,
  useIntersectionObserver,
  usePrevious,
  useIsMounted,
  useAsyncState,
  useMemoizedHandler,
  useDeepCompareEffect,
  useBatchedState,
} from '../performance';

// Mock timers for debounce and throttle tests
jest.useFakeTimers();

describe('Performance Utilities', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('useDebounce', () => {
    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated', delay: 500 });
      expect(result.current).toBe('initial'); // Still initial

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(result.current).toBe('initial'); // Still initial

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated'); // Now updated
    });

    it('should cancel previous debounce on new value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'first' } }
      );

      rerender({ value: 'second' });
      act(() => {
        jest.advanceTimersByTime(250);
      });

      rerender({ value: 'third' });
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(result.current).toBe('first'); // Still first

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(result.current).toBe('third'); // Skipped 'second'
    });
  });

  describe('useThrottle', () => {
    it('should throttle value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 500),
        { initialProps: { value: 1 } }
      );

      expect(result.current).toBe(1);

      // Rapid updates
      rerender({ value: 2 });
      rerender({ value: 3 });
      rerender({ value: 4 });

      expect(result.current).toBe(1); // Still throttled

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe(4); // Latest value after throttle
    });

    it('should immediately update on first change', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 1000),
        { initialProps: { value: 'start' } }
      );

      expect(result.current).toBe('start');

      // Wait to ensure clean slate
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      rerender({ value: 'immediate' });
      expect(result.current).toBe('immediate'); // Immediate update
    });
  });

  describe('useStableCallback', () => {
    it('should maintain stable reference', () => {
      let count = 0;
      const { result, rerender } = renderHook(() => {
        const callback = useStableCallback(() => {
          count++;
        });
        return callback;
      });

      const firstCallback = result.current;
      
      rerender();
      expect(result.current).toBe(firstCallback); // Same reference

      // Call should work
      act(() => {
        result.current();
      });
      expect(count).toBe(1);
    });

    it('should use latest callback implementation', () => {
      let value = 'initial';
      const { result, rerender } = renderHook(() => {
        return useStableCallback(() => value);
      });

      expect(result.current()).toBe('initial');

      value = 'updated';
      rerender();
      expect(result.current()).toBe('updated'); // Uses latest closure
    });
  });

  describe('useIntersectionObserver', () => {
    let mockObserver: jest.Mock;
    let observeMethod: jest.Mock;
    let unobserveMethod: jest.Mock;

    beforeEach(() => {
      observeMethod = jest.fn();
      unobserveMethod = jest.fn();
      mockObserver = jest.fn(() => ({
        observe: observeMethod,
        unobserve: unobserveMethod,
      }));
      
      global.IntersectionObserver = mockObserver as any;
    });

    it('should observe element intersection', () => {
      const ref = React.createRef<HTMLDivElement>();
      const { result } = renderHook(() => useIntersectionObserver(ref));

      expect(result.current).toBe(false);

      // Simulate ref being attached
      act(() => {
        (ref as any).current = document.createElement('div');
      });

      // Trigger observer callback
      const [[callback]] = mockObserver.mock.calls;
      act(() => {
        callback([{ isIntersecting: true }]);
      });

      expect(result.current).toBe(true);
    });

    it('should cleanup observer on unmount', () => {
      const ref = React.createRef<HTMLDivElement>();
      (ref as any).current = document.createElement('div');
      
      const { unmount } = renderHook(() => useIntersectionObserver(ref));

      expect(observeMethod).toHaveBeenCalled();
      
      unmount();
      expect(unobserveMethod).toHaveBeenCalled();
    });
  });

  describe('usePrevious', () => {
    it('should return previous value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 1 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 2 });
      expect(result.current).toBe(1);

      rerender({ value: 3 });
      expect(result.current).toBe(2);
    });
  });

  describe('useIsMounted', () => {
    it('should track mount state', () => {
      const { result, unmount } = renderHook(() => useIsMounted());

      expect(result.current()).toBe(true);

      unmount();
      expect(result.current()).toBe(false);
    });
  });

  describe('useAsyncState', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('should handle async operations', async () => {
      const asyncFunc = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncState(asyncFunc));

      expect(result.current.loading).toBe(true);
      expect(result.current.value).toBeUndefined();
      expect(result.current.error).toBeUndefined();

      await act(async () => {
        await waitFor(() => {
          expect(result.current.loading).toBe(false);
          expect(result.current.value).toBe('result');
        });
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      const asyncFunc = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsyncState(asyncFunc));

      await act(async () => {
        await waitFor(() => {
          expect(result.current.loading).toBe(false);
          expect(result.current.error).toBe(error);
        });
      });
    });

    it('should not execute immediately when immediate is false', () => {
      const asyncFunc = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncState(asyncFunc, false));

      expect(asyncFunc).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.execute();
      });

      expect(asyncFunc).toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useMemoizedHandler', () => {
    it('should memoize handler based on deps', () => {
      const handler = jest.fn();
      const { result, rerender } = renderHook(
        ({ deps }) => useMemoizedHandler(handler, deps),
        { initialProps: { deps: [1, 2] } }
      );

      const firstHandler = result.current;
      
      rerender({ deps: [1, 2] });
      expect(result.current).toBe(firstHandler); // Same deps, same handler

      rerender({ deps: [1, 3] });
      expect(result.current).not.toBe(firstHandler); // Different deps
    });
  });

  describe('useDeepCompareEffect', () => {
    it('should run effect when deep comparison changes', () => {
      const effect = jest.fn();
      const { rerender } = renderHook(
        ({ deps }) => useDeepCompareEffect(effect, deps),
        { initialProps: { deps: [{ a: 1 }] } }
      );

      expect(effect).toHaveBeenCalledTimes(1);

      // Same object structure, should not trigger
      rerender({ deps: [{ a: 1 }] });
      expect(effect).toHaveBeenCalledTimes(1);

      // Different value, should trigger
      rerender({ deps: [{ a: 2 }] });
      expect(effect).toHaveBeenCalledTimes(2);
    });
  });

  describe('useBatchedState', () => {
    it('should batch state updates', () => {
      const { result } = renderHook(() => useBatchedState({ count: 0, text: 'hello' }));

      act(() => {
        result.current[1]({ count: 1 });
        result.current[1]({ text: 'world' });
      });

      // Updates should be batched
      expect(result.current[0]).toEqual({ count: 0, text: 'hello' });

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current[0]).toEqual({ count: 1, text: 'world' });
    });
  });
});
