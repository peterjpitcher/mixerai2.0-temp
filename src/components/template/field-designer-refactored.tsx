'use client';

import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useFieldDesigner } from '@/hooks/use-field-designer';
import { BasicInfoSection } from './field-designer-sections/basic-info-section';
import { AISettingsSection } from './field-designer-sections/ai-settings-section';
import { 
  ShortTextOptionsComponent,
  LongTextOptionsComponent,
  RichTextOptionsComponent,
  SelectOptionsComponent,
  NumberOptionsComponent,
  DateOptionsComponent,
  TagsOptionsComponent,
  UrlOptionsComponent,
  FileUploadOptionsComponent,
  PlainTextOutputOptionsComponent,
  HtmlOutputOptionsComponent,
  ImageOutputOptionsComponent
} from './field-options';
import { 
  InputField, 
  OutputField,
  GenericField as Field
} from '@/types/template';

interface FieldDesignerProps {
  fieldType: 'input' | 'output';
  field: Field | null;
  availableInputFields: Array<{ id: string; name: string | null }>;
  onSave: (field: Field) => void;
  onCancel: () => void;
}

const INPUT_FIELD_TYPES = [
  { value: 'shortText', label: 'Short Text' },
  { value: 'longText', label: 'Long Text' },
  { value: 'richText', label: 'Rich Text Editor' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'tags', label: 'Tags' },
  { value: 'url', label: 'URL' },
  { value: 'fileUpload', label: 'File Upload' }
];

const OUTPUT_FIELD_TYPES = [
  { value: 'richText', label: 'Rich Text' },
  { value: 'plainText', label: 'Plain Text' },
  { value: 'html', label: 'HTML' },
  { value: 'image', label: 'Image' }
];

export function FieldDesigner({
  fieldType,
  field,
  availableInputFields,
  onSave,
  onCancel
}: FieldDesignerProps) {
  const {
    fieldData,
    isNew,
    handleBasicInfoChange,
    handleTypeChange,
    handleRequiredChange,
    handleAIFeatureChange,
    handleAIPromptChange,
    handleOptionsChange,
    insertTextIntoPrompt,
    validateField
  } = useFieldDesigner(fieldType, field);

  const currentFieldTypes = fieldType === 'input' ? INPUT_FIELD_TYPES : OUTPUT_FIELD_TYPES;

  const renderFieldOptions = () => {
    const props = {
      options: fieldData.options || {},
      onChange: handleOptionsChange
    };

    switch (fieldData.type) {
      case 'shortText':
        return <ShortTextOptionsComponent {...props} />;
      case 'longText':
        return <LongTextOptionsComponent {...props} />;
      case 'richText':
        return <RichTextOptionsComponent {...props} />;
      case 'select':
      case 'multiselect':
        return <SelectOptionsComponent {...props} />;
      case 'number':
        return <NumberOptionsComponent {...props} />;
      case 'date':
        return <DateOptionsComponent {...props} />;
      case 'tags':
        return <TagsOptionsComponent {...props} />;
      case 'url':
        return <UrlOptionsComponent {...props} />;
      case 'fileUpload':
        return <FileUploadOptionsComponent {...props} />;
      case 'plainText':
        return <PlainTextOutputOptionsComponent {...props} />;
      case 'html':
        return <HtmlOutputOptionsComponent {...props} />;
      case 'image':
        return <ImageOutputOptionsComponent {...props} />;
      default:
        return null;
    }
  };

  const handleSave = () => {
    const { isValid, errors } = validateField();
    
    if (!isValid) {
      errors.forEach(error => toast.error(error));
      return;
    }

    onSave(fieldData);
    toast.success(`Field ${isNew ? 'created' : 'updated'} successfully`);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isNew ? 'Create New' : 'Edit'} {fieldType === 'input' ? 'Input' : 'Output'} Field
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="options">Field Options</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <BasicInfoSection
            fieldData={fieldData}
            fieldType={fieldType}
            currentFieldTypes={currentFieldTypes}
            onBasicInfoChange={handleBasicInfoChange}
            onTypeChange={handleTypeChange}
            onRequiredChange={handleRequiredChange}
          />
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          {renderFieldOptions()}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AISettingsSection
            fieldData={fieldData}
            fieldType={fieldType}
            availableInputFields={availableInputFields}
            onAIFeatureChange={handleAIFeatureChange}
            onAIPromptChange={handleAIPromptChange}
            onInsertText={insertTextIntoPrompt}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {isNew ? 'Create Field' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
}