'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bug, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingIssueButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  isEnabled?: boolean;
  zIndex?: number;
  onOpen: () => void;
  isLoading?: boolean;
}

export function FloatingIssueButton({
  position = 'bottom-right',
  isEnabled = true,
  zIndex = 9999,
  onOpen,
  isLoading = false,
}: FloatingIssueButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return;
      
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      
      const newX = buttonStartPos.current.x + deltaX;
      const newY = buttonStartPos.current.y + deltaY;
      
      // Keep button within viewport
      const maxX = window.innerWidth - buttonRef.current.offsetWidth;
      const maxY = window.innerHeight - buttonRef.current.offsetHeight;
      
      setDragPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    buttonStartPos.current = { x: rect.left, y: rect.top };
    
    setIsDragging(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger if not dragging and not loading
    if (!isLoading &&
        Math.abs(e.clientX - dragStartPos.current.x) < 5 && 
        Math.abs(e.clientY - dragStartPos.current.y) < 5) {
      onOpen();
    }
  };

  if (!isEnabled) return null;

  const defaultPositions = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'top-left': { top: 24, left: 24 },
  };

  const style: React.CSSProperties = dragPosition
    ? {
        position: 'fixed',
        left: `${dragPosition.x}px`,
        top: `${dragPosition.y}px`,
        zIndex,
      }
    : {
        position: 'fixed',
        ...defaultPositions[position],
        zIndex,
      };

  return (
    <button
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        'group flex h-14 w-14 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'hover:shadow-xl hover:scale-105 active:scale-95',
        'transition-all duration-200',
        isDragging && 'cursor-grabbing scale-110',
        !isDragging && 'cursor-pointer'
      )}
      style={style}
      title="Report an issue"
      aria-label="Report an issue"
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Bug className="h-6 w-6" />
      )}
      <span className="sr-only">Report an issue</span>
    </button>
  );
}