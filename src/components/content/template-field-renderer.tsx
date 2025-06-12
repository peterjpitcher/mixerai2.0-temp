'use client';

import { useState } from 'react';
import { Label } from '@/components/label';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Button } from '@/components/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';
import { ProductSelect } from './product-select';
import type { InputField, FieldType, SelectOptions } from '@/types/template';
import type { ProductContext } from '@/types/claims';

interface TemplateFieldRendererProps {
  field: InputField;
  value: string;
  onChange: (fieldId: string, value: string, fieldType?: FieldType) => void;
  brandId?: string;
  isGeneratingSuggestion?: boolean;
  onGenerateSuggestion?: (fieldId: string) => void;
  productContext?: ProductContext | null;
}

export function TemplateFieldRenderer({
  field,
  value,
  onChange,
  brandId,
  isGeneratingSuggestion = false,
  onGenerateSuggestion,
  productContext
}: TemplateFieldRendererProps) {
  const isRequired = field.validation?.required || false;
  const maxLength = field.validation?.maxLength;
  
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'email':
        return (
          <Input
            id={field.id}
            type={field.type}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            maxLength={maxLength}
            required={isRequired}
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            maxLength={maxLength}
            required={isRequired}
          />
        );
        
      case 'richText':
        return (
          <RichTextEditor
            value={value}
            onChange={(content) => onChange(field.id, content)}
            placeholder={field.placeholder}
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
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.choices.map((choice) => (
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
        
      case 'productSelect':
        return (
          <ProductSelect
            value={value}
            onChange={(val) => onChange(field.id, val, 'productSelect')}
            brandId={brandId}
            placeholder={field.placeholder}
          />
        );
        
      default:
        return (
          <Input
            id={field.id}
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
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
        {field.aiEnabled && onGenerateSuggestion && (
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
      
      {field.helpText && (
        <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>
      )}
      
      {productContext && field.type === 'productSelect' && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Selected: {productContext.productName}
          </p>
          {productContext.styledClaims && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {Object.keys(productContext.styledClaims).length} claims loaded
            </p>
          )}
        </div>
      )}
    </div>
  );
}