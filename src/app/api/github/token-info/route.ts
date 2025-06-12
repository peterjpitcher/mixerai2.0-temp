import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  try {
    // Get rate limit info which includes scopes in headers
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Get scopes from response headers
    const scopes = response.headers.get('x-oauth-scopes') || 'No scopes found';
    const tokenType = response.headers.get('x-oauth-token-type') || 'Unknown';
    
    const rateLimit = await response.json();

    // Also try to list org memberships
    const orgsResponse = await fetch('https://api.github.com/user/orgs', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    let orgs = [];
    if (orgsResponse.ok) {
      orgs = await orgsResponse.json();
    }

    return NextResponse.json({
      tokenInfo: {
        type: tokenType,
        scopes: scopes.split(', ').filter(s => s),
        hasRepoScope: scopes.includes('repo'),
        hasPublicRepoScope: scopes.includes('public_repo')
      },
      organizations: orgs.map((org: any) => ({
        login: org.login,
        description: org.description
      })),
      rateLimit: {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        used: rateLimit.rate.used
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}