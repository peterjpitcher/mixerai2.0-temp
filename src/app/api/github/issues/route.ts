import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner') || process.env.GITHUB_OWNER;
    const repo = searchParams.get('repo') || process.env.GITHUB_REPO;

    // Validate required configuration
    if (!owner || !repo) {
      console.error('Missing GitHub configuration:', { owner, repo });
      return NextResponse.json(
        { 
          error: 'GitHub repository not configured',
          details: 'Please set GITHUB_OWNER and GITHUB_REPO environment variables'
        },
        { status: 500 }
      );
    }
    const state = searchParams.get('state') || 'all'; // open, closed, all
    const labels = searchParams.get('labels') || '';
    const sort = searchParams.get('sort') || 'created';
    const direction = searchParams.get('direction') || 'desc';
    const per_page = searchParams.get('per_page') || '30';
    const page = searchParams.get('page') || '1';

    // Construct GitHub API URL
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const params = new URLSearchParams({
      state,
      sort,
      direction,
      per_page,
      page,
    });
    
    if (labels) {
      params.append('labels', labels);
    }

    const githubUrl = `${baseUrl}?${params.toString()}`;

    // Log the URL for debugging (remove in production)
    console.log('Fetching GitHub issues from:', githubUrl);
    console.log('Owner:', owner, 'Repo:', repo);

    // Make request to GitHub API
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GitHub token not configured');
      return NextResponse.json(
        { error: 'GitHub token not configured. Please add GITHUB_TOKEN to your environment variables.' },
        { status: 500 }
      );
    }

    const response = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', response.status, errorData);
      return NextResponse.json(
        { 
          error: errorData.message || 'Failed to fetch GitHub issues',
          details: {
            status: response.status,
            owner,
            repo,
            message: errorData.message || 'Unknown error'
          }
        },
        { status: response.status }
      );
    }

    const issues = await response.json();
    
    // Parse link header for pagination info
    const linkHeader = response.headers.get('link');
    const pagination = parseLinkHeader(linkHeader);

    return NextResponse.json({
      success: true,
      data: {
        issues,
        pagination: {
          ...pagination,
          page: parseInt(page),
          per_page: parseInt(per_page)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to parse GitHub's Link header for pagination
function parseLinkHeader(header: string | null): Record<string, number> {
  if (!header) return {};
  
  const links: Record<string, number> = {};
  const parts = header.split(',');
  
  for (const part of parts) {
    const section = part.split(';');
    if (section.length !== 2) continue;
    
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const name = section[1].replace(/rel="(.*)"/, '$1').trim();
    
    // Extract page number from URL
    const match = url.match(/[?&]page=(\d+)/);
    if (match) {
      links[name] = parseInt(match[1]);
    }
  }
  
  return links;
}