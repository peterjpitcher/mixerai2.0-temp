'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface HelpArticleSidebarProps {
  articles: Array<{
    slug: string;
    title: string;
    summary?: string;
  }>;
  currentSlug?: string;
}

export function HelpArticleSidebar({ articles, currentSlug }: HelpArticleSidebarProps) {
  const [query, setQuery] = useState('');

  const filteredArticles = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return articles;
    }

    return articles.filter((article) => {
      const haystack = `${article.title} ${article.slug} ${article.summary ?? ''}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [articles, query]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="help-search" className="text-sm font-medium text-foreground">
          Search help
        </label>
        <Input
          id="help-search"
          type="search"
          placeholder="Search topics…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2"
          aria-label="Search help articles"
        />
      </div>

      <ScrollArea className="max-h-[60vh] pr-2">
        {filteredArticles.length > 0 ? (
          <nav className="space-y-2">
            {filteredArticles.map((article) => {
              const href = `/dashboard/help?article=${encodeURIComponent(article.slug)}`;
              const isActive = currentSlug === article.slug;

              return (
                <Link
                  key={article.slug}
                  href={href}
                  className={cn(
                    'block rounded-md p-2 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent font-semibold text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <span className="block">{article.title}</span>
                  {article.summary && (
                    <span className="mt-1 block text-xs text-muted-foreground/80 line-clamp-2">
                      {article.summary}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ) : (
          <p className="text-sm text-muted-foreground">
            No help topics match your search.
          </p>
        )}
      </ScrollArea>
    </div>
  );
}

