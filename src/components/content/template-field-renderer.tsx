'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { QuillEditor } from './quill-editor';
import 'quill/dist/quill.snow.css';
import { ProductSelect } from './product-select';
import { RecipeUrlField } from './recipe-url-field';
import { SlugInput } from '@/components/ui/slug-input';
import type { InputField, FieldType, SelectOptions, ShortTextOptions, LongTextOptions, RichTextOptions, UrlOptions, RecipeUrlOptions, SlugOptions } from '@/types/template';

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
        const handleLongTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          let newValue = e.target.value;
          
          // Enforce maxRows if specified
          if (longTextOptions?.maxRows && typeof longTextOptions.maxRows === 'number') {
            const lines = newValue.split('\n');
            if (lines.length > longTextOptions.maxRows) {
              // Truncate to maxRows
              newValue = lines.slice(0, longTextOptions.maxRows).join('\n');
              // Note: toast is not available here, so we'll just truncate silently
              // or we could pass a callback for notifications
            }
          }
          
          // Also check maxLength if specified
          if (longTextOptions?.maxLength && typeof longTextOptions.maxLength === 'number') {
            if (newValue.length > longTextOptions.maxLength) {
              newValue = newValue.substring(0, longTextOptions.maxLength);
            }
          }
          
          onChange(field.id, newValue);
        };
        
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={handleLongTextChange}
            placeholder={longTextOptions?.placeholder}
            rows={longTextOptions?.rows || 4}
            required={isRequired}
          />
        );
        
      case 'richText':
        const richTextOptions = field.options as RichTextOptions;
        return (
          <QuillEditor
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
        // Simplified multiselect - in production would need proper multiselect component
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Multi-select functionality to be implemented
            </p>
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