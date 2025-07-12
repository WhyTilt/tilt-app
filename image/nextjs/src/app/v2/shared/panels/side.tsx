'use client';

import React from 'react';

interface SidePanelProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export function SidePanel({ children, className = '', width = 'w-80' }: SidePanelProps) {
  return (
    <div className={`
      h-full
      ${width}
      bg-zinc-900/80 backdrop-blur-sm
      border border-zinc-800 rounded-lg
      overflow-y-auto
      ${className}
    `}>
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}