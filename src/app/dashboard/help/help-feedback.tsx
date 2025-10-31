'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface HelpArticleFeedbackProps {
  articleSlug: string;
  articleTitle: string;
}

type HelpfulChoice = 'yes' | 'no' | null;

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export function HelpArticleFeedback({ articleSlug, articleTitle }: HelpArticleFeedbackProps) {
  const [helpfulChoice, setHelpfulChoice] = useState<HelpfulChoice>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const helpfulBoolean = useMemo(() => {
    if (helpfulChoice === 'yes') return true;
    if (helpfulChoice === 'no') return false;
    return null;
  }, [helpfulChoice]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (helpfulBoolean === null) {
      toast.error('Please let us know if the article was helpful.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        articleSlug,
        helpful: helpfulBoolean,
        articleTitle,
        comments: comments.trim() || undefined,
      };

      const csrfToken = getCsrfToken();
      const response = await fetch('/api/help/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to send feedback');
      }

      toast.success('Thanks for sharing your feedback!');
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send feedback';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/80 dark:bg-green-950/40 dark:text-green-200">
        We appreciate your feedback—thanks for helping us improve the help center.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-muted-foreground/10 bg-muted/40 p-4"
      aria-label="Help article feedback form"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Was this article helpful?
        </h3>
        <p className="text-xs text-muted-foreground">
          Your response helps us prioritise improvements.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={helpfulChoice === 'yes' ? 'default' : 'outline'}
          onClick={() => setHelpfulChoice('yes')}
          disabled={isSubmitting}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant={helpfulChoice === 'no' ? 'default' : 'outline'}
          onClick={() => setHelpfulChoice('no')}
          disabled={isSubmitting}
        >
          No
        </Button>
      </div>

      <div>
        <label htmlFor="help-article-feedback-comments" className="text-sm font-medium text-foreground">
          Additional feedback
        </label>
        <Textarea
          id="help-article-feedback-comments"
          placeholder="Let us know what worked well or what could be clearer (optional)"
          value={comments}
          maxLength={1000}
          onChange={(event) => setComments(event.target.value)}
          disabled={isSubmitting}
          className="mt-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {comments.length}/1000 characters
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || helpfulBoolean === null}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send feedback'
          )}
        </Button>
      </div>
    </form>
  );
}

