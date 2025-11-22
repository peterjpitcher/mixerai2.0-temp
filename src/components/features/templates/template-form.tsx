'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldDesigner } from './field-designer';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { AlertCircle, Menu } from 'lucide-react';
import { 
  GenericField as Field,
  InputField, 
  OutputField, 
  ContentTemplate 
} from '@/types/template';
import { apiClient } from '@/lib/api-client-csrf';
import { useBrands } from '@/contexts/brand-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TemplateData = ContentTemplate;

interface TemplateFormProps {
  initialData?: TemplateData;
  isReadOnly?: boolean;
}

const SPECIAL_PLACEHOLDERS = new Set(['rules', 'product name']);

const normalizePlaceholderToken = (token: string) =>
  token
    .trim()
    .toLowerCase()
    .replace(/[\s\u00A0\u2000-\u200B]+/g, ' ')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isSupportedPlaceholder = (placeholder: string, allowed: Set<string>) => {
  if (!placeholder) {
    return true;
  }

  const normalized = normalizePlaceholderToken(placeholder);
  if (!normalized) {
    return true;
  }

  if (allowed.has(normalized)) {
    return true;
  }

  if (SPECIAL_PLACEHOLDERS.has(normalized)) {
    return true;
  }

  if (normalized === 'brand' || normalized.startsWith('brand ')) {
    return true;
  }

  return false;
};

