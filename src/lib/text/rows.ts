/**
 * Normalizes line endings to Unix format (\n) and removes null characters
 */
export function normaliseNewlines(s: string): string {
  return s.replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
}

/**
 * Counts the number of rows (lines) in text
 */
export function countRows(s: string): number {
  const normalized = normaliseNewlines(s);
  return normalized.split('\n').length;
}

/**
 * Clamps text to a maximum number of rows
 */
export function clampRows(
  s: string, 
  maxRows?: number
): { 
  text: string; 
  rows: number; 
  truncated: boolean;
  originalRows: number;
} {
  const norm = normaliseNewlines(s);
  const parts = norm.split('\n');
  const originalRows = parts.length;
  
  if (!maxRows || maxRows <= 0) {
    return { 
      text: norm, 
      rows: originalRows, 
      truncated: false,
      originalRows 
    };
  }
  
  if (originalRows <= maxRows) {
    return { 
      text: norm, 
      rows: originalRows, 
      truncated: false,
      originalRows 
    };
  }
  
  return { 
    text: parts.slice(0, maxRows).join('\n'), 
    rows: maxRows, 
    truncated: true,
    originalRows
  };
}

/**
 * Validates if text meets row constraints
 */
export function validateRows(
  text: string,
  maxRows?: number,
  minRows?: number
): {
  valid: boolean;
  error?: string;
  rows: number;
} {
  const normalized = normaliseNewlines(text);
  const rows = normalized.split('\n').length;
  
  if (minRows !== undefined && rows < minRows) {
    return {
      valid: false,
      error: `Minimum ${minRows} rows required (current: ${rows})`,
      rows
    };
  }
  
  if (maxRows !== undefined && rows > maxRows) {
    return {
      valid: false,
      error: `Maximum ${maxRows} rows allowed (current: ${rows})`,
      rows
    };
  }
  
  return { valid: true, rows };
}

/**
 * Checks if adding a line break would exceed max rows
 * Used for preventing Enter key when at limit
 */
export function wouldExceedMaxRows(
  currentText: string,
  selectionStart: number,
  selectionEnd: number,
  maxRows: number
): boolean {
  const normalized = normaliseNewlines(currentText);
  const beforeSelection = normalized.slice(0, selectionStart);
  const afterSelection = normalized.slice(selectionEnd);
  const newText = beforeSelection + '\n' + afterSelection;
  const newRows = newText.split('\n').length;
  
  return newRows > maxRows;
}