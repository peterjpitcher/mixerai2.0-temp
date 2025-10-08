'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { ProductSelect } from './product-select';
import { RecipeUrlField } from './recipe-url-field';
import { SlugInput } from '@/components/ui/slug-input';
import { ValidatedTextarea } from '@/components/form/validated-textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { InputField, FieldType, SelectOptions, ShortTextOptions, LongTextOptions, RichTextOptions, UrlOptions, RecipeUrlOptions, SlugOptions, NumberOptions, DateOptions, TagsOptions, FileUploadOptions } from '@/types/template';

interface TemplateFieldRendererProps {
  field: InputField;
  value: string;
  onChange: (fieldId: string, value: string, fieldType?: FieldType) => void;
  brandId?: string;
  isGeneratingSuggestion?: boolean;
  onGenerateSuggestion?: (fieldId: string) => void;
  productContext?: unknown;
  onRecipeDataExtracted?: (data: Record<string, string>) => void;
}

export function TemplateFieldRenderer({
  field,
  value,
  onChange,
  brandId,
  isGeneratingSuggestion = false,
  onGenerateSuggestion,
  onRecipeDataExtracted
}: TemplateFieldRendererProps) {
  const isRequired = field.required || false;
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  const renderField = () => {
    switch (field.type) {
      case 'shortText':
      case 'url':
        return (
          <Input
            id={field.id}
            type={field.type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={(field.options as ShortTextOptions | UrlOptions)?.placeholder}
            maxLength={(field.options as ShortTextOptions)?.maxLength}
            required={isRequired}
          />
        );
        
      case 'longText':
        const longTextOptions = field.options as LongTextOptions;
        return (
          <ValidatedTextarea
            value={value}
            onChange={(v) => onChange(field.id, v)}
            field={{
              name: field.id,
              label: undefined, // Label is rendered separately
              placeholder: longTextOptions?.placeholder || `Enter ${field.name}`,
              config: {
                max_rows: longTextOptions?.maxRows,
                max_length: longTextOptions?.maxLength,
                required: isRequired,
              },
            }}
          />
        );
        
      case 'richText':
        const richTextOptions = field.options as RichTextOptions;
        return (
          <RichTextEditor
            value={value}
            onChange={(content) => onChange(field.id, content)}
            placeholder={richTextOptions?.placeholder}
            allowImages={richTextOptions?.allowImages === true} // Only allow images if explicitly enabled
          />
        );
        
      case 'select':
        const options = field.options as SelectOptions;
        return (
          <Select 
            value={value} 
            onValueChange={(val) => onChange(field.id, val)}
          >
            <SelectTrigger id={field.id}>
              <SelectValue placeholder={"Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {(options.choices || []).map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'multiselect':
        return (
          <MultiSelect
            fieldId={field.id}
            options={field.options as SelectOptions}
            value={value}
            onChange={(val) => onChange(field.id, val)}
          />
        );

      case 'number':
        const numberOptions = field.options as NumberOptions;
        return (
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(event) => onChange(field.id, event.target.value)}
            min={numberOptions?.min}
            max={numberOptions?.max}
            step={numberOptions?.step ?? 'any'}
            placeholder={numberOptions?.placeholder}
            required={isRequired}
          />
        );

      case 'date':
        const dateOptions = field.options as DateOptions;
        const now = new Date();
        const formatDate = (date: Date, includeTime: boolean) => {
          const iso = date.toISOString();
          return includeTime ? iso.slice(0, 16) : iso.slice(0, 10);
        };
        const includeTime = dateOptions?.includeTime === true;
        const min = dateOptions?.disablePast ? formatDate(now, includeTime) : undefined;
        const max = dateOptions?.disableFuture ? formatDate(now, includeTime) : undefined;
        return (
          <Input
            id={field.id}
            type={includeTime ? 'datetime-local' : 'date'}
            value={value}
            onChange={(event) => onChange(field.id, event.target.value)}
            min={min}
            max={max}
            required={isRequired}
          />
        );

      case 'tags':
        return (
          <TagsInput
            value={value}
            options={field.options as TagsOptions}
            onChange={(val) => onChange(field.id, val)}
          />
        );

      case 'fileUpload':
        const fileOptions = field.options as FileUploadOptions;
        const uploadedFile = parseFileMetadata(value);
        const accept = fileOptions?.acceptedTypes || (fileOptions?.allowedTypes ? fileOptions.allowedTypes.join(',') : undefined);

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (!file) {
            onChange(field.id, '');
            setFileError(null);
            return;
          }

          if (fileOptions?.maxSizeMB && file.size > fileOptions.maxSizeMB * 1024 * 1024) {
            setFileError(`File exceeds ${fileOptions.maxSizeMB}MB limit.`);
            return;
          }

          if (fileOptions?.maxSize && file.size > fileOptions.maxSize) {
            setFileError('File exceeds the allowed size.');
            return;
          }

          if (fileOptions?.allowedTypes && !fileOptions.allowedTypes.includes(file.type)) {
            setFileError('File type is not permitted.');
            return;
          }

          setIsUploading(true);
          setFileError(null);
          try {
            const data = await readFileAsBase64(file);
            const payload = JSON.stringify({
              name: file.name,
              size: file.size,
              type: file.type,
              data,
            });
            onChange(field.id, payload, 'fileUpload');
          } catch (error) {
            console.error('Failed to encode file upload field', error);
            setFileError('We could not read this file. Please try another.');
          } finally {
            setIsUploading(false);
          }
        };

        return (
          <div className="space-y-2">
            <Input
              id={field.id}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading && (
              <p className="text-xs text-muted-foreground">Encoding file...</p>
            )}
            {uploadedFile && !isUploading && (
              <p className="text-xs text-muted-foreground">
                Selected file: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
              </p>
            )}
            {fileError && (
              <p className="text-xs text-destructive">{fileError}</p>
            )}
          </div>
        );
        
      case 'product-selector':
        return (
          <ProductSelect
            value={value}
            onChange={(val) => onChange(field.id, val || '', 'product-selector')}
            brandId={brandId || null}
          />
        );

      case 'recipeUrl':
        return (
          <RecipeUrlField
            id={field.id}
            label={field.name}
            value={value}
            onChange={(val) => onChange(field.id, val, 'recipeUrl')}
            required={isRequired}
            options={field.options as RecipeUrlOptions}
            helpText={field.helpText}
            onRecipeDataExtracted={onRecipeDataExtracted}
          />
        );
        
      case 'slug':
        const slugOptions = field.options as SlugOptions;
        return (
          <SlugInput
            value={value}
            onChange={(val) => onChange(field.id, val, 'slug')}
            sourceValue={slugOptions?.sourceField ? '' : undefined} // TODO: Get source field value
            required={isRequired}
            description={field.helpText}
            placeholder="article-url-slug"
            autoGenerate={slugOptions?.autoGenerate !== false}
          />
        );
        
      default:
        return (
          <Input
            id={field.id}
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={(field.options as ShortTextOptions | UrlOptions)?.placeholder}
            required={isRequired}
          />
        );
    }
  };
  
  // RecipeUrlField renders its own label, so we skip the label for this field type
  if (field.type === 'recipeUrl') {
    return renderField();
  }

  return (
    <div key={field.id}>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={field.id}>
          {field.name} {isRequired && '*'}
        </Label>
        {field.aiSuggester && onGenerateSuggestion && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGenerateSuggestion(field.id)}
            disabled={isGeneratingSuggestion}
          >
            {isGeneratingSuggestion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="ml-1">AI Suggest</span>
          </Button>
        )}
      </div>
      
      {renderField()}
      
    </div>
  );
}

