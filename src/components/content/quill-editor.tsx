'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type QuillType from 'quill';

type DeltaStatic = any;
type ClipboardMatcherCallback = (node: Node, delta: DeltaStatic) => DeltaStatic;
type QuillOp = any;

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  allowImages?: boolean;
}

export function QuillEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
  allowImages = false // Default closed for security
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<QuillType | null>(null);
  const dropHandlerRef = useRef<((event: DragEvent) => void) | null>(null);
  const dragOverHandlerRef = useRef<((event: DragEvent) => void) | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const resolveHtmlValue = useMemo(() => {
    const ensureHtml = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (/<[a-z][\s\S]*>/i.test(trimmed)) {
        return trimmed;
      }
      // Wrap plain text in paragraph for Quill
      return `<p>${trimmed.replace(/\n+/g, '<br />')}</p>`;
    };

    return (raw: string): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      if (!trimmed.startsWith('{')) {
        return ensureHtml(trimmed);
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') {
          return ensureHtml(parsed);
        }
        if (parsed && typeof parsed === 'object') {
          const candidate = Object.values(parsed).find((value): value is string => typeof value === 'string');
          if (candidate) {
            return ensureHtml(candidate);
          }
        }
      } catch {
        return ensureHtml(trimmed);
      }
      return ensureHtml(trimmed);
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const initQuill = async () => {
      // Check if Quill was already initialized in this element
      if (editorRef.current?.querySelector('.ql-toolbar')) {
        console.log('Quill already initialized, skipping');
        return;
      }

      // Dynamically import Quill to avoid SSR issues
      const { default: Quill } = await import('quill');
      const DeltaConstructor = Quill.import('delta') as { new (ops?: QuillOp[]): DeltaStatic };

      console.log('Initializing Quill editor');

      // Initialize Quill
      const toolbarConfig = readOnly
        ? false
        : [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            allowImages ? ['link', 'image'] : ['link'],
          ];

      const formats: string[] = [
        'header',
        'bold',
        'italic',
        'underline',
        'strike',
        'blockquote',
        'code-block',
        'list',
        'color',
        'background',
        'align',
        'link',
      ];
      if (allowImages) {
        formats.push('image');
      }

      const quill = new Quill(editorRef.current!, {
        theme: 'snow',
        placeholder,
        readOnly,
        modules: {
          toolbar: toolbarConfig,
        },
        formats,
      });

      quillRef.current = quill;

      const editorContentClasses = 'prose prose-sm max-w-none dark:prose-invert focus:outline-none';
      const containerClasses = 'bg-transparent border-none';
      const rootPaddingClasses = 'px-0 py-0';
      editorContentClasses.split(' ').forEach(cls => {
        if (cls) {
          quill.root.classList.add(cls);
        }
      });
      containerClasses.split(' ').forEach(cls => {
        if (cls) {
          quill.container.classList.add(cls);
        }
      });
      rootPaddingClasses.split(' ').forEach(cls => {
        if (cls) {
          quill.root.classList.add(cls);
        }
      });
      quill.root.style.backgroundColor = 'transparent';

      if (!readOnly) {
        const headingMatcherFactory = (level: number): ClipboardMatcherCallback => (node, delta) => {
          const element = node as HTMLElement;
          const contentText = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (!contentText) {
            return delta;
          }
          const normalized = new DeltaConstructor();
          normalized.insert(contentText);
          normalized.insert('\n', { header: level });
          return normalized;
        };

        ['h1', 'h2', 'h3'].forEach((tagName, index) => {
          quill.clipboard.addMatcher(tagName, headingMatcherFactory(index + 1));
        });
      }

      // Add paste and drop handlers for image restriction
      if (!allowImages) {
        // Strip images from paste
        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
          if ((node as HTMLElement).tagName === 'IMG') {
            return new DeltaConstructor();
          }
          const filteredOps = (delta.ops ?? []).filter(op => {
            if (typeof op.insert === 'object' && op.insert) {
              return !('image' in (op.insert as Record<string, unknown>));
            }
            return true;
          });
          return new DeltaConstructor(filteredOps as QuillOp[]);
        });

        // Prevent image drops
        const editorElement = quill.root;
        const handleDrop = (event: DragEvent) => {
          const items = Array.from(event.dataTransfer?.items || []);
          if (items.some(item => item.type.startsWith('image/'))) {
            event.preventDefault();
            event.stopPropagation();
            console.log('Image drop prevented due to template restrictions');
          }
        };
        const handleDragOver = (event: DragEvent) => {
          const items = Array.from(event.dataTransfer?.items || []);
          if (items.some(item => item.type.startsWith('image/'))) {
            event.preventDefault();
          }
        };
        dropHandlerRef.current = handleDrop;
        dragOverHandlerRef.current = handleDragOver;
        editorElement.addEventListener('drop', handleDrop);
        editorElement.addEventListener('dragover', handleDragOver);
      }

      // Set initial content if provided
      const initialValue = resolveHtmlValue(value);
      if (initialValue && initialValue.trim() !== '') {
        console.log('Setting initial HTML content:', initialValue.substring(0, 100) + '...');
        quill.clipboard.dangerouslyPasteHTML(initialValue);
      }

      // Handle changes
      quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        console.log('Content changed, new length:', html.length);
        onChange(html);
      });

      setIsLoaded(true);
    };

    initQuill();

    // Cleanup
    return () => {
      if (quillRef.current) {
        const quill = quillRef.current;
        quill.off('text-change');

        if (dropHandlerRef.current) {
          quill.root.removeEventListener('drop', dropHandlerRef.current);
          dropHandlerRef.current = null;
        }
        if (dragOverHandlerRef.current) {
          quill.root.removeEventListener('dragover', dragOverHandlerRef.current);
          dragOverHandlerRef.current = null;
        }

        quillRef.current = null;
      }
    };
  }, [allowImages, onChange, placeholder, readOnly, resolveHtmlValue, value]);

  // Update content when value prop changes
  useEffect(() => {
    if (!quillRef.current || !isLoaded) return;

    const quill = quillRef.current;
    const currentHtml = quill.root.innerHTML;

    // Only update if content is different
    const normalizedValue = resolveHtmlValue(value);
    if (currentHtml !== normalizedValue) {
      console.log('Updating editor content:', normalizedValue ? normalizedValue.substring(0, 100) + '...' : 'empty');
      
      // Save selection
      const selection = quill.getSelection();
      
      // Update content
      if (normalizedValue && normalizedValue.trim() !== '') {
        quill.clipboard.dangerouslyPasteHTML(normalizedValue);
      } else {
        quill.setText('');
      }
      
      // Restore selection if possible
      if (selection) {
        quill.setSelection(selection);
      }
    }
  }, [value, isLoaded, resolveHtmlValue]);

  // Update read-only state
  useEffect(() => {
    if (quillRef.current && isLoaded) {
      quillRef.current.enable(!readOnly);
    }
  }, [readOnly, isLoaded]);

  return (
    <div className={`quill-wrapper relative ${className}`}>
      <div ref={editorRef} className="min-h-[200px]" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
          <div className="text-sm text-muted-foreground">Loading editor...</div>
        </div>
      )}
    </div>
  );
}
