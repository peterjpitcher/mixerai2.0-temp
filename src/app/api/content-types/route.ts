import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 200;

function parseQuery(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const limitParam = Number(url.searchParams.get('perPage') ?? url.searchParams.get('limit'));
  const pageParam = Number(url.searchParams.get('page'));

  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), MAX_PAGE_SIZE)
    : 50;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const offset = (page - 1) * limit;

  return { search, limit, page, offset };
}

function buildHeaders(total: number) {
  return {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'X-Total-Count': total.toString(),
  } as Record<string, string>;
}

/**
 * GET: Retrieve all content types with optional pagination and search.
 * Requires authentication.
 */
export const GET = withAuth(async (request) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { search, limit, page, offset } = parseQuery(request);
    const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');

    let query = supabase
      .from('content_types')
      .select('id, name, description, created_at, updated_at', { count: 'exact' });

    if (escapedSearch) {
      query = query.or(
        `name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`
      );
    }

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching content types:', error);
      throw error;
    }

    const contentTypes = data ?? [];
    const total = typeof count === 'number' ? count : contentTypes.length;

    return NextResponse.json({
      success: true,
      data: contentTypes,
      pagination: {
        page,
        limit,
        total,
      },
    }, { headers: buildHeaders(total) });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch content types');
  }
}); 
