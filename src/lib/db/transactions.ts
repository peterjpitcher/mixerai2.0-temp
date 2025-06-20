import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Utility for handling database transactions in Supabase
 * Since Supabase doesn't directly support client-side transactions,
 * we use RPC calls to database functions that handle transactions
 */

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a transactional operation via RPC
 * The RPC function must be defined in the database with proper transaction handling
 */
export async function executeTransaction<T = any>(
  supabase: SupabaseClient<Database>,
  rpcName: string,
  params: Record<string, any>
): Promise<TransactionResult<T>> {
  try {
    const { data, error } = await (supabase.rpc as any)(rpcName, params);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data: data as T
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed'
    };
  }
}

/**
 * Helper to create a compensating transaction for rollback scenarios
 * Used when operations span multiple services (e.g., database + email)
 */
export class CompensatingTransaction {
  private rollbackActions: Array<() => Promise<void>> = [];
  
  /**
   * Add a rollback action to be executed if the transaction fails
   */
  addRollback(action: () => Promise<void>) {
    this.rollbackActions.push(action);
  }
  
  /**
   * Execute all rollback actions in reverse order
   */
  async rollback() {
    // Execute rollbacks in reverse order (LIFO)
    const reversedActions = [...this.rollbackActions].reverse();
    
    for (const action of reversedActions) {
      try {
        await action();
      } catch (error) {
        // Log rollback errors but continue with other rollbacks
        console.error('Rollback action failed:', error);
      }
    }
  }
  
  /**
   * Clear all rollback actions (call after successful completion)
   */
  clear() {
    this.rollbackActions = [];
  }
}

/**
 * Batch operations helper for operations that should succeed or fail together
 */
export async function executeBatchOperation<T = unknown>(
  operations: Array<() => Promise<any>>
): Promise<TransactionResult<T[]>> {
  const results: T[] = [];
  const completed: number[] = [];
  
  try {
    for (let i = 0; i < operations.length; i++) {
      const result = await operations[i]();
      results.push(result);
      completed.push(i);
    }
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    // If any operation fails, we note which ones completed
    // This information can be used for manual cleanup if needed
    return {
      success: false,
      error: `Batch operation failed at step ${completed.length + 1} of ${operations.length}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    };
  }
}

/**
 * Create an idempotent operation wrapper
 * Prevents duplicate operations by checking for existing records
 */
export function makeIdempotent<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: T,
  checkExists: (...args: Parameters<T>) => Promise<boolean>
): T {
  return (async (...args: Parameters<T>) => {
    const exists = await checkExists(...args);
    if (exists) {
      return { success: true, data: null, skipped: true };
    }
    return operation(...args);
  }) as T;
}