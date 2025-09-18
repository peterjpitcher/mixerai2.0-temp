import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, user) => {
  try {
    // Check if user is admin
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !githubToken) {
      return NextResponse.json(
        { error: 'GitHub configuration missing' },
        { status: 500 }
      );
    }

    // Fetch labels from GitHub
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch labels' },
        { status: response.status }
      );
    }

    const labels = await response.json();
    
    // Filter and categorize priority labels
    const priorityLabels = labels.filter((label: { name: string; color: string; id: number }) => 
      label.name.toLowerCase().includes('priority') ||
      label.name.toLowerCase() === 'critical' ||
      label.name.toLowerCase() === 'high' ||
      label.name.toLowerCase() === 'medium' ||
      label.name.toLowerCase() === 'low'
    );

    return NextResponse.json({
      success: true,
      data: {
        allLabels: labels,
        priorityLabels
      }
    });

  } catch (error) {
    console.error('Error fetching GitHub labels:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
