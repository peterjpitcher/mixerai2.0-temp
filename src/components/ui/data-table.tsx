"use client"

import * as React from "react"
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

export function DataTable<TData>({
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

  // Filter data based on search and filters
  const filteredData = React.useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchTerm && searchKey) {
      filtered = filtered.filter((item) => {
        const value = (item as any)[searchKey]
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      })
    }

    // Apply column filters
    Object.entries(filterValues).forEach(([columnId, filterValue]) => {
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

    // Apply sorting
    if (sorting) {
      const column = columns.find((col) => col.id === sorting.id)
      if (column) {
        filtered.sort((a, b) => {
          if (column.sortingFn) {
            const result = column.sortingFn(a, b)
            return sorting.desc ? -result : result
          }
          
          // Default sorting for strings/numbers
          const aValue = (a as any)[sorting.id]
          const bValue = (b as any)[sorting.id]
          
          if (aValue === bValue) return 0
          if (aValue === null || aValue === undefined) return 1
          if (bValue === null || bValue === undefined) return -1
          
          const result = aValue < bValue ? -1 : 1
          return sorting.desc ? -result : result
        })
      }
    }

    return filtered
  }, [data, searchTerm, searchKey, filterValues, sorting, columns])

  const toggleSorting = (columnId: string, desc?: boolean) => {
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
  }

  const getIsSorted = (columnId: string): "asc" | "desc" | false => {
    if (sorting?.id !== columnId) return false
    return sorting.desc ? "desc" : "asc"
  }

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
                onValueChange={(value) =>
                  setFilterValues((prev) => ({ ...prev, [filter.id]: value }))
                }
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
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const columnForHeader: Column = {
                  id: column.id,
                  toggleSorting: (desc) => toggleSorting(column.id, desc),
                  getIsSorted: () => getIsSorted(column.id),
                }

                return (
                  <TableHead 
                    key={column.id} 
                    className={cn(
                      column.className,
                      column.hideOnMobile && "hidden sm:table-cell"
                    )}
                  >
                    {column.enableSorting ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => toggleSorting(column.id)}
                        aria-label={`Sort by ${typeof column.header === "string" ? column.header : column.id} ${getIsSorted(column.id) === "asc" ? "descending" : getIsSorted(column.id) === "desc" ? "ascending" : ""}`}
                      >
                        {typeof column.header === "function"
                          ? column.header({ column: columnForHeader })
                          : column.header}
                        {getIsSorted(column.id) === "asc" ? (
                          <ChevronUpIcon className="ml-2 h-4 w-4" />
                        ) : getIsSorted(column.id) === "desc" ? (
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    ) : typeof column.header === "function" ? (
                      column.header({ column: columnForHeader })
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => (
                <TableRow
                  key={(row as any).id || index}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      className={cn(
                        column.className,
                        column.hideOnMobile && "hidden sm:table-cell"
                      )}
                    >
                      {column.cell({ row })}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileX className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">No results found.</div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  )
}
