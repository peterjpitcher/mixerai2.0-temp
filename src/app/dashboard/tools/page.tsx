'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { useRouter } from 'next/navigation';
import { Image, FileText, Languages, ArrowRight } from 'lucide-react';

const tools = [
  {
    id: 'alt-text-generator',
    name: 'Alt Text Generator',
    description: 'Generate descriptive alt text for images to improve accessibility',
    icon: Image,
    href: '/dashboard/tools/alt-text-generator',
    color: 'text-blue-500'
  },
  {
    id: 'metadata-generator',
    name: 'Metadata Generator',
    description: 'Create SEO-optimized meta titles and descriptions',
    icon: FileText,
    href: '/dashboard/tools/metadata-generator',
    color: 'text-green-500'
  },
  {
    id: 'content-transcreator',
    name: 'Content Transcreator',
    description: 'Adapt and translate content for different markets',
    icon: Languages,
    href: '/dashboard/tools/content-transcreator',
    color: 'text-purple-500'
  }
];

export default function ToolsPage() {
  const router = useRouter();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
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
    </div>
  );
}