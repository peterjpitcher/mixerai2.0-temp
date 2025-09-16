import type { Cache } from './cache';

const store = new Map<string, { exp: number; val: unknown }>();

export const memoryCache: Cache = {
  async get<T>(key: string): Promise<T | null> {
    const e = store.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) {
      store.delete(key);
      return null;
    }
    return e.val as T;
  },
  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    store.set(key, { exp: Date.now() + ttlSec * 1000, val: value });
  },
  async del(key: string): Promise<void> {
    store.delete(key);
  },
  async mdel(prefix: string): Promise<void> {
    for (const k of Array.from(store.keys())) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  },
};

