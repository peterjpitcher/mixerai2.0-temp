'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { ProductSelect } from './product-select';
import type { InputField, FieldType, SelectOptions, ShortTextOptions, LongTextOptions, RichTextOptions, UrlOptions } from '@/types/template';

interface TemplateFieldRendererProps {
  field: InputField;
  value: string;
  onChange: (fieldId: string, value: string, fieldType?: FieldType) => void;
  brandId?: string;
  isGeneratingSuggestion?: boolean;
  onGenerateSuggestion?: (fieldId: string) => void;
  productContext?: unknown;
}

export function TemplateFieldRenderer({
  field,
  value,
  onChange,
  brandId,
  isGeneratingSuggestion = false,
  onGenerateSuggestion
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
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={(field.options as LongTextOptions)?.placeholder}
            rows={(field.options as LongTextOptions)?.rows || 4}
            required={isRequired}
          />
        );
        
      case 'richText':
        return (
          <RichTextEditor
            value={value}
            onChange={(content) => onChange(field.id, content)}
            placeholder={(field.options as RichTextOptions)?.placeholder}
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