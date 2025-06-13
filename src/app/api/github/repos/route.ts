import { NextResponse } from 'next/server';

interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  has_issues: boolean;
  open_issues_count: number;
  updated_at: string;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;

  if (!token) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
  }

  try {
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    let tokenUser = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      tokenUser = userData.login;
    }

    // List repos for the owner
    const reposUrl = owner 
      ? `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`
      : 'https://api.github.com/user/repos?per_page=100&sort=updated';

    const reposResponse = await fetch(reposUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (reposResponse.ok) {
      const repos = await reposResponse.json();
      return NextResponse.json({
        tokenUser,
        owner: owner || tokenUser,
        count: repos.length,
        repositories: repos.map((repo: GitHubRepo) => ({
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          has_issues: repo.has_issues,
          open_issues_count: repo.open_issues_count,
          updated_at: repo.updated_at
        }))
      });
    } else {
      const error = await reposResponse.json();
      return NextResponse.json({
        tokenUser,
        error: error.message,
        statusCode: reposResponse.status
      }, { status: reposResponse.status });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}