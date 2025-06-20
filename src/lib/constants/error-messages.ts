/**
 * Standardized error messages for consistent user experience
 * All messages should be user-friendly and provide actionable next steps
 */

export const ERROR_MESSAGES = {
  // Network & Connection
  NETWORK_ERROR: 'Connection failed. Please check your internet and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'Please sign in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  
  // Data & Validation
  INVALID_INPUT: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  
  // CRUD Operations
  SAVE_FAILED: 'Unable to save changes. Please try again.',
  UPDATE_FAILED: 'Unable to update. Please try again.',
  DELETE_FAILED: 'Unable to delete. Please try again.',
  LOAD_FAILED: 'Unable to load data. Please refresh and try again.',
  
  // Not Found
  NOT_FOUND: 'The requested item could not be found.',
  PAGE_NOT_FOUND: "This page doesn't exist. Let's get you back on track.",
  BRAND_NOT_FOUND: 'Brand not found. It may have been deleted.',
  CONTENT_NOT_FOUND: 'Content not found. It may have been deleted.',
  USER_NOT_FOUND: 'User not found.',
  
  // AI & Generation
  AI_GENERATION_FAILED: 'Content generation failed. Please try again.',
  AI_SERVICE_UNAVAILABLE: 'AI service is temporarily unavailable. Please try again later.',
  
  // File Operations
  FILE_UPLOAD_FAILED: 'File upload failed. Please check the file and try again.',
  FILE_TOO_LARGE: 'File is too large. Please upload a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
  
  // Workflow
  WORKFLOW_ACTION_FAILED: 'Workflow action failed. Please try again.',
  INVALID_WORKFLOW_STATE: 'Invalid workflow state. Please refresh and try again.',
  
  // General
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  FORM_SUBMISSION_FAILED: 'Failed to submit form. Please check your input and try again.',
  OPERATION_CANCELLED: 'Operation cancelled.',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Get a standardized error message with optional custom details
 */
export function getErrorMessage(
  key: ErrorMessageKey, 
  customDetails?: string
): string {
  const baseMessage = ERROR_MESSAGES[key];
  return customDetails ? `${baseMessage} ${customDetails}` : baseMessage;
}

/**
 * Format API error responses consistently
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('Network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return ERROR_MESSAGES.PERMISSION_DENIED;
    }
    if (error.message.includes('404') || error.message.includes('Not found')) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    if (error.message.includes('500') || error.message.includes('Internal')) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    
    // Return the error message if it seems user-friendly
    if (error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message;
    }
  }
  
  return ERROR_MESSAGES.GENERIC_ERROR;
}