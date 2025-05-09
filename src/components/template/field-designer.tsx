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
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/toast-provider';

type FieldType = 'shortText' | 'longText' | 'richText' | 'select' | 'number' | 'date' | 'tags' | 'url' | 'fileUpload' | 'plainText' | 'html';

interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  options: any;
  aiSuggester?: boolean;
  aiAutoComplete?: boolean;
  aiPrompt?: string;
  useBrandIdentity?: boolean;
  useToneOfVoice?: boolean;
  useGuardrails?: boolean;
}

interface FieldDesignerProps {
  isOpen: boolean;
  fieldType: 'input' | 'output';
  initialData: Field | null;
  onSave: (field: Field, isNew: boolean) => void;
  onCancel: () => void;
}

export function FieldDesigner({ isOpen, fieldType, initialData, onSave, onCancel }: FieldDesignerProps) {
  const isNew = !initialData;
  const [fieldData, setFieldData] = useState<Field>(
    initialData || {
      id: uuidv4(),
      name: '',
      type: fieldType === 'input' ? 'shortText' : 'richText',
      required: false,
      options: {},
      ...(fieldType === 'output' && { 
        aiAutoComplete: true,
        aiPrompt: '' 
      })
    }
  );
  
  const [activeTab, setActiveTab] = useState('basic');
  
  // Reset field data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFieldData(initialData);
    } else {
      setFieldData({
        id: uuidv4(),
        name: '',
        type: fieldType === 'input' ? 'shortText' : 'richText',
        required: false,
        options: {},
        ...(fieldType === 'output' && { 
          aiAutoComplete: true,
          aiPrompt: '' 
        })
      });
    }
  }, [initialData, fieldType]);
  
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleTypeChange = (value: string) => {
    setFieldData(prev => ({
      ...prev,
      type: value as FieldType,
      // Reset options when changing type
      options: {}
    }));
  };
  
  const handleRequiredChange = (checked: boolean) => {
    setFieldData(prev => ({
      ...prev,
      required: checked
    }));
  };
  
  const handleAIFeatureChange = (feature: 'aiSuggester' | 'aiAutoComplete' | 'aiPrompt' | 'useBrandIdentity' | 'useToneOfVoice' | 'useGuardrails', value: boolean | string) => {
    setFieldData({
      ...fieldData,
      [feature]: value
    });
  };
  
  const handleAIPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFieldData(prev => ({
      ...prev,
      aiPrompt: e.target.value
    }));
  };
  
  const handleOptionsChange = (options: any) => {
    setFieldData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        ...options
      }
    }));
  };
  
  // Validate the field before saving
  const validateField = () => {
    // Basic validations
    if (!fieldData.name.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return false;
    }

    // For output fields, require an AI prompt
    if (fieldType === 'output' && fieldData.aiAutoComplete && (!fieldData.aiPrompt || !fieldData.aiPrompt.trim())) {
      toast({
        title: "Error",
        description: "AI prompt is required for output fields",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateField()) return;
    onSave(fieldData, isNew);
  };
  
  // Field type options
  const inputFieldTypes = [
    { value: 'shortText', label: 'Short Text' },
    { value: 'longText', label: 'Long Text' },
    { value: 'richText', label: 'Rich Text' },
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
  ];
  
  const fieldTypeOptions = fieldType === 'input' ? inputFieldTypes : outputFieldTypes;
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Add' : 'Edit'} {fieldType === 'input' ? 'Input' : 'Output'} Field
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave}>
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="options">Field Options</TabsTrigger>
              <TabsTrigger value="ai">AI Features {fieldType === 'output' && <span className="text-red-500 ml-1">*</span>}</TabsTrigger>
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Title, Description, Keywords"
                  value={fieldData.name}
                  onChange={handleBasicInfoChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select
                  value={fieldData.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="required"
                  checked={fieldData.required}
                  onCheckedChange={handleRequiredChange}
                />
                <Label htmlFor="required">Required field</Label>
              </div>
            </TabsContent>
            
            {/* Field Options Tab */}
            <TabsContent value="options" className="space-y-4 py-4">
              {fieldData.type === 'shortText' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minLength">Minimum Length</Label>
                      <Input
                        id="minLength"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={fieldData.options.minLength || ''}
                        onChange={(e) => handleOptionsChange({ minLength: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLength">Maximum Length</Label>
                      <Input
                        id="maxLength"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={fieldData.options.maxLength || ''}
                        onChange={(e) => handleOptionsChange({ maxLength: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placeholder">Placeholder Text</Label>
                    <Input
                      id="placeholder"
                      placeholder="Enter placeholder text"
                      value={fieldData.options.placeholder || ''}
                      onChange={(e) => handleOptionsChange({ placeholder: e.target.value })}
                    />
                  </div>
                </>
              )}
              
              {fieldData.type === 'longText' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minWords">Minimum Words</Label>
                      <Input
                        id="minWords"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={fieldData.options.minWords || ''}
                        onChange={(e) => handleOptionsChange({ minWords: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxWords">Maximum Words</Label>
                      <Input
                        id="maxWords"
                        type="number"
                        min="1"
                        placeholder="500"
                        value={fieldData.options.maxWords || ''}
                        onChange={(e) => handleOptionsChange({ maxWords: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placeholder">Placeholder Text</Label>
                    <Input
                      id="placeholder"
                      placeholder="Enter placeholder text"
                      value={fieldData.options.placeholder || ''}
                      onChange={(e) => handleOptionsChange({ placeholder: e.target.value })}
                    />
                  </div>
                </>
              )}
              
              {fieldData.type === 'tags' && (
                <div className="space-y-2">
                  <Label htmlFor="maxTags">Maximum Number of Tags</Label>
                  <Input
                    id="maxTags"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={fieldData.options.maxTags || ''}
                    onChange={(e) => handleOptionsChange({ maxTags: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
              
              {fieldData.type === 'select' && (
                <div className="space-y-2">
                  <Label htmlFor="choices">Options (one per line)</Label>
                  <Textarea
                    id="choices"
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    value={Array.isArray(fieldData.options.choices) ? fieldData.options.choices.join('\n') : ''}
                    onChange={(e) => handleOptionsChange({ choices: e.target.value.split('\n').filter(Boolean) })}
                    rows={5}
                  />
                </div>
              )}
              
              {(fieldData.type === 'plainText' || fieldData.type === 'html') && (
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Maximum Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    min="1"
                    placeholder="1000"
                    value={fieldData.options.maxLength || ''}
                    onChange={(e) => handleOptionsChange({ maxLength: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
              
              {/* Add more field-specific options here based on type */}
            </TabsContent>
            
            {/* AI Features Tab */}
            <TabsContent value="ai" className="space-y-4 py-4">
              {fieldType === 'input' ? (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aiSuggester"
                      checked={fieldData.aiSuggester || false}
                      onCheckedChange={(checked) => handleAIFeatureChange('aiSuggester', !!checked)}
                    />
                    <Label htmlFor="aiSuggester">AI Suggestions</Label>
                  </div>
                  
                  {fieldData.aiSuggester && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="aiPrompt">AI Prompt <span className="text-muted-foreground text-xs">(instructions for AI)</span></Label>
                      <Textarea
                        id="aiPrompt"
                        placeholder="Write instructions for the AI suggester, e.g. 'Suggest SEO keywords for this article about {{topic}}'"
                        value={fieldData.aiPrompt || ''}
                        onChange={handleAIPromptChange}
                        className="h-24"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {"{{placeholders}}"} to reference other input fields.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aiAutoComplete"
                      checked={fieldData.aiAutoComplete || false}
                      onCheckedChange={(checked) => handleAIFeatureChange('aiAutoComplete', !!checked)}
                    />
                    <Label htmlFor="aiAutoComplete">AI Auto-Complete</Label>
                  </div>
                  
                  <div className="border-t my-4 pt-4">
                    <p className="text-sm font-medium mb-2">Brand Context Options</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useBrandIdentity"
                          checked={fieldData.useBrandIdentity || false}
                          onCheckedChange={(checked) => handleAIFeatureChange('useBrandIdentity', !!checked)}
                        />
                        <Label htmlFor="useBrandIdentity">Inject Brand Identity</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useToneOfVoice"
                          checked={fieldData.useToneOfVoice || false}
                          onCheckedChange={(checked) => handleAIFeatureChange('useToneOfVoice', !!checked)}
                        />
                        <Label htmlFor="useToneOfVoice">Use Brand Tone of Voice</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useGuardrails"
                          checked={fieldData.useGuardrails || false}
                          onCheckedChange={(checked) => handleAIFeatureChange('useGuardrails', !!checked)}
                        />
                        <Label htmlFor="useGuardrails">Apply Brand Guardrails</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="aiPrompt">
                      AI Prompt <span className="text-destructive">*</span> 
                      <span className="text-muted-foreground text-xs ml-1">(instructions for AI generation)</span>
                    </Label>
                    <Textarea
                      id="aiPrompt"
                      value={fieldData.aiPrompt || ''}
                      onChange={handleAIPromptChange}
                      placeholder="Write a prompt to guide the AI in generating this field content. Use {{input_field_name}} to reference input fields."
                      className="min-h-[100px]"
                      required={true}
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: "Write a blog post about {'{{topic}}'} that is {'{{tone}}'} in tone."
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {isNew ? 'Add' : 'Update'} Field
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 