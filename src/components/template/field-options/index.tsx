// Export all field option components
export { ShortTextOptionsComponent } from './short-text-options';
export { LongTextOptionsComponent } from './long-text-options';
export { RichTextOptionsComponent } from './rich-text-options';
export { SelectOptionsComponent } from './select-options';
export { NumberOptionsComponent } from './number-options';

// Placeholder components for other field types
// These should be implemented as separate files when needed

import { DateOptions, TagsOptions, UrlOptions, FileUploadOptions, PlainTextOutputOptions, HtmlOutputOptions, ImageOutputOptions } from '@/types/template';

export function DateOptionsComponent({ options, onChange }: { options: DateOptions; onChange: (options: DateOptions) => void }) {
  return <div className="text-sm text-muted-foreground">Date options configuration coming soon</div>;
}

export function TagsOptionsComponent({ options, onChange }: { options: TagsOptions; onChange: (options: TagsOptions) => void }) {
  return <div className="text-sm text-muted-foreground">Tags options configuration coming soon</div>;
}

export function UrlOptionsComponent({ options, onChange }: { options: UrlOptions; onChange: (options: UrlOptions) => void }) {
  return <div className="text-sm text-muted-foreground">URL options configuration coming soon</div>;
}

export function FileUploadOptionsComponent({ options, onChange }: { options: FileUploadOptions; onChange: (options: FileUploadOptions) => void }) {
  return <div className="text-sm text-muted-foreground">File upload options configuration coming soon</div>;
}

export function PlainTextOutputOptionsComponent({ options, onChange }: { options: PlainTextOutputOptions; onChange: (options: PlainTextOutputOptions) => void }) {
  return <div className="text-sm text-muted-foreground">Plain text output options configuration coming soon</div>;
}

export function HtmlOutputOptionsComponent({ options, onChange }: { options: HtmlOutputOptions; onChange: (options: HtmlOutputOptions) => void }) {
  return <div className="text-sm text-muted-foreground">HTML output options configuration coming soon</div>;
}

export function ImageOutputOptionsComponent({ options, onChange }: { options: ImageOutputOptions; onChange: (options: ImageOutputOptions) => void }) {
  return <div className="text-sm text-muted-foreground">Image output options configuration coming soon</div>;
}