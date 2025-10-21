'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetchJson } from '@/lib/api-client';
import { ShieldCheck, RefreshCw } from 'lucide-react';

type AdminAgencyRecord = {
  id: string;
  name: string;
  description: string | null;
  country_code: string;
  priority: number;
  priority_label?: string | null;
  status: string;
  regulatory_scope: string | null;
  category_tags: string[];
  language_codes: string[];
  website_url: string | null;
  rationale: string | null;
  source: string;
  source_metadata?: Record<string, unknown>;
  is_fallback: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type StatusFilter = 'pending_verification' | 'approved' | 'rejected';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Pending', value: 'pending_verification' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function VettingAgenciesAdminPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_verification');

  const agenciesQuery = useQuery({
    queryKey: ['vetting-agencies-admin', statusFilter],
    queryFn: async () => {
      const queryString = new URLSearchParams({ status: statusFilter, perPage: '200' }).toString();
      const response = await apiFetchJson<{
        success: boolean;
        data?: AdminAgencyRecord[];
        error?: string;
        pagination?: { total: number };
      }>(`/api/content-vetting-agencies?${queryString}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load vetting agencies');
      }

      return response.data ?? [];
    },
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const response = await apiFetchJson<{ success: boolean; data?: AdminAgencyRecord; error?: string }>(
        `/api/content-vetting-agencies/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        },
      );

      if (!response.success) {
        throw new Error(response.error || 'Update failed');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vetting-agencies-admin'] });
    },
  });

  const agencies = useMemo(() => agenciesQuery.data ?? [], [agenciesQuery.data]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tools', href: '/dashboard/tools' },
          { label: 'Agency Catalogue' },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Agency Catalogue</h1>
        <p className="text-muted-foreground max-w-2xl">
          Review AI-suggested content vetting agencies, capture metadata, and approve trusted regulators before they
          reach brand teams.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Discovery Queue</CardTitle>
            <CardDescription>
              {STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? 'Agencies'} •{' '}
              {agenciesQuery.data ? agencies.length : '—'} results
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['vetting-agencies-admin'] })}
              disabled={agenciesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${agenciesQuery.isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {agenciesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : agencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ShieldCheck className="mb-3 h-10 w-10" />
              <p>No agencies found for this filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Agency</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => {
                  const priorityLabel = agency.priority_label ?? null;
                  const disableActions = agency.is_fallback;

                  return (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <div className="font-medium">{agency.name}</div>
                        {agency.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">{agency.description}</div>
                        )}
                        {agency.rationale && (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            Rationale: {agency.rationale}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{agency.country_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {disableActions ? (
                          <Badge variant="secondary">Static</Badge>
                        ) : (
                        <Select
                            value={priorityLabel ?? undefined}
                            onValueChange={(value) => {
                              updateMutation.mutate({ id: agency.id, updates: { priority: value } });
                            }}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Set priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            agency.status === 'approved'
                              ? 'default'
                              : agency.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {agency.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase text-muted-foreground">{agency.source}</span>
                      </TableCell>
                      <TableCell>{formatDate(agency.updated_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disableActions || updateMutation.isPending}
                          onClick={() => {
                            toast.promise(
                              updateMutation.mutateAsync({
                                id: agency.id,
                                updates: { status: 'approved' },
                              }),
                              {
                                loading: 'Approving agency…',
                                success: 'Agency approved',
                                error: (error) => error.message || 'Failed to approve agency',
                              },
                            );
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={disableActions || updateMutation.isPending}
                          onClick={() => {
                            toast.promise(
                              updateMutation.mutateAsync({
                                id: agency.id,
                                updates: { status: 'pending_verification' },
                              }),
                              {
                                loading: 'Resetting status…',
                                success: 'Agency reset to pending',
                                error: (error) => error.message || 'Failed to reset agency',
                              },
                            );
                          }}
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={disableActions || updateMutation.isPending}
                          onClick={() => {
                            toast.promise(
                              updateMutation.mutateAsync({
                                id: agency.id,
                                updates: { status: 'rejected' },
                              }),
                              {
                                loading: 'Rejecting agency…',
                                success: 'Agency rejected',
                                error: (error) => error.message || 'Failed to reject agency',
                              },
                            );
                          }}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
