/**
 * Utility function to copy text to clipboard
 * @param text The text to copy
 * @returns A promise that resolves when the text is copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  const canUseNavigatorClipboard =
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    Boolean(navigator.clipboard) &&
    Boolean(window.isSecureContext);

  if (canUseNavigatorClipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('Navigator clipboard copy failed, falling back to execCommand.', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!successful) {
      throw new Error('Unable to copy to clipboard');
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    throw err;
  }
}
