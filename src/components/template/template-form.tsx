'use client';

import { useState } from 'react';
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

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  fields: {
    inputFields: InputField[];
    outputFields: OutputField[];
  };
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
      name: '',
      description: '',
      fields: {
        inputFields: [],
        outputFields: []
      }
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
        // Add new field
        updatedFields = [...prev.fields[fieldsList], field];
      } else {
        // Update existing field
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
    } else {
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
    
    // Validate form
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
      
      const url = initialData 
        ? `/api/content-templates/${initialData.id}` 
        : '/api/content-templates';
      
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save template');
      }
      
      toast(initialData ? 'Template updated successfully' : 'Template created successfully');
      
      router.push('/dashboard/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Define your template's basic information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Article Template"
                value={templateData.name}
                onChange={handleBasicInfoChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Briefly describe what this template is for"
                value={templateData.description}
                onChange={handleBasicInfoChange}
              />
            </div>
          </CardContent>
        </Card>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Input Fields ({templateData.fields.inputFields.length})</TabsTrigger>
            <TabsTrigger value="output">Output Fields ({templateData.fields.outputFields.length})</TabsTrigger>
          </TabsList>
          
          {(activeTab === 'input' || activeTab === 'output') && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{activeTab === 'input' ? 'Input' : 'Output'} Fields</CardTitle>
                <CardDescription>
                  Define the {activeTab === 'input' ? 'information needed to generate content' : 'content sections to be generated'}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAddingField ? (
                  <FieldDesigner 
                    isOpen={isAddingField}
                    fieldType={activeTab === 'input' ? 'input' : 'output'}
                    availableInputFields={templateData.fields.inputFields.map(f => ({ id: f.id, name: f.name }))}
                    initialData={editingField}
                    templateId={templateData.id}
                    onSave={handleFieldSave}
                    onCancel={handleFieldCancel}
                  />
                ) : (
                  <>                  
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="fields">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-4"
                          >
                            {(activeTab === 'input' ? templateData.fields.inputFields : templateData.fields.outputFields).map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Menu className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium">{field.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          Type: {field.type} {field.required ? ' (Required)' : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-x-2">
                                      <Button variant="outline" size="sm" onClick={() => handleEditField(field)}>
                                        Edit
                                      </Button>
                                      <Button variant="destructive" size="sm" onClick={() => handleFieldDelete(field.id)}>
                                        Delete
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
                    <Button variant="outline" className="mt-6 w-full" onClick={handleAddField}>
                      <Icons.plus className="mr-2 h-4 w-4" /> Add Field
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Tabs>
        
        <div className="flex justify-end pt-6 space-x-4">
          <Button variant="outline" type="button" onClick={() => router.push('/dashboard/templates')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </form>
    </div>
  );
} 