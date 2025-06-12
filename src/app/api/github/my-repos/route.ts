import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
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
      const mixerRepos = repos.filter((repo: any) => 
        repo.name.toLowerCase().includes('mixer') || 
        repo.name.toLowerCase().includes('mixerai')
      );
      
      return NextResponse.json({
        totalRepos: repos.length,
        mixerRepos: mixerRepos.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          has_issues: repo.has_issues
        })),
        allRepos: repos.map((repo: any) => ({
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
}