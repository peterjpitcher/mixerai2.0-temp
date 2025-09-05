'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';
import { Info } from 'lucide-react';
import { ensureBooleanDefaults } from '@/lib/utils/object';
import { 
  FieldType as GlobalFieldType,
  GenericField as Field,
  InputField,
  OutputField,
  ShortTextOptions,
  LongTextOptions,
  RichTextOptions,
  SelectOptions,
  NumberOptions,
  DateOptions,
  TagsOptions,
  UrlOptions,
  FileUploadOptions,
  PlainTextOutputOptions,
  HtmlOutputOptions,
  ImageOutputOptions,
  ProductSelectorOptions,
  RecipeUrlOptions,
} from '@/types/template';
import { ProductSelectorOptionsComponent } from './product-selector-options';

// Type guards to ensure type safety
function isInputField(field: Field): field is InputField {
  const inputTypes = ['shortText', 'longText', 'richText', 'select', 'number', 'date', 'tags', 'url', 'fileUpload', 'product-selector', 'recipeUrl'];
  return inputTypes.includes(field.type);
}

function isOutputField(field: Field): field is OutputField {
  const outputTypes = ['plainText', 'richText', 'html', 'image'];
  return outputTypes.includes(field.type);
}

// Placeholder components for field options
const ShortTextOptionsComponent = ({ options, onChange }: { options: ShortTextOptions; onChange: (options: Partial<ShortTextOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="placeholder">Placeholder</Label>
      <Input
        id="placeholder"
        value={options.placeholder || ''}
        onChange={(e) => onChange({ placeholder: e.target.value })}
        placeholder="Enter placeholder text"
      />
    </div>
    <div>
      <Label htmlFor="maxLength">Max Length</Label>
      <Input
        id="maxLength"
        type="number"
        value={options.maxLength || ''}
        onChange={(e) => onChange({ maxLength: parseInt(e.target.value) || undefined })}
        placeholder="Maximum characters"
      />
    </div>
  </div>
);

const LongTextOptionsComponent = ({ options, onChange }: { options: LongTextOptions; onChange: (options: Partial<LongTextOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="placeholder">Placeholder</Label>
      <Textarea
        id="placeholder"
        value={options.placeholder || ''}
        onChange={(e) => onChange({ placeholder: e.target.value })}
        placeholder="Enter placeholder text"
      />
    </div>
    <div>
      <Label htmlFor="rows">Display Rows</Label>
      <Input
        id="rows"
        type="number"
        value={options.rows || ''}
        onChange={(e) => onChange({ rows: parseInt(e.target.value) || undefined })}
        placeholder="Initial height (rows)"
      />
    </div>
    <div>
      <Label htmlFor="maxRows">Max Rows <span className="text-xs text-muted-foreground">(Line limit)</span></Label>
      <Input
        id="maxRows"
        type="number"
        value={options.maxRows || ''}
        onChange={(e) => onChange({ maxRows: parseInt(e.target.value) || undefined })}
        placeholder="Maximum lines allowed"
      />
    </div>
  </div>
);

const RichTextOptionsComponent = ({ options, onChange }: { options: RichTextOptions; onChange: (options: Partial<RichTextOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="placeholder">Placeholder</Label>
      <Input
        id="placeholder"
        value={options.placeholder || ''}
        onChange={(e) => onChange({ placeholder: e.target.value })}
        placeholder="Enter placeholder text"
      />
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="allowImages"
        checked={options.allowImages || false}
        onCheckedChange={(checked) => onChange({ allowImages: !!checked })}
      />
      <Label htmlFor="allowImages">Allow Images</Label>
    </div>
  </div>
);

const SelectOptionsComponent = ({ options, onChange }: { options: SelectOptions; onChange: (options: Partial<SelectOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="choices">Choices (one per line)</Label>
      <Textarea
        id="choices"
        value={(options.choices || []).map(choice => choice.label).join('\n')}
        onChange={(e) => onChange({ choices: e.target.value.split('\n').filter(Boolean).map((label) => ({ label, value: label })) })}
        placeholder="Option 1\nOption 2\nOption 3"
        rows={5}
      />
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="multiple"
        checked={options.multiple || false}
        onCheckedChange={(checked) => onChange({ multiple: !!checked })}
      />
      <Label htmlFor="multiple">Allow Multiple Selection</Label>
    </div>
  </div>
);

const NumberOptionsComponent = ({ options, onChange }: { options: NumberOptions; onChange: (options: Partial<NumberOptions>) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="min">Min Value</Label>
        <Input
          id="min"
          type="number"
          value={options.min ?? ''}
          onChange={(e) => onChange({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
        />
      </div>
      <div>
        <Label htmlFor="max">Max Value</Label>
        <Input
          id="max"
          type="number"
          value={options.max ?? ''}
          onChange={(e) => onChange({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
        />
      </div>
    </div>
    <div>
      <Label htmlFor="step">Step</Label>
      <Input
        id="step"
        type="number"
        value={options.step ?? ''}
        onChange={(e) => onChange({ step: e.target.value ? parseFloat(e.target.value) : undefined })}
        placeholder="Step increment"
      />
    </div>
  </div>
);

const DateOptionsComponent = ({ options, onChange }: { options: DateOptions; onChange: (options: Partial<DateOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="format">Date Format</Label>
      <Select
        value={options.format || 'MM/DD/YYYY'}
        onValueChange={(value) => onChange({ format: value })}
      >
        <SelectTrigger id="format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="includeTime"
        checked={options.includeTime || false}
        onCheckedChange={(checked) => onChange({ includeTime: !!checked })}
      />
      <Label htmlFor="includeTime">Include Time</Label>
    </div>
  </div>
);

const TagsOptionsComponent = ({ options, onChange }: { options: TagsOptions; onChange: (options: Partial<TagsOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="maxTags">Max Tags</Label>
      <Input
        id="maxTags"
        type="number"
        value={options.maxTags || ''}
        onChange={(e) => onChange({ maxTags: parseInt(e.target.value) || undefined })}
        placeholder="Maximum number of tags"
      />
    </div>
    <div>
      <Label htmlFor="suggestions">Suggestions (one per line)</Label>
      <Textarea
        id="suggestions"
        value={(options.suggestions || []).join('\n')}
        onChange={(e) => onChange({ suggestions: e.target.value.split('\n').filter(Boolean) })}
        placeholder="Tag 1\nTag 2\nTag 3"
        rows={5}
      />
    </div>
  </div>
);

const UrlOptionsComponent = ({ options, onChange }: { options: UrlOptions; onChange: (options: Partial<UrlOptions>) => void }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="validateUrl"
        checked={options.validateUrl !== false}
        onCheckedChange={(checked) => onChange({ validateUrl: !!checked })}
      />
      <Label htmlFor="validateUrl">Validate URL Format</Label>
    </div>
    <div>
      <Label htmlFor="placeholder">Placeholder</Label>
      <Input
        id="placeholder"
        value={options.placeholder || ''}
        onChange={(e) => onChange({ placeholder: e.target.value })}
        placeholder="https://example.com"
      />
    </div>
  </div>
);

const FileUploadOptionsComponent = ({ options, onChange }: { options: FileUploadOptions; onChange: (options: Partial<FileUploadOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="acceptedTypes">Accepted File Types</Label>
      <Input
        id="acceptedTypes"
        value={options.acceptedTypes || ''}
        onChange={(e) => onChange({ acceptedTypes: e.target.value })}
        placeholder=".pdf,.doc,.docx"
      />
    </div>
    <div>
      <Label htmlFor="maxSize">Max File Size (MB)</Label>
      <Input
        id="maxSize"
        type="number"
        value={options.maxSize || ''}
        onChange={(e) => onChange({ maxSize: parseInt(e.target.value) || undefined })}
        placeholder="10"
      />
    </div>
  </div>
);

const RecipeUrlOptionsComponent = ({ options, onChange }: { options: RecipeUrlOptions; onChange: (options: Partial<RecipeUrlOptions>) => void }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="autoPopulateFields"
        checked={options.autoPopulateFields !== false}
        onCheckedChange={(checked) => onChange({ autoPopulateFields: !!checked })}
      />
      <Label htmlFor="autoPopulateFields">Auto-populate other fields with extracted data</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="extractImages"
        checked={options.extractImages || false}
        onCheckedChange={(checked) => onChange({ extractImages: !!checked })}
      />
      <Label htmlFor="extractImages">Extract recipe images</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id="includeNutrition"
        checked={options.includeNutrition || false}
        onCheckedChange={(checked) => onChange({ includeNutrition: !!checked })}
      />
      <Label htmlFor="includeNutrition">Include nutrition information</Label>
    </div>
    <div>
      <Label className="text-sm font-medium">Field Mapping</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Map extracted recipe data to other fields in your template
      </p>
      <div className="space-y-2 text-sm">
        <p className="text-xs italic">Field mapping configuration would be shown here once other fields are created.</p>
      </div>
    </div>
  </div>
);

const PlainTextOutputOptionsComponent = ({ options, onChange }: { options: PlainTextOutputOptions; onChange: (options: Partial<PlainTextOutputOptions>) => void }) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor="maxLength">Max Length</Label>
      <Input
        id="maxLength"
        type="number"
        value={options.maxLength || ''}
        onChange={(e) => onChange({ maxLength: parseInt(e.target.value) || undefined })}
        placeholder="Maximum characters"
      />
    </div>
  </div>
);

const HtmlOutputOptionsComponent = ({ options, onChange }: { options: HtmlOutputOptions; onChange: (options: Partial<HtmlOutputOptions>) => void }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="sanitize"
        checked={options.sanitize !== false}
        onCheckedChange={(checked) => onChange({ sanitize: !!checked })}
      />
      <Label htmlFor="sanitize">Sanitize HTML</Label>
    </div>
  </div>
);

const ImageOutputOptionsComponent = ({ options, onChange }: { options: ImageOutputOptions; onChange: (options: Partial<ImageOutputOptions>) => void }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="width">Width</Label>
        <Input
          id="width"
          type="number"
          value={options.width || ''}
          onChange={(e) => onChange({ width: parseInt(e.target.value) || undefined })}
          placeholder="800"
        />
      </div>
      <div>
        <Label htmlFor="height">Height</Label>
        <Input
          id="height"
          type="number"
          value={options.height || ''}
          onChange={(e) => onChange({ height: parseInt(e.target.value) || undefined })}
          placeholder="600"
        />
      </div>
    </div>
    <div>
      <Label htmlFor="altText">Alt Text</Label>
      <Input
        id="altText"
        value={options.altText || ''}
        onChange={(e) => onChange({ altText: e.target.value })}
        placeholder="Image description"
      />
    </div>
  </div>
);

interface FieldDesignerProps {
  isOpen: boolean;
  fieldType: 'input' | 'output';
  initialData: Field | null;
  availableInputFields?: Array<{ id: string; name: string | null }>;
  onSave: (field: Field, isNew: boolean) => void;
  onCancel: () => void;
}

const getDefaultField = (type: 'input' | 'output', id?: string): Field => {
  const base = {
    id: id || uuidv4(),
    name: '',
    required: false,
    options: {},
    aiPrompt: '',
  };
  if (type === 'input') {
    return {
      ...base,
      type: 'shortText',
      aiSuggester: false,
    } as InputField;
  } else { 
    return {
      ...base,
      type: 'richText',
      aiAutoComplete: true,
      useBrandIdentity: false,
      useToneOfVoice: false,
      useGuardrails: false,
    } as OutputField;
  }
};

// Helper function to safely initialize field data
const initializeFieldData = (fieldType: 'input' | 'output', initialData: Field | null): Field => {
  if (!initialData) {
    return getDefaultField(fieldType);
  }
  
  // Ensure the initialData matches the expected field type
  if (fieldType === 'input' && isInputField(initialData)) {
    const inputData: InputField = {
      id: initialData.id,
      name: initialData.name,
      type: initialData.type,
      required: initialData.required,
      options: initialData.options || {},
      aiPrompt: initialData.aiPrompt || '',
      aiSuggester: initialData.aiSuggester || false,
      description: initialData.description,
      helpText: initialData.helpText
    };
    return inputData;
  } else if (fieldType === 'output' && isOutputField(initialData)) {
    // Ensure boolean fields have explicit values
    const outputData: OutputField = ensureBooleanDefaults({
      id: initialData.id,
      name: initialData.name,
      type: initialData.type,
      required: initialData.required,
      options: initialData.options || {},
      aiPrompt: initialData.aiPrompt || '',
      aiAutoComplete: initialData.aiAutoComplete ?? true,
      useBrandIdentity: initialData.useBrandIdentity ?? false,
      useToneOfVoice: initialData.useToneOfVoice ?? false,
      useGuardrails: initialData.useGuardrails ?? false,
      description: initialData.description,
      helpText: initialData.helpText
    }, ['aiAutoComplete', 'useBrandIdentity', 'useToneOfVoice', 'useGuardrails']);
    return outputData;
  }
  
  // If there's a type mismatch, create a new field with the correct type
  return getDefaultField(fieldType);
};

export function FieldDesigner({ 
  isOpen, 
  fieldType, 
  initialData, 
  availableInputFields = [], 
  onSave, 
  onCancel 
}: FieldDesignerProps) {
  const isNew = !initialData;
  const [fieldData, setFieldData] = useState<Field>(() => 
    initializeFieldData(fieldType, initialData)
  );
  
  const [activeTab, setActiveTab] = useState('basic');
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  
  useEffect(() => {
    setFieldData(initializeFieldData(fieldType, initialData));
  }, [initialData, fieldType]);
  
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldData(prev => {
      if (isInputField(prev)) {
        return { ...prev, [name]: value } as InputField;
      } else {
        return { ...prev, [name]: value } as OutputField;
      }
    });
  };
  
  const handleTypeChange = (value: string) => {
    const newType = value as GlobalFieldType;
    setFieldData(prev => {
      const basePrev = { ...prev };
      const base = {
        id: basePrev.id,
        name: basePrev.name,
        required: basePrev.required,
        aiPrompt: basePrev.aiPrompt,
        type: newType,
        options: {}, 
      };
      if (fieldType === 'input') {
        return {
          ...base,
          aiSuggester: (prev as InputField).aiSuggester || false, 
        } as InputField;
      } else { 
        return {
          ...base,
          aiAutoComplete: true,
          useBrandIdentity: (prev as OutputField).useBrandIdentity || false,
          useToneOfVoice: (prev as OutputField).useToneOfVoice || false,
          useGuardrails: (prev as OutputField).useGuardrails || false,
        } as OutputField;
      }
    });
  };
  
  const handleRequiredChange = (checked: boolean) => {
    setFieldData(prev => {
      if (isInputField(prev)) {
        return { ...prev, required: checked } as InputField;
      } else {
        return { ...prev, required: checked } as OutputField;
      }
    });
  };
  
  const handleAIFeatureChange = (
    feature: keyof InputField | keyof OutputField | 'aiPrompt', 
    value: boolean | string
  ) => {
    setFieldData(prev => {
      const updatedField = { ...prev } as Field;
      if (feature === 'aiPrompt') {
        updatedField.aiPrompt = value as string;
      } else if (fieldType === 'input' && 'aiSuggester' in updatedField && feature === 'aiSuggester') {
        (updatedField as InputField).aiSuggester = value as boolean;
      } else if (fieldType === 'output') {
        if (feature === 'aiAutoComplete') {
          (updatedField as OutputField).aiAutoComplete = true;
        } else if (feature === 'useBrandIdentity' || feature === 'useToneOfVoice' || feature === 'useGuardrails') {
          if (feature in updatedField) {
            (updatedField as OutputField)[feature as 'useBrandIdentity' | 'useToneOfVoice' | 'useGuardrails'] = value as boolean;
          }
        }
      }
      return updatedField;
    });
  };
  
  const handleAIPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFieldData(prev => {
      if (isInputField(prev)) {
        return { ...prev, aiPrompt: e.target.value } as InputField;
      } else {
        return { ...prev, aiPrompt: e.target.value } as OutputField;
      }
    });
  };
  
  const onPromptSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setSelection({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
  };
  
  const insertTextIntoPrompt = (textToInsert: string) => {
    const textArea = aiPromptRef.current;
    if (!textArea) {
      console.warn('insertTextIntoPrompt: aiPromptRef.current is null');
      return;
    }

    // Get current value from state to ensure consistency
    const currentPrompt = fieldData.aiPrompt || '';
    
    // Check if textarea is focused and has a selection
    let selectionStart = textArea.selectionStart ?? currentPrompt.length;
    let selectionEnd = textArea.selectionEnd ?? currentPrompt.length;
    
    // If textarea is not focused or selection is at the beginning, append at the end
    if (document.activeElement !== textArea || (selectionStart === 0 && selectionEnd === 0 && currentPrompt.length > 0)) {
      selectionStart = currentPrompt.length;
      selectionEnd = currentPrompt.length;
    }
    
    // Create the new prompt with the inserted text
    const newPrompt = 
      currentPrompt.substring(0, selectionStart) + 
      textToInsert + 
      currentPrompt.substring(selectionEnd);
    
    // Update the state
    setFieldData(prev => {
      if (isInputField(prev)) {
        return { ...prev, aiPrompt: newPrompt } as InputField;
      } else {
        return { ...prev, aiPrompt: newPrompt } as OutputField;
      }
    });
    
    // Calculate new cursor position
    const newCursorPosition = selectionStart + textToInsert.length;
    
    // Set focus and cursor position after React has updated the textarea value
    setTimeout(() => {
      if (aiPromptRef.current) {
        aiPromptRef.current.focus();
        aiPromptRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 10);
  };

  const insertPlaceholder = (textToInsert: string) => {
    insertTextIntoPrompt(textToInsert);
  };

  const insertBrandDataOrPlaceholder = (placeholderKey: 'name' | 'identity' | 'tone_of_voice' | 'guardrails' | 'summary' | 'brandObject') => {
    const map = {
      name: '{{brand.name}}',
      identity: '{{brand.identity}}',
      tone_of_voice: '{{brand.tone_of_voice}}',
      guardrails: '{{brand.guardrails}}',
      summary: '{{brand.summary}}',
      brandObject: '{{brand}}',
    } as const;

    const insert = map[placeholderKey];
    if (!insert) return;

    setFieldData(prev => {
      const current = prev.aiPrompt ?? '';
      if (selection) {
        const { start, end } = selection;
        const next = current.slice(0, start) + insert + current.slice(end);
        return { ...prev, aiPrompt: next } as Field;
      }
      // Fallback: append
      const sep = current && !current.endsWith(' ') ? ' ' : '';
      return { ...prev, aiPrompt: current + sep + insert } as Field;
    });

    // Best-effort focus + caret placement next frame
    requestAnimationFrame(() => {
      const el = aiPromptRef.current;
      if (el) {
        const caret = (selection?.start ?? (el.value?.length ?? 0)) + insert.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  };
  
  // The useEffect for aiPromptRef focusing is now handled by insertTextIntoPrompt
  // useEffect(() => {
  //   if (aiPromptRef.current) {
  //     aiPromptRef.current.focus();
  //     const len = aiPromptRef.current.value.length;
  //     aiPromptRef.current.setSelectionRange(len, len);
  //   }
  // }, [fieldData.aiPrompt]); // This specific dependency might need adjustment if prompt changes externally
  
  const handleOptionsChange = (newOptions: Partial<Field['options']>) => {
    setFieldData(prev => {
      if (isInputField(prev)) {
        return {
          ...prev,
          options: {
            ...(prev.options || {}),
            ...newOptions
          }
        } as InputField;
      } else {
        return {
          ...prev,
          options: {
            ...(prev.options || {}),
            ...newOptions
          }
        } as OutputField;
      }
    });
  };
  
  const validateField = () => {
    if (!fieldData.name.trim()) {
      sonnerToast.error("Field name is required");
      return false;
    }
    if (fieldType === 'output' && (!fieldData.aiPrompt || !fieldData.aiPrompt.trim())) {
      sonnerToast.error("AI prompt is required for output fields.");
      setActiveTab('ai');
      return false;
    }
    if (fieldType === 'input' && (fieldData as InputField).aiSuggester && (!fieldData.aiPrompt || !fieldData.aiPrompt.trim())) {
      sonnerToast.error("AI prompt is required for input fields when AI Suggestions are enabled.");
      setActiveTab('ai');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateField()) return;
    const finalFieldData = { ...fieldData };
    if (!finalFieldData.options) {
        finalFieldData.options = {};
    }
    
    // Ensure boolean fields are explicitly set for output fields
    if (fieldType === 'output' && isOutputField(finalFieldData)) {
      const outputField = ensureBooleanDefaults(
        finalFieldData,
        ['aiAutoComplete', 'useBrandIdentity', 'useToneOfVoice', 'useGuardrails']
      );
      onSave(outputField as Field, isNew);
    } else {
      onSave(finalFieldData as Field, isNew);
    }
  };
  
  const inputFieldData = fieldType === 'input' ? fieldData as InputField : null;
  const outputFieldData = fieldType === 'output' ? fieldData as OutputField : null;

  const fieldTypes: { value: GlobalFieldType; label: string }[] = [
    { value: 'shortText', label: 'Short Text' },
    { value: 'longText', label: 'Long Text' },
    { value: 'richText', label: 'Rich Text (WYSIWYG)' },
    { value: 'select', label: 'Select (Dropdown)' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'tags', label: 'Tags' },
    { value: 'url', label: 'URL' },
    { value: 'fileUpload', label: 'File Upload' },
    { value: 'product-selector', label: 'Select from Brand Products' },
    { value: 'recipeUrl', label: 'Recipe URL (with scraping)' },
  ];
  
  const outputFieldTypes: { value: GlobalFieldType; label: string }[] = [
    { value: 'plainText', label: 'Plain Text' },
    { value: 'richText', label: 'Rich Text (WYSIWYG)' },
    { value: 'html', label: 'HTML' },
    { value: 'image', label: 'Image' },
  ];

  const currentFieldTypes = fieldType === 'input' ? fieldTypes : outputFieldTypes;

  const renderOptions = () => {
    switch (fieldData.type) {
      case 'shortText':
        return <ShortTextOptionsComponent options={fieldData.options as ShortTextOptions} onChange={handleOptionsChange} />;
      case 'longText':
        return <LongTextOptionsComponent options={fieldData.options as LongTextOptions} onChange={handleOptionsChange} />;
      case 'richText':
        return <RichTextOptionsComponent options={fieldData.options as RichTextOptions} onChange={handleOptionsChange} />;
      case 'select':
        return <SelectOptionsComponent options={fieldData.options as SelectOptions} onChange={handleOptionsChange} />;
      case 'number':
        return <NumberOptionsComponent options={fieldData.options as NumberOptions} onChange={handleOptionsChange} />;
      case 'date':
        return <DateOptionsComponent options={fieldData.options as DateOptions} onChange={handleOptionsChange} />;
      case 'tags':
        return <TagsOptionsComponent options={fieldData.options as TagsOptions} onChange={handleOptionsChange} />;
      case 'url':
        return <UrlOptionsComponent options={fieldData.options as UrlOptions} onChange={handleOptionsChange} />;
      case 'fileUpload':
        return <FileUploadOptionsComponent options={fieldData.options as FileUploadOptions} onChange={handleOptionsChange} />;
      case 'product-selector':
        return <ProductSelectorOptionsComponent options={fieldData.options as ProductSelectorOptions} onChange={handleOptionsChange} />;
      case 'recipeUrl':
        return <RecipeUrlOptionsComponent options={fieldData.options as RecipeUrlOptions} onChange={handleOptionsChange} />;
      case 'plainText':
        return <PlainTextOutputOptionsComponent options={fieldData.options as PlainTextOutputOptions} onChange={handleOptionsChange} />;
      case 'html':
        return <HtmlOutputOptionsComponent options={fieldData.options as HtmlOutputOptions} onChange={handleOptionsChange} />;
      case 'image':
        return <ImageOutputOptionsComponent options={fieldData.options as ImageOutputOptions} onChange={handleOptionsChange} />;
      default:
        return <p className="text-sm text-gray-500">No specific options for this field type.</p>;
    }
  };

  const renderAiPanel = () => {
    if (fieldType === 'input' && inputFieldData) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="aiSuggester" 
              checked={inputFieldData.aiSuggester || false} 
              onCheckedChange={(checked) => handleAIFeatureChange('aiSuggester', !!checked)} 
            />
            <Label htmlFor="aiSuggester">Enable AI Suggestions</Label>
          </div>
          {inputFieldData.aiSuggester && (
            <div className="pl-6 space-y-1">
              <p className="text-xs text-muted-foreground">
                Uses AI to suggest values for this field during content creation.
              </p>
            </div>
          )}
        </div>
      );
    }
    
    if (fieldType === 'output' && outputFieldData) {
      return (
        <>
          <div className="pt-2">
            <Label className="font-medium">Brand Context for AI (Output Fields)</Label>
            <p className="text-xs text-muted-foreground pb-2">
              Allow AI to use specific brand elements when generating content for this field.
            </p>
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="useBrandIdentity"
                  checked={outputFieldData.useBrandIdentity || false}
                  onCheckedChange={(checked) => handleAIFeatureChange('useBrandIdentity', !!checked)}
                />
                <Label htmlFor="useBrandIdentity">Use Brand Identity</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="useToneOfVoice"
                  checked={outputFieldData.useToneOfVoice || false}
                  onCheckedChange={(checked) => handleAIFeatureChange('useToneOfVoice', !!checked)}
                />
                <Label htmlFor="useToneOfVoice">Use Tone of Voice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="useGuardrails"
                  checked={outputFieldData.useGuardrails || false}
                  onCheckedChange={(checked) => handleAIFeatureChange('useGuardrails', !!checked)}
                />
                <Label htmlFor="useGuardrails">Use Guardrails</Label>
              </div>
               <div className="flex items-center space-x-2 pt-1">
                  <Checkbox 
                      id="useCombinedBrandContext"
                      checked={!!(outputFieldData.useBrandIdentity && outputFieldData.useToneOfVoice && outputFieldData.useGuardrails)}
                      onCheckedChange={(checked) => {
                        const newCheckedState = !!checked;
                        handleAIFeatureChange('useBrandIdentity', newCheckedState);
                        handleAIFeatureChange('useToneOfVoice', newCheckedState);
                        handleAIFeatureChange('useGuardrails', newCheckedState);
                      }}
                  />
                  <Label htmlFor="useCombinedBrandContext">Enable All Brand Context</Label>
            </div>
            </div>
          </div>
        </>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add' : 'Edit'} {fieldType === 'input' ? 'Input' : 'Output'} Field</DialogTitle>
          <DialogDescription>
            Configure the details for this field. Use the tabs to navigate between settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 pt-2">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="ai">AI Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input id="fieldName" name="name" value={fieldData.name} onChange={handleBasicInfoChange} placeholder="e.g., Article Title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type</Label>
              <Select value={fieldData.type} onValueChange={handleTypeChange}>
                <SelectTrigger id="fieldType">
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {currentFieldTypes.map(ft => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="required" checked={fieldData.required} onCheckedChange={handleRequiredChange} />
                <Label htmlFor="required">Required field</Label>
              </div>
          </TabsContent>
          
          <TabsContent value="options" className="space-y-4">
            {renderOptions()}
              </TabsContent>
          
          <TabsContent value="ai" className="space-y-4">
            {renderAiPanel()}
            
            {((fieldType === 'input' && inputFieldData?.aiSuggester) || fieldType === 'output') && (
              <div className="pt-3 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="aiPrompt">AI Prompt</Label>
                  <Textarea 
                    id="aiPrompt" 
                    ref={aiPromptRef}
                    value={fieldData.aiPrompt || ''} 
                    onChange={handleAIPromptChange}
                    onSelect={onPromptSelect}
                    placeholder={fieldType === 'input' 
                      ? "e.g., Suggest 3-5 relevant keywords for {{topic}}."
                      : "e.g., Write an article about {{topic}} using keywords: {{keywords}}."
                    }
                    className="min-h-[100px] mt-1"
                  />
                </div>
                
                  {availableInputFields && availableInputFields.length > 0 && (
                    <div className="space-y-1 pt-3">
                        <Label className="text-xs font-medium text-muted-foreground">Insert Input Field Placeholders:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                        {availableInputFields
                            .filter(inputField => inputField.id !== fieldData.id && inputField.name)
                            .map(inputField => (
                            <Button 
                                type="button" 
                                key={inputField.id} 
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  insertPlaceholder(`{{${inputField.name}}}`);
                                }}
                                className="text-xs"
                            >
                                {`{{${inputField.name}}}`}
                            </Button>
                        ))}
                      </div>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground flex items-center">
                  <Info size={14} className="mr-1.5 text-blue-500" />
                  You can use placeholders like <code>{`{{inputFieldName}}`}</code> to reference other input fields. 
                  <Link href="/dashboard/help#templates" className="ml-1 text-blue-600 hover:underline text-xs">Learn more.</Link>
                </p>

                <div className="space-y-1 pt-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Insert Generic Brand Placeholders:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('name')}
                    >
                      Brand Name
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('identity')}
                    >
                      Brand Identity
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('tone_of_voice')}
                    >
                      Tone of Voice
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('guardrails')}
                    >
                      Guardrails
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('summary')}
                    >
                      Brand Summary
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={() => insertBrandDataOrPlaceholder('brandObject')}
                    >
                      Generic Brand Object
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 