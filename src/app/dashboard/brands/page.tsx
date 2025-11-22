"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { BrandCell } from "@/components/ui/brand-display";
import { COUNTRIES, getLanguageLabel } from "@/lib/constants";
import { PackageOpen, AlertTriangle, Eye, Pencil, Trash2, Plus, MoreVertical } from "lucide-react";
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/date';
import { touchFriendly } from '@/lib/utils/touch-target';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DeleteBrandDialog } from "@/components/dashboard/brand/delete-brand-dialog";
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/use-common-data';
import { apiFetch } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Brand {
  id: string;
  name: string;
  country: string;
  language: string;
  content_count: number;
  brand_color?: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

type BrandPermission = {
  brand_id: string;
  role: string;
};

const EMPTY_BRAND_PERMISSIONS: BrandPermission[] = [];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface BrandsPageClientProps {
  initialBrands: Brand[];
}

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in (error as Record<string, unknown>) &&
    (error as { name?: unknown }).name === 'AbortError'
  );
};

const ErrorState = ({ error, onRetry }: { error: string | null; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
    <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
    <h3 className="text-xl font-bold mb-2">Failed to load brands</h3>
    <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = ({ canCreate }: { canCreate: boolean }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] py-10">
    <PackageOpen className="mb-4 h-16 w-16 text-muted-foreground" />
    <h3 className="text-xl font-bold mb-2">No Brands Available</h3>
    <p className="text-muted-foreground mb-4 text-center max-w-md">
      You currently do not have access to any brands, or no brands have been created in the system.
    </p>
    {canCreate ? (
      <Button asChild>
        <Link href="/dashboard/brands/new">Add Brand</Link>
      </Button>
    ) : (
      <p className="text-sm text-muted-foreground">
        Contact an administrator if you need to create a brand.
      </p>
    )}
  </div>
);

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const aggregated: Brand[] = [];
      const pageSize = 100;
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        if (signal?.aborted) return;

        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });

        const response = await apiFetch(`/api/brands?${params.toString()}`, { signal });
        if (signal?.aborted) return;

        if (!response.ok) {
          throw new Error(`Failed to fetch brands (status ${response.status})`);
        }

        const payload = await response.json();
        if (signal?.aborted) return;

        if (!payload?.success) {
          throw new Error(payload?.error || 'Failed to fetch brands');
        }

        const chunk: Brand[] = Array.isArray(payload.data) ? payload.data : [];
        aggregated.push(...chunk);

        const pagination = payload.pagination;
        hasNext = Boolean(pagination?.hasNextPage);
        if (!hasNext) {
          break;
        }

        page += 1;
      }

      if (!signal?.aborted) {
        setBrands(aggregated);
      }
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        return;
      }
      console.error('Error fetching brands:', error);
      setError((error as Error).message || 'Failed to load brands');
      toast.error('Failed to load brands. Please try again.', {
        description: (error as Error).message,
      });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchBrands(controller.signal);
    return () => controller.abort();
  }, [fetchBrands]);

  const {
    data: currentUser,
    isLoading: isLoadingUser,
  } = useCurrentUser();

  const userRole = currentUser?.user_metadata?.role;
  const isGlobalAdmin = userRole === 'admin';
  const brandPermissions = currentUser?.brand_permissions ?? EMPTY_BRAND_PERMISSIONS;

  const brandPermissionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const permission of brandPermissions) {
      if (permission?.brand_id) {
        map.set(permission.brand_id, permission.role);
      }
    }
    return map;
  }, [brandPermissions]);

  const canManageAnyBrand = useMemo(
    () => isGlobalAdmin || brandPermissions.some((permission) => permission.role === 'admin'),
    [isGlobalAdmin, brandPermissions],
  );

  const canCreateBrand = isGlobalAdmin;

  const canManageBrand = useCallback(
    (brandId: string) => isGlobalAdmin || brandPermissionMap.get(brandId) === 'admin',
    [isGlobalAdmin, brandPermissionMap],
  );

  const showReadOnlyNotice = !isLoadingUser && !canManageAnyBrand;

  const handleSuccessfulDelete = useCallback((deletedBrandId: string) => {
    setBrands(prevBrands => prevBrands.filter(b => b.id !== deletedBrandId));
  }, []);

  const router = useRouter();
  
  // Define columns for the data table
  const columns: DataTableColumn<Brand>[] = useMemo(() => {
    const baseColumns: DataTableColumn<Brand>[] = [
      {
        id: "name",
        header: "Brand",
        cell: ({ row }) => (
          <BrandCell 
            brand={{
              id: row.id,
              name: row.name,
              brand_color: row.brand_color,
              logo_url: row.logo_url,
              country: row.country,
              language: row.language
            }}
          />
        ),
        enableSorting: true,
      },
      {
        id: "country",
        header: "Country",
        cell: ({ row }) => COUNTRIES.find(c => c.value === row.country)?.label || row.country || 'Unknown',
        enableSorting: true,
        enableFiltering: true,
        hideOnMobile: true,
      },
      {
        id: "language",
        header: "Language",
        cell: ({ row }) => (
          <Badge variant="secondary">
            {getLanguageLabel(row.language)}
          </Badge>
        ),
        enableSorting: true,
        enableFiltering: true,
        hideOnMobile: true,
      },
      {
        id: "updated_at",
        header: "Last updated",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.updated_at ? formatDate(row.updated_at) : row.created_at ? formatDate(row.created_at) : 'N/A'}
          </span>
        ),
        enableSorting: true,
        sortingFn: (a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
          return dateA - dateB;
        },
      },
    ];

    if (isGlobalAdmin || canManageAnyBrand) {
      baseColumns.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const allowEdit = canManageBrand(row.id);
          const allowDelete = isGlobalAdmin;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={touchFriendly('tableAction')}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/brands/${row.id}/edit`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                {allowEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/brands/${row.id}/edit`);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {allowDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DeleteBrandDialog brand={row} onSuccess={handleSuccessfulDelete}>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DeleteBrandDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        className: "w-[60px]",
      });
    }

    return baseColumns;
  }, [canManageAnyBrand, canManageBrand, handleSuccessfulDelete, isGlobalAdmin, router]);

  // Get unique countries for filter
  const countryOptions = useMemo(() => {
    const countries = new Set(brands.map(b => b.country).filter(Boolean));
    return Array.from(countries).map(country => ({
      value: country,
      label: COUNTRIES.find(c => c.value === country)?.label || country
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [brands]);

  // Get unique languages for filter
  const languageOptions = useMemo(() => {
    const languages = new Set(brands.map(b => b.language).filter(Boolean));
    return Array.from(languages).map(language => ({
      value: language,
      label: getLanguageLabel(language)
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [brands]);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Brands" }
      ]} />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your brands in one place.
          </p>
        </div>
        {canCreateBrand && (
          <Button asChild>
            <Link href="/dashboard/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Link>
          </Button>
        )}
      </div>

      {showReadOnlyNotice && (
        <Alert variant="warning">
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            You can review brand details but cannot create, edit, or delete brands.
          </AlertDescription>
        </Alert>
      )}

       {isLoading || isLoadingUser ? (
        <TableSkeleton rows={5} columns={isGlobalAdmin || canManageAnyBrand ? 5 : 4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => fetchBrands()} />
      ) : brands.length === 0 ? (
        <EmptyState canCreate={canCreateBrand} />
      ) : (
        <DataTable
          columns={columns}
          data={brands}
          searchKey="name"
          searchPlaceholder="Search brands by name..."
          filters={[
            {
              id: "country",
              label: "Country",
              options: countryOptions,
            },
            {
              id: "language",
              label: "Language",
              options: languageOptions,
            },
          ]}
          onRowClick={
            isGlobalAdmin || canManageAnyBrand
              ? (row) => {
                  if (canManageBrand(row.id)) {
                    router.push(`/dashboard/brands/${row.id}/edit`);
                  } else {
                    toast.info('You do not have permission to edit this brand.');
                  }
                }
              : undefined
          }
          emptyState={
            <TableEmptyState 
              icon={PackageOpen}
              title="No brands found"
              description="No brands match your search criteria."
            />
          }
        />
      )}
    </div>
  );
}
 
