import React from 'react';

export const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div style={{ overflowY: 'auto', maxHeight: '200px' }} className={className}>
      {children}
    </div>
  );
};

export default ScrollArea; 