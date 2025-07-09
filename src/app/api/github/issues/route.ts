import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Rate limiting tracking (in-memory for now, should use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const CreateIssueSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1).max(65536),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  consoleLogs: z.array(z.object({
    level: z.enum(['log', 'warn', 'error', 'info']),
    message: z.string(),
    timestamp: z.string(),
    stack: z.string().optional(),
  })).optional(),
  networkLogs: z.array(z.object({
    method: z.string(),
    url: z.string(),
    status: z.number().optional(),
    timestamp: z.string(),
    duration: z.number().optional(),
    error: z.string().optional(),
  })).optional(),
  screenshot: z.string().optional(),
  environment: z.object({
    url: z.string(),
    userAgent: z.string(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }),
    timestamp: z.string(),
  }),
});

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 30;

  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || userLimit.resetTime < now) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (userLimit.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }

  userLimit.count++;
  return { allowed: true, remaining: maxRequests - userLimit.count, resetTime: userLimit.resetTime };
}

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

export async function POST(request: NextRequest) {
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

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: new Date(rateLimit.resetTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000))
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateIssueSchema.parse(body);

    // Get GitHub configuration
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !githubToken) {
      console.error('Missing GitHub configuration');
      return NextResponse.json(
        { error: 'GitHub repository not configured' },
        { status: 500 }
      );
    }

    // Prepare issue body
    const issueBody = formatIssueBody({
      ...validatedData,
      user: {
        id: user.id,
        email: user.email || 'Unknown',
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
      },
    });

    // Prepare labels
    const labels = ['user-reported'];
    if (validatedData.priority) {
      labels.push(`${validatedData.priority}: ${getPriorityName(validatedData.priority)}`);
    }

    // Create issue on GitHub
    const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: validatedData.title,
        body: issueBody,
        labels: labels,
      }),
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub API error:', githubResponse.status, errorData);
      return NextResponse.json(
        { 
          error: errorData.message || 'Failed to create issue',
          details: errorData
        },
        { status: githubResponse.status }
      );
    }

    const createdIssue = await githubResponse.json();

    // If screenshot exists, add it as a comment
    if (validatedData.screenshot) {
      await addScreenshotComment(
        owner,
        repo,
        createdIssue.number,
        validatedData.screenshot,
        githubToken
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        issueNumber: createdIssue.number,
        issueUrl: createdIssue.html_url,
        title: createdIssue.title,
      },
    }, {
      headers: {
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetTime / 1000))
      }
    });

  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPriorityName(priority: string): string {
  const priorityMap: Record<string, string> = {
    'P0': 'Critical',
    'P1': 'High',
    'P2': 'Medium',
    'P3': 'Low',
  };
  return priorityMap[priority] || priority;
}

interface IssueBodyData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  description: string;
  environment: {
    url: string;
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
    timestamp: string;
  };
  consoleLogs?: ConsoleLog[];
  networkLogs?: NetworkLog[];
}

interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
}

interface NetworkLog {
  method: string;
  url: string;
  status?: number;
  timestamp: string;
  duration?: number;
  error?: string;
}

function formatIssueBody(data: IssueBodyData): string {
  const { user, description, environment, consoleLogs, networkLogs } = data;
  
  let body = `## Issue Description\n\n${description}\n\n`;
  
  // User Information
  body += `## Reporter Information\n\n`;
  body += `- **User ID**: ${user.id}\n`;
  body += `- **Email**: ${user.email}\n`;
  body += `- **Name**: ${user.name}\n\n`;
  
  // Environment Information
  body += `## Environment\n\n`;
  body += `- **URL**: ${environment.url}\n`;
  body += `- **User Agent**: ${environment.userAgent}\n`;
  body += `- **Viewport**: ${environment.viewport.width}x${environment.viewport.height}\n`;
  body += `- **Reported At**: ${environment.timestamp}\n\n`;
  
  // Console Logs
  if (consoleLogs && consoleLogs.length > 0) {
    body += `## Console Logs\n\n`;
    body += `<details>\n<summary>View console logs (${consoleLogs.length} entries)</summary>\n\n`;
    body += '```\n';
    
    consoleLogs.forEach((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      body += `[${time}] [${log.level.toUpperCase()}] ${log.message}\n`;
      if (log.stack) {
        body += `${log.stack}\n`;
      }
      body += '\n';
    });
    
    body += '```\n</details>\n\n';
  }
  
  // Network Logs
  if (networkLogs && networkLogs.length > 0) {
    body += `## Network Activity\n\n`;
    body += `<details>\n<summary>View network logs (${networkLogs.length} requests)</summary>\n\n`;
    body += '| Time | Method | URL | Status | Duration |\n';
    body += '|------|--------|-----|--------|----------|\n';
    
    networkLogs.forEach((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const status = log.status || log.error || 'N/A';
      const duration = log.duration ? `${log.duration}ms` : 'N/A';
      body += `| ${time} | ${log.method} | ${log.url} | ${status} | ${duration} |\n`;
    });
    
    body += '\n</details>\n\n';
  }
  
  body += `---\n\n`;
  body += `*This issue was automatically reported via the in-app issue reporter.*`;
  
  return body;
}

async function addScreenshotComment(
  owner: string,
  repo: string,
  issueNumber: number,
  screenshot: string,
  token: string
): Promise<void> {
  try {
    // Extract base64 data and convert to markdown image
    const imageData = screenshot.split(',')[1] || screenshot;
    const imageSizeKB = Math.round((imageData.length * 3) / 4 / 1024);
    
    const comment = `## Screenshot\n\n`;
    const imageMarkdown = `![Screenshot](data:image/jpeg;base64,${imageData})`;
    
    // GitHub has a limit on comment size, so we'll add a note if the image is large
    const fullComment = imageSizeKB > 1000 
      ? `${comment}*Note: Screenshot is ${imageSizeKB}KB. If it doesn't display properly, please download the issue data.*\n\n${imageMarkdown}`
      : `${comment}${imageMarkdown}`;
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: fullComment,
      }),
    });
  } catch (error) {
    console.error('Failed to add screenshot comment:', error);
    // Don't throw - the issue was created successfully even if the screenshot failed
  }
}