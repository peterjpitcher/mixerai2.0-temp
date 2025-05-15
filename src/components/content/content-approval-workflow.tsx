'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/card';
import { Separator } from '@/components/separator';
import { Badge } from '@/components/badge';
import { Textarea } from '@/components/textarea';
import { CheckCircle, XCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export interface WorkflowStep {
  id: string | number;
  name: string;
  description?: string;
  role?: string;
  approvalRequired?: boolean;
  assignees?: Array<{ id?: string; email?: string; name?: string }>;
}

interface ContentVersion {
  id: string;
  workflow_step_identifier: string;
  step_name: string;
  action_status: string;
  feedback?: string;
  reviewer?: { full_name?: string };
  created_at: string;
}

interface ContentApprovalWorkflowProps {
  contentId: string;
  contentTitle: string;
  currentStepObject?: WorkflowStep;
  isCurrentUserStepOwner: boolean;
  versions?: ContentVersion[];
  onActionComplete: () => void;
  performContentSave?: () => Promise<boolean>;
}

export function ContentApprovalWorkflow({
  contentId,
  contentTitle,
  currentStepObject,
  isCurrentUserStepOwner,
  versions,
  onActionComplete,
  performContentSave
}: ContentApprovalWorkflowProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitAction = async (action: 'approve' | 'reject') => {
    console.log('[ContentApprovalWorkflow] handleSubmitAction called with action:', action);
    if (!isCurrentUserStepOwner) {
      toast.error('You are not authorized to perform this action.');
      console.warn('[ContentApprovalWorkflow] User not authorized for action:', action);
      return;
    }
    if (action === 'reject' && !feedback.trim()) {
      toast.error('Feedback is required for rejection.');
      console.warn('[ContentApprovalWorkflow] Feedback required for rejection.');
      return;
    }

    setIsSubmitting(true);
    console.log('[ContentApprovalWorkflow] Attempting to save content before workflow action...');
    
    let saveSuccessful = true;
    if (performContentSave) {
      try {
        saveSuccessful = await performContentSave();
        if (saveSuccessful) {
          console.log('[ContentApprovalWorkflow] Content saved successfully before workflow action.');
        } else {
          console.warn('[ContentApprovalWorkflow] Content save failed before workflow action. Aborting workflow action.');
          toast.error('Failed to save pending changes. Please try saving manually and then approve/reject.');
          setIsSubmitting(false);
          return;
        }
      } catch (saveError: any) {
        console.error('[ContentApprovalWorkflow] Error during pre-action save:', saveError);
        toast.error('An error occurred while saving pending changes. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    console.log('[ContentApprovalWorkflow] Submitting action:', action, 'with feedback:', feedback);
    try {
      const response = await fetch(`/api/content/${contentId}/workflow-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback }),
      });
      console.log('[ContentApprovalWorkflow] API response status:', response.status);
      const result = await response.json();
      console.log('[ContentApprovalWorkflow] API response result:', result);
      if (!response.ok || !result.success) {
        console.error('[ContentApprovalWorkflow] API error:', result.error || `Failed to ${action} content.`);
        throw new Error(result.error || `Failed to ${action} content.`);
      }
      toast.success(`Content successfully ${action}d.`);
      console.log('[ContentApprovalWorkflow] Action successful:', action);
      setFeedback('');
      onActionComplete();
    } catch (error: any) {
      console.error(`[ContentApprovalWorkflow] Error ${action}ing content:`, error.message, error);
      toast.error(error.message || `Failed to ${action} content.`);
    } finally {
      console.log('[ContentApprovalWorkflow] Finished submitting action:', action);
      setIsSubmitting(false);
    }
  };
  
  if (!currentStepObject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No current workflow step defined for this content or workflow not loaded.</p>
        </CardContent>
      </Card>
    );
  }
  
  const relevantVersions = versions?.filter(
    v => v.workflow_step_identifier === String(currentStepObject.id || "") || versions.length <= 3
  ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approval Workflow</CardTitle>
            <CardDescription>
              Current Step: {currentStepObject.name} (Role: {currentStepObject.role || 'N/A'})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Content Title</div>
          <div className="text-lg">{contentTitle}</div>
        </div>
        
        {relevantVersions && relevantVersions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Feedback/History:</h4>
            {relevantVersions.slice(0,3).map(v => (
              <div key={v.id} className="p-2 border rounded-md bg-muted/30 text-xs">
                <p><strong>{v.step_name} - {v.action_status}</strong> by {v.reviewer?.full_name || 'N/A'} ({new Date(v.created_at).toLocaleDateString()})</p>
                {v.feedback && <p className="italic mt-1">{v.feedback}</p>}
              </div>
            ))}
          </div>
        )}

        <Separator />
        
        <div className="space-y-4">
          <div className="text-sm font-medium">Your Action for: {currentStepObject.name}</div>
          
          {isCurrentUserStepOwner ? (
            <div className="mt-4 space-y-4">
              <Textarea 
                placeholder="Add feedback or comments (required for rejection)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full"
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmitAction('reject')}
                  disabled={isSubmitting || (!feedback || feedback.trim() === '')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => handleSubmitAction('approve')}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You are not the assigned owner for this step.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 