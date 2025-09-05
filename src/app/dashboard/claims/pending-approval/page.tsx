'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ClipboardList,
  User,
  FileText,
  MessageSquare,
  Edit2
} from 'lucide-react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { BrandIcon } from '@/components/brand-icon';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';

interface PendingClaim {
  id: string;
  claim_text: string;
  claim_type: 'allowed' | 'disallowed' | 'mandatory';
  level: 'brand' | 'product' | 'ingredient';
  description?: string;
  workflow_name?: string;
  current_step_name?: string;
  current_step_role?: string;
  current_step_assignees?: string[];
  creator_name?: string;
  entity_name?: string;
  created_at: string;
  brand_id?: string;
  brand_name?: string;
  brand_logo_url?: string;
  brand_primary_color?: string;
}

interface WorkflowStep {
  id: string;
  step_order: number;
  step_name: string;
  name?: string; // Some responses use 'name' instead of 'step_name'
  step_type: string;
  requires_all_assignees: boolean;
  assignees?: string[];
  assigned_users?: Array<{id: string; full_name?: string; email?: string}>;
  instructions?: string;
  is_completed?: boolean;
  is_current?: boolean;
  role?: string;
}

interface WorkflowHistory {
  id: string;
  action_type: string;
  action_status?: string;
  action_by: string;
  action_by_name?: string;
  comment?: string;
  created_at: string;
  workflow_step_id?: string;
  updated_claim_text?: string;
  feedback?: string;
  reviewer?: {
    full_name?: string;
    email?: string;
  };
}

interface ChangeHistoryItem {
  id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_by_name?: string;
  created_at: string;
}

interface ClaimDetails {
  claim: PendingClaim & {
    workflow_id?: string;
    workflow_status?: string;
  };
  workflowSteps: WorkflowStep[];
  history: WorkflowHistory[];
  changeHistory: ChangeHistoryItem[];
  currentUserId: string;
}

