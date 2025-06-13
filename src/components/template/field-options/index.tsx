// Export all field option components
export { ShortTextOptionsComponent } from './short-text-options';
export { LongTextOptionsComponent } from './long-text-options';
export { RichTextOptionsComponent } from './rich-text-options';
export { SelectOptionsComponent } from './select-options';
export { NumberOptionsComponent } from './number-options';

// Placeholder components for other field types
// These should be implemented as separate files when needed

// Import removed - unused types

interface PlaceholderOptionsProps {
  options: Record<string, unknown>;
  onChange: (options: Record<string, unknown>) => void;
}

export function DateOptionsComponent({ }: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">Date options configuration coming soon</div>;
}

export function TagsOptionsComponent({ }: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">Tags options configuration coming soon</div>;
}

export function UrlOptionsComponent({ }: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">URL options configuration coming soon</div>;
}

export function FileUploadOptionsComponent({ }: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">File upload options configuration coming soon</div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PlainTextOutputOptionsComponent(_props: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">Plain text output options configuration coming soon</div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HtmlOutputOptionsComponent(_props: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">HTML output options configuration coming soon</div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ImageOutputOptionsComponent(_props: PlaceholderOptionsProps) {
  return <div className="text-sm text-muted-foreground">Image output options configuration coming soon</div>;
}