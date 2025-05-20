'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { ScrollArea } from '@/components/scroll-area';
import { FieldDesigner } from './field-designer';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { Menu } from 'lucide-react';
import { 
  FieldType as GlobalFieldType,
  GenericField as Field,
  InputField, 
  OutputField, 
  ContentTemplate 
} from '@/types/template';

interface TemplateData extends ContentTemplate {
  // id, name, description, icon, fields, brand_id?, created_at, created_by, updated_at
}

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
      brand_id: null, // Keep brand_id for data model consistency, but don't use for UI logic here
      fields: {
        inputFields: [],
        outputFields: []
      },
      created_at: null,
      created_by: null,
      updated_at: null,
    }
  );
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);

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
      const fieldsList = activeTab === 'input' ? 'inputFields' : 'outputFields';
      let updatedFields;
      
      if (isNew) {
        updatedFields = [...prev.fields[fieldsList], field];
      } else {
        updatedFields = prev.fields[fieldsList].map(f => 
          f.id === field.id ? field : f
        );
      }
      
      return {
        ...prev,
        fields: {
          ...prev.fields,
          [fieldsList]: updatedFields
        }
      };
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
      const fieldsList = activeTab === 'input' ? 'inputFields' : 'outputFields';
      const updatedFields = prev.fields[fieldsList].filter(f => f.id !== fieldId);
      
      return {
        ...prev,
        fields: {
          ...prev.fields,
          [fieldsList]: updatedFields
        }
      };
    });
  };
  
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (activeTab === 'input') {
      const items = Array.from(templateData.fields.inputFields);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem as InputField);
      setTemplateData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          inputFields: items
        }
      }));
    } else if (activeTab === 'output') {
      const items = Array.from(templateData.fields.outputFields);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem as OutputField);
      setTemplateData(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          outputFields: items
        }
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateData.name) {
      toast.error('Template name is required');
      return;
    }
    
    if (templateData.fields.inputFields.length === 0) {
      toast.error('At least one input field is required');
      return;
    }
    
    if (templateData.fields.outputFields.length === 0) {
      toast.error('At least one output field is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const payload = { ...templateData }; 
      if (payload.brand_id === undefined) {
          payload.brand_id = null;
      }

      const url = initialData?.id && initialData.id !== 'new'
        ? `/api/content-templates/${initialData.id}` 
        : '/api/content-templates';
      
      const method = initialData?.id && initialData.id !== 'new' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast.success(initialData?.id && initialData.id !== 'new' ? 'Template updated successfully' : 'Template created successfully');
      
      router.push('/dashboard/templates');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Set the name and description for your template.</CardDescription>
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
              <ScrollArea className="h-72 pr-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="inputFields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {templateData.fields.inputFields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps}
                                className="p-3 border rounded-md flex justify-between items-center bg-card hover:bg-muted/50"
                              >
                                <div>
                                  <p className="font-medium">{field.name || '(Untitled Field)'}</p>
                                  <p className="text-xs text-muted-foreground">Type: {field.type} {field.required ? '| Required' : ''}</p>
                                </div>
                                <div className="space-x-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => handleEditField(field)}>Edit</Button>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => handleFieldDelete(field.id)}>
                                    <Icons.trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </ScrollArea>
              <Button type="button" variant="outline" onClick={handleAddField} className="mt-4">Add Input Field</Button>
            </TabsContent>
            <TabsContent value="output" className="mt-4">
              <ScrollArea className="h-72 pr-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="outputFields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {templateData.fields.outputFields.map((field, index) => (
                           <Draggable key={field.id} draggableId={field.id} index={index}>
                           {(provided) => (
                             <div 
                               ref={provided.innerRef} 
                               {...provided.draggableProps} 
                               {...provided.dragHandleProps}
                               className="p-3 border rounded-md flex justify-between items-center bg-card hover:bg-muted/50"
                             >
                               <div>
                                 <p className="font-medium">{field.name || '(Untitled Field)'}</p>
                                 <p className="text-xs text-muted-foreground">Type: {field.type} {field.required ? '| Required' : ''}</p>
                               </div>
                               <div className="space-x-2">
                                 <Button type="button" variant="outline" size="sm" onClick={() => handleEditField(field)}>Edit</Button>
                                 <Button type="button" variant="ghost" size="icon" onClick={() => handleFieldDelete(field.id)}>
                                   <Icons.trash className="h-4 w-4" />
                                 </Button>
                               </div>
                             </div>
                           )}
                         </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </ScrollArea>
              <Button type="button" variant="outline" onClick={handleAddField} className="mt-4">Add Output Field</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isAddingField && (
        <FieldDesigner 
          isOpen={isAddingField} 
          fieldType={activeTab as 'input' | 'output'}
          initialData={editingField}
          onSave={handleFieldSave}
          onCancel={handleFieldCancel}
          availableInputFields={templateData.fields.inputFields.map(f => ({ id: f.id, name: f.name }))}
          templateId={templateData.id}
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