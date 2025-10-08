'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Quote,
  Code,
  List,
  ListOrdered,
  WrapText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Redo2,
  Undo2,
  Highlighter,
  Droplet,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  allowImages?: boolean;
  minHeight?: number;
}

const palette = [
  '#1F2933',
  '#475569',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#F97316',
  '#10B981',
  '#0EA5E9',
];

function isSameHTML(editor: Editor | null, next: string) {
  if (!editor) return false;
  return editor.getHTML().trim() === (next || '').trim();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing…',
  className,
  readOnly = false,
  allowImages = false,
  minHeight = 220,
}: RichTextEditorProps) {
  const extensions = useMemo<Extensions>(() => {
    const exts: Extensions = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: {
          HTMLAttributes: { class: 'rounded-xl bg-muted px-4 py-3 font-mono text-sm' },
        },
      }),
      Underline,
      Strike,
      Link.configure({
        openOnClick: !readOnly,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 hover:text-primary/80 transition-colors',
        },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        includeChildren: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
    ];

    if (allowImages) {
      exts.push(
        Image.configure({
          allowBase64: false,
          HTMLAttributes: {
            class: 'rounded-xl border border-border/60 shadow-sm max-w-full',
          },
        })
      );
    }

    return exts;
  }, [allowImages, placeholder, readOnly]);

  const editor = useEditor({
    extensions,
    content: value || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      onChange(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isSameHTML(editor, value)) return;
    editor.commands.setContent(value || '', { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const [, setEditorVersion] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setEditorVersion((version) => version + 1);
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    editor.on('focus', handleUpdate);
    editor.on('blur', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-3xl border border-white/60 bg-white/70 px-5 py-4 text-sm text-muted-foreground shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10',
          className
        )}
      >
        Loading editor…
      </div>
    );
  }

  const runCommand = (command: () => void) => {
    command();
  };

  const applyLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previous || '');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const safeUrl = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      className={cn(
        'group/editor rounded-[2rem] border border-white/60 bg-white/75 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10',
        className
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/50 px-5 py-3 dark:border-white/10">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            isActive={editor.isActive('bold')}
            onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            isActive={editor.isActive('italic')}
            onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
          />
          <ToolbarButton
            icon={UnderlineIcon}
            label="Underline"
            isActive={editor.isActive('underline')}
            onClick={() => runCommand(() => editor.chain().focus().toggleUnderline().run())}
          />
          <ToolbarButton
            icon={Strikethrough}
            label="Strikethrough"
            isActive={editor.isActive('strike')}
            onClick={() => runCommand(() => editor.chain().focus().toggleStrike().run())}
          />
          <ToolbarButton
            icon={Quote}
            label="Quote"
            isActive={editor.isActive('blockquote')}
            onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
          />
          <ToolbarButton
            icon={Code}
            label="Code block"
            isActive={editor.isActive('codeBlock')}
            onClick={() => runCommand(() => editor.chain().focus().toggleCodeBlock().run())}
          />
          <Divider />
          <ToolbarButton
            icon={List}
            label="Bullet list"
            isActive={editor.isActive('bulletList')}
            onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            isActive={editor.isActive('orderedList')}
            onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
          />
          <ToolbarButton
            icon={WrapText}
            label="Heading 1"
            isActive={editor.isActive('heading', { level: 1 })}
            onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            display="H1"
          />
          <ToolbarButton
            icon={WrapText}
            label="Heading 2"
            isActive={editor.isActive('heading', { level: 2 })}
            onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            display="H2"
          />
          <ToolbarButton
            icon={WrapText}
            label="Heading 3"
            isActive={editor.isActive('heading', { level: 3 })}
            onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            display="H3"
          />
          <Divider />
          <ToolbarButton
            icon={AlignLeft}
            label="Align left"
            isActive={editor.isActive({ textAlign: 'left' })}
            onClick={() => runCommand(() => editor.chain().focus().setTextAlign('left').run())}
          />
          <ToolbarButton
            icon={AlignCenter}
            label="Align center"
            isActive={editor.isActive({ textAlign: 'center' })}
            onClick={() => runCommand(() => editor.chain().focus().setTextAlign('center').run())}
          />
          <ToolbarButton
            icon={AlignRight}
            label="Align right"
            isActive={editor.isActive({ textAlign: 'right' })}
            onClick={() => runCommand(() => editor.chain().focus().setTextAlign('right').run())}
          />
          <Divider />
          <ToolbarButton
            icon={LinkIcon}
            label="Add link"
            isActive={editor.isActive('link')}
            onClick={applyLink}
          />
          <ToolbarButton
            icon={Unlink}
            label="Remove link"
            onClick={() => runCommand(() => editor.chain().focus().unsetLink().run())}
          />
          {allowImages && (
            <ToolbarButton icon={ImageIcon} label="Insert image" onClick={addImage} />
          )}
          <Divider />
          <ToolbarButton icon={Undo2} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolbarButton icon={Redo2} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
          <Divider />
          <ColorSwatchGroup
            editor={editor}
            onUnset={() => runCommand(() => editor.chain().focus().unsetColor().run())}
          />
          <ToolbarButton
            icon={Highlighter}
            label="Highlight"
            isActive={editor.isActive('highlight')}
            onClick={() => runCommand(() => editor.chain().focus().toggleHighlight().run())}
          />
        </div>
      )}

      <div className="px-5 pb-5">
        <div
          className={cn(
            'prose prose-sm max-w-none rounded-3xl border border-white/60 bg-white/90 px-4 py-3 text-muted-foreground shadow-inner backdrop-blur-xl transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100',
            readOnly && 'bg-transparent shadow-none'
          )}
          style={{ minHeight }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  display?: string;
}

function ToolbarButton({ icon: Icon, label, onClick, isActive = false, display }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-10 rounded-full border border-transparent px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-primary/30 hover:text-primary',
        isActive && 'border-primary/50 bg-primary/10 text-primary',
        display && 'w-12 justify-center'
      )}
      onClick={onClick}
      title={label}
    >
      {display ? (
        <span>{display}</span>
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </Button>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-white/40 dark:bg-white/10" />;
}

function ColorSwatchGroup({ editor, onUnset }: { editor: Editor; onUnset: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {palette.map((color) => (
        <button
          key={color}
          type="button"
          title={`Text color ${color}`}
          className={cn(
            'h-6 w-6 rounded-full border border-white/60 transition hover:scale-105 dark:border-white/10',
            editor.isActive('textStyle', { color }) && 'ring-2 ring-offset-2 ring-primary'
          )}
          style={{ backgroundColor: color }}
          onClick={() => editor.chain().focus().setColor(color).run()}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 rounded-full border border-transparent px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-primary/30 hover:text-primary"
        onClick={onUnset}
        title="Reset color"
      >
        <Droplet className="mr-1 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
