"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AffectedItem {
  id: string;
  name?: string;
  title?: string;
  status?: string;
}

interface RemovalImpact {
  workflow_count: number;
  content_count: number;
  total_assignments: number;
  affected_workflows: AffectedItem[];
  affected_content: AffectedItem[];
}

interface BrandRemovalWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  brandName?: string;
  impact: RemovalImpact | null;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BrandRemovalWarning({
  open,
  onOpenChange,
  userName = 'this user',
  brandName = 'this brand',
  impact,
  isLoading = false,
  onConfirm,
  onCancel
}: BrandRemovalWarningProps) {
  const hasAssignments = impact && impact.total_assignments > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Brand Removal Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to remove <strong>{userName}</strong> from{' '}
                <strong>{brandName}</strong>.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : impact ? (
                <>
                  {hasAssignments ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="font-medium text-amber-900">
                          This user has active assignments that will need to be reassigned:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {impact.workflow_count > 0 && (
                            <li>• {impact.workflow_count} workflow{impact.workflow_count !== 1 ? 's' : ''}</li>
                          )}
                          {impact.content_count > 0 && (
                            <li>• {impact.content_count} content item{impact.content_count !== 1 ? 's' : ''}</li>
                          )}
                        </ul>
                      </div>

                      {impact.affected_workflows.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Affected Workflows:</h4>
                          <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                            {impact.affected_workflows.map((workflow) => (
                              <div key={workflow.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{workflow.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {workflow.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {impact.affected_content.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Affected Content:</h4>
                          <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                            {impact.affected_content.map((content) => (
                              <div key={content.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{content.title}</span>
                                <Badge variant="outline" className="ml-2">
                                  {content.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">
                        All assignments will be automatically reassigned to an available admin or editor in the brand.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-sm text-green-800">
                        This user has no active assignments in this brand. They can be safely removed.
                      </p>
                    </div>
                  )}
                </>
              ) : null}

              <p className="text-sm text-muted-foreground">
                Are you sure you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={hasAssignments ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {hasAssignments ? 'Remove and Reassign' : 'Remove from Brand'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}