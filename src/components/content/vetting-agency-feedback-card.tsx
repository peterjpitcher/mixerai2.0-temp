'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NormalizedContent } from '@/types/template';
import type { VettingFeedbackStageResult, VettingFeedbackPriority } from '@/types/vetting-feedback';

interface VettingAgency {
  id: string;
  name: string;
  description?: string | null;
  country_code?: string | null;
  priority: number;
}

interface BrandGuidelines {
  guardrails: string | null;
  toneOfVoice: string | null;
  brandIdentity: string | null;
}

interface VettingAgencyFeedbackCardProps {
  contentId: string;
  brandName: string;
  agencies: VettingAgency[];
  generatedOutputs: Record<string, NormalizedContent>;
  outputFieldLabels: Record<string, string>;
  stageId: string | null;
  stageName: string | null;
  existingFeedback?: VettingFeedbackStageResult;
  onFeedbackUpdated: () => void;
  autoRun?: boolean;
  brandGuidelines?: BrandGuidelines;
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
  generatedOutputs,
  outputFieldLabels,
  stageId,
  stageName,
  existingFeedback,
  onFeedbackUpdated,
  autoRun = false,
  brandGuidelines,
}: VettingAgencyFeedbackCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoRunStagesRef = useRef<Set<string>>(new Set());

  const groupedFeedback = useMemo(() => {
    const items = existingFeedback?.items ?? [];
    if (items.length === 0) {
      return [] as Array<{ priority: VettingFeedbackPriority; items: typeof items }>;
    }

    return priorityOrder
      .map(priority => ({
        priority,
        items: items.filter(item => item.priority === priority),
      }))
      .filter(group => group.items.length > 0);
  }, [existingFeedback]);

  const fieldsSummary = useMemo(() => {
    const entries = Object.entries(generatedOutputs);
    return entries.map(([fieldId, content]) => {
      const label = outputFieldLabels[fieldId] || fieldId;
      const plain = content?.plain ?? '';
      return {
        id: fieldId,
        label,
        preview: plain.length > 600 ? `${plain.slice(0, 600)}…` : plain,
      };
    });
  }, [generatedOutputs, outputFieldLabels]);

  const handleGenerate = async (force: boolean, { silentAutoRun = false }: { silentAutoRun?: boolean } = {}) => {
    if (!stageId) {
      toast.error('Unable to determine the current workflow stage.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const response = await fetch(`/api/content/${contentId}/vetting-feedback`, {
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

      onFeedbackUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate vetting feedback.';
      setErrorMessage(message);
      if (!silentAutoRun) {
        toast.error(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!autoRun || !stageId) {
      return;
    }

    if (autoRunStagesRef.current.has(stageId)) {
      return;
    }

    if (!existingFeedback && agencies.length > 0 && !isGenerating) {
      autoRunStagesRef.current.add(stageId);
      void handleGenerate(false, { silentAutoRun: true });
    }
  }, [autoRun, stageId, existingFeedback, agencies.length, isGenerating]);

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
              {existingFeedback.items.length === 0 && <Badge variant="secondary">No issues found</Badge>}
            </div>

            {groupedFeedback.map(group => (
              <div key={group.priority} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={priorityBadgeVariants[group.priority]}>
                    {priorityLabels[group.priority]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                </div>
                <div className="space-y-3">
                  {group.items.map(item => (
                    <div key={item.id} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">{item.agencyName}</div>
                          <p className="text-sm text-muted-foreground">{item.summary}</p>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="text-sm">
                        <span className="font-medium">Action:</span> {item.recommendedAction}
                      </div>
                      {item.relatedFields && item.relatedFields.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Related fields:</span> {item.relatedFields.map(fieldId => outputFieldLabels[fieldId] || fieldId).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!existingFeedback && !isDisabled && !isGenerating && (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No vetting feedback has been generated for this stage yet. Run the analysis to surface agency-specific risks.
          </div>
        )}

        {fieldsSummary.length > 0 && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="font-semibold text-sm text-foreground">Generated output summary</div>
            {fieldsSummary.map(field => (
              <div key={field.id}>
                <span className="font-medium text-foreground">{field.label}:</span> {field.preview || '—'}
              </div>
            ))}
          </div>
        )}

        {brandGuidelines && (brandGuidelines.guardrails || brandGuidelines.toneOfVoice) && (
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {brandGuidelines.guardrails && (
              <div className="mb-2">
                <span className="font-medium text-foreground">Guardrails:</span> {brandGuidelines.guardrails}
              </div>
            )}
            {brandGuidelines.toneOfVoice && (
              <div>
                <span className="font-medium text-foreground">Tone of voice:</span> {brandGuidelines.toneOfVoice}
              </div>
            )}
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
            disabled={isGenerating || isDisabled}
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
