export interface FrontmatterParseResult {
  title?: string;
  content: string;
}

/**
 * Very small helper to extract YAML-style frontmatter from markdown files.
 * If no frontmatter is present, the entire file content is returned.
 */
export function parseFrontmatter(fileContent: string): FrontmatterParseResult {
  const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const frontmatter = match[1];
    const content = match[2];
    let title: string | undefined;
    const titleMatch = frontmatter.match(/^title:\s*(.*)/m);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/['"`]/g, '');
    }
    return { title, content };
  }
  return { content: fileContent };
}
