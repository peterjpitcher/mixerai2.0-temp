'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import type { VettingFeedbackStageResult, VettingFeedbackPriority } from '@/types/vetting-feedback';
import { getCSRFToken as readCSRFToken } from '@/lib/csrf-setup';

interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority: number;
}

interface VettingAgencyFeedbackCardProps {
  contentId: string;
  brandName: string;
  agencies: VettingAgency[];
  stageId: string | null;
  stageName: string | null;
  existingFeedback?: VettingFeedbackStageResult;
  onFeedbackUpdated: (result: VettingFeedbackStageResult) => void;
  autoRun?: boolean;
  outputFieldLabels?: Record<string, string>;
}

const priorityOrder: VettingFeedbackPriority[] = ['critical', 'high', 'medium', 'low'];

const priorityLabels: Record<VettingFeedbackPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const priorityBadgeVariants: Record<VettingFeedbackPriority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

export function VettingAgencyFeedbackCard({
  contentId,
  brandName,
  agencies,
  stageId,
  stageName,
  existingFeedback,
  onFeedbackUpdated,
  autoRun = false,
  outputFieldLabels = {},
}: VettingAgencyFeedbackCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoRunStagesRef = useRef<Set<string>>(new Set());
  const [csrfReady, setCsrfReady] = useState(() => {
    if (typeof document === 'undefined') return false;
    return Boolean(readCSRFToken());
  });

  const feedbackItems = useMemo(() => {
    const items = existingFeedback?.items ?? [];
    const priorityRanking = Object.fromEntries(priorityOrder.map((priority, index) => [priority, index]));
    return items.slice().sort((a, b) => {
      const rankA = priorityRanking[a.priority] ?? Number.MAX_SAFE_INTEGER;
      const rankB = priorityRanking[b.priority] ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  }, [existingFeedback]);

  const handleGenerate = useCallback(async (
    force: boolean,
    { silentAutoRun = false }: { silentAutoRun?: boolean } = {}
  ) => {
    if (!stageId) {
      toast.error('Unable to determine the current workflow stage.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const response = await apiFetch(`/api/content/${contentId}/vetting-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId,
          stageName,
          force,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        const message = payload.error || 'Failed to generate vetting feedback.';
        throw new Error(message);
      }

      if (!silentAutoRun) {
        toast.success('Vetting agency feedback generated successfully.');
      }

      if (payload.data) {
        onFeedbackUpdated(payload.data as VettingFeedbackStageResult);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate vetting feedback.';
      setErrorMessage(message);
      if (!silentAutoRun) {
        toast.error(message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [stageId, stageName, contentId, onFeedbackUpdated]);

  useEffect(() => {
    if (csrfReady) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (readCSRFToken()) {
        setCsrfReady(true);
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [csrfReady]);

  useEffect(() => {
    if (!autoRun || !stageId || !csrfReady) {
      return;
    }

    if (autoRunStagesRef.current.has(stageId)) {
      return;
    }

    if (!existingFeedback && agencies.length > 0 && !isGenerating) {
      autoRunStagesRef.current.add(stageId);
      void handleGenerate(false, { silentAutoRun: true });
    }
  }, [autoRun, stageId, existingFeedback, agencies.length, isGenerating, handleGenerate, csrfReady]);

  const isDisabled = agencies.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Regulatory Feedback (AI)</span>
          <Badge variant="outline">Beta</Badge>
        </CardTitle>
        <CardDescription>
          AI-generated compliance insights for {brandName}{stageName ? ` at the "${stageName}" stage` : ''} across selected vetting agencies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDisabled && (
          <AlertMessage message="No vetting agencies are assigned to this brand. Add agencies in the brand settings to receive AI feedback." />
        )}

        {errorMessage && (
          <AlertMessage message={errorMessage} tone="error" />
        )}

        {existingFeedback && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Generated {formatDistanceToNow(new Date(existingFeedback.generatedAt), { addSuffix: true })}
              </span>
              <span className="text-xs uppercase tracking-wide">Stage: {stageName || stageId}</span>
              {feedbackItems.length === 0 && <Badge variant="secondary">No issues found</Badge>}
            </div>

            <div className="space-y-3">
              {feedbackItems.map(item => (
                <div key={item.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge variant={priorityBadgeVariants[item.priority]}>{priorityLabels[item.priority]}</Badge>
                      <div className="text-sm font-semibold text-foreground">{item.agencyName}</div>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Recommended action:</span> {item.recommendedAction}
                  </div>
                  {item.relatedFields && item.relatedFields.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Related fields:</span> {item.relatedFields.map(fieldId => outputFieldLabels[fieldId] || fieldId).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!existingFeedback && !isDisabled && !isGenerating && (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No vetting feedback has been generated for this stage yet. Run the analysis to surface agency-specific risks.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {agencies.length > 0
            ? `${agencies.length} vetting agenc${agencies.length === 1 ? 'y is' : 'ies are'} configured for this brand.`
            : 'Add vetting agencies to the brand to enable this analysis.'}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating || isDisabled || !csrfReady}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Run vetting feedback
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function AlertMessage({ message, tone = 'info' }: { message: string; tone?: 'info' | 'error' }) {
  const isError = tone === 'error';
  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
        isError ? 'border-destructive/50 bg-destructive/10 text-destructive-foreground' : 'border-primary/40 bg-primary/10 text-primary'
      }`}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4" />
      <div>{message}</div>
    </div>
  );
}
