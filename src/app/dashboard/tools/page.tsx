'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { useRouter } from 'next/navigation';
import { Image, FileText, Languages, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-common-data';

type ToolConfig = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  allowedRoles?: ReadonlyArray<string>;
};

const tools: ToolConfig[] = [
  {
    id: 'alt-text-generator',
    name: 'Alt Text Generator',
    description: 'Generate descriptive alt text for images to improve accessibility',
    icon: Image,
    href: '/dashboard/tools/alt-text-generator',
    color: 'text-blue-500',
    allowedRoles: ['admin', 'editor'],
  },
  {
    id: 'metadata-generator',
    name: 'Metadata Generator',
    description: 'Create SEO-optimized meta titles and descriptions',
    icon: FileText,
    href: '/dashboard/tools/metadata-generator',
    color: 'text-green-500',
    allowedRoles: ['admin', 'editor'],
  },
  {
    id: 'content-transcreator',
    name: 'Content Transcreator',
    description: 'Adapt and translate content for different markets',
    icon: Languages,
    href: '/dashboard/tools/content-transcreator',
    color: 'text-purple-500',
    allowedRoles: ['admin', 'editor'],
  },
  {
    id: 'vetting-agencies',
    name: 'Agency Catalogue',
    description: 'Approve AI-suggested regulators before they reach brand workflows',
    icon: ShieldCheck,
    href: '/dashboard/tools/vetting-agencies',
    color: 'text-orange-500',
    allowedRoles: ['admin'],
  },
];

export default function ToolsPage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();

  const userRole = currentUser?.user_metadata?.role ?? null;

  const accessibleTools = useMemo(() => {
    if (!userRole) {
      return [];
    }
      return tools.filter((tool) => {
        if (!tool.allowedRoles || tool.allowedRoles.length === 0) {
          return true;
        }
        return tool.allowedRoles.includes(userRole);
      });
  }, [userRole]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Tools" }
      ]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Tools</h1>
        <p className="text-muted-foreground mt-1">
          Powerful AI-powered tools to enhance your content creation workflow
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!isLoading && accessibleTools.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted p-8 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">You don&apos;t have access to any diagnostics or content tools yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask an administrator to grant you the editor role for a brand to unlock these workflows.
          </p>
        </div>
      )}

      {!isLoading && accessibleTools.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accessibleTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(tool.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background ${tool.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{tool.description}</CardDescription>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full justify-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(tool.href);
                    }}
                  >
                    Open Tool
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
