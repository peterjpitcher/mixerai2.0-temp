'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/dialog';
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
import { Rocket } from 'lucide-react';
import { 
  FieldType as GlobalFieldType,
  GenericField as Field,
  InputField,
  OutputField,
  ShortTextOptions,
  LongTextOptions,
  TagsOptions,
  SelectOptions,
  PlainTextOutputOptions,
  HtmlOutputOptions,
  // Ensure all other necessary option types are imported if used directly
} from '@/types/template';

interface FieldDesignerProps {
  isOpen: boolean;
  fieldType: 'input' | 'output';
  initialData: Field | null;
  availableInputFields?: { id: string; name: string }[];
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
    aiPrompt: '', // Common, but primarily for output
  };
  if (type === 'input') {
    return {
      ...base,
      type: 'shortText', // Default input type
      aiSuggester: false,
    } as InputField;
  } else { // output
    return {
      ...base,
      type: 'richText', // Default output type
      aiAutoComplete: false, // Or true if prompt implies it
      useBrandIdentity: false,
      useToneOfVoice: false,
      useGuardrails: false,
    } as OutputField;
  }
};

export function FieldDesigner({ isOpen, fieldType, initialData, availableInputFields = [], templateId, onSave, onCancel }: FieldDesignerProps) {
  const isNew = !initialData;
  const [fieldData, setFieldData] = useState<Omit<Field, 'options'> & {options?: any}>(
    initialData ? 
      {...initialData, options: initialData.options || {}} : 
      {...getDefaultField(fieldType), options: {}}
  );
  
  // console.log('FieldDesigner - templateId:', templateId); // For debugging
  const [activeTab, setActiveTab] = useState('basic');
  
  useEffect(() => {
    let idFromInitial: string | undefined = undefined;
    if (initialData) {
      idFromInitial = initialData.id;
      setFieldData({...initialData, options: initialData.options || {}});
    } else {
      setFieldData({...getDefaultField(fieldType), options: {}});
    }
  }, [initialData, fieldType]);
  
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldData(prev => ({ ...prev, [name]: value } as Field));
  };
  
  const handleTypeChange = (value: string) => {
    // When type changes, reset options and AI features specific to the old type.
    // The new default field will have correct AI features for its type.
    const newType = value as GlobalFieldType;
    setFieldData(prev => {
      const base = {
        ...prev,
        type: newType,
        options: {}, // Reset options
      };
      // Re-initialize AI properties based on new type and fieldType (input/output)
      if (fieldType === 'input') {
        return {
          ...base,
          aiSuggester: (prev as InputField).aiSuggester || false, // Retain if possible, or reset
        } as InputField;
      } else { // output
        return {
          ...base,
          aiAutoComplete: (prev as OutputField).aiAutoComplete || false,
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
    feature: keyof InputField | keyof OutputField, 
    value: boolean | string
  ) => {
    setFieldData(prev => {
      const updatedField = { ...prev };
      if (fieldType === 'input' && feature === 'aiSuggester') {
        (updatedField as InputField).aiSuggester = value as boolean;
      } else if (fieldType === 'output') {
        if (feature === 'aiAutoComplete' || feature === 'useBrandIdentity' || feature === 'useToneOfVoice' || feature === 'useGuardrails') {
          (updatedField as OutputField)[feature] = value as boolean;
        }
      }
      if (feature === 'aiPrompt') { // aiPrompt is on BaseField, accessible by both
        updatedField.aiPrompt = value as string;
      }
      return updatedField as Field;
    });
  };
  
  const handleCombinedBrandContextChange = (checked: boolean) => {
    if (fieldType === 'output') {
      setFieldData(prev => ({
        ...(prev as OutputField),
        useBrandIdentity: checked,
        useToneOfVoice: checked,
        useGuardrails: checked,
      } as OutputField));
    }
  };
  
  const handleAIPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setFieldData(prev => ({ ...prev, aiPrompt: e.target.value } as Field));
  };
  
  const handleOptionsChange = (newOptions: any) => {
    setFieldData(prev => ({
      ...prev,
      options: {
        ...(prev.options || {}), // prev.options is now any
        ...newOptions
      }
    }));
  };
  
  const validateField = () => {
    if (!fieldData.name.trim()) {
      sonnerToast.error("Field name is required");
      return false;
    }
    if (fieldType === 'output' && (fieldData as OutputField).aiAutoComplete && (!fieldData.aiPrompt || !fieldData.aiPrompt.trim())) {
      sonnerToast.error("AI prompt is required for output fields when AI Auto-Complete is enabled.");
      return false;
    }
    return true;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (!validateField()) return;
    onSave(fieldData, isNew);
  };
  
  // Cast fieldData to InputField or OutputField for accessing specific AI properties in JSX
  const inputFieldData = fieldType === 'input' ? fieldData as InputField : null;
  const outputFieldData = fieldType === 'output' ? fieldData as OutputField : null;

  // Field type options
  const inputFieldTypes = [
    { value: 'shortText', label: 'Short Text' },
    { value: 'longText', label: 'Long Text' },
    { value: 'richText', label: 'Rich Text' }, // Assuming richText can be an input
    { value: 'select', label: 'Select/Dropdown' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date/Time' },
    { value: 'tags', label: 'Keywords/Tags' },
    { value: 'url', label: 'URL' },
    { value: 'fileUpload', label: 'File Upload' },
  ];
  
  const outputFieldTypes = [
    { value: 'plainText', label: 'Plain Text' },
    { value: 'richText', label: 'Rich Text' },
    { value: 'html', label: 'HTML' },
    { value: 'image', label: 'Image' },
  ];
  
  const fieldTypeOptions = fieldType === 'input' ? inputFieldTypes : outputFieldTypes;
  
  // Helper to safely access options based on field type
  const getOptionValue = <T extends keyof Field['options']>(optionName: T, defaultValue: any = '') => {
    if (!fieldData.options) return defaultValue;
    // This requires fieldData.options to be typed correctly based on fieldData.type
    // For simplicity, we might need to cast options inside each specific block
    // e.g. (fieldData.options as ShortTextOptions)?.minLength
    return (fieldData.options as any)[optionName] || defaultValue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add' : 'Edit'} {fieldType === 'input' ? 'Input' : 'Output'} Field</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave}>
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              {fieldType === 'input' && <TabsTrigger value="options">Field Options</TabsTrigger>}
              <TabsTrigger value="ai">AI Features</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name</Label>
                <Input id="name" name="name" placeholder="e.g. Title, Description, Keywords" value={fieldData.name} onChange={handleBasicInfoChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select value={fieldData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Select field type" /></SelectTrigger>
                  <SelectContent>
                    {fieldTypeOptions.map((typeOpt) => (
                      <SelectItem key={typeOpt.value} value={typeOpt.value}>{typeOpt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldType === 'input' && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="required" checked={fieldData.required || false} onCheckedChange={handleRequiredChange} />
                  <Label htmlFor="required">Required field</Label>
                </div>
              )}
            </TabsContent>
            
            {fieldType === 'input' && (
              <TabsContent value="options" className="space-y-4 py-4">
                {fieldData.type === 'shortText' && fieldData.options && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minLength">Minimum Length</Label>
                        <Input id="minLength" type="number" min="0" placeholder="0" value={(fieldData.options as any)?.minLength || ''} onChange={(e) => handleOptionsChange({ minLength: parseInt(e.target.value) || 0 })}/>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxLength">Maximum Length</Label>
                        <Input id="maxLength" type="number" min="1" placeholder="100" value={(fieldData.options as any)?.maxLength || ''} onChange={(e) => handleOptionsChange({ maxLength: parseInt(e.target.value) || 0 })}/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placeholder">Placeholder Text</Label>
                      <Input id="placeholder" placeholder="Enter placeholder text" value={(fieldData.options as any)?.placeholder || ''} onChange={(e) => handleOptionsChange({ placeholder: e.target.value })}/>
                    </div>
                  </>
                )}
                {fieldData.type === 'longText' && fieldData.options && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="minWords">Minimum Words</Label>
                            <Input id="minWords" type="number" min="0" placeholder="0" value={(fieldData.options as any)?.minWords || ''} onChange={(e) => handleOptionsChange({ minWords: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxWords">Maximum Words</Label>
                            <Input id="maxWords" type="number" min="1" placeholder="500" value={(fieldData.options as any)?.maxWords || ''} onChange={(e) => handleOptionsChange({ maxWords: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="placeholder">Placeholder Text</Label>
                        <Input id="placeholder" placeholder="Enter placeholder text" value={(fieldData.options as any)?.placeholder || ''} onChange={(e) => handleOptionsChange({ placeholder: e.target.value })} />
                    </div>
                  </>
                )}
                {fieldData.type === 'tags' && fieldData.options && (
                  <div className="space-y-2">
                    <Label htmlFor="maxTags">Maximum Number of Tags</Label>
                    <Input id="maxTags" type="number" min="1" placeholder="10" value={(fieldData.options as any)?.maxTags || ''} onChange={(e) => handleOptionsChange({ maxTags: parseInt(e.target.value) || 0 })}/>
                  </div>
                )}
                {fieldData.type === 'select' && fieldData.options && (
                  <div className="space-y-2">
                    <Label htmlFor="choices">Options (one per line)</Label>
                    <Textarea id="choices" placeholder={"Option 1\\nOption 2\\nOption 3"} value={Array.isArray((fieldData.options as any)?.choices) ? (fieldData.options as any).choices.join('\\n') : ''} onChange={(e) => handleOptionsChange({ choices: e.target.value.split('\\n').filter(Boolean) })} rows={5}/>
                  </div>
                )}
              </TabsContent>
            )}
             {(fieldData.type === 'plainText' || fieldData.type === 'html') && fieldData.options && fieldType === 'output' && (
                <TabsContent value="options" className="space-y-4 py-4"> {/* This tab might need to be shown for output fields */}
                     <div className="space-y-2">
                        <Label htmlFor="maxLength">Maximum Length</Label>
                        <Input id="maxLength" type="number" min="1" placeholder="1000" value={(fieldData.options as any)?.maxLength || ''} onChange={(e) => handleOptionsChange({ maxLength: parseInt(e.target.value) || 0 })}/>
                    </div>
                </TabsContent>
            )}
            
            <TabsContent value="ai" className="space-y-4 py-4">
              {fieldType === 'input' && inputFieldData && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="aiSuggester" checked={inputFieldData.aiSuggester || false} onCheckedChange={(checked) => handleAIFeatureChange('aiSuggester', !!checked)}/>
                    <Label htmlFor="aiSuggester">AI Suggestions</Label>
                  </div>
                  {inputFieldData.aiSuggester && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="aiPrompt">AI Prompt <span className="text-muted-foreground text-xs">(instructions for AI)</span></Label>
                      <Textarea id="aiPrompt" placeholder="Write instructions for the AI suggester, e.g. 'Suggest SEO keywords for this article about {{topic}}'" value={fieldData.aiPrompt || ''} onChange={handleAIPromptChange} className="h-24"/>
                      <p className="text-xs text-muted-foreground">Use {"{{placeholders}}"} to reference other input fields.</p>
                      {templateId && (
                        <div className="mt-3">
                          <Link href={`/dashboard/content/new?template=${templateId}&field=${fieldData.id}&prompt=${encodeURIComponent(fieldData.aiPrompt || '')}`} passHref>
                            <Button type="button" variant="outline" size="sm">
                              <Rocket className="mr-2 h-4 w-4" />
                              Generate Suggestions
                            </Button>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            This will take you to the content generator using this template to get suggestions for this field based on your prompt.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {fieldType === 'output' && outputFieldData && (
                <>
                  {/* aiAutoComplete removed from direct user control for output, implied by aiPrompt */}
                  <div className="border-t my-4 pt-4">
                    <p className="text-sm font-medium mb-2">Brand Context Options</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="injectBrandIdentity" checked={!!(outputFieldData.useBrandIdentity && outputFieldData.useToneOfVoice && outputFieldData.useGuardrails)} onCheckedChange={handleCombinedBrandContextChange}/>
                        <Label htmlFor="injectBrandIdentity">Inject Brand Identity, Tone of Voice & Guardrails</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="aiPrompt">AI Prompt <span className="text-destructive">*</span> <span className="text-muted-foreground text-xs ml-1">(instructions for AI generation)</span></Label>
                    <Textarea id="aiPrompt" value={fieldData.aiPrompt || ''} onChange={handleAIPromptChange} placeholder="Write a prompt to guide the AI in generating this field content. Use {{input_field_name}} to reference input fields." className="min-h-[100px]" required={true}/>
                    {availableInputFields && availableInputFields.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Available input field placeholders:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {availableInputFields.map(inputField => (
                            <Badge key={inputField.id} variant="secondary" className="text-xs cursor-pointer" onClick={() => {
                                const currentPrompt = fieldData.aiPrompt || '';
                                const newPrompt = currentPrompt + `{{${inputField.name}}}`;
                                setFieldData(prev => ({...prev, aiPrompt: newPrompt } as Field));
                              }}>{`{{${inputField.name}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Example: "Generate an image of {'{{product_name}}'} in a {'{{style}}'} setting."</p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{isNew ? 'Add' : 'Update'} Field</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 