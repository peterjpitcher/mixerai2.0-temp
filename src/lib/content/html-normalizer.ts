import { sanitizeHTML } from '@/lib/sanitize/html-sanitizer';

const headingLargeClass = 'mix-generated-heading-large';
const headingSmallClass = 'mix-generated-heading-small';
const paragraphClass = 'mix-generated-paragraph';
const listClass = 'mix-generated-list';
const listItemClass = 'mix-generated-list-item';
const faqContainerClass = 'mix-generated-faq';
const faqSectionClass = 'mix-generated-faq-section';
const faqSectionTitleClass = 'mix-generated-faq-section-title';
const faqItemClass = 'mix-generated-faq-item';
const faqQuestionClass = 'mix-generated-faq-question';
const faqAnswerClass = 'mix-generated-faq-answer';

const htmlTagRegex = /<\s*([a-z][a-z0-9]*)\b[^>]*>/i;
const inlineBoldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
const inlineItalicRegex = /(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)|(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/g;
const inlineCodeRegex = /`([^`]+)`/g;
const inlineLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

export interface NormalizedContent {
  html: string;
  plain: string;
  wordCount: number;
  charCount: number;
  faq?: FaqContent | null;
}

export interface FaqEntry {
  id: string;
  question: string;
  answerHtml: string;
  answerPlain: string;
}

export interface FaqSection {
  id: string;
  title: string;
  entries: FaqEntry[];
}

export interface FaqContent {
  entries: FaqEntry[];
  sections?: FaqSection[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInlineMarkdown(text: string): string {
  let formatted = escapeHtml(text);
  formatted = formatted.replace(inlineLinkRegex, (_match, label: string, url: string) => `<a href="${url}">${label}</a>`);
  formatted = formatted.replace(inlineBoldRegex, (_match, boldA?: string, boldB?: string) => `<strong>${boldA ?? boldB ?? ''}</strong>`);
  formatted = formatted.replace(inlineItalicRegex, (_match, italA?: string, italB?: string) => `<em>${italA ?? italB ?? ''}</em>`);
  formatted = formatted.replace(inlineCodeRegex, (_match, code: string) => `<code>${code}</code>`);
  return formatted;
}

function looksLikeHtml(text: string): boolean {
  return htmlTagRegex.test(text);
}

export function isLikelyMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (looksLikeHtml(trimmed)) return false;
  return /(^|\n)#{1,6}\s+/.test(trimmed)
    || /(^|\n)(?:[-*+]\s+)/.test(trimmed)
    || /(^|\n)\d+\.\s+/.test(trimmed);
}

function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const htmlParts: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  const paragraphBuffer: string[] = [];

  const closeLists = () => {
    if (inUnorderedList) {
      htmlParts.push('</ul>');
      inUnorderedList = false;
    }
    if (inOrderedList) {
      htmlParts.push('</ol>');
      inOrderedList = false;
    }
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const paragraph = paragraphBuffer.map(line => formatInlineMarkdown(line)).join('<br />');
    if (paragraph.trim()) {
      htmlParts.push(`<p class="${paragraphClass}">${paragraph}</p>`);
    }
    paragraphBuffer.length = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimRight();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeLists();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeLists();
      const level = headingMatch[1].length;
      const content = formatInlineMarkdown(headingMatch[2]);
      const clampedLevel = Math.min(level, 6);
      const cssClass = clampedLevel <= 2 ? headingLargeClass : headingSmallClass;
      htmlParts.push(`<h${clampedLevel} class="${cssClass}">${content}</h${clampedLevel}>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!inOrderedList) {
        closeLists();
        htmlParts.push(`<ol class="${listClass}">`);
        inOrderedList = true;
      }
      const itemContent = formatInlineMarkdown(orderedMatch[2]);
      htmlParts.push(`<li class="${listItemClass}">${itemContent}</li>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (!inUnorderedList) {
        closeLists();
        htmlParts.push(`<ul class="${listClass}">`);
        inUnorderedList = true;
      }
      const itemContent = formatInlineMarkdown(unorderedMatch[1]);
      htmlParts.push(`<li class="${listItemClass}">${itemContent}</li>`);
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeLists();

  return htmlParts.join('');
}

function convertPlainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/);
  const htmlBlocks: string[] = [];

  const isHeadingText = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 120) return false;
    const letters = trimmed.replace(/[^A-Za-z]/g, '').length;
    if (letters < 3) return false;
    const sanitized = trimmed.replace(/[:?]/g, '').replace(/\s+/g, ' ');
    if (!/^[A-Z0-9][A-Za-z0-9\s'’&-]*$/.test(sanitized)) return false;
    if (/[.!]$/.test(trimmed)) return false;
    if (trimmed.includes(':')) {
      const [beforeColon, afterColon = ''] = trimmed.split(':');
      if (!afterColon.trim()) return false;
      if (afterColon.trim().split(/\s+/).length < 2) return false;
      if (beforeColon.trim().split(/\s+/).length > 6) return false;
    }
    return true;
  };

  blocks.forEach(block => {
    const lines = block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    if (lines.length === 1 && isHeadingText(lines[0])) {
      htmlBlocks.push(`<h2 class="${headingLargeClass}">${formatInlineMarkdown(lines[0])}</h2>`);
      return;
    }

    const bulletList = lines.every(line => /^[-*+]\s+/.test(line));
    if (bulletList) {
      const items = lines.map(line => {
        const content = line.replace(/^[-*+]\s+/, '');
        return `<li class="${listItemClass}">${formatInlineMarkdown(content)}</li>`;
      }).join('');
      htmlBlocks.push(`<ul class="${listClass}">${items}</ul>`);
      return;
    }

    const descriptorList = lines.length >= 2 && lines.every(line => /^[^:]+:\s*.+$/.test(line));
    if (descriptorList) {
      const items = lines.map(line => {
        const [label, ...rest] = line.split(':');
        const value = rest.join(':').trim();
        const labelHtml = `<strong>${formatInlineMarkdown(label.trim())}:</strong>`;
        return `<li class="${listItemClass}">${labelHtml} ${formatInlineMarkdown(value)}</li>`;
      }).join('');
      htmlBlocks.push(`<ul class="${listClass}">${items}</ul>`);
      return;
    }

    const paragraphContent = lines.map(line => formatInlineMarkdown(line)).join('<br />');
    htmlBlocks.push(`<p class="${paragraphClass}">${paragraphContent}</p>`);
  });

  return htmlBlocks.join('');
}

function stripHtmlWrappers(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '');
}

function plainTextFromHtml(html: string): string {
  return stripHtmlWrappers(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function buildFaqEntry(
  question: string,
  answerSource: string,
  fallbackId: string,
  maybeProvidedId?: unknown
): FaqEntry {
  const normalizedAnswer = normalizeRichText(answerSource);
  const entryId =
    typeof maybeProvidedId === 'string' && maybeProvidedId.trim().length > 0
      ? maybeProvidedId.trim()
      : fallbackId;
  const safeQuestion = question.trim();
  return {
    id: entryId,
    question: safeQuestion.length > 0 ? safeQuestion : 'Frequently Asked Question',
    answerHtml: normalizedAnswer.html,
    answerPlain: normalizedAnswer.plain,
  };
}

function coerceFaqEntries(raw: unknown, pathPrefix = 'faq', offset = 0): FaqEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          const value = String(item ?? '').trim();
          if (!value) return null;
          return buildFaqEntry(`Question ${offset + index + 1}`, value, `${pathPrefix}-entry-${index + 1}`);
        }
        const obj = item as Record<string, unknown>;
        const question =
          typeof obj.question === 'string' && obj.question.trim().length > 0
            ? obj.question
            : typeof obj.title === 'string' && obj.title.trim().length > 0
            ? obj.title
            : `Question ${offset + index + 1}`;
        const answerCandidate =
          (typeof obj.answerHtml === 'string' && obj.answerHtml) ||
          (typeof obj.answer === 'string' && obj.answer) ||
          (typeof obj.answer_text === 'string' && obj.answer_text) ||
          (typeof obj.content === 'string' && obj.content) ||
          (typeof obj.body === 'string' && obj.body) ||
          (typeof obj.description === 'string' && obj.description) ||
          '';
        return buildFaqEntry(question, answerCandidate, `${pathPrefix}-entry-${index + 1}`, obj.id);
      })
      .filter((entry): entry is FaqEntry => Boolean(entry));
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.entries)) {
      return coerceFaqEntries(obj.entries, pathPrefix, offset);
    }
    if (Array.isArray(obj.items)) {
      return coerceFaqEntries(obj.items, pathPrefix, offset);
    }
    if (Array.isArray(obj.faq)) {
      return coerceFaqEntries(obj.faq, pathPrefix, offset);
    }
    if (Array.isArray(obj.questions)) {
      return coerceFaqEntries(obj.questions, pathPrefix, offset);
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    // Treat plain text as a single Q/A entry with a generated question label
    return [
      buildFaqEntry(
        'FAQ Item',
        raw,
        `${pathPrefix}-entry-${offset + 1}`
      ),
    ];
  }

  return [];
}

function coerceFaqSections(raw: unknown): FaqSection[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) {
    if (typeof raw === 'object' && raw) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.sections)) {
        return coerceFaqSections(obj.sections);
      }
      if (Array.isArray(obj.groups)) {
        return coerceFaqSections(obj.groups);
      }
    }
    return [];
  }

  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const obj = item as Record<string, unknown>;
      const entries = coerceFaqEntries(
        obj.entries ?? obj.items ?? obj.questions ?? obj.faq ?? [],
        `faq-section-${index + 1}`,
        0
      );
      if (!entries.length) {
        return null;
      }
      const titleCandidate =
        typeof obj.title === 'string' && obj.title.trim().length > 0
          ? obj.title.trim()
          : typeof obj.name === 'string' && obj.name.trim().length > 0
          ? obj.name.trim()
          : `Section ${index + 1}`;
      const idCandidate =
        typeof obj.id === 'string' && obj.id.trim().length > 0
          ? obj.id.trim()
          : `faq-section-${index + 1}`;
      return {
        id: idCandidate,
        title: titleCandidate,
        entries,
      } as FaqSection;
    })
    .filter((section): section is FaqSection => Boolean(section));
}

function coerceFaqContent(raw: unknown): FaqContent {
  if (!raw) {
    return { entries: [] };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { entries: [] };
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return coerceFaqContent(parsed);
      } catch {
        // fall through to treating as plain text
      }
    }
    return { entries: coerceFaqEntries(trimmed) };
  }

  if (Array.isArray(raw)) {
    return { entries: coerceFaqEntries(raw) };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    const directContent =
      obj.faq ?? obj.content ?? obj.data ?? obj.value ?? obj.payload ?? obj;

    if (Array.isArray(directContent)) {
      return { entries: coerceFaqEntries(directContent) };
    }

    const entries = coerceFaqEntries(obj.entries ?? obj.items ?? obj.questions ?? obj.faq);
    const sections = coerceFaqSections(obj.sections ?? obj.groups);

    if (!entries.length && Array.isArray(obj.sections)) {
      // If only sections exist, flatten them into entries while keeping sections structure.
      const parsedSections = coerceFaqSections(obj.sections);
      const flattened = parsedSections.flatMap((section) => section.entries);
      return {
        entries: flattened,
        sections: parsedSections,
      };
    }

    return {
      entries,
      sections: sections.length ? sections : undefined,
    };
  }

  return { entries: [] };
}

function renderFaqHtml(content: FaqContent): string {
  const allSections = content.sections ?? [];
  const hasSections = allSections.length > 0;
  const entriesOutsideSections =
    content.entries.filter((entry) => {
      if (!hasSections) return true;
      // When sections are present, exclude duplicates already listed inside them
      const entryId = entry.id;
      return !allSections.some((section) =>
        section.entries.some((sectionEntry) => sectionEntry.id === entryId)
      );
    }) ?? [];

  const parts: string[] = [`<div class="${faqContainerClass}">`];

  if (hasSections) {
    allSections.forEach((section) => {
      parts.push(
        `<div class="${faqSectionClass}" data-faq-section-id="${escapeHtml(section.id)}">`,
        `<p class="${faqSectionTitleClass}">${escapeHtml(section.title)}</p>`
      );
      section.entries.forEach((entry) => {
        parts.push(
          `<div class="${faqItemClass}" data-faq-entry-id="${escapeHtml(entry.id)}">`,
          `<p class="${faqQuestionClass}">${escapeHtml(entry.question)}</p>`,
          `<div class="${faqAnswerClass}">${entry.answerHtml}</div>`,
          `</div>`
        );
      });
      parts.push(`</div>`);
    });
  }

  entriesOutsideSections.forEach((entry) => {
    parts.push(
      `<div class="${faqItemClass}" data-faq-entry-id="${escapeHtml(entry.id)}">`,
      `<p class="${faqQuestionClass}">${escapeHtml(entry.question)}</p>`,
      `<div class="${faqAnswerClass}">${entry.answerHtml}</div>`,
      `</div>`
    );
  });

  parts.push(`</div>`);
  return parts.join('');
}

function renderFaqPlain(content: FaqContent): string {
  const strings: string[] = [];
  const appendEntries = (entries: FaqEntry[], sectionTitle?: string) => {
    entries.forEach((entry) => {
      if (sectionTitle) {
        strings.push(`${sectionTitle}`.trim());
      }
      strings.push(entry.question.trim());
      strings.push(entry.answerPlain.trim());
      strings.push(''); // blank line between entries
    });
  };

  if (content.sections?.length) {
    content.sections.forEach((section) => {
      appendEntries(section.entries, section.title);
    });
  }

  const sectionEntryIds = new Set(
    content.sections?.flatMap((section) => section.entries.map((entry) => entry.id)) ?? []
  );
  const standaloneEntries = content.entries.filter((entry) => !sectionEntryIds.has(entry.id));
  appendEntries(standaloneEntries);

  return strings.join('\n').trim();
}

function normalizeFaq(raw: unknown): NormalizedContent {
  const parsed = coerceFaqContent(raw);
  const html = renderFaqHtml(parsed);
  const sanitizedHtml = sanitizeHTML(html, {
    allow_links: true,
    allow_tables: true,
    allow_images: false,
  }).replace(/\n+/g, '');
  const plain = renderFaqPlain(parsed);

  return {
    html: sanitizedHtml || `<div class="${faqContainerClass}"></div>`,
    plain,
    wordCount: countWords(plain),
    charCount: plain.length,
    faq: parsed,
  };
}

export function normalizeRichText(raw: string): NormalizedContent {
  const trimmed = raw?.trim() ?? '';

  let baseHtml = '';
  if (!trimmed) {
    baseHtml = '';
  } else if (isLikelyMarkdown(trimmed)) {
    baseHtml = convertMarkdownToHtml(trimmed);
  } else if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    baseHtml = trimmed;
  } else {
    baseHtml = convertPlainTextToHtml(trimmed);
  }

  const sanitized = sanitizeHTML(stripHtmlWrappers(baseHtml), {
    allow_images: false,
    allow_links: true,
    allow_tables: true,
  }).replace(/\n+/g, '');

  const normalizedHtml = sanitized || `<p class="${paragraphClass}"></p>`;
  const plain = plainTextFromHtml(normalizedHtml);

  return {
    html: normalizedHtml,
    plain,
    wordCount: countWords(plain),
    charCount: plain.length,
  };
}

export function normalizePlainText(raw: string): NormalizedContent {
  const safe = raw?.replace(/\r\n/g, '\n') ?? '';
  const asHtml = convertPlainTextToHtml(safe);
  const sanitized = sanitizeHTML(asHtml, { allow_images: false, allow_links: true, allow_tables: true }).replace(/\n+/g, '');
  const plain = plainTextFromHtml(sanitized);
  return {
    html: sanitized || `<p class="${paragraphClass}"></p>`,
    plain,
    wordCount: countWords(plain),
    charCount: plain.length
  };
}

export function normalizeFieldContent(raw: string, fieldType: string): NormalizedContent {
  if (!raw) {
    return {
      html: `<p class="${paragraphClass}"></p>`,
      plain: '',
      wordCount: 0,
      charCount: 0,
      faq: fieldType?.toLowerCase() === 'faq' ? { entries: [] } : undefined,
    };
  }

  const normalizedType = fieldType?.toLowerCase();
  if (normalizedType === 'faq') {
    return normalizeFaq(raw);
  }
  if (normalizedType === 'richtext' || normalizedType === 'rich-text' || normalizedType === 'html') {
    return normalizeRichText(raw);
  }

  return normalizePlainText(raw);
}

export function extractFirstHtmlValue(raw: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const first = Object.values(parsed).find((value): value is string => typeof value === 'string');
      return first ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export const GeneratedContentClasses = {
  headingLargeClass,
  headingSmallClass,
  paragraphClass,
  listClass,
  listItemClass,
};

export function ensureNormalizedContent(value: unknown, fieldType: string): NormalizedContent {
  if (value && typeof value === 'object') {
    const maybeContent = value as Partial<NormalizedContent> & { html?: string; plain?: string };
    if (typeof maybeContent.html === 'string' && typeof maybeContent.plain === 'string') {
      const hasCounts = typeof maybeContent.wordCount === 'number' && typeof maybeContent.charCount === 'number';
      if (hasCounts) {
        // Ensure faq payload is at least an object when the field type expects it
        if (fieldType?.toLowerCase() === 'faq') {
          const faqPayload = maybeContent.faq ?? coerceFaqContent(maybeContent.html);
          return {
            ...maybeContent,
            faq: faqPayload,
          } as NormalizedContent;
        }
        return maybeContent as NormalizedContent;
      }
      const fallbackSource = maybeContent.html || maybeContent.plain;
      return normalizeFieldContent(fallbackSource, fieldType);
    }
    if (typeof maybeContent.html === 'string') {
      return normalizeFieldContent(maybeContent.html, fieldType);
    }
    if (typeof maybeContent.plain === 'string') {
      return normalizeFieldContent(maybeContent.plain, fieldType);
    }
    if (fieldType?.toLowerCase() === 'faq' && maybeContent.faq) {
      return normalizeFaq(maybeContent.faq);
    }
  }

  const raw = typeof value === 'string' ? value : value == null ? '' : String(value);
  const normalizedType = fieldType?.toLowerCase();
  if (normalizedType === 'faq') {
    return normalizeFaq(value);
  }
  const candidate = normalizedType === 'richtext' || normalizedType === 'rich-text' || normalizedType === 'html'
    ? extractFirstHtmlValue(raw)
    : raw;
  return normalizeFieldContent(candidate, fieldType);
}

export function normalizeOutputsMap(
  outputs: Record<string, unknown> | null | undefined,
  fields?: Array<{ id: string; type: string }>
): Record<string, NormalizedContent> {
  if (!outputs) {
    return {};
  }

  const fieldTypeById = new Map<string, string>();
  fields?.forEach((field) => {
    fieldTypeById.set(field.id, field.type);
  });

  return Object.entries(outputs).reduce<Record<string, NormalizedContent>>((acc, [key, value]) => {
    const fieldType = fieldTypeById.get(key) ?? 'plainText';
    acc[key] = ensureNormalizedContent(value, fieldType);
    return acc;
  }, {});
}
