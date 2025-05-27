import React from 'react';

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
  return asChild ? <>{children}</> : <div>{children}</div>;
};

export const DropdownMenuContent = ({ children, align }: { children: React.ReactNode; align?: string }) => {
  const alignmentStyle: React.CSSProperties = align === 'end' ? { textAlign: 'right' } : {};
  return <div style={alignmentStyle}>{children}</div>;
};

export const DropdownMenuItem = ({ children, asChild, onClick, className }: { children: React.ReactNode; asChild?: boolean; onClick?: () => void; className?: string }) => {
  return asChild ? <>{children}</> : <div onClick={onClick} className={className}>{children}</div>;
};

export default DropdownMenu; 