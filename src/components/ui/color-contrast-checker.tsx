"use client";

import React, { useState } from 'react';
import { validateColorContrast } from '@/lib/utils/color-contrast';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorContrastCheckerProps {
  foreground: string;
  background: string;
  className?: string;
}

export function ColorContrastChecker({ 
  foreground, 
  background, 
  className 
}: ColorContrastCheckerProps) {
  const validation = validateColorContrast(foreground, background);
  
  if (!validation) {
    return null;
  }
  
  const getStatusIcon = () => {
    if (validation.meetsAA) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (validation.meetsLargeTextAA) {
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };
  
  const getStatusColor = () => {
    if (validation.meetsAA) {
      return 'text-green-600';
    } else if (validation.meetsLargeTextAA) {
      return 'text-amber-600';
    } else {
      return 'text-red-600';
    }
  };
  
  return (
    <div className={cn("text-sm space-y-1", className)}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={cn("font-medium", getStatusColor())}>
          Contrast Ratio: {validation.ratio}:1
        </span>
      </div>
      
      <div className="pl-6 space-y-1 text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className={validation.meetsAA ? 'text-green-600' : 'text-muted-foreground'}>
            {validation.meetsAA ? '✓' : '✗'} WCAG AA (4.5:1)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={validation.meetsAAA ? 'text-green-600' : 'text-muted-foreground'}>
            {validation.meetsAAA ? '✓' : '✗'} WCAG AAA (7:1)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={validation.meetsLargeTextAA ? 'text-green-600' : 'text-muted-foreground'}>
            {validation.meetsLargeTextAA ? '✓' : '✗'} Large Text AA (3:1)
          </span>
        </div>
      </div>
      
      {validation.recommendation && (
        <div className="pl-6 flex items-start gap-2 mt-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <span className="text-xs text-muted-foreground">
            {validation.recommendation}
          </span>
        </div>
      )}
    </div>
  );
}

// Development-only component to check color contrast
export function DevColorContrastChecker() {
  const [isOpen, setIsOpen] = useState(false);
  const [foreground, setForeground] = useState('#000000');
  const [background, setBackground] = useState('#FFFFFF');
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Color Contrast Checker</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Foreground Color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={foreground}
                  onChange={(e) => setForeground(e.target.value)}
                  className="h-9 w-16"
                />
                <input
                  type="text"
                  value={foreground}
                  onChange={(e) => setForeground(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border rounded"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Background Color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-9 w-16"
                />
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border rounded"
                />
              </div>
            </div>
            
            <div className="border-t pt-3 mt-3">
              <ColorContrastChecker
                foreground={foreground}
                background={background}
              />
            </div>
            
            <div className="flex gap-4 p-3 rounded border mt-3">
              <div
                className="flex-1 p-4 rounded text-center font-medium"
                style={{ backgroundColor: background, color: foreground }}
              >
                Sample Text
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-card border rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
          title="Open Color Contrast Checker"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20" />
            <path d="M2 12h10" strokeDasharray="3 3" />
            <path d="M12 12h10" />
          </svg>
        </button>
      )}
    </div>
  );
}