export function extractCleanDomain(urlInput: string): string | null {
  try {
    const url = new URL(urlInput.startsWith('http') ? urlInput : `http://${urlInput}`);
    // Remove 'www.' and return hostname, converted to lowercase for consistent matching
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (e) {
    // Log the error for server-side debugging, but don't expose details to client directly from here.
    console.warn(`[extractCleanDomain] Invalid URL provided: ${urlInput}`, e);
    return null;
  }
} 