// Types for content template fields structure

export interface TemplateField {
  id: string;
  name: string;
  type:
    | 'text'
    | 'textarea'
    | 'rich-text'
    | 'select'
    | 'multi-select'
    | 'number'
    | 'url'
    | 'date'
    | 'faq';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface TemplateInputField extends TemplateField {
  helpText?: string;
  defaultValue?: string | number | string[];
}

export interface TemplateOutputField extends TemplateField {
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  dependsOn?: string[]; // IDs of input fields this output depends on
}

export interface TemplateFields {
  inputFields: TemplateInputField[];
  outputFields: TemplateOutputField[];
  metadata?: {
    version?: string;
    created?: string;
    updated?: string;
  };
}

export interface ContentData {
  [fieldId: string]: unknown;
}
