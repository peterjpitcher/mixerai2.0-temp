'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api-client';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeOutputsMap } from '@/lib/content/html-normalizer';
import type { NormalizedContent } from '@/types/template';

export interface WorkflowStep {
  id: string | number;
  name: string;
  description?: string;
  role?: string;
  approvalRequired?: boolean;
  step_order?: number;
  stepOrder?: number;
  position?: number;
  assignees?: Array<{ id?: string; email?: string; name?: string; full_name?: string; avatar_url?: string }>;
  formRequirements?: { requiresPublishedUrl?: boolean } | null;
}

interface ContentVersion {
  id: string;
  workflow_step_identifier: string;
  step_name: string;
  action_status: string;
  feedback?: string;
  reviewer?: { full_name?: string };
  created_at: string;
  content_json?: {
    generatedOutputs?: Record<string, unknown>;
  } | null;
}

// Define Template related interfaces if not imported (minimal version for prop type)
interface TemplateOutputField {
  id: string;
  name: string;
  type: string;
}

interface TemplateFields {
  // inputFields: any[]; 
  outputFields: TemplateOutputField[];
}

interface TemplateForHistory {
  id: string;
  name: string;
  // description?: string;
  fields: TemplateFields;
}

interface ContentApprovalWorkflowProps {
  contentId: string;
  contentTitle: string;
  currentStepObject?: WorkflowStep;
  isCurrentUserStepOwner: boolean;
  versions?: ContentVersion[];
  template?: TemplateForHistory | null; // Added template prop
  onActionComplete: () => void;
  performContentSave?: () => Promise<boolean>;
  initialPublishedUrl?: string | null;
  workflowSteps?: WorkflowStep[];
}