function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Fallback to comma separated parsing
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function encodeStringArray(values: string[]): string {
  return JSON.stringify(values);
}

interface MultiSelectProps {
  fieldId: string;
  options: SelectOptions;
  value: string;
  onChange: (value: string) => void;
}

function MultiSelect({ fieldId, options, value, onChange }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedValues = React.useMemo(() => parseStringArray(value), [value]);

  const toggleValue = (choiceValue: string) => {
    const exists = selectedValues.includes(choiceValue);
    const next = exists
      ? selectedValues.filter((item) => item !== choiceValue)
      : [...selectedValues, choiceValue];
    onChange(encodeStringArray(next));
  };

  const displayLabel = selectedValues.length
    ? `${selectedValues.length} selected`
    : 'Select options';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          id={fieldId}
        >
          {displayLabel}
          <Icons.chevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {(options.choices || []).map((choice) => {
                const active = selectedValues.includes(choice.value);
                return (
                  <CommandItem
                    key={choice.value}
                    value={choice.value}
                    onSelect={() => toggleValue(choice.value)}
                  >
                    <Icons.check className={`mr-2 h-4 w-4 ${active ? 'opacity-100' : 'opacity-0'}`} />
                    {choice.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface TagsInputProps {
  value: string;
  options?: TagsOptions;
  onChange: (value: string) => void;
}

function parseFileMetadata(value: string | undefined): { name: string; size: number; type?: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'name' in parsed && 'size' in parsed) {
      return parsed as { name: string; size: number; type?: string };
    }
  } catch {
    return null;
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // remove the data: prefix if present
        const [, base64] = result.split('base64,');
        resolve(base64 ? base64 : result);
      } else {
        reject(new Error('Unexpected file reader result'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function TagsInput({ value, options, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const tags = React.useMemo(() => parseStringArray(value), [value]);

  const updateTags = (next: string[]) => {
    const maxTags = options?.maxTags;
    const trimmed = maxTags ? next.slice(0, maxTags) : next;
    onChange(encodeStringArray(trimmed));
  };

  const addTag = (tag: string) => {
    const cleaned = tag.trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) {
      setInputValue('');
      return;
    }
    updateTags([...tags, cleaned]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    updateTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={options?.placeholder || 'Add a tag and press Enter'}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addTag(inputValue);
          } else if (event.key === 'Backspace' && !inputValue && tags.length) {
            removeTag(tags[tags.length - 1]);
          }
        }}
      />
    </div>
  );
}
