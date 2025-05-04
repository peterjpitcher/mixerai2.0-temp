'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import { Trash2 } from "lucide-react";

export default function BrandDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [requiresCascade, setRequiresCascade] = useState(false);
  const [contentCount, setContentCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Fetch brand data
  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        setIsLoading(true);
        setError("");
        
        // Add a timestamp and unique identifier to prevent caching
        const cacheBuster = `nocache=${Date.now()}-${Math.random()}`;
        
        // Fetch brand details with debug header
        console.log(`🔍 Fetching brand details for ID: ${params.id} at ${new Date().toISOString()}`);
        const brandResponse = await fetch(`/api/brands/${params.id}?${cacheBuster}`, {
          headers: {
            'x-request-source': 'brand-detail-page',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        
        // Log response status and headers for debugging
        console.log(`🔄 Brand API response status: ${brandResponse.status}`);
        // Convert headers to object safely
        const responseHeaders: Record<string, string> = {};
        brandResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        console.log(`🔄 Brand API response headers:`, responseHeaders);
        
        const brandData = await brandResponse.json();
        
        console.log("📊 Brand API response:", JSON.stringify(brandData, null, 2));
        
        if (brandData.isFallback) {
          console.warn("⚠️ Using fallback brand data from API - this indicates a database connection issue");
        }
        
        if (!brandData.success) {
          throw new Error(brandData.error || "Failed to fetch brand data");
        }
        
        setBrand(brandData.brand);
        
        // Fetch brand content from the API
        try {
          console.log(`🔍 Fetching content for brand ID: ${params.id}`);
          const contentResponse = await fetch(`/api/content?brand_id=${params.id}&${cacheBuster}`, {
            headers: {
              'x-request-source': 'brand-detail-page',
              'Cache-Control': 'no-cache, no-store'
            }
          });
          
          console.log(`🔄 Content API response status: ${contentResponse.status}`);
          const contentData = await contentResponse.json();
          
          console.log("📊 Content API response:", JSON.stringify(contentData, null, 2));
          
          if (contentData.isFallback) {
            console.warn("⚠️ Using fallback content data from API");
          }
          
          if (contentData.success) {
            setContents(contentData.content || []);
          } else {
            console.error("Failed to fetch content:", contentData.error);
            setContents([]);
          }
        } catch (contentError) {
          console.error("Error fetching content:", contentError);
          // Fallback to empty array
          setContents([]);
        }
        
        // Fetch workflows associated with this brand
        try {
          console.log(`🔍 Fetching workflows for brand ID: ${params.id}`);
          const workflowsResponse = await fetch(`/api/workflows?brand_id=${params.id}&${cacheBuster}`, {
            headers: {
              'x-request-source': 'brand-detail-page',
              'Cache-Control': 'no-cache, no-store'
            }
          });
          
          console.log(`🔄 Workflows API response status: ${workflowsResponse.status}`);
          const workflowsData = await workflowsResponse.json();
          
          console.log("📊 Workflows API response:", JSON.stringify(workflowsData, null, 2));
          
          if (workflowsData.isFallback) {
            console.warn("⚠️ Using fallback workflows data from API");
          }
          
          if (workflowsData.success) {
            setWorkflows(workflowsData.workflows || []);
          } else {
            console.error("Failed to fetch workflows:", workflowsData.error);
            // Fallback to empty array rather than dummy data
            setWorkflows([]);
          }
        } catch (workflowError) {
          console.error("Error fetching workflows:", workflowError);
          // Fallback to empty array
          setWorkflows([]);
        }
        
        // Fetch users with access to this brand
        try {
          console.log(`🔍 Fetching users for brand ID: ${params.id}`);
          const usersResponse = await fetch(`/api/users?brand_id=${params.id}&${cacheBuster}`, {
            headers: {
              'x-request-source': 'brand-detail-page',
              'Cache-Control': 'no-cache, no-store'
            }
          });
          
          console.log(`🔄 Users API response status: ${usersResponse.status}`);
          const usersData = await usersResponse.json();
          
          console.log("📊 Users API response:", JSON.stringify(usersData, null, 2));
          
          if (usersData.isFallback) {
            console.warn("⚠️ Using fallback users data from API");
          }
          
          if (usersData.success) {
            setUsers(usersData.users || []);
          } else {
            console.error("Failed to fetch users:", usersData.error);
            // Fallback to empty array rather than dummy data
            setUsers([]);
          }
        } catch (userError) {
          console.error("Error fetching users:", userError);
          // Fallback to empty array
          setUsers([]);
        }
        
      } catch (error: any) {
        console.error("🔴 Error in fetchBrandData:", error);
        setError(error.message || "Failed to load brand data");
        toast({
          title: "Error",
          description: error.message || "Failed to load brand data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrandData();
  }, [params.id, toast]);

  // Control the delete dialog based on requiresCascade state
  useEffect(() => {
    console.log("requiresCascade changed:", requiresCascade, 
                "contentCount:", contentCount, 
                "workflowCount:", workflowCount);
                
    // If requiresCascade is true, make sure the dialog shows up
    if (requiresCascade && !showDeleteConfirm) {
      console.log("Opening delete dialog due to cascade requirement");
      setTimeout(() => {
        setShowDeleteConfirm(true);
      }, 100);
    }
  }, [requiresCascade, contentCount, workflowCount, showDeleteConfirm]);

  // Handle delete brand
  const handleDeleteBrand = async (options?: { cascade?: boolean }) => {
    console.log("handleDeleteBrand called with options:", options);
    
    // If dialog is already open with cascade required, but user didn't check cascade option,
    // just return and let them check the box
    if (requiresCascade && !options?.cascade) {
      console.log("Cascade required but not selected, showing error toast");
      toast({
        title: "Cascade required",
        description: "Please check the box to confirm deletion of all associated content and workflows.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Reset error state at the beginning of each attempt
      setDeleteError("");
      
      const url = new URL(`/api/brands/${brand.id}`, window.location.origin);
      if (options?.cascade) {
        url.searchParams.append('deleteCascade', 'true');
      }
      
      console.log("Sending DELETE request to:", url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });
      
      const data = await response.json();
      console.log("DELETE response:", data);
      
      if (data.success) {
        // Success case
        toast({
          title: "Success",
          description: data.message || "Brand deleted successfully",
        });
        router.push('/brands');
        return;
      }
      
      // Handle error cases
      if (data.requiresCascade) {
        // This brand has associated content or workflows
        setRequiresCascade(true);
        setContentCount(data.contentCount || 0);
        setWorkflowCount(data.workflowCount || 0);
        
        // No need to set showDeleteConfirm here, the useEffect will handle it
        toast({
          title: "Cascade Delete Required",
          description: `This brand has associated items that must be deleted as well.`,
        });
      } else {
        // Other error
        setDeleteError(data.error || "Failed to delete brand");
        toast({
          title: "Error",
          description: data.error || "Failed to delete brand",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Exception in handleDeleteBrand:", error);
      setDeleteError(error.message || "An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading brand details...</p>
        </div>
      </div>
    );
  }

  // If error or no brand data, show error state
  if (error || !brand) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="text-destructive text-xl">
          {error || "Brand not found"}
        </div>
        <Button onClick={() => router.push('/brands')}>
          Back to Brands
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {brand.name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
            <p className="text-muted-foreground">
              {brand.country || 'No country'}, {brand.language || 'No language'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/brands/${brand.id}/edit`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit Brand
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              // Reset cascade state when initiating a new delete
              setRequiresCascade(false);
              setContentCount(0);
              setWorkflowCount(0);
              setDeleteError("");
              setShowDeleteConfirm(true);
            }}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button asChild>
            <Link href={`/content/new?brand=${brand.id}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15h6" />
              </svg>
              Create Content
            </Link>
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(isOpen) => {
          setShowDeleteConfirm(isOpen);
        }}
        title="Delete Brand"
        description={
          requiresCascade ? (
            <div className="space-y-2">
              <p>
                This brand has {contentCount} content items and {workflowCount} workflows associated with it.
              </p>
              <p>
                <strong className="text-destructive">Warning:</strong> Deleting this brand will also delete all associated content and workflows.
              </p>
            </div>
          ) : (
            <p>Are you sure you want to delete this brand? This action cannot be undone.</p>
          )
        }
        verificationText={brand?.name}
        verificationRequired={true}
        onConfirm={() => handleDeleteBrand({ cascade: requiresCascade })}
        confirmText={isDeleting ? "Deleting..." : "Delete Brand"}
        cancelText="Cancel"
        variant="destructive"
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>
                Basic information about the brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Website URL</h3>
                <p>{brand.website_url || 'No website URL provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Country</h3>
                <p>{brand.country || 'No country specified'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Language</h3>
                <p>{brand.language || 'No language specified'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created on</h3>
                <p>{brand.created_at ? new Date(brand.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Brand Identity</h3>
                <p>{brand.brand_identity || 'No brand identity defined'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tone of Voice</h3>
                <p>{brand.tone_of_voice || 'No tone of voice defined'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Content Guardrails</h3>
                <p>{brand.guardrails || 'No content guardrails defined'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Content Vetting Agencies</h3>
                <p>{brand.content_vetting_agencies || 'No content vetting agencies specified'}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{contents.length}</div>
                <p className="text-sm text-muted-foreground">
                  Pieces of content created
                </p>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="#" onClick={() => {
                    const contentTab = document.querySelector('[value="content"]') as HTMLElement;
                    if (contentTab) contentTab.click();
                  }}>
                    View All Content
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{users.length}</div>
                <p className="text-sm text-muted-foreground">
                  Users with access to this brand
                </p>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="#" onClick={() => {
                    const usersTab = document.querySelector('[value="team"]') as HTMLElement;
                    if (usersTab) usersTab.click();
                  }}>
                    Manage Users
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{workflows.length}</div>
                <p className="text-sm text-muted-foreground">
                  Content approval workflows
                </p>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="#" onClick={() => {
                    const workflowsTab = document.querySelector('[value="workflows"]') as HTMLElement;
                    if (workflowsTab) workflowsTab.click();
                  }}>
                    Manage Workflows
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                All content created for this brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-3 font-medium">Title</th>
                      <th className="text-left pb-3 font-medium">Type</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-left pb-3 font-medium">Date</th>
                      <th className="text-left pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No content has been created for this brand yet.
                        </td>
                      </tr>
                    ) : (
                      contents.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3">{item.title}</td>
                          <td className="py-3">{item.content_type_name || 'Unknown type'}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${item.status === 'published' ? 'bg-green-100 text-green-800' : 
                                item.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                                item.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-blue-100 text-blue-800'}`}>
                              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1).replace('_', ' ') || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-3">{new Date(item.created_at).toLocaleDateString()}</td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/content/${item.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button asChild>
                <Link href={`/content/new?brand=${brand.id}`}>
                  Create New Content
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
              <CardDescription>
                Content approval workflows for this brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-3 font-medium">Name</th>
                      <th className="text-left pb-3 font-medium">Content Type</th>
                      <th className="text-left pb-3 font-medium">Steps</th>
                      <th className="text-left pb-3 font-medium">Content Count</th>
                      <th className="text-left pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No workflows have been created for this brand yet.
                        </td>
                      </tr>
                    ) : (
                      workflows.map((workflow) => (
                        <tr key={workflow.id} className="border-b">
                          <td className="py-3">{workflow.name}</td>
                          <td className="py-3">{workflow.content_type_name || 'Unknown type'}</td>
                          <td className="py-3">{workflow.steps_count || 0}</td>
                          <td className="py-3">{workflow.content_count || 0}</td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/workflows/${workflow.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button asChild>
                <Link href={`/workflows/new?brand=${brand.id}`}>
                  Create New Workflow
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Users with access to this brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-3 font-medium">Name</th>
                      <th className="text-left pb-3 font-medium">Email</th>
                      <th className="text-left pb-3 font-medium">Role</th>
                      <th className="text-left pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          No users have been assigned to this brand yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        // Find user's role for this specific brand
                        const brandPermission = user.brand_permissions?.find(
                          permission => permission.brand_id === brand.id
                        );
                        
                        const userRole = brandPermission ? 
                          (brandPermission.role.charAt(0).toUpperCase() + brandPermission.role.slice(1)) :
                          user.role || 'Viewer';
                        
                        return (
                          <tr key={user.id} className="border-b">
                            <td className="py-3">{user.full_name}</td>
                            <td className="py-3">{user.email}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                ${userRole === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                                  userRole === 'Editor' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-gray-100 text-gray-800'}`}>
                                {userRole}
                              </span>
                            </td>
                            <td className="py-3">
                              <Button variant="ghost" size="sm">Edit Role</Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button>Add User to Brand</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 