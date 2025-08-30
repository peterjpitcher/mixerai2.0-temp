import { z } from 'zod';

// Schema for Output Field with explicit boolean defaults
export const OutputFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  required: z.boolean().default(false),
  options: z.record(z.any()).optional(),
  aiPrompt: z.string().optional(),
  aiAutoComplete: z.boolean().default(true),
  useBrandIdentity: z.boolean().default(false),
  useToneOfVoice: z.boolean().default(false),
  useGuardrails: z.boolean().default(false),
  description: z.string().optional(),
  helpText: z.string().optional(),
});

// Schema for Input Field
export const InputFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  required: z.boolean().default(false),
  options: z.record(z.any()).optional(),
  aiPrompt: z.string().optional(),
  aiSuggester: z.boolean().default(false),
  description: z.string().optional(),
  helpText: z.string().optional(),
});

// Schema for template fields
export const TemplateFieldsSchema = z.object({
  inputFields: z.array(InputFieldSchema).default([]),
  outputFields: z.array(OutputFieldSchema).default([]),
});

// Parse and ensure defaults for output fields
export function parseOutputField(field: unknown) {
  return OutputFieldSchema.parse(field);
}

// Parse and ensure defaults for input fields
export function parseInputField(field: unknown) {
  return InputFieldSchema.parse(field);
}