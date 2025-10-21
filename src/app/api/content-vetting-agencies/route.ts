import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { COUNTRIES } from '@/lib/constants';
import { fetchVettingAgencies } from '@/lib/vetting-agencies/service';
import type { VettingAgencyStatus } from '@/lib/vetting-agencies/service';

export const dynamic = 'force-dynamic';

type PriorityLabel = 'High' | 'Medium' | 'Low';
type PriorityLabelNullable = PriorityLabel | null;
type StatusFilter = VettingAgencyStatus;

const MAX_PAGE_SIZE = 1000;

const COUNTRY_SYNONYM_MAP: Record<string, string> = {
  UK: 'GB',
  GBR: 'GB',
  'UNITED KINGDOM': 'GB',
  'GREAT BRITAIN': 'GB',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'U.S.': 'US',
  'U.S.A.': 'US',
};

function normalizeCountryQuery(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  for (const country of COUNTRIES) {
    if (country.value.toLowerCase() === lower) return country.value;
    if (country.label.toLowerCase() === lower) return country.value;
  }

  const synonym = COUNTRY_SYNONYM_MAP[trimmed.toUpperCase()];
  return synonym ?? trimmed.toUpperCase();
}

function mapPriorityLabelToNumber(priority: PriorityLabelNullable): number {
  switch (priority) {
    case 'High':
      return 1;
    case 'Medium':
      return 2;
    case 'Low':
      return 3;
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

function normalizePriorityFilter(value: string): PriorityLabel | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'high') return 'High';
  if (trimmed === 'medium') return 'Medium';
  if (trimmed === 'low') return 'Low';
  return null;
}

function normalizeStatusFilter(value: string): StatusFilter | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'approved') return 'approved';
  if (trimmed === 'pending' || trimmed === 'pending_verification') {
    return 'pending_verification';
  }
  if (trimmed === 'rejected') return 'rejected';
  return null;
}

interface VettingAgencyForApiResponse {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number;
  priority_label?: PriorityLabelNullable;
  status: string;
  regulatory_scope: string | null;
  category_tags: string[];
  language_codes: string[];
  website_url: string | null;
  rationale: string | null;
  source: string;
  source_metadata: Record<string, unknown>;
  is_fallback: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function parseQuery(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const country = url.searchParams.get('country')?.trim() ?? '';
  const priority = url.searchParams.get('priority')?.trim() ?? '';
  const status = url.searchParams.get('status')?.trim() ?? '';

  const limitParamRaw = url.searchParams.get('perPage') ?? url.searchParams.get('limit');
  const pageParamRaw = url.searchParams.get('page');

  const parsedLimit = limitParamRaw !== null ? Number(limitParamRaw) : null;
  const parsedPage = pageParamRaw !== null ? Number(pageParamRaw) : null;
  const paginationRequested = limitParamRaw !== null || pageParamRaw !== null;

  const limit = paginationRequested
    ? (Number.isFinite(parsedLimit) && (parsedLimit as number) > 0
        ? Math.min(Math.floor(parsedLimit as number), MAX_PAGE_SIZE)
        : 50)
    : MAX_PAGE_SIZE;

  const page = paginationRequested && Number.isFinite(parsedPage) && (parsedPage as number) > 0
    ? Math.floor(parsedPage as number)
    : 1;

  const offset = limit !== null ? (page - 1) * limit : 0;

  return { search, country, priority, status, limit, page, offset, paginationRequested };
}

function buildHeaders(total: number) {
  return {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'X-Total-Count': total.toString(),
  } as Record<string, string>;
}

export const GET = withAuth(async (request) => {
  try {
    const { search, country, priority, status, limit, page, offset, paginationRequested } = parseQuery(request);

    const priorityLabel = normalizePriorityFilter(priority);
    if (priority && !priorityLabel) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: {
            page,
            limit: paginationRequested ? (limit ?? 0) : 0,
            total: 0,
          },
        },
        { headers: buildHeaders(0) },
      );
    }

    const statusFilters = status
      ? status
          .split(',')
          .map((value) => normalizeStatusFilter(value))
          .filter((value): value is StatusFilter => value !== null)
      : undefined;

    if (status && (!statusFilters || statusFilters.length === 0)) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: {
            page,
            limit: paginationRequested ? (limit ?? 0) : 0,
            total: 0,
          },
        },
        { headers: buildHeaders(0) },
      );
    }

    const normalizedCountry = country ? normalizeCountryQuery(country) : '';

    const { agencies: records, total, fallbackApplied } = await fetchVettingAgencies(
      {
        countryCode: normalizedCountry || undefined,
        search: search || null,
        priority: priorityLabel ?? undefined,
        status: statusFilters && statusFilters.length > 0 ? statusFilters : undefined,
        limit: limit ?? undefined,
        offset,
      },
    );

    const agencies = records.map((agency): VettingAgencyForApiResponse => {
      const numericPriority = mapPriorityLabelToNumber(agency.priorityLabel ?? null);
      return {
        id: agency.id,
        name: agency.name,
        description: agency.description,
        country_code: agency.countryCode,
        priority: numericPriority,
        priority_label: agency.priorityLabel ?? null,
        status: agency.status,
        regulatory_scope: agency.regulatoryScope,
        category_tags: agency.categoryTags,
        language_codes: agency.languageCodes,
        website_url: agency.websiteUrl,
        rationale: agency.rationale,
        source: agency.source,
        source_metadata: agency.sourceMetadata,
        is_fallback: agency.isFallback,
        created_at: agency.createdAt,
        updated_at: agency.updatedAt,
      };
    });

    const responseLimit = paginationRequested
      ? (limit ?? agencies.length)
      : agencies.length;

    const headers = {
      ...buildHeaders(total),
      'X-Vetting-Fallback': fallbackApplied ? '1' : '0',
    };

    return NextResponse.json({
      success: true,
      data: agencies,
      pagination: {
        page,
        limit: responseLimit,
        total,
      },
      fallback_applied: fallbackApplied,
    }, { headers });

  } catch (error) {
    return handleApiError(error, 'Error fetching content vetting agencies');
  }
}); 
