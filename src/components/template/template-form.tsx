'use client';

import { useState, useEffect } from 'react';
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
import { Menu } from 'lucide-react';
import { 
  GenericField as Field,
  InputField, 
  OutputField, 
  ContentTemplate 
} from '@/types/template';
import { useFormPersistence } from '@/hooks/use-form-persistence';

type TemplateData = ContentTemplate;

interface TemplateFormProps {
  initialData?: TemplateData;
}

export function TemplateForm({ initialData }: TemplateFormProps) {
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
  
  // Form persistence
  const { restoreFormData, clearSavedData } = useFormPersistence(templateData, {
    storageKey: `template-form-${initialData?.id || 'new'}`,
    debounceMs: 2000,
    excludeFields: ['id', 'created_at', 'created_by', 'updated_at'],
    onRestore: (data) => {
      setTemplateData(data);
      toast.info('Form data restored from previous session');
    }
  });
  
  // Restore data on mount
  useEffect(() => {
    if (!initialData) { // Only restore for new templates
      restoreFormData();
    }
  }, [restoreFormData, initialData]);

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
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        name: templateData.name,
        description: templateData.description,
        icon: templateData.icon,
        brand_id: templateData.brand_id === undefined ? null : templateData.brand_id, 
        inputFields: templateData.inputFields || [],
        outputFields: templateData.outputFields || []
      }; 

      const url = initialData?.id && initialData.id !== 'new'
        ? `/api/content-templates/${initialData.id}` 
        : '/api/content-templates';
      
      const method = initialData?.id && initialData.id !== 'new' ? 'PUT' : 'POST';
      
      console.log('[DEBUG] Template Save Request:', {
        url,
        method,
        payload,
        timestamp: new Date().toISOString()
      });
      
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      console.log('[DEBUG] CSRF Token:', csrfToken ? 'Found' : 'Not found');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '', // Add CSRF token to headers
        },
        body: JSON.stringify(payload),
      });
      
      console.log('[DEBUG] Template Save Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        ok: response.ok
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[DEBUG] Non-JSON Response Body:', text);
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
      }
      
      const data = await response.json();
      console.log('[DEBUG] Parsed Response Data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast.success(initialData?.id && initialData.id !== 'new' ? 'Template updated successfully' : 'Template created successfully');
      
      clearSavedData(); // Clear persisted data after successful save
      router.push('/dashboard/templates');
      router.refresh();
    } catch (error: unknown) {
      console.error('Error saving template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set the name and description for your template.</CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              Auto-save enabled
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
                onAddField={handleAddField} 
                onEditField={handleEditField} 
                onDeleteField={handleFieldDelete} 
                onDragEnd={handleDragEnd} 
                fieldType="input"
              />
            </TabsContent>
            <TabsContent value="output" className="mt-4">
              <FieldList 
                fields={templateData.outputFields || []} 
                onAddField={handleAddField} 
                onEditField={handleEditField} 
                onDeleteField={handleFieldDelete} 
                onDragEnd={handleDragEnd} 
                fieldType="output"
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

      <CardFooter className="flex justify-end space-x-2 pt-6">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/templates')}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
          {initialData?.id && initialData.id !== 'new' ? 'Save Changes' : 'Create Template'}
        </Button>
      </CardFooter>
    </form>
  );
}

interface FieldListProps {
  fields: Field[];
  onAddField: () => void;
  onEditField: (field: Field) => void;
  onDeleteField: (fieldId: string) => void;
  onDragEnd: (result: DropResult) => void;
  fieldType: 'input' | 'output';
}

function FieldList({ fields, onAddField, onEditField, onDeleteField, onDragEnd, fieldType }: FieldListProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
                    <div className="space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onEditField(field)}>Edit</Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => onDeleteField(field.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <Button type="button" variant="outline" onClick={onAddField} className="w-full mt-4">
              <Icons.plus className="mr-2 h-4 w-4" /> Add {fieldType === 'input' ? 'Input' : 'Output'} Field
            </Button>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
} 