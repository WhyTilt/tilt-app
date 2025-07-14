'use client';

import React, { useState, useRef } from 'react';

interface SidePanelProps {
  children: React.ReactNode;
  className?: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function SidePanel({ 
  children, 
  className = '', 
  initialWidth = 384, // 24rem (w-96)
  minWidth = 240,     // 15rem 
  maxWidth = 600      // 37.5rem
}: SidePanelProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={panelRef}
      className={`
        h-full
        bg-zinc-900/80 backdrop-blur-sm
        border border-zinc-800 rounded-lg
        overflow-y-auto
        relative
        ${className}
      `}
      style={{ width: `${width}px` }}
    >
      <div className="h-full">
        {children}
      </div>
      
      {/* Resize Handle */}
      <div
        className={`
          absolute top-0 right-0 w-1 h-full cursor-col-resize
          hover:bg-[var(--accent-color)] transition-colors
          ${isResizing ? 'bg-[var(--accent-color)]' : 'bg-transparent'}
        `}
        onMouseDown={handleMouseDown}
        title="Resize panel"
      />
    </div>
  );
}