import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectOptions } from '@/types/template';
import { PlusCircle, X } from 'lucide-react';

interface SelectOptionsComponentProps {
  options: SelectOptions;
  onChange: (options: SelectOptions) => void;
}

export function SelectOptionsComponent({ options, onChange }: SelectOptionsComponentProps) {
  const [newOption, setNewOption] = useState({ label: '', value: '' });
  const choices = options.choices || [];

  const addOption = () => {
    if (newOption.label && newOption.value) {
      onChange({
        ...options,
        choices: [...choices, { ...newOption }]
      });
      setNewOption({ label: '', value: '' });
    }
  };

  const removeOption = (index: number) => {
    onChange({
      ...options,
      choices: choices.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Options</Label>
        <div className="space-y-2 mt-2">
          {choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={choice.label}
                onChange={(e) => {
                  const newChoices = [...choices];
                  newChoices[index] = { ...choice, label: e.target.value };
                  onChange({ ...options, choices: newChoices });
                }}
                placeholder="Label"
                className="flex-1"
              />
              <Input
                value={choice.value}
                onChange={(e) => {
                  const newChoices = [...choices];
                  newChoices[index] = { ...choice, value: e.target.value };
                  onChange({ ...options, choices: newChoices });
                }}
                placeholder="Value"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Add New Option</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={newOption.label}
            onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
            placeholder="Label"
            className="flex-1"
          />
          <Input
            value={newOption.value}
            onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
            placeholder="Value"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={!newOption.label || !newOption.value}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}