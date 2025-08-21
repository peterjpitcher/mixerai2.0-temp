import { Segmenter } from '@/lib/utils/text-segmenter';

export interface FieldConstraints {
  max_length?: number;
  min_length?: number;
  max_rows?: number;
  format?: string; // 'email', 'url', 'phone', etc.
  pattern?: string; // regex pattern
  examples?: string[];
}

export interface TemplateField {
  name: string;
  type: 'short_text' | 'long_text' | 'number' | 'email' | 'url';
  config?: FieldConstraints;
}

/**
 * Builds a constraint-aware prompt for AI generation
 */
export function buildConstrainedPrompt(
  field: TemplateField,
  context: Record<string, any>,
  attemptNumber: number = 0
): string {
  const parts: string[] = [`Generate content for field: ${field.name}`];

  // Add type-specific instructions
  switch (field.type) {
    case 'short_text':
      parts.push('Provide a brief, concise text.');
      break;
    case 'long_text':
      parts.push('Provide detailed text content.');
      break;
    case 'number':
      parts.push('Provide a numeric value only.');
      break;
    case 'email':
      parts.push('Provide a valid email address.');
      break;
    case 'url':
      parts.push('Provide a valid URL starting with http:// or https://.');
      break;
  }

  // Add constraints with emphasis
  if (field.config?.max_length) {
    parts.push(`**CRITICAL CONSTRAINT**: Maximum ${field.config.max_length} characters.`);
    parts.push(`The response MUST NOT exceed ${field.config.max_length} characters under any circumstances.`);
    
    // Stronger emphasis on retry
    if (attemptNumber > 0) {
      parts.push(`PREVIOUS ATTEMPT FAILED: Response was too long.`);
      parts.push(`Generate EXACTLY ${field.config.max_length} characters or less. This is mandatory.`);
    }
  }

  if (field.config?.min_length) {
    parts.push(`Minimum ${field.config.min_length} characters required.`);
  }

  if (field.config?.max_rows) {
    parts.push(`Maximum ${field.config.max_rows} lines/rows.`);
    parts.push('Do not include more line breaks than specified.');
  }

  // Format constraints
  if (field.config?.format) {
    switch (field.config.format) {
      case 'email':
        parts.push('Format: Valid email address (e.g., user@example.com)');
        break;
      case 'url':
        parts.push('Format: Valid URL (e.g., https://example.com)');
        break;
      case 'phone':
        parts.push('Format: Valid phone number with country code');
        break;
      default:
        parts.push(`Format: ${field.config.format}`);
    }
  }

  // Pattern constraint
  if (field.config?.pattern) {
    parts.push(`**Must match pattern**: ${field.config.pattern}`);
    if (attemptNumber > 0) {
      parts.push(`Ensure the output matches the regex pattern exactly.`);
    }
  }

  // Examples
  if (field.config?.examples && field.config.examples.length > 0) {
    parts.push(`Examples of valid values: ${field.config.examples.join(', ')}`);
  }

  // Add context
  if (context && Object.keys(context).length > 0) {
    parts.push(`Context: ${JSON.stringify(context)}`);
  }

  return parts.join('\n');
}

/**
 * Calculate appropriate max_tokens based on max_length constraint
 * Rough approximation: 1 token ≈ 3-4 characters for English
 */
export function calculateMaxTokens(maxLength?: number): number | undefined {
  if (!maxLength) return undefined;
  
  // Conservative estimate: 1 token = 3 characters
  // Add small buffer for safety
  return Math.ceil(maxLength / 3) + 5;
}

/**
 * Process and validate AI response against field constraints
 */
export function processAIResponse(
  response: string,
  field: TemplateField
): { value: string; warnings: string[]; requiresRegeneration: boolean } {
  let processed = response.trim();
  const warnings: string[] = [];

  // Enforce max_length with grapheme-safe truncation
  if (field.config?.max_length && processed.length > field.config.max_length) {
    warnings.push(`AI response exceeded max length (${processed.length} > ${field.config.max_length})`);
    
    // Use grapheme segmenter for safe truncation
    const segmenter = new Segmenter();
    processed = segmenter.truncate(processed, field.config.max_length);
  }

  // Enforce max_rows
  if (field.config?.max_rows) {
    const lines = processed.split('\n');
    if (lines.length > field.config.max_rows) {
      warnings.push(`AI response exceeded max rows (${lines.length} > ${field.config.max_rows})`);
      processed = lines.slice(0, field.config.max_rows).join('\n');
    }
  }

  // Validate min_length
  if (field.config?.min_length && processed.length < field.config.min_length) {
    warnings.push(`AI response too short (${processed.length} < ${field.config.min_length})`);
  }

  // Validate format
  if (field.config?.format) {
    const isValid = validateFormat(processed, field.config.format);
    if (!isValid) {
      warnings.push(`AI response doesn't match required format: ${field.config.format}`);
    }
  }

  // Validate pattern
  if (field.config?.pattern) {
    try {
      const regex = new RegExp(field.config.pattern);
      if (!regex.test(processed)) {
        warnings.push(`AI response doesn't match required pattern: ${field.config.pattern}`);
      }
    } catch (e) {
      warnings.push(`Invalid regex pattern: ${field.config.pattern}`);
    }
  }

  // Determine if regeneration is needed
  const criticalErrors = warnings.some(w => 
    w.includes('pattern') || 
    w.includes('format') ||
    w.includes('too short')
  );

  return {
    value: processed,
    warnings,
    requiresRegeneration: criticalErrors
  };
}

/**
 * Validate value against known formats
 */
function validateFormat(value: string, format: string): boolean {
  switch (format) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'url':
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    case 'phone':
      return /^\+?[\d\s\-\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 10;
    default:
      return true;
  }
}

/**
 * Generate content with constraints and retry logic
 */
export async function generateConstrainedContent(
  field: TemplateField,
  context: Record<string, any>,
  callAI: (prompt: string, options?: any) => Promise<string>,
  maxRetries: number = 3
): Promise<{ value: string; attempts: number; warnings: string[] }> {
  let lastResponse = '';
  let allWarnings: string[] = [];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = buildConstrainedPrompt(field, context, attempt);
    
    // Configure AI options
    const aiOptions = {
      max_tokens: calculateMaxTokens(field.config?.max_length),
      temperature: 0.2, // Low temperature for constrained generation
    };
    
    try {
      const response = await callAI(prompt, aiOptions);
      lastResponse = response;
      
      const processed = processAIResponse(response, field);
      allWarnings = [...allWarnings, ...processed.warnings];
      
      if (!processed.requiresRegeneration) {
        return {
          value: processed.value,
          attempts: attempt + 1,
          warnings: processed.warnings
        };
      }
      
      console.warn(`AI generation attempt ${attempt + 1} failed constraints:`, processed.warnings);
    } catch (error) {
      console.error(`AI generation attempt ${attempt + 1} error:`, error);
      allWarnings.push(`Generation attempt ${attempt + 1} failed: ${error}`);
    }
  }
  
  // Final fallback: return truncated version of last attempt
  const finalProcessed = processAIResponse(lastResponse, field);
  return {
    value: finalProcessed.value,
    attempts: maxRetries,
    warnings: [...allWarnings, 'Max retries reached, using best effort result']
  };
}