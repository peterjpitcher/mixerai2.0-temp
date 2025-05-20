import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import Link from "next/link";
import { Button } from "@/components/button";
import { requireAuth } from '@/lib/auth/server';
import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight } from 'lucide-react';

export const metadata = {
  title: 'Help Wiki | MixerAI',
  description: 'Find comprehensive help and support for using MixerAI. Browse articles and guides on all features.',
};

interface HelpArticle {
  slug: string;
  title: string;
  content?: string; // Content is loaded on demand
}

async function getHelpArticles(): Promise<HelpArticle[]> {
  const wikiDir = path.join(process.cwd(), 'docs', 'help-wiki');
  try {
    const files = await fs.readdir(wikiDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const articles: HelpArticle[] = [];
    for (const file of markdownFiles.sort()) { // Sort to maintain order (e.g. 01-overview, 02-brands)
      const filePath = path.join(wikiDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      // Extract title from the first line (e.g., "# My Article Title")
      const firstLine = fileContent.split('\n')[0];
      const title = firstLine.replace(/^#\s*/, '') || file.replace('.md', '');
      articles.push({
        slug: file.replace('.md', ''),
        title,
      });
    }
    return articles;
  } catch (error) {
    console.error("Failed to load help articles list:", error);
    return [];
  }
}

async function getHelpArticleContent(slug: string): Promise<string | null> {
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) { // Basic slug validation
    console.error("Invalid slug provided for help article:", slug);
    return null;
  }
  const filePath = path.join(process.cwd(), 'docs', 'help-wiki', `${slug}.md`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load help article content for ${slug}:`, error);
    return null;
  }
}

// Placeholder Breadcrumbs component - replace with actual implementation later
const Breadcrumbs = ({ items }: { items: { label: string, href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
    <ol className="flex items-center space-x-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <ChevronRight className="h-4 w-4" />}
        </li>
      ))}
    </ol>
  </nav>
);

interface HelpPageProps {
  searchParams?: { article?: string };
}

/**
 * HelpPage component - Renders a multi-page help wiki.
 * Articles are read from markdown files in the 'docs/help-wiki' directory.
 * Navigation allows users to switch between articles.
 */
export default async function HelpPage({ searchParams }: HelpPageProps) {
  await requireAuth();
  const articles = await getHelpArticles();
  const currentArticleSlug = searchParams?.article || articles[0]?.slug || '01-overview'; // Default to first article or overview
  
  const currentArticleContent = await getHelpArticleContent(currentArticleSlug);
  const currentArticleTitle = articles.find(a => a.slug === currentArticleSlug)?.title || 'Help Article';

  const breadcrumbItems: { label: string, href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Help Wiki", href: "/dashboard/help" },
  ];
  if (currentArticleSlug !== (articles[0]?.slug || '01-overview') && currentArticleTitle !== 'Help Article') {
    breadcrumbItems.push({ label: currentArticleTitle, href: undefined });
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-1/4 lg:w-1/5">
          <h2 className="text-xl font-semibold mb-4">Help Topics</h2>
          <nav className="space-y-2">
            {articles.map(article => (
              <Link
                key={article.slug}
                href={`/dashboard/help?article=${article.slug}`}
                className={`block p-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground ${currentArticleSlug === article.slug ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground'}`}
              >
                {article.title}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {currentArticleContent ? (
            <Card>
              <CardHeader>
                 <CardTitle className="text-2xl font-bold">{currentArticleTitle}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none pt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentArticleContent}
                </ReactMarkdown>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Content Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The help article you are looking for could not be found. Please select a topic from the navigation menu or contact support if you believe this is an error.
                </p>
                 <Button variant="outline" asChild className="mt-4">
                   <Link href="/dashboard/help">
                    Back to Help Overview
                   </Link>
                 </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
} 