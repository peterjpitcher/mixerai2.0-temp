import { normalizeFieldContent, ensureNormalizedContent } from '@/lib/content/html-normalizer';

describe('FAQ normalization', () => {
  it('parses JSON FAQ payloads into structured entries', () => {
    const rawFaq = JSON.stringify([
      { question: 'What is Product X?', answerHtml: '<p>Product X is a daily supplement.</p>' },
      { question: 'How do I use it?', answer: 'Take two capsules with water.' },
    ]);

    const normalized = normalizeFieldContent(rawFaq, 'faq');

    expect(normalized.faq).toBeDefined();
    expect(normalized.faq?.entries).toHaveLength(2);
    expect(normalized.faq?.entries[0].question).toBe('What is Product X?');
    expect(normalized.faq?.entries[0].answerHtml).toContain('<p>');
    expect(normalized.faq?.entries[1].answerPlain).toContain('Take two capsules');
    expect(normalized.html).toContain('mix-generated-faq');
    expect(normalized.plain).toContain('What is Product X?');
    expect(normalized.wordCount).toBeGreaterThan(0);
  });

  it('normalizes FAQ sections and regenerates html/plain output', () => {
    const faqPayload = {
      entries: [],
      sections: [
        {
          id: 'usage',
          title: 'Usage',
          entries: [
            {
              id: 'dose',
              question: 'What is the recommended dose?',
              answerHtml: '<p>One scoop mixed with water.</p>',
            },
          ],
        },
      ],
    };

    const normalized = ensureNormalizedContent({ faq: faqPayload }, 'faq');

    expect(normalized.faq?.sections).toHaveLength(1);
    expect(normalized.faq?.sections?.[0].entries[0].answerPlain).toBe('One scoop mixed with water.');
    expect(normalized.html).toContain('mix-generated-faq-section');
    expect(normalized.plain).toContain('Usage');
  });
});
