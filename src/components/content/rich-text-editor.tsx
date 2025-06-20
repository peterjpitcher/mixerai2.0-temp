'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues and ensure proper initialization
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-40 bg-muted animate-pulse rounded-md" />
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  modules?: Record<string, unknown>;
  formats?: string[];
}

const defaultModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image']
  ],
  clipboard: {
    // toggle to add extra line breaks when pasting HTML:
    matchVisual: false,
  }
};

const defaultFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
  'list', 'indent',
  'link', 'image',
  'color', 'background', 'align',
  'script'
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  modules = defaultModules,
  formats = defaultFormats
}: RichTextEditorProps) {
  // Ensure value is a string (fallback to empty string if null/undefined)
  const safeValue = value || '';
  
  return (
    <div className={className}>
      <ReactQuill 
        theme="snow"
        value={safeValue}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={editorClassName}
      />
    </div>
  );
} 