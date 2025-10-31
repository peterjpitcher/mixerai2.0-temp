export interface FrontmatterParseResult {
  title?: string;
  content: string;
  data: Record<string, string>;
}

/**
 * Extract YAML-style frontmatter from markdown files.
 * Supports simple "key: value" pairs (one per line) and returns the content body.
 * If no frontmatter is present, the entire file content is returned.
 */
export function parseFrontmatter(fileContent: string): FrontmatterParseResult {
  const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);

  if (!match) {
    return {
      content: fileContent,
      data: {},
    };
  }

  const frontmatterBlock = match[1];
  const content = match[2];
  const data: Record<string, string> = {};
  let title: string | undefined;

  for (const rawLine of frontmatterBlock.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    // Strip wrapping quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")) || (value.startsWith('`') && value.endsWith('`'))) {
      value = value.slice(1, -1);
    }

    data[key] = value;

    if (key === 'title' && value) {
      title = value;
    }
  }

  return { title, content, data };
}
