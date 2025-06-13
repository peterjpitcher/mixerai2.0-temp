'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from './rich-text-editor';
import type { OutputField } from '@/types/template';

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
    <Card>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
        <CardDescription>
          Review and edit the AI-generated content below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {aiError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md">
            <p className="text-sm font-medium">Generation Error</p>
            <p className="text-sm mt-1">{aiError}</p>
          </div>
        )}
        
        {outputFields.map((field) => {
          const value = generatedOutputs[field.id] || '';
          const isRetrying = retryingFieldId === field.id;
          
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{field.name}</Label>
                {field.aiAutoComplete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetry(field.id)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Regenerating..." : "Regenerate"}
                  </Button>
                )}
              </div>
              
              {field.type === 'richText' ? (
                <RichTextEditor
                  value={value}
                  onChange={(content) => onOutputChange(field.id, content)}
                  placeholder="Generated content will appear here"
                />
              ) : (
                <div className="p-4 border rounded-md bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{value || 'No content generated'}</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}