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
import { useToast } from '@/components/use-toast';
import { FieldDesigner } from './field-designer';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Icons } from '@/components/icons';

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
}

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  fields: {
    inputFields: Field[];
    outputFields: Field[];
  };
}

interface TemplateFormProps {
  initialData?: TemplateData;
}

export function TemplateForm({ initialData }: TemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
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
    const fieldsList = activeTab === 'input' ? 'inputFields' : 'outputFields';
    const items = Array.from(templateData.fields[fieldsList]);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);
    
    setTemplateData(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldsList]: items
      }
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!templateData.name) {
      toast({
        title: 'Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (templateData.fields.inputFields.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one input field is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (templateData.fields.outputFields.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one output field is required',
        variant: 'destructive',
      });
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
      
      toast({
        title: initialData ? 'Template updated' : 'Template created',
        description: initialData 
          ? 'Your template has been updated successfully'
          : 'Your new template has been created successfully',
      });
      
      router.push('/dashboard/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive',
      });
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
                placeholder="Describe what this template is used for"
                value={templateData.description}
                onChange={handleBasicInfoChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Configuration</CardTitle>
              <CardDescription>
                Configure the input and output fields for your template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="input"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="input">Input Fields</TabsTrigger>
                  <TabsTrigger value="output">Output Fields</TabsTrigger>
                </TabsList>
                
                <TabsContent value="input" className="py-4">
                  <div className="mb-4">
                    <Button type="button" onClick={handleAddField}>
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Add Input Field
                    </Button>
                  </div>
                  
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="input-fields">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {templateData.fields.inputFields.length > 0 ? (
                            templateData.fields.inputFields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-between p-3 border rounded-md bg-card"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="text-muted-foreground">
                                        <svg
                                          width="15"
                                          height="15"
                                          viewBox="0 0 15 15"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4"
                                        >
                                          <path
                                            d="M5.5 4.625C5.5 4.97018 5.22018 5.25 4.875 5.25C4.52982 5.25 4.25 4.97018 4.25 4.625C4.25 4.27982 4.52982 4 4.875 4C5.22018 4 5.5 4.27982 5.5 4.625ZM5.5 7.625C5.5 7.97018 5.22018 8.25 4.875 8.25C4.52982 8.25 4.25 7.97018 4.25 7.625C4.25 7.27982 4.52982 7 4.875 7C5.22018 7 5.5 7.27982 5.5 7.625ZM4.875 11.25C5.22018 11.25 5.5 10.9702 5.5 10.625C5.5 10.2798 5.22018 10 4.875 10C4.52982 10 4.25 10.2798 4.25 10.625C4.25 10.9702 4.52982 11.25 4.875 11.25Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                          ></path>
                                          <path
                                            d="M10.5 4.625C10.5 4.97018 10.2202 5.25 9.875 5.25C9.52982 5.25 9.25 4.97018 9.25 4.625C9.25 4.27982 9.52982 4 9.875 4C10.2202 4 10.5 4.27982 10.5 4.625ZM10.5 7.625C10.5 7.97018 10.2202 8.25 9.875 8.25C9.52982 8.25 9.25 7.97018 9.25 7.625C9.25 7.27982 9.52982 7 9.875 7C10.2202 7 10.5 7.27982 10.5 7.625ZM9.875 11.25C10.2202 11.25 10.5 10.9702 10.5 10.625C10.5 10.2798 10.2202 10 9.875 10C9.52982 10 9.25 10.2798 9.25 10.625C9.25 10.9702 9.52982 11.25 9.875 11.25Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                          ></path>
                                        </svg>
                                      </div>
                                      <div>
                                        <div className="font-medium">{field.name}</div>
                                        <div className="text-sm text-muted-foreground flex items-center">
                                          <span className="capitalize">{field.type}</span>
                                          {field.required && (
                                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                              Required
                                            </span>
                                          )}
                                          {field.aiSuggester && (
                                            <span className="ml-2 text-xs bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                                              AI Suggester
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditField(field)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleFieldDelete(field.id)}
                                      >
                                        <Icons.trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No input fields added yet. Click the "Add Input Field" button to add one.
                              </p>
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </TabsContent>
                
                <TabsContent value="output" className="py-4">
                  <div className="mb-4">
                    <Button type="button" onClick={handleAddField}>
                      <Icons.plus className="mr-2 h-4 w-4" />
                      Add Output Field
                    </Button>
                  </div>
                  
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="output-fields">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {templateData.fields.outputFields.length > 0 ? (
                            templateData.fields.outputFields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-between p-3 border rounded-md bg-card"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="text-muted-foreground">
                                        <svg
                                          width="15"
                                          height="15"
                                          viewBox="0 0 15 15"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4"
                                        >
                                          <path
                                            d="M5.5 4.625C5.5 4.97018 5.22018 5.25 4.875 5.25C4.52982 5.25 4.25 4.97018 4.25 4.625C4.25 4.27982 4.52982 4 4.875 4C5.22018 4 5.5 4.27982 5.5 4.625ZM5.5 7.625C5.5 7.97018 5.22018 8.25 4.875 8.25C4.52982 8.25 4.25 7.97018 4.25 7.625C4.25 7.27982 4.52982 7 4.875 7C5.22018 7 5.5 7.27982 5.5 7.625ZM4.875 11.25C5.22018 11.25 5.5 10.9702 5.5 10.625C5.5 10.2798 5.22018 10 4.875 10C4.52982 10 4.25 10.2798 4.25 10.625C4.25 10.9702 4.52982 11.25 4.875 11.25Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                          ></path>
                                          <path
                                            d="M10.5 4.625C10.5 4.97018 10.2202 5.25 9.875 5.25C9.52982 5.25 9.25 4.97018 9.25 4.625C9.25 4.27982 9.52982 4 9.875 4C10.2202 4 10.5 4.27982 10.5 4.625ZM10.5 7.625C10.5 7.97018 10.2202 8.25 9.875 8.25C9.52982 8.25 9.25 7.97018 9.25 7.625C9.25 7.27982 9.52982 7 9.875 7C10.2202 7 10.5 7.27982 10.5 7.625ZM9.875 11.25C10.2202 11.25 10.5 10.9702 10.5 10.625C10.5 10.2798 10.2202 10 9.875 10C9.52982 10 9.25 10.2798 9.25 10.625C9.25 10.9702 9.52982 11.25 9.875 11.25Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                          ></path>
                                        </svg>
                                      </div>
                                      <div>
                                        <div className="font-medium">{field.name}</div>
                                        <div className="text-sm text-muted-foreground flex items-center">
                                          <span className="capitalize">{field.type}</span>
                                          {field.required && (
                                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                              Required
                                            </span>
                                          )}
                                          {field.aiAutoComplete && (
                                            <span className="ml-2 text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                              AI Auto-Complete
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditField(field)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleFieldDelete(field.id)}
                                      >
                                        <Icons.trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                No output fields added yet. Click the "Add Output Field" button to add one.
                              </p>
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-5">
              <Button variant="outline" type="button" onClick={() => router.push('/dashboard/templates')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Template'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
      
      {isAddingField && (
        <FieldDesigner
          isOpen={isAddingField}
          fieldType={activeTab === 'input' ? 'input' : 'output'}
          initialData={editingField}
          onSave={handleFieldSave}
          onCancel={handleFieldCancel}
        />
      )}
    </div>
  );
} 