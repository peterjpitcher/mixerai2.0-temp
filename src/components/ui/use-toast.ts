import { toast as sonnerToast } from 'sonner';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
};

export const toast = ({ title, description, variant = 'default' }: ToastProps) => {
  const toastFn = 
    variant === 'destructive' ? sonnerToast.error :
    variant === 'success' ? sonnerToast.success :
    sonnerToast;

  if (title && description) {
    toastFn(title, {
      description
    });
  } else if (title) {
    toastFn(title);
  }
}; 