"use client";

import * as React from "react";
import { X } from "lucide-react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * ToastProvider component from Radix UI.
 * Provides context for the toast components.
 */
const ToastProvider = ToastPrimitives.Provider;

/**
 * ToastViewport component from Radix UI.
 * Defines the area where toasts will be rendered.
 */
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-popover text-popover-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success:
          "success group border-success/50 bg-success/10 text-success-foreground [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Toast component (Root).
 * The main container for an individual toast notification.
 * Supports variants like `default`, `destructive`, and `success`.
 */
const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

/**
 * ToastAction component.
 * An action button that can be included within a Toast.
 */
const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive group-[.success]:border-muted/40 group-[.success]:hover:border-success/30 group-[.success]:hover:bg-success group-[.success]:hover:text-success-foreground group-[.success]:focus:ring-success",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

/**
 * ToastClose component.
 * A button to dismiss the Toast.
 */
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-destructive-foreground/70 group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive group-[.success]:text-success-foreground/70 group-[.success]:hover:text-success-foreground group-[.success]:focus:ring-success",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

/**
 * ToastTitle component.
 * The title of the Toast notification.
 */
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

/**
 * ToastDescription component.
 * The main message content of the Toast notification.
 */
const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: VariantProps<typeof toastVariants>["variant"];
};

/**
 * ToastActionElement type for defining the action prop of a Toast.
 */
type ToastActionElement = React.ReactElement<typeof ToastAction>;

/**
 * Type for the global `toast` function.
 */
export type ToastFunction = (props: ToastProps) => void;

/**
 * Result type for the `useToast` hook.
 */
export interface UseToastResult {
  toast: ToastFunction;
}

// Global toast state and dispatcher (simplified custom store)
const toastStore = {
  toasts: [] as Array<ToastProps & { id: string }>,
  listeners: new Set<() => void>(),
  addToast(toastProps: ToastProps) {
    const id = crypto.randomUUID();
    this.toasts = [...this.toasts, { ...toastProps, id }];
    this.listeners.forEach((listener) => listener());
  },
  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
};

/**
 * Global `toast` function to display notifications.
 * @param props - The properties for the toast, including title, description, variant, and action.
 */
export function toast(props: ToastProps) {
  toastStore.addToast(props);
}

/**
 * `useToast` hook.
 * Provides access to the global `toast` function.
 */
export function useToast(): UseToastResult {
  return { toast };
}

/**
 * Toaster component.
 * Renders the list of active toasts using the global toastStore.
 * Manages adding and removing toasts from the display.
 */
export function Toaster() {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([]);

  React.useEffect(() => {
    const updateToasts = () => {
      setToasts([...toastStore.toasts]);
    };
    updateToasts();
    const unsubscribe = toastStore.subscribe(updateToasts);
    return unsubscribe;
  }, []);

  return (
    <ToastProvider>
      {toasts.map((toastProps) => (
        <Toast
          key={toastProps.id}
          variant={toastProps.variant}
          onOpenChange={(open) => {
            if (!open) toastStore.removeToast(toastProps.id!);
          }}
          {...toastProps}
        >
          <div className="grid gap-1">
            {toastProps.title && <ToastTitle>{toastProps.title}</ToastTitle>}
            {toastProps.description && (
              <ToastDescription>{toastProps.description}</ToastDescription>
            )}
          </div>
          {toastProps.action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
} 