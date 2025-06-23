'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QuillEditor } from './quill-editor';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { OutputField } from '@/types/template';
import 'quill/dist/quill.snow.css';

interface GeneratedContentPreviewProps {
  generatedOutputs: Record<string, string>;
  outputFields: OutputField[];
  onOutputChange: (fieldId: string, value: string) => void;
  onRetry: (fieldId: string) => void;
  retryingFieldId: string | null;
  aiError: string | null;
}

export function GeneratedContentPreview({
  generatedOutputs,
  outputFields,
  onOutputChange,
  onRetry,
  retryingFieldId,
  aiError
}: GeneratedContentPreviewProps) {
  if (!outputFields.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Generation Error</p>
            <p className="text-sm mt-1">{aiError}</p>
          </div>
        </div>
      )}
      
      {outputFields.map((field) => {
        const value = generatedOutputs[field.id] || '';
        const isRetrying = retryingFieldId === field.id;
        const hasContent = value && value.trim().length > 0;
        
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>{field.name}</Label>
                {!hasContent && field.aiAutoComplete && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">• Missing content</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRetry(field.id)}
                disabled={isRetrying}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
            
            {field.type === 'richText' ? (
              <QuillEditor
                key={`${field.id}-${value?.length || 0}`} // Force remount on content changes
                value={value}
                onChange={(content) => onOutputChange(field.id, content)}
                placeholder="Generated content will appear here"
              />
            ) : (
              <div className={`p-4 border rounded-md ${hasContent ? 'bg-muted/50' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                <p className="text-sm whitespace-pre-wrap">
                  {value || (
                    <span className="text-muted-foreground italic">
                      No content generated - click Regenerate to generate this field
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}