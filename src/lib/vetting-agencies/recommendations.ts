import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateVettingAgencyModelSuggestions,
  VETTING_AGENCY_PROMPT_VERSION,
  type VettingAgencyModelSuggestion,
} from '@/lib/azure/openai';
import {
  fetchVettingAgencies,
  logVettingAgencyEvent,
  upsertAgencySuggestion,
  type VettingAgencyEventInput,
  type VettingAgencyRecord,
  type VettingAgencySuggestionInput,
  type VettingAgencyUpsertResult,
  type VettingAgencyPriorityLabel,
} from './service';
import type { Database } from '@/types/supabase';

export interface VettingAgencyRecommendationInput {
  brandId?: string | null;
  brandName: string;
  countryCode: string;
  languageCodes?: string[];
  categoryTags?: string[];
  brandSummary?: string | null;
  existingAgencyNames?: string[];
  existingAgencyIds?: string[];
  requestedByUserId?: string | null;
  includeFallback?: boolean;
  supabaseClient?: SupabaseClient<Database>;
}

export interface RecommendedAgency {
  record: VettingAgencyRecord;
  confidence: number | null;
  rationale: string | null;
  source: 'existing' | 'ai' | 'fallback';
  created: boolean;
}

export interface VettingAgencyRecommendationResult {
  suggestions: RecommendedAgency[];
  catalog: VettingAgencyRecord[];
  warnings: string[];
  fallbackApplied: boolean;
  metadata: {
    promptVersion: string;
    model: string;
  };
}

function coalescePriority(priority: VettingAgencyPriorityLabel | null | undefined): VettingAgencyPriorityLabel {
  if (priority === 'High' || priority === 'Medium' || priority === 'Low') {
    return priority;
  }
  return 'Medium';
}

function buildSuggestionPayload(
  suggestion: VettingAgencyModelSuggestion,
  input: VettingAgencyRecommendationInput,
  modelName: string,
): VettingAgencySuggestionInput {
  return {
    name: suggestion.name,
    description: suggestion.description,
    countryCode: input.countryCode,
    priorityLabel: coalescePriority(suggestion.priority),
    regulatoryScope: suggestion.regulatory_scope,
    categoryTags: suggestion.category_tags?.length
      ? suggestion.category_tags
      : input.categoryTags ?? [],
    languageCodes: suggestion.language_codes?.length
      ? suggestion.language_codes
      : input.languageCodes ?? [],
    websiteUrl: suggestion.website_url,
    rationale: suggestion.rationale,
    source: 'ai',
    sourceMetadata: {
      confidence: suggestion.confidence ?? null,
      prompt_version: VETTING_AGENCY_PROMPT_VERSION,
      brand_name: input.brandName,
      brand_country: input.countryCode,
      generated_at: new Date().toISOString(),
      model: modelName,
    },
  };
}

function mergeCatalog(
  baseCatalog: VettingAgencyRecord[],
  additions: VettingAgencyRecord[],
): VettingAgencyRecord[] {
  const byId = new Map<string, VettingAgencyRecord>();
  for (const agency of baseCatalog) {
    byId.set(agency.id, agency);
  }
  for (const agency of additions) {
    byId.set(agency.id, agency);
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function recommendVettingAgencies(
  input: VettingAgencyRecommendationInput,
): Promise<VettingAgencyRecommendationResult> {
  const normalizedCountry = input.countryCode.trim().toUpperCase();

  const baseResult = await fetchVettingAgencies(
    {
      countryCode: normalizedCountry,
      status: ['approved', 'pending_verification'],
      includeFallback: input.includeFallback ?? true,
    },
    input.supabaseClient,
  );

  const existingRecords = baseResult.agencies;

  let suggestionResult;
  try {
    suggestionResult = await generateVettingAgencyModelSuggestions({
      brandName: input.brandName,
      countryCode: normalizedCountry,
      languageCodes: input.languageCodes,
      categoryTags: input.categoryTags,
      brandSummary: input.brandSummary,
      existingAgencies: input.existingAgencyNames,
    });
  } catch (error) {
    console.error('[vetting-agency-recommendations] Failed to generate AI suggestions', error);
    suggestionResult = {
      agencies: [],
      warnings: ['AI suggestion step failed; falling back to existing catalogue.'],
      metadata: {
        prompt_version: VETTING_AGENCY_PROMPT_VERSION,
        model: 'unknown',
      },
    };
  }

  const suggestions: RecommendedAgency[] = [];
  const newlyCreated: VettingAgencyRecord[] = [];

  for (const suggestion of suggestionResult.agencies) {
    try {
      const payload = buildSuggestionPayload(
        suggestion,
        input,
        suggestionResult.metadata.model,
      );
      const upsertOutcome: VettingAgencyUpsertResult = await upsertAgencySuggestion(
        payload,
        input.supabaseClient,
      );

      suggestions.push({
        record: upsertOutcome.record,
        confidence: suggestion.confidence ?? null,
        rationale: suggestion.rationale ?? null,
        source: upsertOutcome.created ? 'ai' : 'existing',
        created: upsertOutcome.created,
      });

      if (upsertOutcome.created) {
        newlyCreated.push(upsertOutcome.record);
      }

      const event: VettingAgencyEventInput = {
        brandId: input.brandId ?? null,
        agencyId: upsertOutcome.record.id,
        eventType: 'suggested',
        countryCode: normalizedCountry,
        categoryTags: payload.categoryTags ?? [],
        createdBy: input.requestedByUserId ?? null,
        metadata: {
          confidence: suggestion.confidence ?? null,
          rationale: suggestion.rationale ?? null,
          generated_at: new Date().toISOString(),
        },
      };

      await logVettingAgencyEvent(event, input.supabaseClient);
    } catch (error) {
      console.error('[vetting-agency-recommendations] Failed to persist suggestion', error);
    }
  }

  const catalog = mergeCatalog(existingRecords, newlyCreated);

  return {
    suggestions,
    catalog,
    warnings: suggestionResult.warnings,
    fallbackApplied: baseResult.fallbackApplied,
    metadata: {
      promptVersion: suggestionResult.metadata.prompt_version,
      model: suggestionResult.metadata.model,
    },
  };
}
