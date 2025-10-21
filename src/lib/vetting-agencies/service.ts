import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/types/supabase';
import {
  DEFAULT_VETTING_AGENCIES,
  DefaultVettingAgency,
  getDefaultAgenciesForCountry,
} from './defaults';

type VettingAgencyRow = Database['public']['Tables']['content_vetting_agencies']['Row'];
export type VettingAgencyStatus =
  Database['public']['Enums']['vetting_agency_status'];
export type VettingAgencyPriorityLabel =
  Database['public']['Enums']['vetting_agency_priority_level'];
export type VettingAgencyEventType =
  Database['public']['Enums']['vetting_agency_event_type'];
type VettingAgencyEventInsert =
  Database['public']['Tables']['content_vetting_agency_events']['Insert'];

export interface VettingAgencyRecord {
  id: string;
  name: string;
  description: string | null;
  countryCode: string;
  status: VettingAgencyStatus;
  priorityLabel: VettingAgencyPriorityLabel | null;
  priorityRank: number;
  regulatoryScope: string | null;
  categoryTags: string[];
  languageCodes: string[];
  websiteUrl: string | null;
  rationale: string | null;
  source: string;
  sourceMetadata: Record<string, unknown>;
  isFallback: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VettingAgencyQueryOptions {
  countryCode?: string | null;
  status?: VettingAgencyStatus | VettingAgencyStatus[];
  includeFallback?: boolean;
  categoryTags?: string[];
  languageCodes?: string[];
  limit?: number;
  search?: string | null;
  priority?: VettingAgencyPriorityLabel | VettingAgencyPriorityLabel[];
  offset?: number;
}

export interface VettingAgencyQueryResult {
  agencies: VettingAgencyRecord[];
  total: number;
  fallbackApplied: boolean;
}

export interface VettingAgencyEventInput {
  brandId?: string | null;
  agencyId?: string | null;
  eventType: VettingAgencyEventType;
  countryCode?: string | null;
  categoryTags?: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface VettingAgencySuggestionInput {
  name: string;
  description: string;
  countryCode: string;
  priorityLabel?: VettingAgencyPriorityLabel | null;
  regulatoryScope?: string | null;
  categoryTags?: string[];
  languageCodes?: string[];
  websiteUrl?: string | null;
  rationale?: string | null;
  source?: string;
  sourceMetadata?: Record<string, unknown>;
  status?: VettingAgencyStatus;
}

export interface VettingAgencyUpsertResult {
  record: VettingAgencyRecord;
  created: boolean;
}

const FALLBACK_PRIORITY_LABELS: Record<number, VettingAgencyPriorityLabel> = {
  1: 'High',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Low',
};

const PRIORITY_RANKING: Record<VettingAgencyPriorityLabel, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
};

function ensureSupabaseClient(
  client?: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (client) {
    return client;
  }
  return createSupabaseAdminClient();
}

function normalizeCountryCode(countryCode?: string | null): string | undefined {
  if (!countryCode) {
    return undefined;
  }
  const trimmed = countryCode.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.toUpperCase();
}

function mapPriorityLabelToRank(
  label: VettingAgencyPriorityLabel | null,
): number {
  if (!label) {
    return Number.MAX_SAFE_INTEGER;
  }
  return PRIORITY_RANKING[label] ?? Number.MAX_SAFE_INTEGER;
}

function mapNumericToPriorityLabel(
  numericPriority: number,
): VettingAgencyPriorityLabel | null {
  return FALLBACK_PRIORITY_LABELS[numericPriority] ?? null;
}

export function mapAgencyRow(row: VettingAgencyRow): VettingAgencyRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    countryCode: row.country_code,
    status: row.status,
    priorityLabel: row.priority,
    priorityRank: mapPriorityLabelToRank(row.priority),
    regulatoryScope: row.regulatory_scope,
    categoryTags: row.category_tags ?? [],
    languageCodes: row.language_codes ?? [],
    websiteUrl: row.website_url ?? null,
    rationale: row.rationale ?? null,
    source: row.source,
    sourceMetadata:
      (row.source_metadata as Record<string, unknown> | null) ?? {},
    isFallback: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformFallbackAgency(
  agency: DefaultVettingAgency,
  countryCode?: string,
): VettingAgencyRecord {
  const normalizedCountryCode = normalizeCountryCode(countryCode) ?? 'general';
  const priorityLabel = mapNumericToPriorityLabel(agency.priority);

  return {
    id: `fallback:${normalizedCountryCode}:${agency.id}`,
    name: agency.name,
    description: agency.description,
    countryCode: normalizedCountryCode,
    status: 'approved',
    priorityLabel,
    priorityRank:
      priorityLabel !== null
        ? mapPriorityLabelToRank(priorityLabel)
        : agency.priority,
    regulatoryScope: null,
    categoryTags: [],
    languageCodes: [],
    websiteUrl: agency.website ?? null,
    rationale: null,
    source: 'static_default',
    sourceMetadata: {
      origin: 'static_seed',
    },
    isFallback: true,
    createdAt: null,
    updatedAt: null,
  };
}

function sortAgencies(a: VettingAgencyRecord, b: VettingAgencyRecord): number {
  if (a.priorityRank !== b.priorityRank) {
    return a.priorityRank - b.priorityRank;
  }
  return a.name.localeCompare(b.name);
}

function applyPagination<T>(
  items: T[],
  limit?: number,
  offset?: number,
): T[] {
  if (typeof limit !== 'number' || limit <= 0) {
    return items;
  }
  const start = Math.max(offset ?? 0, 0);
  if (start >= items.length) {
    return [];
  }
  return items.slice(start, start + limit);
}

export async function fetchVettingAgencies(
  options: VettingAgencyQueryOptions = {},
  client?: SupabaseClient<Database>,
): Promise<VettingAgencyQueryResult> {
  const supabase = ensureSupabaseClient(client);
  const normalizedCountry = normalizeCountryCode(options.countryCode);
  const statuses: VettingAgencyStatus[] = Array.isArray(options.status)
    ? options.status
    : options.status
    ? [options.status]
    : ['approved', 'pending_verification'];
  const priorities: VettingAgencyPriorityLabel[] | undefined = Array.isArray(options.priority)
    ? options.priority
    : options.priority
    ? [options.priority]
    : undefined;
  const searchTerm = options.search?.trim();
  const escapedSearch =
    searchTerm?.replace(/%/g, '\\%').replace(/_/g, '\\_') ?? null;
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.floor(options.limit)
      : undefined;
  const offset =
    typeof options.offset === 'number' && options.offset >= 0
      ? Math.floor(options.offset)
      : undefined;
  const useFallback =
    options.includeFallback === undefined || options.includeFallback === true;

  let query = supabase
    .from('content_vetting_agencies')
    .select('*', { count: 'exact' })
    .order('country_code', { ascending: true })
    .order('priority', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (normalizedCountry) {
    query = query.eq('country_code', normalizedCountry);
  }

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (options.categoryTags && options.categoryTags.length > 0) {
    query = query.overlaps('category_tags', options.categoryTags);
  }

  if (options.languageCodes && options.languageCodes.length > 0) {
    query = query.overlaps('language_codes', options.languageCodes);
  }

  if (priorities && priorities.length > 0) {
    query = query.in('priority', priorities);
  }

  if (escapedSearch) {
    query = query.or(
      `name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,country_code.ilike.%${escapedSearch}%`,
    );
  }

  if (typeof limit === 'number' && typeof offset === 'number') {
    query = query.range(offset, offset + limit - 1);
  } else if (typeof limit === 'number') {
    query = query.limit(limit);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[vetting-agency-service] Failed to fetch agencies', error);
    throw error;
  }

  const agencies = (data ?? []).map(mapAgencyRow).sort(sortAgencies);
  const total =
    typeof count === 'number' ? count : (data ?? []).length;

  if (agencies.length > 0 || !useFallback) {
    return {
      agencies,
      total,
      fallbackApplied: false,
    };
  }

  const statusSet = new Set(statuses);
  if (!statusSet.has('approved')) {
    return {
      agencies: [],
      total: 0,
      fallbackApplied: true,
    };
  }

  const fallbackAgenciesRaw = getDefaultAgenciesForCountry(
    normalizedCountry ?? null,
  );

  const fallbackAgencies = fallbackAgenciesRaw
    .map((agency) => transformFallbackAgency(agency, normalizedCountry))
    .filter((agency) => {
      if (priorities && priorities.length > 0) {
        if (!agency.priorityLabel) {
          return false;
        }
        return priorities.includes(agency.priorityLabel);
      }
      return true;
    })
    .filter((agency) => {
      if (!searchTerm) {
        return true;
      }
      const haystack = `${agency.name} ${agency.description ?? ''} ${
        agency.countryCode
      }`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    })
    .sort(sortAgencies);

  const paginatedFallback = applyPagination(fallbackAgencies, limit, offset);

  return {
    agencies: paginatedFallback,
    total: fallbackAgencies.length,
    fallbackApplied: true,
  };
}

export async function findAgencyByName(
  countryCode: string,
  name: string,
  client?: SupabaseClient<Database>,
): Promise<VettingAgencyRecord | null> {
  const supabase = ensureSupabaseClient(client);
  const normalizedCountry = normalizeCountryCode(countryCode);
  const trimmedName = name.trim();

  if (!normalizedCountry || !trimmedName) {
    return null;
  }

  const escapedName = trimmedName
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  const { data, error } = await supabase
    .from('content_vetting_agencies')
    .select('*')
    .eq('country_code', normalizedCountry)
    .ilike('name', escapedName)
    .limit(5);

  if (error) {
    console.error('[vetting-agency-service] Failed to find agency by name', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const bestMatch = data.find(
    (row) => row.name.toLowerCase().trim() === trimmedName.toLowerCase(),
  ) ?? data[0];

  return mapAgencyRow(bestMatch);
}

export async function upsertAgencySuggestion(
  suggestion: VettingAgencySuggestionInput,
  client?: SupabaseClient<Database>,
): Promise<VettingAgencyUpsertResult> {
  const supabase = ensureSupabaseClient(client);
  const normalizedCountry = normalizeCountryCode(suggestion.countryCode);

  if (!normalizedCountry) {
    throw new Error('Country code is required to upsert a vetting agency suggestion.');
  }

  const existing = await findAgencyByName(normalizedCountry, suggestion.name, supabase).catch(() => null);

  if (existing) {
    return { record: existing, created: false };
  }

  const payload: Database['public']['Tables']['content_vetting_agencies']['Insert'] = {
    name: suggestion.name.trim(),
    description: suggestion.description,
    country_code: normalizedCountry,
    priority: suggestion.priorityLabel ?? 'Medium',
    regulatory_scope: suggestion.regulatoryScope ?? null,
    category_tags: suggestion.categoryTags ?? [],
    language_codes: suggestion.languageCodes ?? [],
    website_url: suggestion.websiteUrl ?? null,
    rationale: suggestion.rationale ?? null,
    source: suggestion.source ?? 'ai',
    source_metadata: (suggestion.sourceMetadata ?? {}) as Json,
    status: suggestion.status ?? 'pending_verification',
  };

  const { data, error } = await supabase
    .from('content_vetting_agencies')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[vetting-agency-service] Failed to insert suggested agency', error);
    throw error;
  }

  return {
    record: mapAgencyRow(data),
    created: true,
  };
}

export async function getVettingAgenciesByCountry(
  countryCode: string | null | undefined,
  client?: SupabaseClient<Database>,
  options: Omit<VettingAgencyQueryOptions, 'countryCode'> = {},
): Promise<VettingAgencyRecord[]> {
  const result = await fetchVettingAgencies(
    {
      ...options,
      countryCode,
    },
    client,
  );
  return result.agencies;
}

export async function logVettingAgencyEvent(
  input: VettingAgencyEventInput,
  client?: SupabaseClient<Database>,
): Promise<void> {
  const supabase = ensureSupabaseClient(client);
  const payload: VettingAgencyEventInsert = {
    agency_id: input.agencyId ?? null,
    brand_id: input.brandId ?? null,
    category_tags: input.categoryTags ?? [],
    country_code: normalizeCountryCode(input.countryCode) ?? null,
    event_type: input.eventType,
    metadata: (input.metadata ?? {}) as Json,
    created_by: input.createdBy ?? null,
  };

  const { error } = await supabase
    .from('content_vetting_agency_events')
    .insert(payload);

  if (error) {
    console.error('[vetting-agency-service] Failed to log agency event', error);
    throw error;
  }
}

export function getFallbackCatalog(): Record<
  string,
  DefaultVettingAgency[]
> {
  return DEFAULT_VETTING_AGENCIES;
}
