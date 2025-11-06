import { z } from 'zod';

const INPUT_FIELD_TYPES = [
  'shortText',
  'longText',
  'richText',
  'select',
  'multiselect',
  'number',
  'date',
  'tags',
  'url',
  'slug',
  'fileUpload',
  'product-selector',
  'recipeUrl',
] as const;

const OUTPUT_FIELD_TYPES = [
  'plainText',
  'richText',
  'html',
  'image',
  'faq',
] as const;

// Schema for Output Field with explicit boolean defaults
const BaseOutputFieldSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.enum(OUTPUT_FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.record(z.any()).optional(),
    aiPrompt: z.string().optional(),
    aiAutoComplete: z.boolean().default(true),
    useBrandIdentity: z.boolean().default(false),
    useToneOfVoice: z.boolean().default(false),
    useGuardrails: z.boolean().default(false),
    description: z.string().optional(),
    helpText: z.string().optional(),
    minChars: z.number().int().positive().optional(),
    maxChars: z.number().int().positive().optional(),
    minWords: z.number().int().positive().optional(),
    maxWords: z.number().int().positive().optional(),
    maxTokens: z.number().int().positive().max(4000).optional(),
    allowedTags: z.array(z.string()).optional(),
  })
  .passthrough();

export const OutputFieldSchema = BaseOutputFieldSchema.superRefine((data, ctx) => {
    if (
      typeof data.minChars === 'number' &&
      typeof data.maxChars === 'number' &&
      data.minChars >= data.maxChars
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minChars'],
        message: 'Minimum character count must be less than maximum character count',
      });
    }
    if (
      typeof data.minWords === 'number' &&
      typeof data.maxWords === 'number' &&
      data.minWords >= data.maxWords
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minWords'],
        message: 'Minimum word count must be less than maximum word count',
      });
    }
  });

// Schema for Input Field
export const InputFieldSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.enum(INPUT_FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.record(z.any()).optional(),
    aiPrompt: z.string().optional(),
    aiSuggester: z.boolean().default(false),
    description: z.string().optional(),
    helpText: z.string().optional(),
  })
  .passthrough();

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
