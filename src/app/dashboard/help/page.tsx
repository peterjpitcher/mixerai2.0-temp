import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from "next/link";
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/server';
import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';

export const metadata = {
  title: 'Help Wiki | MixerAI',
  description: 'Find comprehensive help and support for using MixerAI. Browse articles and guides on all features.',
};

interface HelpArticle {
  slug: string;
  title: string;
  content?: string;
}

// Function to parse YAML frontmatter (simplified)
function parseFrontmatter(fileContent: string): { title?: string; content: string } {
  const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const frontmatter = match[1];
    const content = match[2];
    let title;
    const titleMatch = frontmatter.match(/^title:\s*(.*)/m);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/['"`]/g, ''); // Remove quotes
    }
    return { title, content };
  }
  return { content: fileContent }; // No frontmatter found
}

async function getHelpArticles(): Promise<HelpArticle[]> {
  const wikiDir = path.join(process.cwd(), 'src', 'content', 'help-wiki');
  try {
    const files = await fs.readdir(wikiDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const articles: HelpArticle[] = [];
    for (const file of markdownFiles.sort()) {
      const filePath = path.join(wikiDir, file);
      const rawFileContent = await fs.readFile(filePath, 'utf-8');
      
      const { title: fmTitle, content: bodyContent } = parseFrontmatter(rawFileContent);
      let articleTitle = fmTitle;

      if (!articleTitle) {
        const firstLine = bodyContent.split('\n')[0];
        articleTitle = firstLine.replace(/^#\s*/, '').trim() || file.replace('.md', '');
      }
      
      articles.push({
        slug: file.replace('.md', ''),
        title: articleTitle,
      });
    }
    return articles;
  } catch (error) {
    console.error('Failed to load help articles list:', error);
    return [];
  }
}

async function getHelpArticleContent(slug: string): Promise<string | null> {
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    console.error('Invalid slug provided for help article:', slug);
    return null;
  }
  const filePath = path.join(process.cwd(), 'src', 'content', 'help-wiki', `${slug}.md`);
  try {
    const rawFileContent = await fs.readFile(filePath, 'utf-8');
    const { content } = parseFrontmatter(rawFileContent); // Get content after frontmatter
    return content;
  } catch (error) {
    console.error(`Failed to load help article content for ${slug}:`, error);
    return null;
  }
}

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
  const currentArticleSlug = searchParams?.article || articles[0]?.slug || '01-overview';

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
