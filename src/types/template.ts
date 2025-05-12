// Proposed content for src/types/template.ts

export type FieldType = 
  | 'shortText' 
  | 'longText' 
  | 'richText' // Used as an output type in FieldDesigner, and input in TemplateForm
  | 'select' 
  | 'number' 
  | 'date' 
  | 'tags' 
  | 'url'
  | 'fileUpload' // Input only
  | 'plainText'  // Output only
  | 'html';      // Output only

// Option interfaces for each field type
export interface ShortTextOptions {
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}

export interface LongTextOptions {
  minWords?: number;
  maxWords?: number;
  placeholder?: string;
}

export interface RichTextOptions { // May not need specific options, but included for structure
  placeholder?: string;
}

export interface SelectOptions {
  choices?: string[];
  allowMultiple?: boolean; // Example, if needed
}

export interface NumberOptions {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface DateOptions {
  disablePast?: boolean;
  disableFuture?: boolean;
}

export interface TagsOptions {
  maxTags?: number;
  placeholder?: string; // e.g., "Enter tags separated by commas"
}

export interface UrlOptions {
  placeholder?: string;
}

export interface FileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[]; // e.g., ['image/jpeg', 'application/pdf']
}

export interface PlainTextOutputOptions { // For output fields
  maxLength?: number;
}

export interface HtmlOutputOptions { // For output fields
  // No specific options typically, content is raw HTML
}


// Base Field interface
interface BaseField {
  id: string;         // Unique ID for the field
  name: string;       // Display name of the field
  required: boolean;
  // AI features common to input/output, but specific toggles might differ
  aiPrompt?: string;   // Custom prompt for AI assistance
}

// Discriminated union for InputField options
export type InputFieldOptionType =
  | ({ type: 'shortText'; options?: ShortTextOptions })
  | ({ type: 'longText'; options?: LongTextOptions })
  | ({ type: 'richText'; options?: RichTextOptions }) // If richText is an input type
  | ({ type: 'select'; options?: SelectOptions })
  | ({ type: 'number'; options?: NumberOptions })
  | ({ type: 'date'; options?: DateOptions })
  | ({ type: 'tags'; options?: TagsOptions })
  | ({ type: 'url'; options?: UrlOptions })
  | ({ type: 'fileUpload'; options?: FileUploadOptions });

export interface InputField extends BaseField {
  type: Extract<FieldType, 'shortText' | 'longText' | 'richText' | 'select' | 'number' | 'date' | 'tags' | 'url' | 'fileUpload'>;
  options?: InputFieldOptionType['options'];
  aiSuggester?: boolean; // Specific to input fields
}

// Discriminated union for OutputField options
export type OutputFieldOptionType =
  | ({ type: 'plainText'; options?: PlainTextOutputOptions })
  | ({ type: 'richText'; options?: RichTextOptions }) // RichText often an output
  | ({ type: 'html'; options?: HtmlOutputOptions });
  // Add other output-specific types if they emerge

export interface OutputField extends BaseField {
  type: Extract<FieldType, 'plainText' | 'richText' | 'html'>; // Could expand if other output types are needed
  options?: OutputFieldOptionType['options'];
  aiAutoComplete?: boolean; // Specific to output fields
  useBrandIdentity?: boolean;
  useToneOfVoice?: boolean;
  useGuardrails?: boolean;
}

// A more generic Field type if needed, though distinguishing Input/Output is better
export type GenericField = InputField | OutputField;

// For the 'fields' property in ContentTemplate
export interface TemplateFields {
  inputFields: InputField[];
  outputFields: OutputField[];
}

// For the main Content Template structure
export interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  fields: TemplateFields; // Stored as JSON in DB, parsed into this structure
  created_at: string | null;
  created_by: string | null; // user id
  updated_at: string | null;
} 