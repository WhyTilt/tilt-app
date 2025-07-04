import React from 'react';

interface PanelBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelBody({ children, className = '' }: PanelBodyProps) {
  return (
    <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 p-4 min-h-0 max-h-full ${className}`}>
      {children}
    </div>
  );
}