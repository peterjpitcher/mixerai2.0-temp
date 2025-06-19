import { format } from 'date-fns';

/**
 * Format a date according to the UI standards: "dd MMMM yyyy"
 * Example: "21 May 2024"
 * 
 * @param date - The date to format (string or Date object)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMMM yyyy');
}

/**
 * Format a date with time according to the UI standards
 * Example: "21 May 2024, 14:30"
 * 
 * @param date - The date to format (string or Date object)
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMMM yyyy, HH:mm');
}