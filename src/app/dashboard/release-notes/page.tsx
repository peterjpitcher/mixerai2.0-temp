import fs from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cache } from 'react';

import { Breadcrumbs } from '@/components/dashboard/breadcrumbs';
import { requireAuth } from '@/lib/auth/server';
import { parseFrontmatter } from '@/lib/utils/markdown';
import { formatDate } from '@/lib/utils/date';

interface ReleaseNote {
  slug: string;
  title: string;
  summary?: string;
  date?: string;
  content: string;
}

const releaseNotesDir = path.join(process.cwd(), 'src', 'content', 'release-notes');

const loadReleaseNotes = cache(async (): Promise<ReleaseNote[]> => {
  try {
    const files = await fs.readdir(releaseNotesDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const releases: ReleaseNote[] = [];

    for (const file of markdownFiles) {
      const filePath = path.join(releaseNotesDir, file);
      const rawFileContent = await fs.readFile(filePath, 'utf-8');
      const { title: fmTitle, content } = parseFrontmatter(rawFileContent);

      const frontmatterMatch = rawFileContent.match(/^---\s*\n([\s\S]*?)\n---/);
      let summary: string | undefined;
      let date: string | undefined;
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const summaryMatch = frontmatter.match(/^summary:\s*(.*)$/m);
        const dateMatch = frontmatter.match(/^date:\s*(.*)$/m);
        summary = summaryMatch ? summaryMatch[1].trim().replace(/['"`]/g, '') : undefined;
        const rawDate = dateMatch ? dateMatch[1].trim().replace(/['"`]/g, '') : undefined;
        date = rawDate && rawDate.length > 0 ? rawDate : undefined;
      }

      releases.push({
        slug: file.replace(/\.md$/i, ''),
        title: fmTitle || file.replace(/\.md$/i, ''),
        summary,
        date,
        content,
      });
    }

    releases.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });

    return releases;
  } catch (error) {
    console.error('Failed to load release notes:', error);
    return [];
  }
});

export default async function ReleaseNotesPage() {
  await requireAuth();
  const releaseNotes = await loadReleaseNotes();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Release Notes" },
        ]}
      />

      <header className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Release Notes</h1>
        <p className="text-muted-foreground">
          Summary of recent changes and improvements to MixerAI.
        </p>
      </header>

      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        {releaseNotes.map(note => (
          <section key={note.slug} className="mb-12">
            <h2 className="text-xl font-semibold border-b pb-2 mb-3">
              {note.title}
            </h2>
            {(note.summary || note.date) && (
              <p className="text-sm text-muted-foreground mb-4">
                {note.summary}
                {note.date && (
                  <>
                    {note.summary ? ' · ' : ''}
                    {formatDate(note.date)}
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
    </div>
  );
}
