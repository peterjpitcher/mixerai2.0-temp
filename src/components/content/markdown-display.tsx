'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/card';

interface MarkdownDisplayProps {
  markdown: string;
  className?: string;
}

export function MarkdownDisplay({ markdown, className = '' }: MarkdownDisplayProps) {
  // In a real app, this would use a markdown parser library like react-markdown
  // For this example, we'll do a very basic transformation
  const [formattedContent, setFormattedContent] = useState('');
  
  useEffect(() => {
    // Very basic markdown formatting
    let formatted = markdown;
    
    // Convert headers
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    
    // Convert bold and italic
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert lists
    formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
    
    // Convert paragraphs (simple)
    formatted = formatted.replace(/^(?!<[hl]).+$/gm, (match) => {
      if (match.trim() === '') return '';
      return `<p>${match}</p>`;
    });
    
    // Wrap lists
    const wrappedWithUl = formatted.replace(
      /(<li>.+<\/li>\n?)+/g,
      (match) => `<ul>${match}</ul>`
    );
    
    setFormattedContent(wrappedWithUl);
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