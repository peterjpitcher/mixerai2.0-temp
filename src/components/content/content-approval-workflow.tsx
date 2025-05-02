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

interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  role: string;
  completed: boolean;
  skipped: boolean;
  feedback?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface ContentApprovalWorkflowProps {
  contentId: string;
  contentTitle: string;
  contentType: string;
  workflowName: string;
  currentStep: number;
  steps: WorkflowStep[];
  onApprove: (stepIndex: number, feedback: string) => Promise<void>;
  onReject: (stepIndex: number, feedback: string) => Promise<void>;
  canApprove: boolean;
}

export function ContentApprovalWorkflow({
  contentId,
  contentTitle,
  contentType,
  workflowName,
  currentStep,
  steps,
  onApprove,
  onReject,
  canApprove
}: ContentApprovalWorkflowProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleApprove = async () => {
    if (!canApprove) {
      toast.error('You do not have permission to approve this step');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onApprove(currentStep, feedback);
      toast.success('Content approved successfully');
      setFeedback('');
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to approve content');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    if (!canApprove) {
      toast.error('You do not have permission to reject this step');
      return;
    }
    
    if (!feedback.trim()) {
      toast.error('Please provide feedback for the rejection');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onReject(currentStep, feedback);
      toast.success('Content rejected successfully');
      setFeedback('');
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast.error('Failed to reject content');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStepStatusIcon = (step: WorkflowStep, index: number) => {
    if (step.skipped) {
      return <Badge variant="outline" className="ml-auto">Skipped</Badge>;
    }
    
    if (step.completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (index === currentStep) {
      return <Clock className="h-5 w-5 text-amber-500" />;
    }
    
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approval Workflow</CardTitle>
            <CardDescription>
              {workflowName} • {contentType}
            </CardDescription>
          </div>
          <Badge>Step {currentStep + 1} of {steps.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Content</div>
          <div className="text-lg">{contentTitle}</div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="text-sm font-medium">Workflow Steps</div>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`p-4 border rounded-md ${
                  index === currentStep ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{step.name}</span>
                      <span className="text-xs text-muted-foreground">({step.role})</span>
                    </div>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStepStatusIcon(step, index)}
                  </div>
                </div>
                
                {step.completed && step.feedback && (
                  <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                    <p className="font-medium">Feedback:</p>
                    <p>{step.feedback}</p>
                    {step.approvedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved by {step.approvedBy} on {new Date(step.approvedAt!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                {index === currentStep && canApprove && (
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
                        onClick={handleReject}
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        onClick={handleApprove}
                        disabled={isSubmitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <div className="text-sm text-muted-foreground">
          Once all steps are complete, the content will be automatically published.
        </div>
      </CardFooter>
    </Card>
  );
} 