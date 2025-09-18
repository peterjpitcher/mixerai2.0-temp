import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

const githubDiagnosticsEnabled = process.env.ENABLE_GITHUB_TEST_ENDPOINTS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'GitHub diagnostics are disabled. Set ENABLE_GITHUB_TEST_ENDPOINTS=true to enable locally.' },
    { status: 410 }
  );
}

interface GitHubRepo {
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  has_issues: boolean;
}

export const GET = withAuth(async (_req, user) => {
  if (!githubDiagnosticsEnabled) {
    return disabledResponse();
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  if (user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    // Get repos for authenticated user
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (reposResponse.ok) {
      const repos = await reposResponse.json();
      const mixerRepos = repos.filter((repo: GitHubRepo) => 
        repo.name.toLowerCase().includes('mixer') || 
        repo.name.toLowerCase().includes('mixerai')
      );
      
      return NextResponse.json({
        totalRepos: repos.length,
        mixerRepos: mixerRepos.map((repo: GitHubRepo) => ({
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          has_issues: repo.has_issues
        })),
        allRepos: repos.map((repo: GitHubRepo) => ({
          name: repo.name,
          owner: repo.owner.login
        }))
      });
    } else {
      const error = await reposResponse.json();
      return NextResponse.json({ error: error.message }, { status: reposResponse.status });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
