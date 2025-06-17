"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Input } from "@/components/ui/input";
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Trash2, Edit3, PlusCircle, Search, AlertTriangle, PackageOpen, Loader2, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FileText, Building2, Package, Sprout, Globe, Tag, ShieldCheck, ShieldOff, ShieldAlert, WorkflowIcon, MoreVertical, Eye 
} from "lucide-react";
import { toast } from 'sonner';
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"; // For filtering
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types from API definitions
type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';
type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';

interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  master_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string;
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
}

interface MasterClaimBrand { id: string; name: string; }
interface Product { id: string; name: string; }
interface Ingredient { id: string; name: string; }

const claimTypeIcons: Record<ClaimTypeEnum, () => JSX.Element> = {
  allowed: () => <ShieldCheck className="mr-1 h-3 w-3 text-green-500" />,
  disallowed: () => <ShieldOff className="mr-1 h-3 w-3 text-red-500" />,
  mandatory: () => <ShieldAlert className="mr-1 h-3 w-3 text-blue-500" />,
};

const claimLevelIcons: Record<ClaimLevelEnum, () => JSX.Element> = {
  brand: () => <Building2 className="mr-1 h-3 w-3 text-purple-500" />,
  product: () => <Package className="mr-1 h-3 w-3 text-orange-500" />,
  ingredient: () => <Sprout className="mr-1 h-3 w-3 text-teal-500" />,
};

export default function ClaimsPage() {
  // Define columns for the data table
  const columns: DataTableColumn<Claim>[] = [
    {
      id: "claim_text",
      header: "Claim Text",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.claim_text}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.entity_icon}
          <span>{row.entity_name}</span>
        </div>
      ),
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "level",
      header: "Level",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.level}
        </Badge>
      ),
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "claim_type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {claimTypeIcons[row.claim_type]()}
          <span className="capitalize">{row.claim_type}</span>
        </div>
      ),
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "country_code",
      header: "Country",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.country_code === '__GLOBAL__' ? 'Global' : row.country_code}
        </Badge>
      ),
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "workflow_status",
      header: "Status",
      cell: ({ row }) => {
        if (!row.workflow_status) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge 
            variant={
              row.workflow_status === 'approved' ? 'default' :
              row.workflow_status === 'rejected' ? 'destructive' :
              row.workflow_status === 'pending_review' ? 'secondary' :
              'outline'
            }
          >
            {row.workflow_status}
          </Badge>
        );
      },
      enableSorting: true,
      enableFiltering: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/claims/${row.id}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/claims/${row.id}/edit`);
              }}
            >
              <Edit3 className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(row);
              }} 
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[60px]",
    },
  ];

  const [claims, setClaims] = useState<Claim[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [masterBrands, setMasterBrands] = useState<MasterClaimBrand[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [products, setProducts] = useState<Product[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
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

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [claimsRes, brandsRes, productsRes, ingredientsRes] = await Promise.all([
          fetch('/api/claims'),
          fetch('/api/master-claim-brands'),
          fetch('/api/products'),
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
          if (claim.level === 'brand' && claim.master_brand_id) {
            entity_name = fetchedBrands.find(b => b.id === claim.master_brand_id)?.name || 'Unknown Brand';
            entity_icon = claimLevelIcons.brand();
          } else if (claim.level === 'product' && claim.product_id) {
            entity_name = fetchedProducts.find(p => p.id === claim.product_id)?.name || 'Unknown Product';
            entity_icon = claimLevelIcons.product();
          } else if (claim.level === 'ingredient' && claim.ingredient_id) {
            entity_name = fetchedIngredients.find(i => i.id === claim.ingredient_id)?.name || 'Unknown Ingredient';
            entity_icon = claimLevelIcons.ingredient();
          }
          return { ...claim, entity_name, entity_icon };
        });

        setClaims(enrichedClaims);

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
  }, []);

  const router = useRouter();

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/claims/${itemToDelete.id}`, { method: 'DELETE' });
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

  const openDeleteDialog = (claim: Claim) => {
    setItemToDelete(claim);
    setShowDeleteDialog(true);
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
  const EmptyState = () => ( <div className="flex flex-col items-center justify-center min-h-[300px] py-10 text-center"><FileText className="w-16 h-16 text-muted-foreground mb-4" /><h3 className="text-xl font-bold mb-2">No Claims Found</h3><p className="text-muted-foreground mb-4">Get started by adding a new claim.</p><Button asChild><Link href="/dashboard/claims/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Claim</Link></Button></div> );
  const NoResultsState = () => ( <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center"><Search className="w-16 h-16 text-muted-foreground mb-4" /><h3 className="text-xl font-bold mb-2">No Claims Match Filters</h3><p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria.</p><Button variant="outline" onClick={() => { setSearchTerm(""); setFilterLevel('all'); setFilterType('all'); setFilterCountry('all');}}>Clear Filters</Button></div> );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Claims Management"
        description="Manage all claims across brands, products, and ingredients."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/claims/workflows">
                <WorkflowIcon className="mr-2 h-4 w-4" /> Manage Workflows
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/claims/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Claim
              </Link>
            </Button>
          </div>
        }
      />

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
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={setFilterCountry} disabled={uniqueCountryCodes.length <= 1}>
                <SelectTrigger><SelectValue placeholder="Filter by Country" /></SelectTrigger>
                <SelectContent>
                    {uniqueCountryCodes.map(code => (
                        <SelectItem key={code} value={code}>{code === 'all' ? 'All Countries' : (code === '__GLOBAL__' ? 'Global' : code)}</SelectItem>
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
          showSearch={false}
          onRowClick={(row) => router.push(`/dashboard/claims/${row.id}`)}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8">
              <h3 className="text-xl font-bold mb-2">No claims found</h3>
              <p className="text-muted-foreground mb-4">No claims match your search criteria.</p>
            </div>
          }
        />
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