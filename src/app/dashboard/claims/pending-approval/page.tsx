'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PendingClaim {
  id: string;
  claim_text: string;
  claim_type: 'allowed' | 'disallowed' | 'mandatory';
  level: 'brand' | 'product' | 'ingredient';
  description?: string;
  workflow_name?: string;
  current_step_name?: string;
  current_step_role?: string;
  creator_name?: string;
  entity_name?: string;
  created_at: string;
}

export default function ClaimsPendingApprovalPage() {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchPendingClaims = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/claims/pending-approval');
      const data = await response.json();
      
      if (data.success) {
        setPendingClaims(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch pending claims');
      }
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      toast.error('Failed to load pending claims');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (claim: PendingClaim, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setActionType(action);
    setFeedback('');
    setShowActionDialog(true);
  };

  const submitAction = async () => {
    if (!selectedClaim || !actionType) return;

    if (actionType === 'reject' && !feedback.trim()) {
      toast.error('Feedback is required when rejecting a claim');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/claims/${selectedClaim.id}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType,
          feedback: feedback.trim() || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Claim ${actionType}d successfully`);
        setShowActionDialog(false);
        fetchPendingClaims(); // Refresh the list
      } else {
        throw new Error(data.error || `Failed to ${actionType} claim`);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing claim:`, error);
      toast.error(`Failed to ${actionType} claim`);
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'brand': return '🏢';
      case 'product': return '📦';
      case 'ingredient': return '🧪';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Claims", href: "/dashboard/claims" },
          { label: "Pending Approval" }
        ]} />
        <PageHeader
          title="Claims Pending Approval"
          description="Review and approve or reject claims awaiting your decision"
        />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims", href: "/dashboard/claims" },
        { label: "Pending Approval" }
      ]} />
      <PageHeader
        title="Claims Pending Approval"
        description="Review and approve or reject claims awaiting your decision"
      />

      {pendingClaims.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Claims Pending</h3>
            <p className="text-muted-foreground text-center">
              You don't have any claims waiting for your approval at the moment.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/claims">View All Claims</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingClaims.map((claim) => (
            <Card key={claim.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{getLevelIcon(claim.level)}</span>
                      {claim.entity_name || claim.level}
                    </CardTitle>
                    <CardDescription>
                      Created by {claim.creator_name || 'Unknown'} on{' '}
                      {new Date(claim.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getClaimTypeColor(claim.claim_type)}>
                    {claim.claim_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Claim Text:</h4>
                  <p className="text-sm">{claim.claim_text}</p>
                </div>
                {claim.description && (
                  <div>
                    <h4 className="font-medium mb-1">Description:</h4>
                    <p className="text-sm text-muted-foreground">{claim.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Workflow: <span className="font-medium">{claim.workflow_name || 'Unknown'}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Current Step: <span className="font-medium">{claim.current_step_name || 'Unknown'}</span>
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(claim, 'reject')}
                  disabled={isSubmitting}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(claim, 'approve')}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Reject'} Claim
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Are you sure you want to approve this claim?'
                : 'Please provide feedback for rejecting this claim.'}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Claim:</p>
                <p className="text-sm">{selectedClaim.claim_text}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="feedback" className="text-sm font-medium">
                  Feedback {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  id="feedback"
                  placeholder={
                    actionType === 'approve'
                      ? 'Optional: Add any comments about this approval'
                      : 'Required: Explain why this claim is being rejected'
                  }
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={isSubmitting || (actionType === 'reject' && !feedback.trim())}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}