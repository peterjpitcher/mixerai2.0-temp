'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FieldDesigner as FieldDesignerContent } from './field-designer-refactored';
import { GenericField as Field } from '@/types/template';

interface FieldDesignerProps {
  isOpen: boolean;
  fieldType: 'input' | 'output';
  initialData: Field | null;
  availableInputFields?: Array<{ id: string; name: string | null }>;
  templateId?: string;
  onSave: (field: Field, isNew: boolean) => void;
  onCancel: () => void;
}

export function FieldDesigner({
  isOpen,
  fieldType,
  initialData,
  availableInputFields = [],
  onSave,
  onCancel
}: FieldDesignerProps) {
  const handleSave = (field: Field) => {
    onSave(field, !initialData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <FieldDesignerContent
          fieldType={fieldType}
          field={initialData}
          availableInputFields={availableInputFields}
          onSave={handleSave}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}