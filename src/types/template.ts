// This is a placeholder for the original content of src/types/template.ts
// The actual revert will be done by reading the original file state if possible
// For now, this tool call will effectively ask to restore the intended complex types.
// The key is to restore InputField/OutputField extending BaseField, 
// and their type/options being discriminated unions.

export type FieldType = 
  | 'shortText' 
  | 'longText' 
  | 'richText'
  | 'select' 
  | 'number' 
  | 'date' 
  | 'tags' 
  | 'url'
  | 'fileUpload'
  | 'plainText'
  | 'html'
  | 'image';

export interface ShortTextOptions { minLength?: number; maxLength?: number; placeholder?: string; }
export interface LongTextOptions { minWords?: number; maxWords?: number; placeholder?: string; }
export interface RichTextOptions { placeholder?: string; }
export interface SelectOptions { choices?: string[]; allowMultiple?: boolean; }
export interface NumberOptions { min?: number; max?: number; step?: number; placeholder?: string; }
export interface DateOptions { disablePast?: boolean; disableFuture?: boolean; }
export interface TagsOptions { maxTags?: number; placeholder?: string; }
export interface UrlOptions { placeholder?: string; }
export interface FileUploadOptions { maxSizeMB?: number; allowedTypes?: string[]; }
export interface PlainTextOutputOptions { maxLength?: number; }
export interface HtmlOutputOptions {}
export interface ImageOutputOptions {}

interface BaseField {
  id: string;
  name: string;
  type: FieldType; // Use the full FieldType again
  required: boolean;
  aiPrompt?: string;
}

export type InputFieldOptionType =
  | ({ type: 'shortText'; options?: ShortTextOptions })
  | ({ type: 'longText'; options?: LongTextOptions })
  | ({ type: 'richText'; options?: RichTextOptions })
  | ({ type: 'select'; options?: SelectOptions })
  | ({ type: 'number'; options?: NumberOptions })
  | ({ type: 'date'; options?: DateOptions })
  | ({ type: 'tags'; options?: TagsOptions })
  | ({ type: 'url'; options?: UrlOptions })
  | ({ type: 'fileUpload'; options?: FileUploadOptions });

export interface InputField extends BaseField {
  type: Extract<FieldType, 'shortText' | 'longText' | 'richText' | 'select' | 'number' | 'date' | 'tags' | 'url' | 'fileUpload'>;
  options?: InputFieldOptionType['options'];
  aiSuggester?: boolean;
}

export type OutputFieldOptionType =
  | ({ type: 'plainText'; options?: PlainTextOutputOptions })
  | ({ type: 'richText'; options?: RichTextOptions })
  | ({ type: 'html'; options?: HtmlOutputOptions })
  | ({ type: 'image'; options?: ImageOutputOptions });

export interface OutputField extends BaseField {
  type: Extract<FieldType, 'plainText' | 'richText' | 'html' | 'image'>;
  options?: OutputFieldOptionType['options'];
  aiAutoComplete?: boolean;
  useBrandIdentity?: boolean;
  useToneOfVoice?: boolean;
  useGuardrails?: boolean;
}

export type GenericField = InputField | OutputField;

export interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  inputFields?: InputField[];
  outputFields?: OutputField[];
  brand_id?: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
} 