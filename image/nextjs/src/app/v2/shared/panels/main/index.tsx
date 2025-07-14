'use client';

import React from 'react';

interface MainPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function MainPanel({ children, className = '' }: MainPanelProps) {
  return (
    <div className={`
      h-full
      bg-zinc-900/80 backdrop-blur-sm
      border border-zinc-800 rounded-lg
      overflow-auto
      ${className}
    `}>
      {children}
    </div>
  );
}