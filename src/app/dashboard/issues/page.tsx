'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitHubIssue, GitHubLabel } from '@/types/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ExternalLink, MessageSquare, User, Search, AlertCircle, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface PriorityLabel {
  name: string;
  order: number;
  color: string;
  displayName?: string;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [priorityLabels, setPriorityLabels] = useState<PriorityLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const stateFilter = 'open'; // Always show open issues only
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'comments'>('created');

  // Fetch labels to understand priority structure
  const fetchLabels = useCallback(async () => {
    try {
      const response = await fetch('/api/github/labels');
      
      if (!response.ok) {
        console.error('Failed to fetch labels');
        return;
      }

      const data = await response.json();
      const allLabels = data.data.allLabels || [];
      setLabels(allLabels);

      // Determine priority labels from actual GitHub labels
      const priorities: PriorityLabel[] = [];
      
      // Check for standard priority labels - more flexible patterns
      const priorityPatterns = [
        // P0-P3 style labels with descriptions (exact match first)
        { pattern: /^P0:\s*Critical$/i, name: 'P0: Critical', order: 1, displayName: 'Critical' },
        { pattern: /^P1:\s*High$/i, name: 'P1: High', order: 2, displayName: 'High' },
        { pattern: /^P2:\s*Medium$/i, name: 'P2: Medium', order: 3, displayName: 'Medium' },
        { pattern: /^P3:\s*Low$/i, name: 'P3: Low', order: 4, displayName: 'Low' },
        // Simple P0-P3 labels
        { pattern: /^p0$/i, name: 'P0', order: 1, displayName: 'Critical' },
        { pattern: /^p1$/i, name: 'P1', order: 2, displayName: 'High' },
        { pattern: /^p2$/i, name: 'P2', order: 3, displayName: 'Medium' },
        { pattern: /^p3$/i, name: 'P3', order: 4, displayName: 'Low' },
        // Other common formats
        { pattern: /priority.*critical|critical.*priority|^critical$/i, name: 'critical', order: 1, displayName: 'Critical' },
        { pattern: /priority.*high|high.*priority|^high$/i, name: 'high', order: 2, displayName: 'High' },
        { pattern: /priority.*medium|medium.*priority|^medium$/i, name: 'medium', order: 3, displayName: 'Medium' },
        { pattern: /priority.*low|low.*priority|^low$/i, name: 'low', order: 4, displayName: 'Low' },
      ];

      allLabels.forEach((label: GitHubLabel) => {
        priorityPatterns.forEach(({ pattern, name, order, displayName }) => {
          if (pattern.test(label.name)) {
            priorities.push({
              name: label.name,
              order,
              color: label.color,
              displayName
            });
          }
        });
      });

      // Remove duplicates and sort by order
      const uniquePriorities = Array.from(
        new Map(priorities.map(p => [p.name, p])).values()
      ).sort((a, b) => a.order - b.order);

      setPriorityLabels(uniquePriorities);
      console.log('Found priority labels:', uniquePriorities);
      console.log('All labels:', allLabels.map((l: GitHubLabel) => l.name));
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        state: stateFilter,
        sort: sortBy,
        direction: 'desc',
        per_page: '100' // Fetch all issues (GitHub max is 100 per page)
      });

      const response = await fetch(`/api/github/issues?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('GitHub API response:', errorData);
        if (errorData.details) {
          throw new Error(`${errorData.error} (${errorData.details.owner}/${errorData.details.repo})`);
        }
        throw new Error(errorData.error || 'Failed to fetch issues');
      }

      const data = await response.json();
      setIssues(data.data.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [stateFilter, sortBy]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Filter and group issues
  const filteredAndGroupedIssues = () => {
    const filtered = issues.filter(issue => 
      searchQuery === '' || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.body?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by priority
    const grouped = filtered.reduce((acc, issue) => {
      let priority = 'none';
      
      // Find priority label - check against the actual GitHub label names
      for (const label of issue.labels) {
        const matchedPriority = priorityLabels.find(p => p.name === label.name);
        if (matchedPriority) {
          priority = label.name; // Use the actual GitHub label name
          break;
        }
      }
      
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(issue);
      return acc;
    }, {} as Record<string, GitHubIssue[]>);

    // Sort priorities based on configured order
    const sortedPriorities = Object.keys(grouped).sort((a, b) => {
      if (a === 'none' && b === 'none') return 0;
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      
      const aOrder = priorityLabels.find(p => p.name === a)?.order || 999;
      const bOrder = priorityLabels.find(p => p.name === b)?.order || 999;
      return aOrder - bOrder;
    });

    return { grouped, sortedPriorities };
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  const getStateColor = (state: string) => {
    return state === 'open' ? 'bg-green-500' : 'bg-purple-500';
  };

  const toggleIssueExpanded = (issueId: number) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const { grouped, sortedPriorities } = filteredAndGroupedIssues();

  if (loading && issues.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          asChild
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded p-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        asChild
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      {/* Page Title and Description */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Repository Issues</h1>
        <p className="text-muted-foreground">
          View and manage open issues from your GitHub repository. Issues are grouped by priority for better organization.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Issues</CardTitle>
            {process.env.NEXT_PUBLIC_GITHUB_OWNER && process.env.NEXT_PUBLIC_GITHUB_REPO && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
              {/* Hidden select for state filter - always show open issues */}
              <input type="hidden" value="open" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-32 h-8 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="comments">Comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Issues List */}
          <div className="space-y-4">
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No issues match your search.' : 'No issues found.'}
              </div>
            ) : (
              sortedPriorities.map((priority) => {
                const priorityInfo = priorityLabels.find(p => p.name === priority);
                const priorityColor = priorityInfo ? `#${priorityInfo.color}` : '#6b7280';
                const priorityDisplayName = priorityInfo?.displayName || (priority === 'none' ? 'No Priority' : priority);
                
                return (
                  <div key={priority} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {priority !== 'none' && (
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: priorityColor }}
                        />
                      )}
                      {priorityDisplayName} ({grouped[priority].length})
                    </h3>
                    <div className="space-y-1">
                      {grouped[priority].map((issue) => {
                        const isExpanded = expandedIssues.has(issue.id);
                        const priorityLabel = issue.labels.find(label => 
                          priority !== 'none' && label.name === priority
                        );
                        const otherLabels = issue.labels.filter(label => 
                          priority === 'none' || label.name !== priority
                        );
                        
                        return (
                          <div
                            key={issue.id}
                            className="border rounded overflow-hidden"
                          >
                            <div 
                              className="p-2 hover:bg-accent/5 transition-colors cursor-pointer"
                              onClick={() => toggleIssueExpanded(issue.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleIssueExpanded(issue.id);
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Badge 
                                      variant="outline" 
                                      className={`${getStateColor(issue.state)} text-white border-0 px-1.5 py-0 text-xs h-5`}
                                    >
                                      {issue.state}
                                    </Badge>
                                    <h4 className="font-medium text-sm truncate flex-1">
                                      {issue.title}
                                    </h4>
                                    <span className="text-xs text-muted-foreground">
                                      #{issue.number}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground ml-7">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {issue.user.login}
                                    </span>
                                    <span>{formatDate(issue.created_at)}</span>
                                    {issue.comments > 0 && (
                                      <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {issue.comments}
                                      </span>
                                    )}
                                    {issue.assignees && issue.assignees.length > 0 && (
                                      <div className="flex -space-x-1">
                                        {issue.assignees.slice(0, 3).map((assignee) => (
                                          <img
                                            key={assignee.id}
                                            src={assignee.avatar_url}
                                            alt={assignee.login}
                                            className="h-4 w-4 rounded-full border border-background"
                                            title={assignee.login}
                                          />
                                        ))}
                                        {issue.assignees.length > 3 && (
                                          <span className="h-4 px-1 text-xs bg-muted rounded-full border border-background flex items-center">
                                            +{issue.assignees.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {/* Labels */}
                                  {otherLabels.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1 ml-7 flex-wrap">
                                      <Tag className="h-3 w-3 text-muted-foreground" />
                                      {otherLabels.map((label) => (
                                        <Badge
                                          key={label.id}
                                          variant="outline"
                                          className="text-xs px-1.5 py-0 h-5"
                                          style={{
                                            backgroundColor: `#${label.color}20`,
                                            borderColor: `#${label.color}`,
                                            color: `#${label.color}`
                                          }}
                                        >
                                          {label.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" asChild>
                                    <a 
                                      href={issue.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t bg-accent/5 p-4">
                                <div className="prose prose-sm max-w-none">
                                  <h5 className="text-sm font-semibold mb-2">Description</h5>
                                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {issue.body || 'No description provided.'}
                                  </div>
                                  {issue.labels.length > 0 && (
                                    <div className="mt-4">
                                      <h5 className="text-sm font-semibold mb-2">All Labels</h5>
                                      <div className="flex flex-wrap gap-1">
                                        {issue.labels.map((label) => (
                                          <Badge
                                            key={label.id}
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                              backgroundColor: `#${label.color}20`,
                                              borderColor: `#${label.color}`,
                                              color: `#${label.color}`
                                            }}
                                          >
                                            {label.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Created: {format(new Date(issue.created_at), 'dd MMM yyyy HH:mm')}</span>
                                    <span>Updated: {format(new Date(issue.updated_at), 'dd MMM yyyy HH:mm')}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}