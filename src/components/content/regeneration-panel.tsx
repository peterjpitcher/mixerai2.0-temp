'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface RegenerationPanelProps {
  contentId: string;
  currentStepName?: string;
  canRegenerate: boolean;
  outputFields?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  onRegenerationComplete: () => void;
}

export function RegenerationPanel({
  contentId,
  currentStepName,
  canRegenerate,
  outputFields = [],
  onRegenerationComplete
}: RegenerationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['body']);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationType, setRegenerationType] = useState<'sections' | 'fields'>('sections');

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for regeneration');
      return;
    }

    setIsRegenerating(true);
    
    try {
      const payload: { 
        feedback?: string; 
        sections?: string[]; 
        fieldId?: string;
      } = { feedback };
      
      if (regenerationType === 'sections') {
        payload.sections = selectedSections;
      } else if (regenerationType === 'fields' && selectedFields.length === 1) {
        payload.fieldId = selectedFields[0];
      }
      
      const response = await apiFetch(`/api/content/${contentId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to regenerate content');
      }
      
      toast.success('Content regenerated successfully!');
      setIsOpen(false);
      setFeedback('');
      setSelectedSections(['body']);
      setSelectedFields([]);
      onRegenerationComplete();
      
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate content');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSectionToggle = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  if (!canRegenerate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Content Regeneration
        </CardTitle>
        <CardDescription>
          {currentStepName ? `Regenerate content at "${currentStepName}" step` : 'Regenerate content with AI feedback'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Content
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Regenerate Content</DialogTitle>
              <DialogDescription>
                Provide feedback to guide the AI in regenerating your content. Select which parts to regenerate.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Feedback Input */}
              <div className="space-y-2">
                <Label htmlFor="feedback">
                  Feedback for Regeneration <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Describe what improvements you'd like to see..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  Be specific about what changes you want. The AI will use this to improve the content.
                </p>
              </div>

              {/* Regeneration Type Selection */}
              <div className="space-y-2">
                <Label>What to Regenerate</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="sections"
                      checked={regenerationType === 'sections'}
                      onChange={() => setRegenerationType('sections')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Content Sections</span>
                  </label>
                  {outputFields.length > 0 && (
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="fields"
                        checked={regenerationType === 'fields'}
                        onChange={() => setRegenerationType('fields')}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Specific Fields</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Section Selection */}
              {regenerationType === 'sections' && (
                <div className="space-y-2">
                  <Label>Select Sections</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSections.includes('title')}
                        onCheckedChange={() => handleSectionToggle('title')}
                      />
                      <span className="text-sm">Title</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSections.includes('body')}
                        onCheckedChange={() => handleSectionToggle('body')}
                      />
                      <span className="text-sm">Body Content</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSections.includes('meta_description')}
                        onCheckedChange={() => handleSectionToggle('meta_description')}
                      />
                      <span className="text-sm">Meta Description</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Field Selection */}
              {regenerationType === 'fields' && outputFields.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Field</Label>
                  <div className="space-y-2">
                    {outputFields.map((field) => (
                      <label key={field.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="field"
                          value={field.id}
                          checked={selectedFields.includes(field.id)}
                          onChange={() => setSelectedFields([field.id])}
                        />
                        <span className="text-sm">{field.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedFields.length > 1 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Only one field can be regenerated at a time
                    </p>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Regeneration will create a new version of your content. 
                    The current version will be saved in the history.
                  </span>
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isRegenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={
                  isRegenerating || 
                  !feedback.trim() || 
                  (regenerationType === 'sections' && selectedSections.length === 0) ||
                  (regenerationType === 'fields' && selectedFields.length !== 1)
                }
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
