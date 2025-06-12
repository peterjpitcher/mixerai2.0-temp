import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  FieldType as GlobalFieldType,
  GenericField as Field,
  InputField,
  OutputField,
} from '@/types/template';

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

export function useFieldDesigner(
  fieldType: 'input' | 'output',
  initialData: Field | null
) {
  const isNew = !initialData;
  const [fieldData, setFieldData] = useState<Field>(
    initialData ? 
      {...initialData, options: initialData.options || {}} : 
      getDefaultField(fieldType)
  );
  
  useEffect(() => {
    if (initialData) {
      setFieldData({...initialData, options: initialData.options || {}});
    } else {
      setFieldData(getDefaultField(fieldType));
    }
  }, [initialData, fieldType]);
  
  const handleBasicInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldData(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleTypeChange = useCallback((value: string) => {
    const newType = value as GlobalFieldType;
    setFieldData(prev => {
      const basePrev = { ...prev };
      const base = {
        id: basePrev.id,
        name: basePrev.name,
        type: newType,
        required: basePrev.required,
        options: {},
        aiPrompt: basePrev.aiPrompt || '',
      };
      
      if (fieldType === 'input') {
        return {
          ...base,
          aiSuggester: (basePrev as InputField).aiSuggester || false,
        } as InputField;
      } else {
        const outputPrev = basePrev as OutputField;
        return {
          ...base,
          aiAutoComplete: outputPrev.aiAutoComplete !== undefined ? outputPrev.aiAutoComplete : true,
          useBrandIdentity: outputPrev.useBrandIdentity || false,
          useToneOfVoice: outputPrev.useToneOfVoice || false,
          useGuardrails: outputPrev.useGuardrails || false,
        } as OutputField;
      }
    });
  }, [fieldType]);
  
  const handleRequiredChange = useCallback((checked: boolean) => {
    setFieldData(prev => ({ ...prev, required: checked }));
  }, []);
  
  const handleAIFeatureChange = useCallback((
    feature: 'aiSuggester' | 'aiAutoComplete' | 'useBrandIdentity' | 'useToneOfVoice' | 'useGuardrails',
    checked: boolean
  ) => {
    setFieldData(prev => {
      const updatedField = { ...prev } as Field;
      if (fieldType === 'input' && feature === 'aiSuggester') {
        (updatedField as InputField).aiSuggester = checked;
      } else if (fieldType === 'output') {
        const outputField = updatedField as OutputField;
        if (feature === 'aiAutoComplete') outputField.aiAutoComplete = checked;
        if (feature === 'useBrandIdentity') outputField.useBrandIdentity = checked;
        if (feature === 'useToneOfVoice') outputField.useToneOfVoice = checked;
        if (feature === 'useGuardrails') outputField.useGuardrails = checked;
      }
      return updatedField;
    });
  }, [fieldType]);
  
  const handleAIPromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFieldData(prev => ({ ...prev, aiPrompt: e.target.value }));
  }, []);
  
  const handleOptionsChange = useCallback((newOptions: any) => {
    setFieldData(prev => ({ ...prev, options: newOptions }));
  }, []);
  
  const insertTextIntoPrompt = useCallback((textToInsert: string, textArea: HTMLTextAreaElement | null) => {
    if (!textArea) return;
    
    const currentPrompt = textArea.value || '';
    const selectionStart = textArea.selectionStart ?? currentPrompt.length;
    const selectionEnd = textArea.selectionEnd ?? currentPrompt.length;
    
    const newPrompt = 
      currentPrompt.slice(0, selectionStart) + 
      textToInsert + 
      currentPrompt.slice(selectionEnd);
    
    setFieldData(prev => ({ ...prev, aiPrompt: newPrompt }));
    
    setTimeout(() => {
      const newCursorPosition = selectionStart + textToInsert.length;
      textArea.setSelectionRange(newCursorPosition, newCursorPosition);
      textArea.focus();
    }, 0);
  }, []);
  
  const validateField = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!fieldData.name.trim()) {
      errors.push('Field name is required');
    }
    
    if (fieldData.type === 'select' || fieldData.type === 'multiselect') {
      const selectOptions = fieldData.options as any;
      if (!selectOptions.choices || selectOptions.choices.length === 0) {
        errors.push('Select fields must have at least one option');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }, [fieldData]);
  
  return {
    fieldData,
    isNew,
    setFieldData,
    handleBasicInfoChange,
    handleTypeChange,
    handleRequiredChange,
    handleAIFeatureChange,
    handleAIPromptChange,
    handleOptionsChange,
    insertTextIntoPrompt,
    validateField,
  };
}