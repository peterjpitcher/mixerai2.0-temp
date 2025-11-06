'use client';

import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RichTextEditor } from './rich-text-editor';
import { ensureNormalizedContent } from '@/lib/content/html-normalizer';
import type { NormalizedContent, FaqContent, FaqEntry, FaqSection } from '@/types/template';

type CollapseMode = 'single' | 'multiple';

const sanitizeEntries = (entries: FaqEntry[] = [], removeEmptyEntries: boolean): FaqEntry[] => {
  const normalized = entries.map((entry) => ({
    ...entry,
    id: entry.id || uuidv4(),
    question: typeof entry.question === 'string' ? entry.question : '',
    answerHtml: typeof entry.answerHtml === 'string' ? entry.answerHtml : '<p></p>',
    answerPlain: typeof entry.answerPlain === 'string' ? entry.answerPlain : '',
  }));

  if (!removeEmptyEntries) {
    return normalized;
  }

  return normalized.filter((entry) => {
    const hasQuestion = entry.question.trim().length > 0;
    const htmlText = entry.answerHtml.replace(/<[^>]+>/g, '').trim();
    const plainText = entry.answerPlain.trim();
    const hasAnswer = htmlText.length > 0 || plainText.length > 0;
    return hasQuestion || hasAnswer;
  });
};

const pruneFaqContent = (
  content: FaqContent | undefined,
  options: { removeEmptyEntries?: boolean } = {}
): FaqContent => {
  const removeEmptyEntries = options.removeEmptyEntries ?? false;
  const base = content ?? { entries: [] };

  const entries = sanitizeEntries(base.entries, removeEmptyEntries);
  const sections = (base.sections || [])
    .map((section) => {
      const normalizedEntries = sanitizeEntries(section.entries, removeEmptyEntries);
      if (removeEmptyEntries && normalizedEntries.length === 0) {
        return null;
      }
      return {
        id: section.id || uuidv4(),
        title: typeof section.title === 'string' ? section.title : 'FAQ Section',
        entries: normalizedEntries,
      };
    })
    .filter((section): section is FaqSection => Boolean(section));

  return {
    entries,
    ...(sections.length > 0 || (!removeEmptyEntries && base.sections)
      ? { sections }
      : {}),
  };
};

const normalizeAnswer = (value: string): Pick<FaqEntry, 'answerHtml' | 'answerPlain'> => {
  const normalized = ensureNormalizedContent(value, 'richText');
  return {
    answerHtml: normalized.html,
    answerPlain: normalized.plain,
  };
};

const createEmptyEntry = (): FaqEntry => ({
  id: uuidv4(),
  question: '',
  answerHtml: '<p></p>',
  answerPlain: '',
});

const createEmptySection = (): FaqSection => ({
  id: uuidv4(),
  title: 'New Section',
  entries: [createEmptyEntry()],
});

interface FaqEditorProps {
  value?: NormalizedContent;
  onChange: (value: NormalizedContent) => void;
  allowSections?: boolean;
}

