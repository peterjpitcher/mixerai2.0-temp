import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

type SupabaseVettingAgencyPriority = 'High' | 'Medium' | 'Low';
type SupabaseVettingAgencyPriorityNullable = SupabaseVettingAgencyPriority | null;

const MAX_PAGE_SIZE = 200;

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
  const limitParam = Number(url.searchParams.get('perPage') ?? url.searchParams.get('limit'));
  const pageParam = Number(url.searchParams.get('page'));

  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), MAX_PAGE_SIZE)
    : 50;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const offset = (page - 1) * limit;

  return { search, country, priority, limit, page, offset };
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
    const { search, country, priority, limit, page, offset } = parseQuery(request);

    const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const normalizedPriority = priority ? priority.toLowerCase() : '';

    let query = supabase
      .from('content_vetting_agencies')
      .select('id, name, description, country_code, priority', { count: 'exact' });

    if (escapedSearch) {
      query = query.or(
        `name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,country_code.ilike.%${escapedSearch}%`
      );
    }

    if (country) {
      query = query.ilike('country_code', country);
    }

    if (normalizedPriority) {
      if (['high', 'medium', 'low'].includes(normalizedPriority)) {
        const label = normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1) as SupabaseVettingAgencyPriority;
        query = query.eq('priority', label);
      } else {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0 } }, { headers: buildHeaders(0) });
      }
    }

    const { data, error, count } = await query
      .order('country_code', { ascending: true })
      .order('priority', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

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

    return NextResponse.json({
      success: true,
      data: agencies,
      pagination: {
        page,
        limit,
        total,
      },
    }, { headers: buildHeaders(total) });

  } catch (error) {
    return handleApiError(error, 'Error fetching content vetting agencies');
  }
}); 
