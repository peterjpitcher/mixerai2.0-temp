import { cache } from 'react';
import fs from 'fs/promises';
import Link from 'next/link';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { HelpArticleFeedback } from '@/app/dashboard/help/help-feedback';
import { HelpArticleSidebar } from '@/app/dashboard/help/help-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { requireAuth } from '@/lib/auth/server';
import { formatDate } from '@/lib/utils/date';
import { parseFrontmatter } from '@/lib/utils/markdown';

export const metadata = {
  title: 'Help Wiki | MixerAI',
  description: 'Find comprehensive help and support for using MixerAI. Browse articles and guides on all features.',
};

interface HelpArticle {
  slug: string;
  title: string;
  summary?: string;
  lastUpdatedIso?: string;
}

interface HelpArticleDetail {
  slug: string;
  title?: string;
  content: string;
  lastUpdatedIso?: string;
}

const wikiDir = path.join(process.cwd(), 'src', 'content', 'help-wiki');

function normalizeDate(input?: string, fallback?: Date): string | undefined {
  if (input) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (fallback) {
    return fallback.toISOString();
  }
  return undefined;
}

const getHelpArticles = cache(async (): Promise<HelpArticle[]> => {
  try {
    await fs.access(wikiDir, fs.constants.R_OK);
    const files = await fs.readdir(wikiDir);
    const markdownFiles = files.filter(file => file.endsWith('.md')).sort();

    const deduped: HelpArticle[] = [];
    const seen = new Set<string>();

    for (const file of markdownFiles) {
      const slug = file.replace(/\.md$/i, '');
      if (seen.has(slug)) {
        continue;
      }
      seen.add(slug);

      let articleTitle: string | undefined;
      let summary: string | undefined;
      let lastUpdatedIso: string | undefined;

      try {
        const filePath = path.join(wikiDir, file);
        const [rawFileContent, stat] = await Promise.all([
          fs.readFile(filePath, 'utf-8'),
          fs.stat(filePath),
        ]);
        const { title: fmTitle, content: bodyContent, data } = parseFrontmatter(rawFileContent);
        articleTitle = fmTitle || bodyContent.split('\n')[0]?.replace(/^#\s*/, '').trim();
        const summarySource = bodyContent.split('\n').find(line => Boolean(line.trim()) && !line.trim().startsWith('#'));
        if (summarySource) {
          summary = summarySource.trim().slice(0, 160);
        }
        lastUpdatedIso = normalizeDate(
          data.lastUpdated || data.updatedAt || data.updated_at,
          stat?.mtime,
        );
      } catch {
        // If a single file fails to read we continue without crashing the page.
        articleTitle = undefined;
        summary = undefined;
        lastUpdatedIso = undefined;
      }

      deduped.push({
        slug,
        title: articleTitle && articleTitle.length > 0 ? articleTitle : slug,
        summary,
        lastUpdatedIso,
      });
    }

    return deduped;
  } catch (error) {
    console.error('Failed to load help articles list:', error);
    return [];
  }
});

const getHelpArticleDetail = cache(async (slug: string): Promise<HelpArticleDetail | null> => {
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return null;
  }

  try {
    const filePath = path.join(wikiDir, `${slug}.md`);
    const [rawFileContent, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ]);
    const { content, title, data } = parseFrontmatter(rawFileContent);

    return {
      slug,
      title,
      content,
      lastUpdatedIso: normalizeDate(
        data.lastUpdated || data.updatedAt || data.updated_at,
        stat?.mtime,
      ),
    };
  } catch (error) {
    console.error(`Failed to load help article content for ${slug}:`, error);
    return null;
  }
});

interface HelpPageProps {
  searchParams?: { article?: string };
}

/**
 * HelpPage component - Renders a multi-page help wiki.
 * Articles are read from markdown files in the 'src/content/help-wiki' directory.
 * Navigation allows users to switch between articles.
 */
export default async function HelpPage({ searchParams }: HelpPageProps) {
  await requireAuth();
  const articles = await getHelpArticles();

  if (articles.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Help Wiki' },
          ]}
        />

        <header className="my-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Help Wiki
          </h1>
          <p className="text-muted-foreground">
            We couldn&rsquo;t locate any help articles right now. If this persists, please contact support.
          </p>
        </header>

        <Alert>
          <AlertTitle>Help content missing</AlertTitle>
          <AlertDescription>
            The help content directory at <code className="font-mono text-xs">src/content/help-wiki</code> is unavailable.
            Ensure the repository includes the latest wiki export or reach out to the platform administrator.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Need assistance?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You can still get help by contacting our support team.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="default">
                <Link href="mailto:support@mixerai.com?subject=MixerAI%20Help%20Wiki%20Assistance">
                  Email Support
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="https://teams.microsoft.com/l/chat/0/0?users=peter.pitcher@genmills.com" target="_blank" rel="noopener noreferrer">
                  Chat on Teams
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fallbackSlug = articles[0]?.slug ?? '';
  const requestedSlug = searchParams?.article;
  const currentArticleSlug = (requestedSlug && articles.some(article => article.slug === requestedSlug))
    ? requestedSlug
    : fallbackSlug;

  const articleMap = new Map(articles.map(article => [article.slug, article]));
  const currentArticleSummary = currentArticleSlug ? articleMap.get(currentArticleSlug) : undefined;
  const articleDetail = currentArticleSlug ? await getHelpArticleDetail(currentArticleSlug) : null;

  const currentArticleContent = articleDetail?.content ?? null;
  const currentArticleTitle = articleDetail?.title || currentArticleSummary?.title || 'Help Article';
  const currentArticleUpdatedIso = articleDetail?.lastUpdatedIso || currentArticleSummary?.lastUpdatedIso;

  const breadcrumbItems: { label: string, href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Help Wiki", href: "/dashboard/help" },
  ];
  if (currentArticleSlug !== (articles[0]?.slug || '01-overview') && currentArticleTitle !== 'Help Article') {
    breadcrumbItems.push({ label: currentArticleTitle, href: undefined });
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <header className="my-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Help Wiki
        </h1>
        <p className="text-muted-foreground mt-2">
          Find answers to common questions and learn how to use MixerAI effectively.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-1/4 lg:w-1/5">
          <HelpArticleSidebar
            articles={articles}
            currentSlug={currentArticleSlug}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {currentArticleContent ? (
            <Card>
              <CardHeader>
                 <CardTitle className="text-2xl font-bold">{currentArticleTitle}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none pt-2">
                {currentArticleUpdatedIso && (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                    Last updated {formatDate(currentArticleUpdatedIso)}
                  </p>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                >
                  {currentArticleContent}
                </ReactMarkdown>
                <div className="mt-8">
                  <HelpArticleFeedback
                    articleSlug={currentArticleSlug}
                    articleTitle={currentArticleTitle}
                  />
                </div>
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
