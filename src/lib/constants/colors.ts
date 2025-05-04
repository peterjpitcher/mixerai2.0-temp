/**
 * MixerAI 2.0 Color System
 * 
 * This file defines the color palette used throughout the application.
 * Use these color tokens to maintain a consistent look and feel.
 */

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: '#0066CC', // Primary blue for main navigation
    light: '#4D94DB',
    dark: '#004C99',
    50: '#E6F0FA',
    100: '#CCE0F5',
    200: '#99C2EB',
    300: '#66A3E0',
    400: '#3385D6',
    500: '#0066CC', // Base blue
    600: '#0052A3',
    700: '#003D7A',
    800: '#002952',
    900: '#001429',
  },
  
  // Secondary/accent color
  accent: {
    DEFAULT: '#CC3333', // Red accent for icons/actions
    light: '#E66666',
    dark: '#992626',
    50: '#FAEBEB',
    100: '#F5D6D6',
    200: '#EBADAD',
    300: '#E08585',
    400: '#D65C5C',
    500: '#CC3333', // Base red
    600: '#A32929',
    700: '#7A1F1F',
    800: '#521414',
    900: '#290A0A',
  },
  
  // UI neutrals
  neutral: {
    50: '#F5F7FA',  
    100: '#E4E7EB',
    200: '#CBD2D9',
    300: '#9AA5B1',
    400: '#7B8794',
    500: '#616E7C',
    600: '#52606D',
    700: '#3E4C59',
    800: '#323F4B',
    900: '#1F2933',
  },
  
  // Semantic colors
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#3B82F6',
};

// Named colors for specific UI elements
export const uiColors = {
  topNavigation: colors.primary.DEFAULT,
  sideNavigation: colors.primary[50],
  appBackground: colors.neutral[50],
  
  // Text colors
  navText: '#FFFFFF',
  accentText: colors.accent.DEFAULT,
  primaryText: colors.neutral[900],
  secondaryText: colors.neutral[500],
  
  // Border colors
  border: colors.neutral[200],
  borderDark: colors.neutral[300],
  
  // Status colors
  statusSuccess: colors.success,
  statusWarning: colors.warning,
  statusError: colors.error,
  statusInfo: colors.info,
};

// Helper function to generate rgba values
export function rgba(hex: string, alpha: number) {
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export default colors; 