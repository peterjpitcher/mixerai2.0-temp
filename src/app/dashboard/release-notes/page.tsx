import { cache } from 'react';
import fs from 'fs/promises';
import Link from 'next/link';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth/server';
import { formatDate } from '@/lib/utils/date';
import { parseFrontmatter } from '@/lib/utils/markdown';

interface ReleaseNote {
  slug: string;
  title: string;
  summary?: string;
  dateIso?: string;
  content: string;
}

interface ReleaseNotesPageProps {
  searchParams?: {
    page?: string;
  };
}

const releaseNotesDir = path.join(process.cwd(), 'src', 'content', 'release-notes');
const PAGE_SIZE = 5;

function normaliseDate(raw?: string, fallback?: Date): string | undefined {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (fallback) {
    return fallback.toISOString();
  }

  return undefined;
}

const loadReleaseNotes = cache(async (): Promise<ReleaseNote[]> => {
  try {
    await fs.access(releaseNotesDir, fs.constants.R_OK);
    const files = await fs.readdir(releaseNotesDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    const releases: ReleaseNote[] = [];

    for (const file of markdownFiles) {
      const filePath = path.join(releaseNotesDir, file);
      const [rawFileContent, stat] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath),
      ]);

      const { title: fmTitle, content, data } = parseFrontmatter(rawFileContent);
      const slug = file.replace(/\.md$/i, '');

      const summary =
        data.summary ||
        content
          .split('\n')
          .find((line) => Boolean(line.trim()) && !line.trim().startsWith('#'))
          ?.trim();

      releases.push({
        slug,
        title: fmTitle || slug,
        summary,
        dateIso: normaliseDate(data.date, stat?.mtime),
        content,
      });
    }

    releases.sort((a, b) => {
      if (a.dateIso && b.dateIso) {
        return new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime();
      }
      if (a.dateIso) return -1;
      if (b.dateIso) return 1;
      return a.title.localeCompare(b.title);
    });

    return releases;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      console.warn('Release notes directory not found at', releaseNotesDir);
    } else {
      console.error('Failed to load release notes:', error);
    }
    return [];
  }
});

export default async function ReleaseNotesPage({ searchParams }: ReleaseNotesPageProps) {
  await requireAuth();
  const releaseNotes = await loadReleaseNotes();

  if (releaseNotes.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Release Notes' },
          ]}
        />

        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest changes to MixerAI.
          </p>
        </header>

        <Alert>
          <AlertTitle>No release notes available</AlertTitle>
          <AlertDescription>
            We couldn&rsquo;t find the release notes content directory. Make sure{' '}
            <code className="font-mono text-xs">src/content/release-notes</code> is present and
            contains the latest markdown files.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Need visibility into updates?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reach out to the product team so we can get the latest release notes added.
            </p>
            <Button asChild variant="outline">
              <Link
                href="mailto:support@mixerai.com?subject=MixerAI%20Release%20Notes"
              >
                Email product support
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(releaseNotes.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(searchParams?.page ?? '1', 10);
  const page = Number.isNaN(requestedPage) || requestedPage < 1
    ? 1
    : Math.min(requestedPage, totalPages);

  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedNotes = releaseNotes.slice(startIndex, startIndex + PAGE_SIZE);

  const pageLabel = `Page ${page} of ${totalPages}`;

  const getPageHref = (targetPage: number) => {
    if (targetPage <= 1) {
      return '/dashboard/release-notes';
    }
    return `/dashboard/release-notes?page=${targetPage}`;
  };

  const prevHref = page > 1 ? getPageHref(page - 1) : null;
  const nextHref = page < totalPages ? getPageHref(page + 1) : null;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Release Notes' },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
        <p className="text-muted-foreground">
          Summary of recent changes and improvements to MixerAI.
        </p>
      </header>

      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        {paginatedNotes.map((note) => (
          <section key={note.slug} className="mb-12">
            <h2 className="text-xl font-semibold border-b pb-2 mb-3">
              {note.title}
            </h2>
            {(note.summary || note.dateIso) && (
              <p className="text-sm text-muted-foreground mb-4">
                {note.summary}
                {note.dateIso && (
                  <>
                    {note.summary ? ' · ' : ''}
                    {formatDate(note.dateIso)}
                  </>
                )}
              </p>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
            >
              {note.content}
            </ReactMarkdown>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {pageLabel}
        </span>
        <div className="flex gap-2">
          {prevHref ? (
            <Button variant="outline" asChild>
              <Link href={prevHref}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Previous
            </Button>
          )}
          {nextHref ? (
            <Button variant="outline" asChild>
              <Link href={nextHref}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

