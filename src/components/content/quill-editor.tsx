'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  allowImages = true
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const initQuill = async () => {
      // Check if Quill was already initialized in this element
      if (editorRef.current?.querySelector('.ql-toolbar')) {
        console.log('Quill already initialized, skipping');
        return;
      }

      // Dynamically import Quill to avoid SSR issues
      const Quill = (await import('quill')).default;
      
      console.log('Initializing Quill editor');
      
      // Initialize Quill
      const quill = new Quill(editorRef.current!, {
        theme: 'snow',
        placeholder,
        readOnly,
        modules: {
          toolbar: readOnly ? false : [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            allowImages ? ['link', 'image'] : ['link'],
          ]
        }
      });

      quillRef.current = quill;

      // Set initial content if provided
      if (value && value.trim() !== '') {
        console.log('Setting initial HTML content:', value.substring(0, 100) + '...');
        quill.clipboard.dangerouslyPasteHTML(value);
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
        quillRef.current.off('text-change');
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    if (!quillRef.current || !isLoaded) return;

    const quill = quillRef.current;
    const currentHtml = quill.root.innerHTML;

    // Only update if content is different
    if (currentHtml !== value) {
      console.log('Updating editor content:', value ? value.substring(0, 100) + '...' : 'empty');
      
      // Save selection
      const selection = quill.getSelection();
      
      // Update content
      if (value && value.trim() !== '') {
        quill.clipboard.dangerouslyPasteHTML(value);
      } else {
        quill.setText('');
      }
      
      // Restore selection if possible
      if (selection) {
        quill.setSelection(selection);
      }
    }
  }, [value, isLoaded]);

  // Update read-only state
  useEffect(() => {
    if (quillRef.current && isLoaded) {
      quillRef.current.enable(!readOnly);
    }
  }, [readOnly, isLoaded]);

  return (
    <div className={`quill-wrapper relative ${className}`}>
      <div 
        ref={editorRef}
        className="min-h-[150px]"
        style={{ backgroundColor: 'white' }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-md">
          <div className="text-sm text-muted-foreground">Loading editor...</div>
        </div>
      )}
    </div>
  );
}