export default function ClaimsPendingApprovalPage() {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(null);
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [comment, setComment] = useState('');
  const [editedClaimText, setEditedClaimText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditingClaim, setIsEditingClaim] = useState(false);

  const fetchPendingClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/claims/pending-approval');
      const data = await response.json();
      
      if (data.success) {
        setPendingClaims(data.data || []);
        setCurrentUserId(data.currentUserId || null);
        // Select first claim if available
        if (data.data && data.data.length > 0 && !selectedClaim) {
          setSelectedClaim(data.data[0]);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch pending claims');
      }
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      toast.error('Failed to load pending claims');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingClaims();
  }, [fetchPendingClaims]);

  useEffect(() => {
    if (selectedClaim) {
      fetchClaimDetails(selectedClaim.id);
      setEditedClaimText(selectedClaim.claim_text);
      setComment('');
      setIsEditingClaim(false);
    }
  }, [selectedClaim]);

  const fetchClaimDetails = async (claimId: string) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/details`);
      const data = await response.json();
      
      if (data.success) {
        setClaimDetails(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch claim details');
      }
    } catch (error) {
      console.error('Error fetching claim details:', error);
      toast.error('Failed to load claim details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedClaim) return;

    if (action === 'reject' && !comment.trim()) {
      toast.error('Comment is required when rejecting a claim');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/claims/${selectedClaim.id}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          feedback: action === 'reject' ? comment.trim() : '',
          comment: comment.trim() || undefined,
          updatedClaimText: editedClaimText !== selectedClaim.claim_text ? editedClaimText : undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Claim ${action}d successfully`);
        fetchPendingClaims();
        setComment('');
        setIsEditingClaim(false);
        if (selectedClaim) {
          fetchClaimDetails(selectedClaim.id);
        }
      } else {
        throw new Error(data.error || `Failed to ${action} claim`);
      }
    } catch (error) {
      console.error(`Error ${action}ing claim:`, error);
      toast.error(`Failed to ${action} claim`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClaimTypeColor = (type: string) => {
    switch (type) {
      case 'allowed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disallowed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'mandatory': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };


  const isAssignedToUser = (claim: PendingClaim) => {
    return claim.current_step_assignees?.includes(currentUserId || '');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Pending Approval" }
        ]} />
        <PageHeader
          title="Claims Pending Approval"
          description="View all pending claims. You can approve or reject claims assigned to you."
        />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Pending Approval" }
      ]} />
      <PageHeader
        title="Claims Pending Approval"
        description="View all pending claims. You can approve or reject claims assigned to you."
      />

      {pendingClaims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-2">No Claims Pending</h3>
            <p className="text-muted-foreground text-center">
              There are no claims currently pending approval.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/claims">View All Claims</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left Panel - Claims Table */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Pending Claims</CardTitle>
                <CardDescription>
                  {pendingClaims.length} claim{pendingClaims.length === 1 ? '' : 's'} awaiting review
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Brand</TableHead>
                        <TableHead>Claim Text</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Step</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingClaims.map((claim) => {
                        const assigned = isAssignedToUser(claim);
                        return (
                          <TableRow
                            key={claim.id}
                            className={cn(
                              "cursor-pointer",
                              selectedClaim?.id === claim.id && "bg-muted/50"
                            )}
                            onClick={() => setSelectedClaim(claim)}
                          >
                            <TableCell>
                              <BrandIcon 
                                name={claim.brand_name || 'Unknown'}
                                color={claim.brand_primary_color}
                                logoUrl={claim.brand_logo_url}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-sm truncate">
                                {claim.claim_text}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", getClaimTypeColor(claim.claim_type))}>
                                {claim.claim_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>
                                <p className="font-medium">{claim.current_step_name || 'Unknown'}</p>
                                {assigned && (
                                  <Badge className="text-xs bg-primary text-primary-foreground mt-1">
                                    Assigned to you
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Claim Details */}
          <div className="lg:col-span-3">
            {selectedClaim ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <BrandIcon 
                          name={selectedClaim.brand_name || 'Unknown'}
                          color={selectedClaim.brand_primary_color}
                          logoUrl={selectedClaim.brand_logo_url}
                          size="md"
                        />
                        <div>
                          <CardTitle className="text-xl">
                            {selectedClaim.entity_name || selectedClaim.level}
                          </CardTitle>
                          <CardDescription>
                            Created by {selectedClaim.creator_name || 'Unknown'} on{' '}
                            {format(new Date(selectedClaim.created_at), 'MMMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <Badge className={getClaimTypeColor(selectedClaim.claim_type)}>
                      {selectedClaim.claim_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {isLoadingDetails ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Claim Text */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Claim Text
                          </h3>
                          {isAssignedToUser(selectedClaim) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingClaim(!isEditingClaim)}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              {isEditingClaim ? 'Cancel' : 'Edit'}
                            </Button>
                          )}
                        </div>
                        {isEditingClaim ? (
                          <Textarea
                            value={editedClaimText}
                            onChange={(e) => setEditedClaimText(e.target.value)}
                            rows={4}
                            className="resize-none"
                            placeholder="Enter claim text"
                          />
                        ) : (
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm leading-relaxed">{editedClaimText}</p>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {selectedClaim.description && (
                        <div>
                          <h3 className="font-semibold text-sm mb-2">Description</h3>
                          <p className="text-sm text-muted-foreground">{selectedClaim.description}</p>
                        </div>
                      )}

                      {/* Comment Section - Always visible for assigned users */}
                      {isAssignedToUser(selectedClaim) && (
                        <div>
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Add Comment
                          </h3>
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="resize-none"
                            placeholder="Add a comment about this review (required for rejection)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            <AlertCircle className="inline h-3 w-3 mr-1" />
                            Comment is required when rejecting a claim
                          </p>
                        </div>
                      )}

                      {/* Complete Workflow Steps */}
                      {claimDetails && claimDetails.workflowSteps.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Workflow Progress & History
                          </h3>
                          <div className="relative">
                            {claimDetails.workflowSteps.map((step, index) => {
                              const isLast = index === claimDetails.workflowSteps.length - 1;
                              const isPrevious = step.is_completed;
                              const isCurrent = step.is_current;
                              const isNext = !step.is_completed && !step.is_current;
                              
                              // Find history for this step
                              const stepHistory = claimDetails.history.filter((h) => 
                                (h as {workflow_step_id?: string}).workflow_step_id === step.id
                              );

                              return (
                                <div key={step.id} className="relative">
                                  {/* Connection line */}
                                  {!isLast && (
                                    <div className={cn(
                                      "absolute left-4 top-10 w-0.5 h-full -bottom-4",
                                      isPrevious || isCurrent ? "bg-primary" : "bg-gray-300"
                                    )} />
                                  )}
                                  
                                  <div
                                    className={cn(
                                      "flex items-start gap-3 p-3 rounded-lg mb-2 border-2 transition-all",
                                      isCurrent ? "border-primary bg-primary/5 shadow-sm" : 
                                      isPrevious ? "border-green-500 bg-green-50 dark:bg-green-900/20" : 
                                      "border-gray-200 bg-gray-50/50 dark:bg-gray-900/20"
                                    )}
                                  >
                                    <div className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shrink-0",
                                      isPrevious ? "bg-green-600 text-white" : 
                                      isCurrent ? "bg-primary text-primary-foreground" : 
                                      "bg-gray-300 text-gray-600"
                                    )}>
                                      {isPrevious ? (
                                        <CheckCircle className="h-5 w-5" />
                                      ) : (
                                        index + 1
                                      )}
                                    </div>
                                    
                                    <div className="flex-1 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-sm">{step.name || step.step_name}</p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Role: {step.role}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isCurrent && (
                                            <Badge variant="default" className="text-xs">
                                              Current Step
                                            </Badge>
                                          )}
                                          {isPrevious && (
                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                              Completed
                                            </Badge>
                                          )}
                                          {isNext && (
                                            <Badge variant="outline" className="text-xs">
                                              Upcoming
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Assignees */}
                                      <div className="flex items-center gap-2 text-xs">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">Assignees:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {step.assigned_users && step.assigned_users.length > 0 ? (
                                            step.assigned_users.map((u) => (
                                              <Badge key={u.id} variant="secondary" className="text-xs">
                                                {u.full_name || u.email}
                                              </Badge>
                                            ))
                                          ) : (
                                            <span className="text-muted-foreground">No assignees</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Step History - Actions taken */}
                                      {stepHistory.length > 0 && (
                                        <div className="mt-3 space-y-3 border-t pt-3">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Actions Taken
                                          </p>
                                          {stepHistory.map((history) => (
                                            <div key={history.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                                              {/* Action header */}
                                              <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className={cn(
                                                    "h-5 w-5 rounded-full flex items-center justify-center",
                                                    history.action_status === 'approved' ? "bg-green-100" : 
                                                    history.action_status === 'rejected' ? "bg-red-100" : 
                                                    "bg-gray-100"
                                                  )}>
                                                    {history.action_status === 'approved' ? (
                                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                                    ) : history.action_status === 'rejected' ? (
                                                      <XCircle className="h-3 w-3 text-red-600" />
                                                    ) : (
                                                      <AlertCircle className="h-3 w-3 text-gray-600" />
                                                    )}
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium">
                                                      {history.reviewer?.full_name || history.reviewer?.email || history.action_by_name || 'Unknown User'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {history.action_status === 'approved' ? 'Approved' : history.action_status === 'rejected' ? 'Rejected' : (history.action_status as string)}
                                                      {' on '}
                                                      {format(new Date(history.created_at as string), 'MMM d, yyyy, HH:mm')}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Approved/Rejected content if different from current */}
                                              {history.updated_claim_text && history.updated_claim_text !== selectedClaim.claim_text ? (
                                                <div className="bg-muted/50 rounded p-2 space-y-1">
                                                  <p className="text-xs font-medium flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    {history.action_status === 'approved' ? 'Approved with changes:' : 'Content at time of action:'}
                                                  </p>
                                                  <p className="text-xs italic">{history.updated_claim_text as string}</p>
                                                </div>
                                              ) : null}
                                              
                                              {/* Comment */}
                                              {history.comment ? (
                                                <div className="bg-muted/50 rounded p-2 space-y-1">
                                                  <p className="text-xs font-medium flex items-center gap-1">
                                                    <MessageSquare className="h-3 w-3" />
                                                    Comment:
                                                  </p>
                                                  <p className="text-xs">{history.comment as string}</p>
                                                </div>
                                              ) : null}
                                              
                                              {/* Feedback (for rejections) */}
                                              {history.feedback ? (
                                                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 space-y-1">
                                                  <p className="text-xs font-medium flex items-center gap-1 text-red-700 dark:text-red-300">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Rejection Feedback:
                                                  </p>
                                                  <p className="text-xs text-red-600 dark:text-red-400">{history.feedback as string}</p>
                                                </div>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Show pending state for future steps */}
                                      {isNext && (
                                        <div className="text-xs text-muted-foreground italic">
                                          This step will be activated after the current step is completed.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </CardContent>
                {isAssignedToUser(selectedClaim) && (
                  <CardFooter className="pt-4 border-t">
                    <div className="w-full space-y-3">
                      {editedClaimText !== selectedClaim.claim_text && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          <p className="font-medium">Note: You have edited the claim text.</p>
                        </div>
                      )}
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleAction('reject')}
                          disabled={isSubmitting || !comment.trim()}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleAction('approve')}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <p className="text-muted-foreground">Select a claim to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}