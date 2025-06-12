export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  due_on?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  user: GitHubUser;
  assignee?: GitHubUser;
  assignees?: GitHubUser[];
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  comments: number;
  pull_request?: {
    url: string;
    html_url: string;
  };
}

export interface GitHubIssuesResponse {
  issues: GitHubIssue[];
  pagination: {
    first?: number;
    prev?: number;
    next?: number;
    last?: number;
    page: number;
    per_page: number;
  };
}