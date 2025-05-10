import { toast as toastPrimitive, type ToastActionElement } from '@/components/toast';

export type ToastProps = {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  function toast(props: ToastProps) {
    toastPrimitive(props);
  }

  return { toast };
} 