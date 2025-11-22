import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextOptions } from '@/types/template';

interface RichTextOptionsComponentProps {
  options: RichTextOptions;
  onChange: (options: RichTextOptions) => void;
}

export function RichTextOptionsComponent({ options, onChange }: RichTextOptionsComponentProps) {
  const toolbarOptions = [
    { id: 'bold', label: 'Bold' },
    { id: 'italic', label: 'Italic' },
    { id: 'underline', label: 'Underline' },
    { id: 'strike', label: 'Strikethrough' },
    { id: 'link', label: 'Links' },
    { id: 'lists', label: 'Lists' },
    { id: 'headings', label: 'Headings' },
    { id: 'blockquote', label: 'Blockquote' },
    { id: 'code', label: 'Code' },
    { id: 'image', label: 'Images' },
  ];

  const enabledTools = options.toolbarOptions || ['bold', 'italic', 'link', 'lists'];

  const handleToolToggle = (toolId: string, checked: boolean) => {
    const newTools = checked
      ? [...enabledTools, toolId]
      : enabledTools.filter(t => t !== toolId);
    
    onChange({ ...options, toolbarOptions: newTools });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Toolbar Options</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {toolbarOptions.map(tool => (
            <div key={tool.id} className="flex items-center space-x-2">
              <Checkbox
                id={tool.id}
                checked={enabledTools.includes(tool.id)}
                onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
              />
              <Label htmlFor={tool.id} className="text-sm font-normal">
                {tool.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}