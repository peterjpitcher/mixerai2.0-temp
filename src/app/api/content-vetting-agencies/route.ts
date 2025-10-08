import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { COUNTRIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type SupabaseVettingAgencyPriority = 'High' | 'Medium' | 'Low';
type SupabaseVettingAgencyPriorityNullable = SupabaseVettingAgencyPriority | null;

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

function mapSupabasePriorityToNumber(priority: SupabaseVettingAgencyPriorityNullable): number {
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

interface VettingAgencyForApiResponse {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number;
  priority_label?: SupabaseVettingAgencyPriorityNullable;
}

function parseQuery(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const country = url.searchParams.get('country')?.trim() ?? '';
  const priority = url.searchParams.get('priority')?.trim() ?? '';

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

  return { search, country, priority, limit, page, offset, paginationRequested };
}

function buildHeaders(total: number) {
  return {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'X-Total-Count': total.toString(),
  } as Record<string, string>;
}

export const GET = withAuth(async (request) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { search, country, priority, limit, page, offset, paginationRequested } = parseQuery(request);

    const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const normalizedPriority = priority ? priority.toLowerCase() : '';

    const normalizeCountryQuery = (input: string) => {
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
    };

    let query = supabase
      .from('content_vetting_agencies')
      .select('id, name, description, country_code, priority', { count: 'exact' });

    if (escapedSearch) {
      query = query.or(
        `name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,country_code.ilike.%${escapedSearch}%`
      );
    }

    if (country) {
      const normalizedCountry = normalizeCountryQuery(country);
      if (normalizedCountry) {
        query = query.ilike('country_code', normalizedCountry);
      }
    }

    if (normalizedPriority) {
      if (['high', 'medium', 'low'].includes(normalizedPriority)) {
        const label = normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1) as SupabaseVettingAgencyPriority;
        query = query.eq('priority', label);
      } else {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit: paginationRequested ? (limit ?? 0) : 0, total: 0 } }, { headers: buildHeaders(0) });
      }
    }

    query = query
      .order('country_code', { ascending: true })
      .order('priority', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (limit !== null) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching content vetting agencies:', error);
      throw error;
    }

    const agencies = (data ?? []).map((agency) => {
      const numericPriority = mapSupabasePriorityToNumber(agency.priority as SupabaseVettingAgencyPriorityNullable);
      return {
        id: agency.id,
        name: agency.name,
        description: agency.description,
        country_code: agency.country_code,
        priority: numericPriority,
        priority_label: agency.priority as SupabaseVettingAgencyPriorityNullable,
      } satisfies VettingAgencyForApiResponse;
    });

    const total = typeof count === 'number' ? count : agencies.length;

    const responseLimit = paginationRequested
      ? (limit ?? agencies.length)
      : agencies.length;

    return NextResponse.json({
      success: true,
      data: agencies,
      pagination: {
        page,
        limit: responseLimit,
        total,
      },
    }, { headers: buildHeaders(total) });

  } catch (error) {
    return handleApiError(error, 'Error fetching content vetting agencies');
  }
}); 
