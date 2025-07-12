'use client';

import React from 'react';

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div className={`
      h-full z-50 
      w-16
      flex flex-col items-center gap-2 p-2
      bg-zinc-900/80 backdrop-blur-sm
      border border-zinc-800/50 rounded-lg
      shadow-lg
      ${className}
    `}
    style={{
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 0 rgba(0, 0, 0, 0.2),
        0 4px 16px rgba(0, 0, 0, 0.4)
      `,
    }}
    >
      {children}
    </div>
  );
}