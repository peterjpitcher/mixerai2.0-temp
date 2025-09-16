'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DOMPurify from 'dompurify';

interface MarkdownDisplayProps {
  markdown: string;
  className?: string;
}

export function MarkdownDisplay({ markdown, className = '' }: MarkdownDisplayProps) {
  const [formattedContent, setFormattedContent] = useState('');

  useEffect(() => {
    if (!markdown) {
      setFormattedContent('');
      return;
    }

    const looksLikeHtml = /<\s*\w+[^>]*>/.test(markdown);

    if (looksLikeHtml) {
      // Treat as HTML; sanitize and render directly
      const sanitized = DOMPurify.sanitize(markdown, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br']
      });
      setFormattedContent(sanitized);
      return;
    }

    // Fallback: very basic markdown to HTML conversion, then sanitize
    let formatted = markdown;
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(?!<[hl]).+$/gm, (match) => {
      if (match.trim() === '') return '';
      return `<p>${match}</p>`;
    });
    const wrappedWithUl = formatted.replace(/(<li>.+<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
    const sanitized = DOMPurify.sanitize(wrappedWithUl, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br']
    });
    setFormattedContent(sanitized);
  }, [markdown]);
  
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div 
          className="prose max-w-none dark:prose-invert" 
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </CardContent>
    </Card>
  );
} 
