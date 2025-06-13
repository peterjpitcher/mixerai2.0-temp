'use client';

import { useState, FormEvent } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Matches ENUMs in DB
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];

export interface FeedbackFormState {
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  url: string;
  browser_info: string;
  os_info: string;
  user_impact_details: string;
  steps_to_reproduce: string;
}

const initialFormState: FeedbackFormState = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'medium',
  url: '',
  browser_info: '',
  os_info: '',
  user_impact_details: '',
  steps_to_reproduce: '',
};

interface FeedbackSubmitFormProps {
  supabase: SupabaseClient;
  currentUser: User | null; // Or a more specific user session type if available
  onFeedbackSubmitted?: () => void; // Callback for parent component
  cardMode?: boolean; // Optional: if true, wraps form in a Card
}

export function FeedbackSubmitForm({ 
    currentUser, 
    onFeedbackSubmitted, 
    cardMode = true 
}: FeedbackSubmitFormProps) {
  const [formState, setFormState] = useState<FeedbackFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSelectChange = (name: keyof FeedbackFormState) => (value: string) => {
    if ((name === 'type' && feedbackTypes.includes(value as FeedbackType)) || 
        (name === 'priority' && feedbackPriorities.includes(value as FeedbackPriority))) {
      setFormState(prevState => ({ ...prevState, [name]: value as FeedbackType | FeedbackPriority }));
    } else if (name !== 'type' && name !== 'priority') {
         setFormState(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        toast.error('Authentication required to submit feedback.');
        return;
    }
    if (!formState.type || !formState.priority) {
        toast.error('Please select a type and priority.');
        return;
    }
    if (!formState.title.trim()) {
        toast.error('Please provide a title for the feedback.');
        return;
    }
    if (!formState.description.trim()) {
      toast.error('Please provide a description for the feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<FeedbackFormState & { user_id: string }> = {
        user_id: currentUser.id,
        type: formState.type,
        title: formState.title.trim(),
        description: formState.description.trim(),
        priority: formState.priority,
        url: formState.url.trim() === '' ? undefined : formState.url.trim(),
        browser_info: formState.browser_info.trim() === '' ? undefined : formState.browser_info.trim(),
        os_info: formState.os_info.trim() === '' ? undefined : formState.os_info.trim(),
        user_impact_details: formState.user_impact_details.trim() === '' ? undefined : formState.user_impact_details.trim(),
      };
      if (formState.type === 'bug') {
        payload.steps_to_reproduce = formState.steps_to_reproduce.trim() === '' ? undefined : formState.steps_to_reproduce.trim();
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Feedback submitted successfully!');
        setFormState(initialFormState);
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
      } else {
        throw new Error(result.error || result.details || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred while submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="type">Feedback Type <span className="text-destructive">*</span></Label>
          <Select name="type" value={formState.type} onValueChange={handleSelectChange('type')} required>
            <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {feedbackTypes.map(type => (
                <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority <span className="text-destructive">*</span></Label>
          <Select name="priority" value={formState.priority} onValueChange={handleSelectChange('priority')} required>
            <SelectTrigger id="priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
            <SelectContent>
              {feedbackPriorities.map(p => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
        <Input id="title" name="title" value={formState.title} onChange={handleInputChange} placeholder="Brief summary of the issue/suggestion" required />
      </div>

      <div>
        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
        <Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} placeholder="Detailed description..." required rows={5} />
      </div>
      
      <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-lg">Contextual Information (Optional)</CardTitle>
            <CardDescription>Providing these details can help us understand and address your feedback more effectively.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="url">Relevant URL</Label>
              <Input id="url" name="url" type="url" value={formState.url} onChange={handleInputChange} placeholder="e.g., /dashboard/content/some-page" />
            </div>
            
            {formState.type === 'bug' && (
                <div>
                    <Label htmlFor="steps_to_reproduce">Steps to Reproduce (for bugs)</Label>
                    <Textarea id="steps_to_reproduce" name="steps_to_reproduce" value={formState.steps_to_reproduce} onChange={handleInputChange} placeholder="1. Go to X...\n2. Click Y...\n3. See error Z..." rows={4}/>
                </div>
            )}

            <div>
              <Label htmlFor="user_impact_details">User Impact</Label>
              <Textarea id="user_impact_details" name="user_impact_details" value={formState.user_impact_details} onChange={handleInputChange} placeholder="How does this issue affect you or your workflow?" rows={3}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="browser_info">Browser & Version</Label>
                    <Input id="browser_info" name="browser_info" value={formState.browser_info} onChange={handleInputChange} placeholder="e.g., Chrome 123.0.0" />
                </div>
                <div>
                    <Label htmlFor="os_info">Operating System</Label>
                    <Input id="os_info" name="os_info" value={formState.os_info} onChange={handleInputChange} placeholder="e.g., macOS Sonoma, Windows 11" />
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          Submit Feedback
        </Button>
      </div>
    </form>
  );

  if (cardMode) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>Report a bug or suggest an enhancement. Your input is valuable!</CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return formContent;
} 