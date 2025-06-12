import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumberOptions } from '@/types/template';

interface NumberOptionsComponentProps {
  options: NumberOptions;
  onChange: (options: NumberOptions) => void;
}

export function NumberOptionsComponent({ options, onChange }: NumberOptionsComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="min">Minimum Value</Label>
        <Input
          id="min"
          type="number"
          value={options.min ?? ''}
          onChange={(e) => onChange({ ...options, min: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="No minimum"
        />
      </div>
      <div>
        <Label htmlFor="max">Maximum Value</Label>
        <Input
          id="max"
          type="number"
          value={options.max ?? ''}
          onChange={(e) => onChange({ ...options, max: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="No maximum"
        />
      </div>
      <div>
        <Label htmlFor="step">Step</Label>
        <Input
          id="step"
          type="number"
          value={options.step ?? 1}
          onChange={(e) => onChange({ ...options, step: parseFloat(e.target.value) || 1 })}
          min={0}
        />
      </div>
    </div>
  );
}