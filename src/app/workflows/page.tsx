'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/card';
import { Input } from '@/components/input';
import { useToast } from '@/components/toast-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { BrandIcon } from '@/components/brand-icon';
import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  brand_color?: string;
  content_type_name: string;
  steps: Array<{
    id: number;
    name: string;
    description: string;
    role: string;
  }>;
  steps_count: number;
}

interface Brand {
  id: string;
  name: string;
  color?: string;
}

interface GroupedWorkflows {
  [key: string]: {
    brand_id: string;
    brand_name: string;
    brand_color?: string;
    workflows: Workflow[];
    isOpen: boolean;
  }
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);
  const [groupedWorkflows, setGroupedWorkflows] = useState<GroupedWorkflows>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all workflows and brands
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch workflows
        const workflowsResponse = await fetch('/api/workflows');
        
        // Fetch brands for the filter
        const brandsResponse = await fetch('/api/brands');
        
        if (!workflowsResponse.ok || !brandsResponse.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const workflowsData = await workflowsResponse.json();
        const brandsData = await brandsResponse.json();
        
        if (workflowsData.success && brandsData.success) {
          setWorkflows(workflowsData.workflows);
          setFilteredWorkflows(workflowsData.workflows);
          setBrands(brandsData.brands);
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError((error as Error).message || 'Failed to load data');
        toast({
          title: 'Error',
          description: 'Failed to load data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);
  
  // Apply filters and group workflows by brand
  useEffect(() => {
    let result = [...workflows];
    
    // Apply brand filter
    if (selectedBrandId && selectedBrandId !== 'all') {
      result = result.filter(workflow => workflow.brand_id === selectedBrandId);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(workflow => 
        workflow.name.toLowerCase().includes(term) || 
        workflow.brand_name.toLowerCase().includes(term) ||
        workflow.content_type_name.toLowerCase().includes(term)
      );
    }
    
    setFilteredWorkflows(result);
    
    // Group workflows by brand
    const grouped: GroupedWorkflows = {};
    result.forEach((workflow) => {
      const brandId = workflow.brand_id;
      const brandName = workflow.brand_name || 'Unknown';
      
      if (!grouped[brandId]) {
        grouped[brandId] = {
          brand_id: brandId,
          brand_name: brandName,
          brand_color: workflow.brand_color,
          workflows: [],
          isOpen: true
        };
      }
      
      grouped[brandId].workflows.push(workflow);
    });
    
    // Sort brands alphabetically
    const sortedGrouped: GroupedWorkflows = {};
    Object.keys(grouped).sort((a, b) => {
      return grouped[a].brand_name.localeCompare(grouped[b].brand_name);
    }).forEach(key => {
      sortedGrouped[key] = grouped[key];
    });
    
    setGroupedWorkflows(sortedGrouped);
  }, [workflows, selectedBrandId, searchTerm]);
  
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const toggleBrandGroup = (brandId: string) => {
    setGroupedWorkflows(prev => ({
      ...prev,
      [brandId]: {
        ...prev[brandId],
        isOpen: !prev[brandId].isOpen
      }
    }));
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="mr-2 h-4 w-4" /> Create Workflow
          </Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="w-full sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search workflows..." 
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <Select value={selectedBrandId} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand.id} value={brand.id}>
                  <div className="flex items-center gap-2">
                    <BrandIcon name={brand.name} color={brand.color} size="sm" />
                    <span>{brand.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="py-10 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Failed to load workflows</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {error}
          </p>
          <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7l3-3.3" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7l-3 3.3" />
            </svg>
            Retry
          </Button>
        </div>
      ) : Object.keys(groupedWorkflows).length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect width="8" height="8" x="2" y="2" rx="2" />
              <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <path d="M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <path d="M10 18H5c-1.7 0-3-1.3-3-3v-1" />
              <polyline points="7 21 10 18 7 15" />
              <rect width="8" height="8" x="14" y="14" rx="2" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {selectedBrandId || searchTerm ? 'No matching workflows found' : 'No workflows found'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {selectedBrandId || searchTerm 
              ? 'Try adjusting your filters to see more results.'
              : 'You haven\'t created any content approval workflows yet. Create your first workflow to streamline content creation.'}
          </p>
          {!selectedBrandId || selectedBrandId === 'all' ? (
            <Button size="lg" asChild>
              <Link href="/workflows/new">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Create First Workflow
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setSelectedBrandId('all');
              setSearchTerm('');
            }}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedWorkflows).map((group) => (
            <div key={group.brand_id} className="border rounded-lg overflow-hidden">
              <div 
                className="bg-muted p-4 flex justify-between items-center cursor-pointer"
                onClick={() => toggleBrandGroup(group.brand_id)}
              >
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <BrandIcon name={group.brand_name} color={group.brand_color} size="sm" />
                  {group.brand_name} 
                  <span className="ml-2 text-sm text-muted-foreground">({group.workflows.length})</span>
                </h2>
                {group.isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
              
              {group.isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {group.workflows.map((workflow) => (
                    <Card key={workflow.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl">{workflow.name}</CardTitle>
                        <CardDescription>
                          {workflow.content_type_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm text-muted-foreground mb-3">
                          <span>Steps</span>
                          <span className="font-medium">{workflow.steps_count}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {workflow.steps && workflow.steps.length > 0 ? (
                            workflow.steps.map((step) => (
                              <div 
                                key={step.id} 
                                className="h-8 flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs px-3"
                              >
                                {step.name}
                              </div>
                            ))
                          ) : (
                            Array.from({ length: workflow.steps_count }).map((_, i) => (
                              <div 
                                key={i} 
                                className="h-8 flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs px-3"
                              >
                                Step {i + 1}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-4 flex justify-between">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/workflows/${workflow.id}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/workflows/${workflow.id}/edit`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Edit
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 