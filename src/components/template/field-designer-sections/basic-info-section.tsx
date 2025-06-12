import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { GenericField as Field } from '@/types/template';

interface BasicInfoSectionProps {
  fieldData: Field;
  fieldType: 'input' | 'output';
  currentFieldTypes: Array<{ value: string; label: string }>;
  onBasicInfoChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onTypeChange: (value: string) => void;
  onRequiredChange: (checked: boolean) => void;
}

export function BasicInfoSection({
  fieldData,
  fieldType,
  currentFieldTypes,
  onBasicInfoChange,
  onTypeChange,
  onRequiredChange
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Field Name *</Label>
        <Input
          id="name"
          name="name"
          value={fieldData.name}
          onChange={onBasicInfoChange}
          placeholder="Enter field name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="type">Field Type</Label>
        <Select value={fieldData.type} onValueChange={onTypeChange}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentFieldTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Field Description</Label>
        <Textarea
          id="description"
          name="description"
          value={fieldData.description || ''}
          onChange={onBasicInfoChange}
          placeholder="Describe what this field is for"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="helpText">Help Text</Label>
        <Input
          id="helpText"
          name="helpText"
          value={fieldData.helpText || ''}
          onChange={onBasicInfoChange}
          placeholder="Optional help text shown below the field"
        />
      </div>
      
      {fieldType === 'input' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={fieldData.required}
            onCheckedChange={onRequiredChange}
          />
          <Label htmlFor="required">Required field</Label>
        </div>
      )}
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Field ID: <Badge variant="secondary">{fieldData.id}</Badge>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This unique ID will be used to reference this field in templates and AI prompts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}