import { parseFrontmatter } from '@/lib/utils/markdown';

describe('parseFrontmatter', () => {
  it('returns entire content and empty metadata when no frontmatter exists', () => {
    const content = '# Heading\n\nBody copy';

    const result = parseFrontmatter(content);

    expect(result).toEqual({
      title: undefined,
      content,
      data: {},
    });
  });

  it('parses title and metadata fields from frontmatter', () => {
    const markdown = `---
title: Example Article
summary: "Quick overview"
lastUpdated: 2024-05-01
---

# Example Article

More details here.
`;

    const result = parseFrontmatter(markdown);

    expect(result.title).toBe('Example Article');
    expect(result.content.trimStart()).toMatch(/^# Example Article/);
    expect(result.data.summary).toBe('Quick overview');
    expect(result.data.lastUpdated).toBe('2024-05-01');
  });

  it('ignores unsupported lines and preserves valid key-value pairs', () => {
    const markdown = `---
title: "Quoted Title"
// comment should be ignored
# another comment
custom_key: value with spaces
strange: value:with:colons
---

Body text.
`;

    const result = parseFrontmatter(markdown);

    expect(result.title).toBe('Quoted Title');
    expect(result.data.custom_key).toBe('value with spaces');
    expect(result.data.strange).toBe('value:with:colons');
  });
});

