export type VettingFeedbackPriority = 'critical' | 'high' | 'medium' | 'low';

export interface VettingFeedbackItem {
  id: string;
  agencyId: string;
  agencyName: string;
  priority: VettingFeedbackPriority;
  summary: string;
  recommendedAction: string;
  relatedFields?: string[];
}

export interface VettingFeedbackStageResult {
  stageId: string;
  stageName?: string | null;
  generatedAt: string;
  generatedBy: string;
  items: VettingFeedbackItem[];
  metadata?: {
    brandName?: string;
    workflowStage?: string | null;
    agenciesEvaluated?: Array<{ agencyId: string; agencyName: string }>;
  };
}
