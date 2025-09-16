export type JSONish = any;

export interface Cache {
  get<T = JSONish>(key: string): Promise<T | null>;
  set<T = JSONish>(key: string, value: T, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  mdel(prefix: string): Promise<void>;
}

