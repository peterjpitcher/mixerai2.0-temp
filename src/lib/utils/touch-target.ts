import { cn } from '@/lib/utils';

/**
 * Ensures interactive elements meet minimum 44x44px touch target size
 * as per WCAG 2.1 guidelines and mobile best practices
 */

export const touchTargetClasses = {
  // Standard touch-friendly button (44x44px minimum)
  button: 'min-h-[44px] min-w-[44px]',
  
  // Icon-only button (visual can be smaller but tap area is 44x44)
  iconButton: 'h-11 w-11 p-0 flex items-center justify-center',
  
  // Small button with proper touch target
  smallButton: 'min-h-[44px] px-3',
  
  // Dropdown menu trigger
  dropdownTrigger: 'h-11 w-11',
  
  // Table action button
  tableAction: 'h-11 w-11 -m-1.5', // Negative margin to maintain visual spacing
  
  // Close button (X)
  closeButton: 'h-11 w-11 p-2',
  
  // Badge with click action
  clickableBadge: 'min-h-[32px] px-3 py-1.5 cursor-pointer',
};

/**
 * Helper function to apply touch-friendly classes
 */
export function touchFriendly(type: keyof typeof touchTargetClasses, additionalClasses?: string) {
  return cn(touchTargetClasses[type], additionalClasses);
}

