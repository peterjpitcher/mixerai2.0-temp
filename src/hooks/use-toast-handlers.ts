import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Standard toast messages for common operations
 */
const TOAST_MESSAGES = {
  // Success messages
  created: (resource: string) => `${resource} created successfully`,
  updated: (resource: string) => `${resource} updated successfully`,
  deleted: (resource: string) => `${resource} deleted successfully`,
  saved: (resource: string) => `${resource} saved successfully`,
  published: (resource: string) => `${resource} published successfully`,
  archived: (resource: string) => `${resource} archived successfully`,
  restored: (resource: string) => `${resource} restored successfully`,
  copied: (resource: string) => `${resource} copied to clipboard`,
  uploaded: (resource: string) => `${resource} uploaded successfully`,
  
  // Error messages
  createFailed: (resource: string) => `Failed to create ${resource}`,
  updateFailed: (resource: string) => `Failed to update ${resource}`,
  deleteFailed: (resource: string) => `Failed to delete ${resource}`,
  saveFailed: (resource: string) => `Failed to save ${resource}`,
  publishFailed: (resource: string) => `Failed to publish ${resource}`,
  archiveFailed: (resource: string) => `Failed to archive ${resource}`,
  restoreFailed: (resource: string) => `Failed to restore ${resource}`,
  uploadFailed: (resource: string) => `Failed to upload ${resource}`,
  loadFailed: (resource: string) => `Failed to load ${resource}`,
  
  // Generic messages
  operationSuccess: 'Operation completed successfully',
  operationFailed: 'Operation failed',
  networkError: 'Network error. Please check your connection.',
  validationError: 'Please check your input and try again.',
  permissionError: 'You do not have permission to perform this action.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  rateLimitError: 'Too many requests. Please try again later.',
};

/**
 * Hook for standardized toast notifications
 * 
 * @example
 * ```tsx
 * const toast = useToastHandlers();
 * 
 * // Success
 * toast.success.created('Brand');
 * 
 * // Error
 * toast.error.updateFailed('Product');
 * 
 * // Custom
 * toast.custom.success('Custom success message');
 * ```
 */
export function useToastHandlers() {
  // Success handlers
  const created = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.created(resource));
  }, []);
  
  const updated = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.updated(resource));
  }, []);
  
  const deleted = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.deleted(resource));
  }, []);
  
  const saved = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.saved(resource));
  }, []);
  
  const published = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.published(resource));
  }, []);
  
  const archived = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.archived(resource));
  }, []);
  
  const restored = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.restored(resource));
  }, []);
  
  const copied = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.copied(resource));
  }, []);
  
  const uploaded = useCallback((resource: string) => {
    toast.success(TOAST_MESSAGES.uploaded(resource));
  }, []);
  
  // Error handlers
  const createFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.createFailed(resource);
    toast.error(message);
  }, []);
  
  const updateFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.updateFailed(resource);
    toast.error(message);
  }, []);
  
  const deleteFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.deleteFailed(resource);
    toast.error(message);
  }, []);
  
  const saveFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.saveFailed(resource);
    toast.error(message);
  }, []);
  
  const publishFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.publishFailed(resource);
    toast.error(message);
  }, []);
  
  const archiveFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.archiveFailed(resource);
    toast.error(message);
  }, []);
  
  const restoreFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.restoreFailed(resource);
    toast.error(message);
  }, []);
  
  const uploadFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.uploadFailed(resource);
    toast.error(message);
  }, []);
  
  const loadFailed = useCallback((resource: string, error?: Error) => {
    const message = error?.message || TOAST_MESSAGES.loadFailed(resource);
    toast.error(message);
  }, []);
  
  // Common error handlers
  const networkError = useCallback(() => {
    toast.error(TOAST_MESSAGES.networkError);
  }, []);
  
  const validationError = useCallback((message?: string) => {
    toast.error(message || TOAST_MESSAGES.validationError);
  }, []);
  
  const permissionError = useCallback(() => {
    toast.error(TOAST_MESSAGES.permissionError);
  }, []);
  
  const sessionExpired = useCallback(() => {
    toast.error(TOAST_MESSAGES.sessionExpired);
  }, []);
  
  const rateLimitError = useCallback(() => {
    toast.error(TOAST_MESSAGES.rateLimitError);
  }, []);
  
  // Custom handlers
  const customSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);
  
  const customError = useCallback((message: string) => {
    toast.error(message);
  }, []);
  
  const customInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);
  
  const customWarning = useCallback((message: string) => {
    toast.warning(message);
  }, []);
  
  const promise = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  }, []);
  
  return {
    success: {
      created,
      updated,
      deleted,
      saved,
      published,
      archived,
      restored,
      copied,
      uploaded,
    },
    error: {
      createFailed,
      updateFailed,
      deleteFailed,
      saveFailed,
      publishFailed,
      archiveFailed,
      restoreFailed,
      uploadFailed,
      loadFailed,
      networkError,
      validationError,
      permissionError,
      sessionExpired,
      rateLimitError,
    },
    custom: {
      success: customSuccess,
      error: customError,
      info: customInfo,
      warning: customWarning,
      promise,
    },
  };
}

/**
 * Parse API error response and show appropriate toast
 */
export function handleApiErrorToast(error: unknown, fallback: string = 'An error occurred') {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      toast.error(TOAST_MESSAGES.networkError);
    } else if (message.includes('unauthorized') || message.includes('session')) {
      toast.error(TOAST_MESSAGES.sessionExpired);
    } else if (message.includes('permission') || message.includes('forbidden')) {
      toast.error(TOAST_MESSAGES.permissionError);
    } else if (message.includes('rate limit') || message.includes('too many')) {
      toast.error(TOAST_MESSAGES.rateLimitError);
    } else if (message.includes('validation') || message.includes('invalid')) {
      toast.error(TOAST_MESSAGES.validationError);
    } else {
      toast.error(error.message || fallback);
    }
  } else {
    toast.error(fallback);
  }
}