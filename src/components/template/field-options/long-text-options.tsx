import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LongTextOptions } from '@/types/template';

interface LongTextOptionsComponentProps {
  options: LongTextOptions;
  onChange: (options: LongTextOptions) => void;
}

export function LongTextOptionsComponent({ options, onChange }: LongTextOptionsComponentProps) {
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
        <Label htmlFor="rows">Number of Rows</Label>
        <Input
          id="rows"
          type="number"
          value={options.rows || 4}
          onChange={(e) => onChange({ ...options, rows: parseInt(e.target.value) || 4 })}
          min={2}
          max={20}
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
    </div>
  );
}