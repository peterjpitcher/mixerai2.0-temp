import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShortTextOptions } from '@/types/template';

interface ShortTextOptionsComponentProps {
  options: ShortTextOptions;
  onChange: (options: ShortTextOptions) => void;
}

export function ShortTextOptionsComponent({ options, onChange }: ShortTextOptionsComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="placeholder">Placeholder Text</Label>
        <Input
          id="placeholder"
          value={options.placeholder || ''}
          onChange={(e) => onChange({ ...options, placeholder: e.target.value })}
          placeholder="Enter placeholder text"
        />
      </div>
      <div>
        <Label htmlFor="maxLength">Maximum Length</Label>
        <Input
          id="maxLength"
          type="number"
          value={options.maxLength || ''}
          onChange={(e) => onChange({ ...options, maxLength: parseInt(e.target.value) || undefined })}
          placeholder="No limit"
        />
      </div>
      <div>
        <Label htmlFor="minLength">Minimum Length</Label>
        <Input
          id="minLength"
          type="number"
          value={options.minLength || ''}
          onChange={(e) => onChange({ ...options, minLength: parseInt(e.target.value) || undefined })}
          placeholder="No minimum"
        />
      </div>
    </div>
  );
}