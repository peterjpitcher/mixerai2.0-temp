'use client';

import React from 'react';
import dynamic from 'next/dynamic';
// Quill CSS is now imported globally in globals.css
// import 'react-quill/dist/quill.core.css';   
// import 'react-quill/dist/quill.snow.css';   

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
  clipboard: {
    // toggle to add extra line breaks when pasting HTML:
    matchVisual: false,
  }
};

const defaultFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
  'list', 'bullet',
  'link', 'image',
  'color', 'background', 'align',
  'script',
  'clean'
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
  return (
    <div className={className}>
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={editorClassName}
      />
    </div>
  );
} 