export function ContentApprovalWorkflow({
  contentId,
  contentTitle,
  currentStepObject,
  isCurrentUserStepOwner,
  versions,
  template, // Added template prop
  onActionComplete,
  performContentSave,
  initialPublishedUrl,
  workflowSteps = [],
}: ContentApprovalWorkflowProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(initialPublishedUrl ?? '');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setPublishedUrl(initialPublishedUrl ?? '');
  }, [initialPublishedUrl]);

  const toggleHistoryVisibility = (versionId: string) => {
    setExpandedHistoryIds(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const requiresPublishedUrl = Boolean(currentStepObject?.formRequirements?.requiresPublishedUrl);

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
    if (action === 'approve' && requiresPublishedUrl) {
      if (!publishedUrl.trim()) {
        toast.error('Please provide the final published URL before completing this step.');
        return;
      }
      try {
        const parsed = new URL(publishedUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        toast.error('Please enter a valid http(s) URL.');
        return;
      }
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
      } catch (saveError) {
        console.error('[ContentApprovalWorkflow] Error during pre-action save:', saveError);
        toast.error('An error occurred while saving pending changes. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    console.log('[ContentApprovalWorkflow] Submitting action:', action, 'with feedback:', feedback);
    try {
      const response = await apiFetch(`/api/content/${contentId}/workflow-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback, publishedUrl: requiresPublishedUrl ? publishedUrl.trim() : undefined }),
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
    } catch (error) {
      const err = error as Error;
      console.error(`[ContentApprovalWorkflow] Error ${action}ing content:`, err.message, err);
      toast.error(err.message || `Failed to ${action} content.`);
    } finally {
      console.log('[ContentApprovalWorkflow] Finished submitting action:', action);
      setIsSubmitting(false);
    }
  };
  const sortedWorkflowSteps = React.useMemo(() => {
    if (!workflowSteps || workflowSteps.length === 0) return [] as WorkflowStep[];
    const getOrder = (step: WorkflowStep) => {
      const explicitOrder = typeof step.step_order === 'number' ? step.step_order
        : typeof step.stepOrder === 'number' ? step.stepOrder
        : typeof step.position === 'number' ? step.position
        : Number.MAX_SAFE_INTEGER;
      return explicitOrder;
    };
    return workflowSteps.slice().sort((a, b) => getOrder(a) - getOrder(b));
  }, [workflowSteps]);

  const currentStepIndex = React.useMemo(() => {
    if (!currentStepObject) return -1;
    return sortedWorkflowSteps.findIndex(step => String(step.id) === String(currentStepObject.id));
  }, [currentStepObject, sortedWorkflowSteps]);

  const upcomingSteps = React.useMemo(() => {
    if (currentStepIndex < 0) return [] as WorkflowStep[];
    return sortedWorkflowSteps.slice(currentStepIndex + 1);
  }, [currentStepIndex, sortedWorkflowSteps]);

  const renderAssigneeNames = (step: WorkflowStep) => {
    if (!step.assignees || step.assignees.length === 0) {
      return 'Unassigned';
    }
    return step.assignees
      .map(assignee => assignee.full_name || assignee.name || assignee.email || 'Unnamed reviewer')
      .join(', ');
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
    <Card aria-label={`Approval workflow for ${contentTitle}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approval Workflow</CardTitle>
            <CardDescription>
              Current Step: {currentStepObject.name} (Role: {currentStepObject.role || 'N/A'})
            </CardDescription>
          </div>
        </div>
        {/* Display Assignees for the current step */}
        {currentStepObject.assignees && currentStepObject.assignees.length > 0 && (
          <div className="mt-3">
            <h5 className="text-xs font-medium text-muted-foreground mb-1.5">Assigned To:</h5>
            <div className="flex flex-wrap gap-2">
              {currentStepObject.assignees.map((assignee, index) => {
                const displayName = assignee.full_name || assignee.name || assignee.email || 'Unknown Assignee';
                return (
                  <div key={assignee.id || assignee.email || index} className="flex items-center p-1.5 bg-muted/50 rounded-md text-xs">
                  <div className="relative h-5 w-5 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-1.5">
                    {assignee.avatar_url ? (
                      <Image
                        src={assignee.avatar_url}
                        alt={displayName}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                    {(!assignee.avatar_url) && (
                      <div className="flex items-center justify-center h-full w-full text-xxs font-semibold text-primary bg-muted-foreground/20">
                        {(displayName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-muted-foreground font-medium">
                    {displayName}
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {relevantVersions && relevantVersions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Feedback/History:</h4>
            {relevantVersions.slice(0,3).map(v => {
              const getOutputFieldMeta = (outputFieldId: string): { label: string; type: string } => {
                const fieldDef = template?.fields?.outputFields?.find(f => f.id === outputFieldId);
                if (fieldDef) {
                  return { label: fieldDef.name || outputFieldId, type: fieldDef.type };
                }
                return { label: outputFieldId, type: 'plainText' };
              };

              const isExpanded = expandedHistoryIds[v.id] ?? false;

              return (
                <div key={v.id} className="border rounded-md bg-background text-sm shadow-xs">
                  <div className="flex items-start justify-between gap-3 p-3">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {v.step_name || 'N/A'} -
                        {' '}
                        <span
                          className={cn(
                            v.action_status === 'approved' && 'text-green-600',
                            v.action_status === 'rejected' && 'text-red-600',
                            v.action_status === 'pending_review' && 'text-yellow-600',
                            !['approved', 'rejected', 'pending_review'].includes(v.action_status) && 'text-gray-600'
                          )}
                        >
                          {v.action_status || 'N/A'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(v.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => toggleHistoryVisibility(v.id)}
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-border/40 px-3 pb-3 pt-3">
                      {v.reviewer?.full_name && (
                        <div className="flex items-center">
                          <div className="relative h-5 w-5 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-1.5">
                            {'avatar_url' in v.reviewer && v.reviewer.avatar_url ? (
                              <Image
                                src={v.reviewer.avatar_url as string}
                                alt={v.reviewer.full_name || 'Reviewer avatar'}
                                fill
                                className="object-cover"
                              />
                            ) : null}
                            {!('avatar_url' in v.reviewer && v.reviewer.avatar_url) && (
                              <div className="flex items-center justify-center h-full w-full text-xxs font-semibold text-primary bg-muted-foreground/20">
                                {(v.reviewer.full_name || 'R').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">By: {v.reviewer.full_name}</p>
                        </div>
                      )}

                      {v.feedback && (
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground whitespace-pre-wrap shadow-xs">
                          {v.feedback}
                        </div>
                      )}

                      {v.content_json?.generatedOutputs && Object.keys(v.content_json.generatedOutputs).length > 0 && (
                        (() => {
                          const normalized = normalizeOutputsMap(
                            v.content_json.generatedOutputs as Record<string, unknown>,
                            template?.fields?.outputFields
                          );
                          const ordered: Array<{ id: string; label: string; type: string; content: NormalizedContent }> = [];
                          const seen = new Set<string>();

                          if (template?.fields?.outputFields) {
                            template.fields.outputFields.forEach(field => {
                              const value = normalized[field.id];
                              if (value) {
                                ordered.push({ id: field.id, label: field.name, type: field.type, content: value });
                                seen.add(field.id);
                              }
                            });
                          }

                          Object.entries(normalized).forEach(([id, value]) => {
                            if (!seen.has(id) && id !== 'userId' && id !== 'success') {
                              const meta = getOutputFieldMeta(id);
                              ordered.push({ id, label: meta.label, type: meta.type, content: value });
                            }
                          });

                          if (ordered.length === 0) {
                            return null;
                          }

                          return (
                            <div className="space-y-3">
                              <h5 className="text-xs font-semibold text-muted-foreground">Content at this step:</h5>
                              {ordered.map(({ id, label, type, content }) => {
                                const isPlainTextField = type?.toLowerCase() === 'plaintext';
                                const plainTextContent = content.plain?.trim() ?? '';
                                const htmlContent = content.html?.trim();
                                const emptyPlainText = (
                                  <span className="text-muted-foreground italic">No content provided.</span>
                                );

                                return (
                                  <div key={id} className="space-y-1" data-field-container-id={id}>
                                    <p className="text-xs font-medium text-foreground">{label}:</p>
                                    {isPlainTextField ? (
                                      <div
                                        data-field-id={id}
                                        className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground whitespace-pre-wrap shadow-xs"
                                      >
                                        {plainTextContent ? plainTextContent : emptyPlainText}
                                      </div>
                                    ) : (
                                      <div
                                        data-field-id={id}
                                        className="prose prose-sm max-w-none p-3 border rounded-md bg-gray-50 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200"
                                        dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(
                                            htmlContent && htmlContent.length > 0
                                              ? htmlContent
                                              : '<p><em>No content</em></p>',
                                            { USE_PROFILES: { html: true } }
                                          ),
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Upcoming steps</h4>
          {upcomingSteps.length > 0 ? (
            <div className="space-y-2">
              {upcomingSteps.map((step, index) => {
                const stepNumber = currentStepIndex >= 0 ? currentStepIndex + index + 2 : index + 1;
                const assigneeNames = renderAssigneeNames(step);
                return (
                  <div key={step.id || `${step.name}-${index}`} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Step {stepNumber}</div>
                      <div className="text-sm font-semibold text-foreground">{step.name}</div>
                      {step.role && <div className="text-xs text-muted-foreground">Role: {step.role}</div>}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Assigned to:</span> {assigneeNames}
                    </div>
                    {step.description && (
                      <p className="mt-2 text-xs text-muted-foreground/90">{step.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No further steps are scheduled after this approval.</p>
          )}
        </div>

        {requiresPublishedUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="published-url">Final Published URL</label>
            <Input
              id="published-url"
              value={publishedUrl}
              onChange={(event) => setPublishedUrl(event.target.value)}
              placeholder="https://example.com/published-article"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Provide the public link where this content will live once published.
            </p>
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
