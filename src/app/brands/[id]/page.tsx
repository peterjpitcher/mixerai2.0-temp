'use client';

import Link from "next/link";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

export default function BrandDetailPage({ params }: { params: { id: string } }) {
  // Placeholder data for brand details
  const brand = {
    id: params.id,
    name: "TechGadgets",
    website_url: "https://techgadgets.example.com",
    country: "United States",
    language: "English",
    brand_identity: "TechGadgets is a forward-thinking technology company that aims to make high-quality gadgets accessible to everyone. We believe in innovation, sustainability, and user-friendly design.",
    tone_of_voice: "Professional but approachable, tech-savvy but not condescending, enthusiastic about innovation.",
    guardrails: "Avoid negative comparisons with competitors. Focus on benefits rather than features. Do not make unsubstantiated claims.",
    content_vetting_agencies: "TechRating, ConsumerTech",
    created_at: "2023-08-15",
  };

  // Placeholder data for content
  const content = [
    { id: 1, title: "10 Ways to Improve Product Visibility", type: "Article", status: "Published", date: "2023-10-15" },
    { id: 2, title: "Smart Home Technology Guide", type: "Article", status: "Draft", date: "2023-10-10" },
    { id: 3, title: "Wireless Earbuds Pro", type: "Retailer PDP", status: "Published", date: "2023-09-28" },
    { id: 4, title: "4K Ultra HD Smart TV", type: "Owned PDP", status: "Pending Review", date: "2023-09-20" },
  ];

  // Placeholder data for users
  const users = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor" },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer" },
  ];

  // Placeholder data for workflows
  const workflows = [
    { id: 1, name: "Article Approval", contentType: "Article", steps: 3 },
    { id: 2, name: "Retailer PDP Workflow", contentType: "Retailer PDP", steps: 2 },
    { id: 3, name: "Owned PDP Workflow", contentType: "Owned PDP", steps: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {brand.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
            <p className="text-muted-foreground">
              {brand.country}, {brand.language}
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
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
                <p>{brand.website_url}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created on</h3>
                <p>{brand.created_at}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Brand Identity</h3>
                <p>{brand.brand_identity}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tone of Voice</h3>
                <p>{brand.tone_of_voice}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Content Guardrails</h3>
                <p>{brand.guardrails}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Content Vetting Agencies</h3>
                <p>{brand.content_vetting_agencies}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{content.length}</div>
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
                    const usersTab = document.querySelector('[value="users"]') as HTMLElement;
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
                    {content.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.title}</td>
                        <td className="py-3">{item.type}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${item.status === 'Published' ? 'bg-green-100 text-green-800' : 
                              item.status === 'Draft' ? 'bg-gray-100 text-gray-800' : 
                              item.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3">{item.date}</td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/content/${item.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
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

        <TabsContent value="users" className="mt-6">
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
                    {users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3">{user.name}</td>
                        <td className="py-3">{user.email}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                              user.role === 'Editor' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm">Edit Role</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button>Add User to Brand</Button>
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
                      <th className="text-left pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr key={workflow.id} className="border-b">
                        <td className="py-3">{workflow.name}</td>
                        <td className="py-3">{workflow.contentType}</td>
                        <td className="py-3">{workflow.steps}</td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/workflows/${workflow.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
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
      </Tabs>
    </div>
  );
} 