export function TemplateForm({ initialData, isReadOnly = false }: TemplateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [templateData, setTemplateData] = useState<TemplateData>(
    initialData || {
      id: '',
      name: '',
      description: '',
      icon: null,
      brand_id: null,
      inputFields: [], 
      outputFields: [],
      created_at: null,
      created_by: null,
      updated_at: null,
    }
  );
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const { brands, activeBrand, isLoading: isLoadingBrands } = useBrands();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const allowedPlaceholders = useMemo(() => {
    const allowed = new Set<string>();
    const register = (value?: string | null) => {
      if (!value) return;
      const normalized = normalizePlaceholderToken(value);
      if (normalized) {
        allowed.add(normalized);
      }
    };

    (templateData.inputFields || []).forEach(field => {
      register(field.id);
      register(field.name);
    });

    (templateData.outputFields || []).forEach(field => {
      register(field.id);
      register(field.name);
    });

    return allowed;
  }, [templateData.inputFields, templateData.outputFields]);

  useEffect(() => {
    if (isReadOnly) {
      return;
    }

    if (initialData?.id && initialData.id !== 'new') {
      return;
    }

    if (templateData.brand_id) {
      return;
    }

    const candidateBrandId = activeBrand?.id || (brands.length === 1 ? brands[0].id : null);
    if (candidateBrandId) {
      setTemplateData(prev => ({
        ...prev,
        brand_id: candidateBrandId
      }));
    }
  }, [activeBrand?.id, brands, initialData?.id, isReadOnly, templateData.brand_id]);

  const findInvalidPlaceholderReferences = () => {
    const invalid: Array<{ fieldId: string; fieldName: string; placeholder: string; type: 'input' | 'output' }> = [];
    const placeholderPattern = /\{\{([^}]+)\}\}/g;

    const checkFields = (fields: Field[] | undefined, type: 'input' | 'output') => {
      (fields || []).forEach(field => {
        if (!field.aiPrompt) {
          return;
        }

        if (
          (type === 'input' && 'aiSuggester' in field && !(field as InputField).aiSuggester) ||
          (type === 'output' && 'aiAutoComplete' in field && !(field as OutputField).aiAutoComplete)
        ) {
          return;
        }

        placeholderPattern.lastIndex = 0;
        let match;
        while ((match = placeholderPattern.exec(field.aiPrompt)) !== null) {
          const placeholder = match[1]?.trim() ?? '';
          if (!isSupportedPlaceholder(placeholder, allowedPlaceholders)) {
            invalid.push({
              fieldId: field.id,
              fieldName: field.name,
              placeholder,
              type,
            });
          }
        }
      });
    };

    checkFields(templateData.inputFields, 'input');
    checkFields(templateData.outputFields, 'output');

    return invalid;
  };
  

  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddField = () => {
    setIsAddingField(true);
    setEditingField(null);
  };
  
  const handleEditField = (field: Field) => {
    setEditingField(field);
    setIsAddingField(true);
  };
  
  const handleFieldSave = (field: Field, isNew: boolean) => {
    setTemplateData(prev => {
      const listName = activeTab === 'input' ? 'inputFields' : 'outputFields';
      const currentList = prev[listName] || [];
      let updatedList;
      
      if (isNew) {
        updatedList = [...currentList, field];
      } else {
        updatedList = currentList.map(f => 
          f.id === field.id ? field : f
        );
      }
      
      return {
        ...prev,
        [listName]: updatedList
      } as TemplateData;
    });
    
    setIsAddingField(false);
    setEditingField(null);
  };
  
  const handleFieldCancel = () => {
    setIsAddingField(false);
    setEditingField(null);
  };
  
  const handleFieldDelete = (fieldId: string) => {
    setTemplateData(prev => {
      const listName = activeTab === 'input' ? 'inputFields' : 'outputFields';
      const currentList = prev[listName] || [];
      const updatedList = currentList.filter(f => f.id !== fieldId);
      
      return {
        ...prev,
        [listName]: updatedList
      } as TemplateData;
    });
  };
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (activeTab === 'input') {
      const items = Array.from(templateData.inputFields || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem as InputField);
      setTemplateData(prev => ({
        ...prev,
        inputFields: items
      }));
    } else if (activeTab === 'output') {
      const items = Array.from(templateData.outputFields || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem as OutputField);
      setTemplateData(prev => ({
        ...prev,
        outputFields: items
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    
    // Prevent submission in read-only mode
    if (isReadOnly) {
      return;
    }
    
    if (!templateData.name) {
      toast.error('Template name is required');
      return;
    }
    
    if ((templateData.inputFields || []).length === 0) {
      toast.error('At least one input field is required');
      return;
    }
    
    if ((templateData.outputFields || []).length === 0) {
      toast.error('At least one output field is required');
      return;
    }

    const invalidPlaceholders = findInvalidPlaceholderReferences();
    if (invalidPlaceholders.length > 0) {
      const firstInvalid = invalidPlaceholders[0];
      setActiveTab(firstInvalid.type);
      toast.error(`Unknown placeholder "{{${firstInvalid.placeholder}}}" in ${firstInvalid.type} field "${firstInvalid.fieldName}".`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        name: templateData.name,
        description: templateData.description,
        icon: templateData.icon,
        brand_id: templateData.brand_id ?? null,
        inputFields: templateData.inputFields || [],
        outputFields: templateData.outputFields || []
      }; 

      const url = initialData?.id && initialData.id !== 'new'
        ? `/api/content-templates/${initialData.id}` 
        : '/api/content-templates';
      
      const response = initialData?.id && initialData.id !== 'new' 
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${response.status}).`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast.success(initialData?.id && initialData.id !== 'new' ? 'Template updated successfully' : 'Template created successfully');
      
      router.push('/dashboard/templates');
      router.refresh();
    } catch (error: unknown) {
      console.error('Error saving template:', error);
      const message = error instanceof Error ? error.message : 'Failed to save template';
      if (/forbidden|permission/i.test(message)) {
        setSessionError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBrand = templateData.brand_id
    ? brands.find(brand => brand.id === templateData.brand_id) || null
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set the name and description for your template.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={templateData.name} 
              onChange={handleBasicInfoChange} 
              placeholder="e.g., Blog Post Template"
              required 
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={templateData.description || ''} 
              onChange={handleBasicInfoChange} 
              placeholder="A brief description of what this template is for."
            />
          </div>
          <div>
            <Label htmlFor="brand-select">Brand Assignment</Label>
            {isReadOnly ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedBrand ? selectedBrand.name : (templateData.brand_id || 'No brand (available to all teams)')}
              </p>
            ) : (
              <Select
                value={templateData.brand_id ?? 'none'}
                onValueChange={(value) => {
                  setTemplateData(prev => ({
                    ...prev,
                    brand_id: value === 'none' ? null : value
                  }));
                }}
                disabled={isSubmitting || isLoadingBrands}
              >
                <SelectTrigger id="brand-select">
                  <SelectValue placeholder={isLoadingBrands ? 'Loading brands…' : 'Select a brand'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No brand (available to all teams)</SelectItem>
                  {templateData.brand_id && !selectedBrand && (
                    <SelectItem value={templateData.brand_id} disabled>
                      {templateData.brand_id} (no longer accessible)
                    </SelectItem>
                  )}
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isReadOnly && (
              <p className="mt-2 text-xs text-muted-foreground">
                Assign a brand when this template should only be used within that brand&apos;s workspace.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Configuration</CardTitle>
          <CardDescription>Define the input and output fields for this template.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">Input Fields</TabsTrigger>
              <TabsTrigger value="output">Output Fields</TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="mt-4">
              <FieldList 
                fields={templateData.inputFields || []} 
                onAddField={isReadOnly ? undefined : handleAddField} 
                onEditField={isReadOnly ? undefined : handleEditField} 
                onDeleteField={isReadOnly ? undefined : handleFieldDelete} 
                onDragEnd={isReadOnly ? undefined : handleDragEnd} 
                fieldType="input"
                isReadOnly={isReadOnly}
              />
            </TabsContent>
            <TabsContent value="output" className="mt-4">
              <FieldList 
                fields={templateData.outputFields || []} 
                onAddField={isReadOnly ? undefined : handleAddField} 
                onEditField={isReadOnly ? undefined : handleEditField} 
                onDeleteField={isReadOnly ? undefined : handleFieldDelete} 
                onDragEnd={isReadOnly ? undefined : handleDragEnd} 
                fieldType="output"
                isReadOnly={isReadOnly}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isAddingField && (
        <FieldDesigner 
          isOpen={isAddingField}
          initialData={editingField} 
          onSave={handleFieldSave} 
          onCancel={handleFieldCancel} 
          availableInputFields={(templateData.inputFields || []).map(f => ({ id: f.id, name: f.name }))}
          fieldType={activeTab as 'input' | 'output'}
        />
      )}

      {sessionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Permission issue</AlertTitle>
          <AlertDescription>{sessionError}</AlertDescription>
        </Alert>
      )}

      <CardFooter className="flex justify-end space-x-2 pt-6">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/templates')}>
          {isReadOnly ? 'Back' : 'Cancel'}
        </Button>
        {!isReadOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData?.id && initialData.id !== 'new' ? 'Save Changes' : 'Create Template'}
          </Button>
        )}
      </CardFooter>
    </form>
  );
}

interface FieldListProps {
  fields: Field[];
  onAddField?: () => void;
  onEditField?: (field: Field) => void;
  onDeleteField?: (fieldId: string) => void;
  onDragEnd?: (result: DropResult) => void;
  fieldType: 'input' | 'output';
  isReadOnly?: boolean;
}

function FieldList({ fields, onAddField, onEditField, onDeleteField, onDragEnd, fieldType, isReadOnly = false }: FieldListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (onDragEnd && !isReadOnly) {
      onDragEnd(result);
    }
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={fieldType}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {fields.map((field, index) => (
              <Draggable key={field.id} draggableId={field.id} index={index}>
                {(providedDraggable) => (
                  <div 
                    ref={providedDraggable.innerRef} 
                    {...providedDraggable.draggableProps} 
                    className="p-3 border rounded-md bg-background shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <button {...providedDraggable.dragHandleProps} className="p-1 mr-2 text-muted-foreground hover:text-foreground">
                        <Menu size={18} />
                      </button>
                      <div>
                        <p className="font-medium">{field.name}</p>
                        <p className="text-xs text-muted-foreground">Type: {field.type} {field.required ? '(Required)' : ''}</p>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <div className="space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditField && onEditField(field)}>Edit</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => onDeleteField && onDeleteField(field.id)}>Delete</Button>
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {!isReadOnly && onAddField && (
              <Button type="button" variant="outline" onClick={onAddField} className="w-full mt-4">
                <Icons.plus className="mr-2 h-4 w-4" /> Add {fieldType === 'input' ? 'Input' : 'Output'} Field
              </Button>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
} 
