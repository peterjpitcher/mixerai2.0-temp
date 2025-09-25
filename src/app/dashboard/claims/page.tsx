"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Trash2, Search, AlertTriangle, Loader2, 
  FileText, Building2, Package, Sprout, ShieldCheck, ShieldOff, WorkflowIcon, MoreVertical, Eye, AlertOctagon 
} from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { touchFriendly } from '@/lib/utils/touch-target';
import { Badge } from "@/components/ui/badge";
import { apiClient } from '@/lib/api-client';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"; // For filtering
import { useRouter } from "next/navigation";
import { GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PRODUCT_CLAIMS_DEPRECATION_MESSAGE } from '@/lib/constants/claims';

// Types from API definitions
type ClaimTypeEnum = 'allowed' | 'disallowed';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  master_brand_id?: string | null;
  product_id?: string | null; // Deprecated
  ingredient_id?: string | null; // Deprecated
  country_code: string; // Single country from API response
  country_codes?: string[]; // Array of countries from junction table
  product_ids?: string[]; // Array from junction table
  ingredient_ids?: string[]; // Array from junction table
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  // Workflow fields
  workflow_id?: string | null;
  workflow_status?: string | null;
  current_workflow_step?: string | null;
  // For display
  entity_name?: string;
  entity_icon?: JSX.Element;
  product_names?: string[]; // From API
  ingredient_names?: string[]; // From API
  master_brand_name?: string; // From API
}

interface MasterClaimBrand { id: string; name: string; }
interface Product { id: string; name: string; }
interface Ingredient { id: string; name: string; }

const claimTypeIcons: Record<ClaimTypeEnum, () => JSX.Element> = {
  allowed: () => <ShieldCheck className="mr-1 h-3 w-3 text-green-500" />,
  disallowed: () => <ShieldOff className="mr-1 h-3 w-3 text-red-500" />,
};

const claimLevelIcons: Record<ClaimLevelEnum, () => JSX.Element> = {
  brand: () => <Building2 className="mr-1 h-3 w-3 text-purple-500" />,
  product: () => <Package className="mr-1 h-3 w-3 text-orange-500" />,
  ingredient: () => <Sprout className="mr-1 h-3 w-3 text-teal-500" />,
};

