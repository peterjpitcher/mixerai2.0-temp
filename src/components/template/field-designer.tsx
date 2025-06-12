'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Checkbox } from '@/components/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Textarea } from '@/components/textarea';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { toast as sonnerToast } from 'sonner';
import { Badge } from '@/components/badge';
import { Rocket, Info } from 'lucide-react';
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
} from '@/types/template';
import { ProductSelectorOptionsComponent } from './product-selector-options';

interface FieldDesignerProps {
  isOpen: boolean;
  fieldType: 'input' | 'output';
  initialData: Field | null;
  availableInputFields?: Array<{ id: string; name: string | null }>;
  templateId?: string;
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

export function FieldDesigner({ 
  isOpen, 
  fieldType, 
  initialData, 
  availableInputFields = [], 
  templateId, 
  onSave, 
  onCancel 
}: FieldDesignerProps) {
  const isNew = !initialData;
  const [fieldData, setFieldData] = useState<Field>(
    initialData ? 
      {...initialData, options: initialData.options || {}} : 
      getDefaultField(fieldType)
  );
  
  const [activeTab, setActiveTab] = useState('basic');
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (initialData) {
      setFieldData({...initialData, options: initialData.options || {}});
    } else {
      setFieldData(getDefaultField(fieldType));
    }
  }, [initialData, fieldType]);
  
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldData(prev => ({ ...prev, [name]: value } as Field));
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
    setFieldData(prev => ({ ...prev, required: checked } as Field));
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
     setFieldData(prev => ({ ...prev, aiPrompt: e.target.value } as Field));
  };
  
  const insertTextIntoPrompt = (textToInsert: string) => {
    const textArea = aiPromptRef.current;
    if (!textArea) return;

    const currentPrompt = textArea.value || '';
    const selectionStart = textArea.selectionStart ?? currentPrompt.length;
    const selectionEnd = textArea.selectionEnd ?? currentPrompt.length;
    
    const newPrompt = 
      currentPrompt.substring(0, selectionStart) + 
      textToInsert + 
      currentPrompt.substring(selectionEnd);
    
    setFieldData(prev => ({ ...prev, aiPrompt: newPrompt } as Field));
    
    // After inserting, set cursor to the end of the inserted text
    const newCursorPosition = selectionStart + textToInsert.length;
    
    // Defer focusing and setting selection to ensure DOM is updated
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const insertPlaceholder = (textToInsert: string) => {
    insertTextIntoPrompt(textToInsert);
  };

  const insertBrandDataOrPlaceholder = (placeholderKey: 'name' | 'identity' | 'tone_of_voice' | 'guardrails' | 'summary' | 'brandObject') => {
    let placeholder = '';
    switch (placeholderKey) {
      case 'name': placeholder = '{{brand.name}}'; break;
      case 'identity': placeholder = '{{brand.identity}}'; break;
      case 'tone_of_voice': placeholder = '{{brand.tone_of_voice}}'; break;
      case 'guardrails': placeholder = '{{brand.guardrails}}'; break;
      case 'summary': placeholder = '{{brand.summary}}'; break;
      case 'brandObject': placeholder = '{{brand}}'; break;
      default: 
        console.warn(`insertBrandDataOrPlaceholder called with unknown key: ${placeholderKey}`);
        return; // Do nothing if key is unknown
    }
    insertTextIntoPrompt(placeholder);
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
    setFieldData(prev => ({
      ...prev,
      options: {
        ...(prev.options || {}),
        ...newOptions
      }
    }));
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
    onSave(finalFieldData as Field, isNew);
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
    if (fieldType === 'input' && inputFieldData && (
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
    )) || (
      fieldType === 'output' && outputFieldData && (
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
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl">
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
                                onClick={() => insertPlaceholder(`{{${inputField.name}}}`)}
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
                  <Link href="/docs/templating-guide#ai-prompts" target="_blank" className="ml-1 text-blue-600 hover:underline text-xs">Learn more.</Link>
                </p>

                <div className="space-y-1 pt-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Insert Generic Brand Placeholders:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('name')}>
                      Brand Name
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('identity')}>
                      Brand Identity
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('tone_of_voice')}>
                      Tone of Voice
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('guardrails')}>
                      Guardrails
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('summary')}>
                      Brand Summary
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => insertBrandDataOrPlaceholder('brandObject')}>
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