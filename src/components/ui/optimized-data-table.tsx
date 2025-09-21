"use client"

import * as React from "react"
import { useCallback } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  Search,
  FileX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/lib/utils/performance"

export interface DataTableColumn<TData> {
  id: string
  header: string | ((props: { column: Column }) => React.ReactNode)
  cell: (props: { row: TData }) => React.ReactNode
  enableSorting?: boolean
  enableFiltering?: boolean
  filterOptions?: { label: string; value: string }[]
  sortingFn?: (a: TData, b: TData) => number
  className?: string
  hideOnMobile?: boolean
}

interface Column {
  id: string
  toggleSorting: (desc?: boolean) => void
  getIsSorted: () => "asc" | "desc" | false
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  filters?: {
    id: string
    label: string
    options: { label: string; value: string }[]
  }[]
  onRowClick?: (row: TData) => void
  emptyState?: React.ReactNode
  className?: string
}

// Memoized table header component
const TableHeaderRow = React.memo(function TableHeaderRow({
  columns,
  onSort,
  getSortState,
}: {
  columns: DataTableColumn<unknown>[]
  onSort: (columnId: string, desc?: boolean) => void
  getSortState: (columnId: string) => "asc" | "desc" | false
}) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => {
          const sortState = getSortState(column.id)
          const columnProps: Column = {
            id: column.id,
            toggleSorting: (desc) => onSort(column.id, desc),
            getIsSorted: () => sortState,
          }

          return (
            <TableHead
              key={column.id}
              className={cn(
                column.className,
                column.hideOnMobile && "hidden sm:table-cell"
              )}
            >
              {typeof column.header === "function"
                ? column.header({ column: columnProps })
                : column.enableSorting ? (
                    <Button
                      variant="ghost"
                      onClick={() => onSort(column.id)}
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                    >
                      <span>{column.header}</span>
                      {sortState === "desc" ? (
                        <ChevronDownIcon className="ml-2 h-4 w-4" />
                      ) : sortState === "asc" ? (
                        <ChevronUpIcon className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    column.header
                  )}
            </TableHead>
          )
        })}
      </TableRow>
    </TableHeader>
  )
})

// Memoized table row component
const TableDataRow = React.memo(function TableDataRow({
  item,
  columns,
  onRowClick,
}: {
  item: unknown
  columns: DataTableColumn<unknown>[]
  onRowClick?: (row: unknown) => void
}) {
  const handleClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(item)
    }
  }, [onRowClick, item])

  return (
    <TableRow
      onClick={handleClick}
      className={cn(
        onRowClick && "cursor-pointer hover:bg-muted/50"
      )}
    >
      {columns.map((column) => (
        <TableCell
          key={column.id}
          className={cn(
            column.className,
            column.hideOnMobile && "hidden sm:table-cell"
          )}
        >
          {column.cell({ row: item })}
        </TableCell>
      ))}
    </TableRow>
  )
})

export function OptimizedDataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  filters = [],
  onRowClick,
  emptyState,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean } | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})

  // Debounce search input
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Memoized filter function
  const applyFilters = React.useCallback((
    items: TData[],
    search: string,
    filters: Record<string, string>
  ) => {
    let filtered = items

    // Apply search filter
    if (search && searchKey) {
      filtered = filtered.filter((item) => {
        const value = (item as any)[searchKey]
        return value?.toString().toLowerCase().includes(search.toLowerCase())
      })
    }

    // Apply column filters
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (filterValue && filterValue !== "all") {
        filtered = filtered.filter((item) => {
          const column = columns.find((col) => col.id === columnId)
          if (!column) return true
          
          // Get the actual value for this column
          const cellValue = column.cell({ row: item })
          // For simple string/number values
          if (typeof cellValue === "string" || typeof cellValue === "number") {
            return cellValue.toString() === filterValue
          }
          // For complex values, use the raw data
          return (item as any)[columnId] === filterValue
        })
      }
    })

    return filtered
  }, [columns, searchKey])

  // Memoized sort function
  const applySort = React.useCallback((
    items: TData[],
    sortConfig: { id: string; desc: boolean } | null
  ) => {
    if (!sortConfig) return items

    const column = columns.find((col) => col.id === sortConfig.id)
    if (!column) return items

    return [...items].sort((a, b) => {
      if (column.sortingFn) {
        const result = column.sortingFn(a, b)
        return sortConfig.desc ? -result : result
      }
      
      // Default sorting for strings/numbers
      const aValue = (a as any)[sortConfig.id]
      const bValue = (b as any)[sortConfig.id]
      
      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      const result = aValue < bValue ? -1 : 1
      return sortConfig.desc ? -result : result
    })
  }, [columns])

  // Apply all transformations
  const processedData = React.useMemo(() => {
    const filtered = applyFilters(data, debouncedSearchTerm, filterValues)
    return applySort(filtered, sorting)
  }, [data, debouncedSearchTerm, filterValues, sorting, applyFilters, applySort])

  // Memoized handlers
  const toggleSorting = useCallback((columnId: string, desc?: boolean) => {
    if (sorting?.id === columnId) {
      if (desc === undefined) {
        // Toggle between asc, desc, and no sorting
        if (sorting.desc) {
          setSorting(null)
        } else {
          setSorting({ id: columnId, desc: true })
        }
      } else {
        setSorting({ id: columnId, desc })
      }
    } else {
      setSorting({ id: columnId, desc: desc ?? false })
    }
  }, [sorting])

  const getIsSorted = React.useCallback((columnId: string): "asc" | "desc" | false => {
    if (sorting?.id !== columnId) return false
    return sorting.desc ? "desc" : "asc"
  }, [sorting])

  const handleFilterChange = useCallback((filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }))
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Select
                key={filter.id}
                value={filterValues[filter.id] || "all"}
                onValueChange={(value) => handleFilterChange(filter.id, value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeaderRow
            columns={columns as DataTableColumn<unknown>[]}
            onSort={toggleSorting}
            getSortState={getIsSorted}
          />
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileX className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No results found</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((item, index) => (
                <TableDataRow
                  key={index}
                  item={item}
                  columns={columns as DataTableColumn<unknown>[]}
                  onRowClick={onRowClick as ((row: unknown) => void) | undefined}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
