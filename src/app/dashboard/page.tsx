import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import Link from "next/link";
import { BookOpen, Building2, GitBranch, Users } from "lucide-react";
import { requireAuth } from '@/lib/auth/server';

export const metadata = {
  title: 'Dashboard | MixerAI',
  description: 'MixerAI dashboard home',
};

/**
 * DashboardPage component.
 * Serves as the main landing page for authenticated users.
 * Displays an overview of key application sections like Content, Brands, Workflows, and Users,
 * along with quick action buttons for common tasks.
 */
export default async function DashboardPage() {
  await requireAuth();
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to MixerAI. Manage your content, brands, workflows, and users.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Content Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Content
            </CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create and manage different types of marketing content
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/content">View All Content</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Brands Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Brands
            </CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your brands and their identity
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/brands">View All Brands</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/brands/new">Create New Brand</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Workflows Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Workflows
            </CardTitle>
            <GitBranch className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create and manage content approval workflows
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/workflows">View All Workflows</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/workflows/templates">Templates</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Users
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage users and their permissions
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/users">View All Users</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/users/invite">Invite User</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with these common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/content/new">Create New Content</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/brands/new">Add New Brand</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/users/invite">Invite Team Member</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/workflows/new">Create Workflow</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 