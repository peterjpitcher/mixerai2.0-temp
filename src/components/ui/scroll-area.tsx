import React from 'react';

export const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`overflow-y-auto max-h-[200px] ${className || ''}`}>
      {children}
    </div>
  );
};

export default ScrollArea; 