import { NextResponse } from 'next/server';

export async function GET() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  // Check configuration
  const config = {
    owner: owner || 'NOT SET',
    repo: repo || 'NOT SET',
    tokenSet: !!token,
    tokenLength: token ? token.length : 0
  };

  // If all required vars are set, try to fetch repo info
  if (owner && repo && token) {
    try {
      // First, check if the token is valid
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

      // Then try to fetch the repo
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (response.ok) {
        const repoData = await response.json();
        return NextResponse.json({
          config,
          status: 'success',
          tokenUser,
          repository: {
            name: repoData.name,
            full_name: repoData.full_name,
            private: repoData.private,
            has_issues: repoData.has_issues,
            open_issues_count: repoData.open_issues_count
          }
        });
      } else {
        const error = await response.json();
        return NextResponse.json({
          config,
          status: 'error',
          tokenUser,
          error: error.message,
          statusCode: response.status,
          documentation_url: error.documentation_url
        });
      }
    } catch (error) {
      return NextResponse.json({
        config,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    config,
    status: 'not_configured',
    message: 'Please set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN environment variables'
  });
}