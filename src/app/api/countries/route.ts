import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 200;

function parsePagination(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const limitParam = Number(url.searchParams.get('perPage') ?? url.searchParams.get('limit'));
  const pageParam = Number(url.searchParams.get('page'));

  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), MAX_PAGE_SIZE)
    : 100;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const offset = (page - 1) * limit;

  return { search, limit, page, offset };
}

function buildHeaders(total: number) {
  return {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    'X-Total-Count': total.toString(),
  } as Record<string, string>;
}

async function getCountriesHandler(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { search, limit, page, offset } = parsePagination(request);

    const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');

    let query = supabase
      .from('countries')
      .select('code, name', { count: 'exact' })
      .eq('is_active', true);

    if (escapedSearch) {
      query = query.or(
        `name.ilike.%${escapedSearch}%,code.ilike.%${escapedSearch}%`
      );
    }

    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      // If countries table doesn't exist, return a default list
      if (error.code === '42P01') { // Table does not exist
        console.warn('Countries table does not exist, returning default list');
        const defaultCountries = [
          { code: 'US', name: 'United States' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'CA', name: 'Canada' },
          { code: 'AU', name: 'Australia' },
          { code: 'DE', name: 'Germany' },
          { code: 'FR', name: 'France' },
          { code: 'IT', name: 'Italy' },
          { code: 'ES', name: 'Spain' },
          { code: 'NL', name: 'Netherlands' },
          { code: 'JP', name: 'Japan' },
          { code: 'CN', name: 'China' },
          { code: 'IN', name: 'India' },
          { code: 'BR', name: 'Brazil' },
          { code: 'MX', name: 'Mexico' },
          { code: 'KR', name: 'South Korea' },
        ];
        const filtered = search
          ? defaultCountries.filter(country =>
              country.name.toLowerCase().includes(search.toLowerCase()) ||
              country.code.toLowerCase().includes(search.toLowerCase())
            )
          : defaultCountries;

        const paged = filtered.slice(offset, offset + limit);

        const total = filtered.length;

        return NextResponse.json({
          success: true,
          data: paged,
          countries: paged,
          pagination: {
            page,
            limit,
            total,
          },
        }, { headers: buildHeaders(total) });
      }
      
      console.error('Error fetching countries:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const countries = data ?? [];
    const total = typeof count === 'number' ? count : countries.length;

    return NextResponse.json({
      success: true,
      data: countries,
      countries,
      pagination: {
        page,
        limit,
        total,
      },
    }, { headers: buildHeaders(total) });

  } catch (error) {
    return handleApiError(error, 'Error fetching countries');
  }
}

// Export the wrapped handler
export const GET = withAuth((request) => getCountriesHandler(request)); 
