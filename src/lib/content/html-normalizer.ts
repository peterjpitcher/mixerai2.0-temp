import { sanitizeHTML } from '@/lib/sanitize/html-sanitizer';

const headingLargeClass = 'mix-generated-heading-large';
const headingSmallClass = 'mix-generated-heading-small';
const paragraphClass = 'mix-generated-paragraph';
const listClass = 'mix-generated-list';
const listItemClass = 'mix-generated-list-item';

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
      charCount: 0
    };
  }

  const normalizedType = fieldType?.toLowerCase();
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
  }

  const raw = typeof value === 'string' ? value : value == null ? '' : String(value);
  const normalizedType = fieldType?.toLowerCase();
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