export default function ClaimsPage() {
  const router = useRouter();
  
  const [claims, setClaims] = useState<Claim[]>([]);
  const [, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  const [, setProducts] = useState<Product[]>([]);
  const [, setIngredients] = useState<Ingredient[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Claim | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [filterLevel, setFilterLevel] = useState<ClaimLevelEnum | 'all'>('all');
  const [filterType, setFilterType] = useState<ClaimTypeEnum | 'all'>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const openDeleteDialog = (claim: Claim) => {
    setItemToDelete(claim);
    setShowDeleteDialog(true);
  };

  // Define columns for the data table - memoized to prevent re-renders
  const columns = useMemo<DataTableColumn<Claim>[]>(() => [
    {
      id: "claim_text",
      header: "Claim Text",
      cell: ({ row }) => {
        const claim = row;
        if (!claim || !claim.claim_text) {
          return <div className="text-muted-foreground">-</div>;
        }
        return (
          <div>
            <div className="font-medium">{claim.claim_text}</div>
            {claim.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {claim.description}
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => {
        const claim = row;
        if (!claim) return <div className="text-muted-foreground">-</div>;
        return (
          <div className="flex items-center gap-2">
            {claim.entity_icon}
            <span>{claim.entity_name}</span>
          </div>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "level",
      header: "Level",
      cell: ({ row }) => {
        const claim = row as Claim;
        const level = claim.level;
        if (!level) return <div className="text-muted-foreground">-</div>;
        return (
          <Badge variant="outline">
            {level}
          </Badge>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "claim_type",
      header: "Type",
      cell: ({ row }) => {
        const claim = row as Claim;
        const claimType = claim.claim_type;
        if (!claimType) return <div className="text-muted-foreground">-</div>;
        const IconComponent = claimTypeIcons[claimType];
        return (
          <div className="flex items-center gap-1">
            {IconComponent && <IconComponent />}
            <span className="capitalize">{claimType}</span>
          </div>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "country_code",
      header: "Country",
      cell: ({ row }) => {
        const claim = row as Claim;
        const countryCode = claim.country_code;
        if (!countryCode) return <div className="text-muted-foreground">-</div>;
        return (
          <Badge variant="secondary">
            {countryCode === GLOBAL_CLAIM_COUNTRY_CODE ? 'Global' : countryCode}
          </Badge>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "workflow_status",
      header: "Status",
      cell: ({ row }) => {
        const claim = row as Claim;
        const workflowStatus = claim.workflow_status;
        if (!workflowStatus) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge 
            variant={
              workflowStatus === 'approved' ? 'default' :
              workflowStatus === 'rejected' ? 'destructive' :
              workflowStatus === 'pending_review' ? 'secondary' :
              'outline'
            }
          >
            {workflowStatus}
          </Badge>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const claim = row as Claim;
        if (!claim || !claim.id) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className={touchFriendly('tableAction')}>
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/claims/${claim.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(claim);
                }} 
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: "w-[60px]",
    },
  ], [router]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Paginated fetch; additional lists fetched with larger limits
        const [claimsRes, brandsRes, productsRes, ingredientsRes] = await Promise.all([
          fetch(`/api/claims?limit=${pageSize}&page=${page}&includeProductNames=true&includeMasterBrandName=true&includeIngredientName=true`),
          fetch('/api/master-claim-brands'),
          fetch('/api/products?limit=1000'),
          fetch('/api/ingredients'),
        ]);

        const claimsData = await claimsRes.json();
        const brandsData = await brandsRes.json();
        const productsData = await productsRes.json();
        const ingredientsData = await ingredientsRes.json();

        if (!claimsRes.ok || !claimsData.success) throw new Error(claimsData.error || 'Failed to fetch claims');
        // Non-critical, allow page to load if these fail but log error
        if (!brandsRes.ok || !brandsData.success) console.error(brandsData.error || 'Failed to fetch brands');
        if (!productsRes.ok || !productsData.success) console.error(productsData.error || 'Failed to fetch products');
        if (!ingredientsRes.ok || !ingredientsData.success) console.error(ingredientsData.error || 'Failed to fetch ingredients');

        const fetchedBrands: MasterClaimBrand[] = brandsData.success ? brandsData.data : [];
        const fetchedProducts: Product[] = productsData.success ? productsData.data : [];
        const fetchedIngredients: Ingredient[] = ingredientsData.success ? ingredientsData.data : [];

        setMasterBrands(fetchedBrands);
        setProducts(fetchedProducts);
        setIngredients(fetchedIngredients);

        const enrichedClaims = (claimsData.data as Claim[]).map(claim => {
          let entity_name = 'N/A';
          let entity_icon: JSX.Element = <FileText className="mr-1 h-3 w-3" />;
          
          if (claim.level === 'brand') {
            // Use master_brand_name from API if available, otherwise look up
            entity_name = claim.master_brand_name || 
                         (claim.master_brand_id ? fetchedBrands.find(b => b.id === claim.master_brand_id)?.name || 'Unknown Brand' : 'N/A');
            entity_icon = claimLevelIcons.brand();
          } else if (claim.level === 'product') {
            // Use product_names from API if available
            if (claim.product_names && claim.product_names.length > 0) {
              entity_name = claim.product_names.join(', ');
            } else if (claim.product_ids && claim.product_ids.length > 0) {
              const names = claim.product_ids.map(id => fetchedProducts.find(p => p.id === id)?.name || 'Unknown').filter(Boolean);
              entity_name = names.join(', ');
            } else if (claim.product_id) {
              // Fallback to deprecated single product_id
              entity_name = fetchedProducts.find(p => p.id === claim.product_id)?.name || 'Unknown Product';
            }
            entity_icon = claimLevelIcons.product();
          } else if (claim.level === 'ingredient') {
            // Use ingredient_names from API if available
            if (claim.ingredient_names && claim.ingredient_names.length > 0) {
              entity_name = claim.ingredient_names.join(', ');
            } else if (claim.ingredient_ids && claim.ingredient_ids.length > 0) {
              const names = claim.ingredient_ids.map(id => fetchedIngredients.find(i => i.id === id)?.name || 'Unknown').filter(Boolean);
              entity_name = names.join(', ');
            } else if (claim.ingredient_id) {
              // Fallback to deprecated single ingredient_id
              entity_name = fetchedIngredients.find(i => i.id === claim.ingredient_id)?.name || 'Unknown Ingredient';
            }
            entity_icon = claimLevelIcons.ingredient();
          }
          
          return { ...claim, entity_name, entity_icon };
        });

        setClaims(enrichedClaims);
        const pag = claimsData.pagination as { page: number; limit: number; total: number; totalPages: number } | undefined;
        if (pag) {
          setTotalPages(pag.totalPages || 0);
          setTotalCount(pag.total || 0);
        }

      } catch (err) {
        const errorMessage = (err as Error).message || 'An unexpected error occurred';
        console.error('Error fetching data for claims page:', errorMessage);
        setError(errorMessage);
        toast.error("Failed to load Claims data.", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [page, pageSize]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await apiClient.delete(`/api/claims/${itemToDelete.id}`);
      const data = await response.json();
      if (data.success) {
        toast.success("Claim deleted successfully");
        setClaims(prevClaims => prevClaims.filter(c => c.id !== itemToDelete.id));
        setShowDeleteDialog(false);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete Claim");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      console.error('Error deleting Claim:', errorMessage);
      toast.error("Failed to delete Claim.", { description: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  const uniqueCountryCodes = useMemo(() => {
    const codes = new Set(claims.map(claim => claim.country_code));
    return ['all', ...Array.from(codes).sort()];
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      const searchTermMatch = searchTerm.toLowerCase() === '' ||
                            claim.claim_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (claim.description && claim.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (claim.entity_name && claim.entity_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const levelMatch = filterLevel === 'all' || claim.level === filterLevel;
      const typeMatch = filterType === 'all' || claim.claim_type === filterType;
      const countryMatch = filterCountry === 'all' || claim.country_code === filterCountry;

      return searchTermMatch && levelMatch && typeMatch && countryMatch;
    });
  }, [claims, searchTerm, filterLevel, filterType, filterCountry]);

  // Render states (Error, Empty, NoResults)
  const ErrorState = () => ( <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center"><AlertTriangle className="w-16 h-16 text-red-500 mb-4" /><h3 className="text-xl font-bold mb-2">Failed to Load Claims</h3><p className="text-muted-foreground mb-4 max-w-md">{error}</p><Button onClick={() => window.location.reload()}>Try Again</Button></div> );
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold mb-2">Product Claims Deprecated</h3>
      <p className="text-muted-foreground mb-4 max-w-lg">{PRODUCT_CLAIMS_DEPRECATION_MESSAGE}</p>
    </div>
  );
  const NoResultsState = () => ( <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center"><Search className="w-16 h-16 text-muted-foreground mb-4" /><h3 className="text-xl font-bold mb-2">No Claims Match Filters</h3><p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria.</p><Button variant="outline" onClick={() => { setSearchTerm(""); setFilterLevel('all'); setFilterType('all'); setFilterCountry('all');}}>Clear Filters</Button></div> );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Claims" }
      ]} />
      
      <PageHeader 
        title="Claims Management (Deprecated)"
        description="Product Claims tools are retained for reference only. New claims cannot be created."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/claims/workflows">
                <WorkflowIcon className="mr-2 h-4 w-4" /> Manage Workflows
              </Link>
            </Button>
          </div>
        }
      />

      <Alert variant="destructive">
        <AlertOctagon className="h-4 w-4" />
        <AlertTitle>Product Claims Deprecated</AlertTitle>
        <AlertDescription>{PRODUCT_CLAIMS_DEPRECATION_MESSAGE}</AlertDescription>
      </Alert>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claim text, description, entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
            <Select value={filterLevel} onValueChange={(value) => setFilterLevel(value as ClaimLevelEnum | 'all')}>
                <SelectTrigger><SelectValue placeholder="Filter by Level" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="ingredient">Ingredient</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as ClaimTypeEnum | 'all')}>
                <SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="allowed">Allowed</SelectItem>
                    <SelectItem value="disallowed">Disallowed</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={setFilterCountry} disabled={uniqueCountryCodes.length <= 1}>
                <SelectTrigger><SelectValue placeholder="Filter by Country" /></SelectTrigger>
                <SelectContent>
                    {uniqueCountryCodes.map(code => (
                        <SelectItem key={code} value={code}>{code === 'all' ? 'All Countries' : (code === GLOBAL_CLAIM_COUNTRY_CODE ? 'Global' : code)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading Claims...</p>
        </div>
      ) : error ? (
        <ErrorState />
      ) : claims.length === 0 && searchTerm === '' && filterLevel === 'all' && filterType === 'all' && filterCountry === 'all' ? (
        <EmptyState />
      ) : filteredClaims.length === 0 ? (
        <NoResultsState />
      ) : (
        <DataTable
          columns={columns}
          data={filteredClaims}
          searchKey="claim_text"
          searchPlaceholder="Search claims..."
          onRowClick={(row) => router.push(`/dashboard/claims/${row.id}`)}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <h3 className="text-xl font-bold mb-2">No claims found</h3>
              <p className="text-muted-foreground mb-4">No claims match your search criteria.</p>
            </div>
          }
        />
      )}

      {/* Pagination controls */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing page {page} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Page size" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
                <SelectItem value="200">200 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      {itemToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the claim: <strong>{itemToDelete.claim_text}</strong> for {itemToDelete.entity_name} ({itemToDelete.country_code}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 
