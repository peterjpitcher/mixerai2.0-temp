import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './use-debounce';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  save: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  onError,
  onSuccess
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const lastSavedDataRef = useRef<T>(data);
  const saveInProgressRef = useRef(false);
  
  // Debounced data for auto-save
  const debouncedData = useDebounce(data, debounceMs);
  
  // Manual save function
  const save = useCallback(async () => {
    if (!enabled || saveInProgressRef.current) return;
    
    saveInProgressRef.current = true;
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(data);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = data;
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [data, enabled, onSave, onSuccess, onError]);
  
  // Auto-save effect
  useEffect(() => {
    if (!enabled) return;
    
    // Check if data has changed
    const hasChanged = JSON.stringify(debouncedData) !== JSON.stringify(lastSavedDataRef.current);
    
    if (hasChanged && !saveInProgressRef.current) {
      setHasUnsavedChanges(true);
      save();
    }
  }, [debouncedData, enabled, save]);
  
  // Update hasUnsavedChanges when data changes
  useEffect(() => {
    const hasChanged = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
    setHasUnsavedChanges(hasChanged);
  }, [data]);
  
  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !saveInProgressRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  return {
    isSaving,
    lastSaved,
    error,
    save,
    hasUnsavedChanges
  };
}