export function FaqEditor({ value, onChange, allowSections = false }: FaqEditorProps) {
  const [draftFaq, setDraftFaq] = React.useState<FaqContent>(() =>
    pruneFaqContent(value?.faq ?? undefined, { removeEmptyEntries: false })
  );
  const skipSyncRef = React.useRef(false);

  React.useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setDraftFaq(pruneFaqContent(value?.faq ?? undefined, { removeEmptyEntries: false }));
  }, [value?.faq]);

  const commit = React.useCallback(
    (updated: FaqContent) => {
      const nextDraft = pruneFaqContent(updated, { removeEmptyEntries: false });
      setDraftFaq(nextDraft);
      skipSyncRef.current = true;
      const normalizedForStorage = ensureNormalizedContent(
        { faq: pruneFaqContent(updated, { removeEmptyEntries: true }) },
        'faq'
      );
      onChange(normalizedForStorage);
    },
    [onChange]
  );

  const updateEntry = React.useCallback(
    (entryId: string, updates: Partial<FaqEntry>, sectionId?: string) => {
      if (sectionId) {
        const updatedSections = (draftFaq.sections || []).map((section) => {
          if (section.id !== sectionId) {
            return section;
          }
          return {
            ...section,
            entries: section.entries.map((entry) =>
              entry.id === entryId ? { ...entry, ...updates } : entry
            ),
          };
        });
        commit({
          entries: draftFaq.entries,
          sections: updatedSections,
        });
        return;
      }

      const updatedEntries = draftFaq.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      );
      commit({
        entries: updatedEntries,
        sections: draftFaq.sections,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const removeEntry = React.useCallback(
    (entryId: string, sectionId?: string) => {
      if (sectionId) {
        const updatedSections = (draftFaq.sections || [])
          .map((section) => {
            if (section.id !== sectionId) {
              return section;
            }
            return {
              ...section,
              entries: section.entries.filter((entry) => entry.id !== entryId),
            };
          })
          .filter((section) => section.entries.length > 0);
        commit({
          entries: draftFaq.entries,
          sections: updatedSections,
        });
        return;
      }

      commit({
        entries: draftFaq.entries.filter((entry) => entry.id !== entryId),
        sections: draftFaq.sections,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const addEntry = React.useCallback(
    (sectionId?: string) => {
      const newEntry = createEmptyEntry();
      if (sectionId) {
        const updatedSections = (draftFaq.sections || []).map((section) => {
          if (section.id !== sectionId) {
            return section;
          }
          return {
            ...section,
            entries: [...section.entries, newEntry],
          };
        });
        commit({
          entries: draftFaq.entries,
          sections: updatedSections,
        });
        return;
      }

      commit({
        entries: [...draftFaq.entries, newEntry],
        sections: draftFaq.sections,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const moveEntry = React.useCallback(
    (entryId: string, direction: 'up' | 'down', sectionId?: string) => {
      const reorder = (entries: FaqEntry[]) => {
        const index = entries.findIndex((entry) => entry.id === entryId);
        if (index === -1) return entries;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= entries.length) {
          return entries;
        }
        const next = [...entries];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      };

      if (sectionId) {
        const updatedSections = (draftFaq.sections || []).map((section) => {
          if (section.id !== sectionId) {
            return section;
          }
          return {
            ...section,
            entries: reorder(section.entries),
          };
        });
        commit({
          entries: draftFaq.entries,
          sections: updatedSections,
        });
        return;
      }

      commit({
        entries: reorder(draftFaq.entries),
        sections: draftFaq.sections,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const addSection = React.useCallback(() => {
    const section = createEmptySection();
    commit({
      entries: draftFaq.entries,
      sections: [...(draftFaq.sections || []), section],
    });
  }, [commit, draftFaq.entries, draftFaq.sections]);

  const updateSectionTitle = React.useCallback(
    (sectionId: string, title: string) => {
      const updatedSections = (draftFaq.sections || []).map((section) =>
        section.id === sectionId ? { ...section, title } : section
      );
      commit({
        entries: draftFaq.entries,
        sections: updatedSections,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const removeSection = React.useCallback(
    (sectionId: string) => {
      const updatedSections = (draftFaq.sections || []).filter((section) => section.id !== sectionId);
      commit({
        entries: draftFaq.entries,
        sections: updatedSections.length > 0 ? updatedSections : undefined,
      });
    },
    [commit, draftFaq.entries, draftFaq.sections]
  );

  const renderEntryEditor = (entry: FaqEntry, sectionId?: string) => {
    const handleQuestionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      updateEntry(entry.id, { question: event.target.value }, sectionId);
    };

    const handleAnswerChange = (html: string) => {
      const normalizedAnswer = normalizeAnswer(html);
      updateEntry(entry.id, normalizedAnswer, sectionId);
    };

    return (
      <div key={entry.id} className="rounded-md border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <Label htmlFor={`faq-question-${entry.id}`} className="text-sm font-medium">
              Question
            </Label>
            <Input
              id={`faq-question-${entry.id}`}
              value={entry.question}
              onChange={handleQuestionChange}
              placeholder="Enter the frequently asked question"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-1 self-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move question up"
              onClick={() => moveEntry(entry.id, 'up', sectionId)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move question down"
              onClick={() => moveEntry(entry.id, 'down', sectionId)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove question"
              onClick={() => removeEntry(entry.id, sectionId)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Answer</Label>
          <RichTextEditor
            value={entry.answerHtml}
            onChange={handleAnswerChange}
            placeholder="Provide a concise answer to the question."
            allowImages={false}
            minHeight={160}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {draftFaq.entries.map((entry) => renderEntryEditor(entry))}

      <div className="flex justify-start">
        <Button type="button" variant="outline" size="sm" onClick={() => addEntry()}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ Item
        </Button>
      </div>

      {allowSections ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Sections</Label>
            <Button type="button" variant="secondary" size="sm" onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
          {(draftFaq.sections || []).map((section) => (
            <div key={section.id} className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={section.title}
                  onChange={(event) => updateSectionTitle(section.id, event.target.value)}
                  placeholder="Section title"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove section"
                  onClick={() => removeSection(section.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-3">
                {section.entries.map((entry) => renderEntryEditor(entry, section.id))}
              </div>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => addEntry(section.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question to Section
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface FaqAccordionProps {
  content?: NormalizedContent | null;
  collapseMode?: CollapseMode;
  startCollapsed?: boolean;
}

export function FaqAccordionDisplay({
  content,
  collapseMode = 'multiple',
  startCollapsed = true,
}: FaqAccordionProps) {
  const faq = content?.faq;

  if (!faq || (faq.entries.length === 0 && (!faq.sections || faq.sections.length === 0))) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No FAQ items available for this field.
      </div>
    );
  }

  const topLevelDefaultSingle = !startCollapsed ? faq.entries[0]?.id : undefined;
  const topLevelDefaultMultiple = !startCollapsed ? faq.entries.map((entry) => entry.id) : undefined;

  const renderEntryItem = (entry: FaqEntry, prefix?: string) => {
    const itemId = prefix ? `${prefix}:${entry.id}` : entry.id;
    const questionText = entry.question.trim() || 'FAQ Item';
    return (
      <AccordionItem key={itemId} value={itemId}>
        <AccordionTrigger className="text-left">
          <span className="font-medium">{questionText}</span>
        </AccordionTrigger>
        <AccordionContent>
          <div
            className="prose prose-sm max-w-none text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
          />
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="space-y-6">
      {faq.entries.length > 0 ? (
        collapseMode === 'single' ? (
          <Accordion
            type="single"
            collapsible
            defaultValue={topLevelDefaultSingle}
            className="rounded-md border bg-muted/30"
          >
            {faq.entries.map((entry) => renderEntryItem(entry))}
          </Accordion>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={topLevelDefaultMultiple}
            className="rounded-md border bg-muted/30"
          >
            {faq.entries.map((entry) => renderEntryItem(entry))}
          </Accordion>
        )
      ) : null}

      {(faq.sections || []).map((section) => (
        <div key={section.id} className="space-y-3">
          <h4 className="text-base font-semibold">{section.title}</h4>
          {collapseMode === 'single' ? (
            <Accordion
              type="single"
              collapsible
              defaultValue={
                !startCollapsed && section.entries.length > 0 ? `${section.id}:${section.entries[0].id}` : undefined
              }
              className="rounded-md border bg-muted/30"
            >
              {section.entries.map((entry) => renderEntryItem(entry, section.id))}
            </Accordion>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={
                !startCollapsed
                  ? section.entries.map((entry) => `${section.id}:${entry.id}`)
                  : undefined
              }
              className="rounded-md border bg-muted/30"
            >
              {section.entries.map((entry) => renderEntryItem(entry, section.id))}
            </Accordion>
          )}
        </div>
      ))}
    </div>
  );
}
