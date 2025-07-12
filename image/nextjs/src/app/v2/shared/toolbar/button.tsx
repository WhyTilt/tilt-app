'use client';

import React from 'react';

interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  isActive?: boolean;
}

export function ToolbarButton({ 
  children, 
  onClick, 
  className = '', 
  title,
  disabled = false,
  isActive = false
}: ToolbarButtonProps) {
  const isTiltLogo = className.includes('tilt-logo-button');
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        relative overflow-hidden
        w-12 h-12
        flex items-center justify-center
        ${isTiltLogo 
          ? 'bg-transparent border-transparent text-white' 
          : isActive 
            ? 'bg-zinc-700 border-zinc-700 text-white' 
            : 'bg-transparent border-zinc-600 hover:bg-zinc-700 hover:border-zinc-700 text-white'
        }
        border
        rounded-lg
        ${isTiltLogo ? '' : 'transition-all duration-200'}
        active:bg-zinc-800/70
        disabled:opacity-50
        disabled:cursor-not-allowed
        group
        ${className}
      `}
      style={{
        boxShadow: isActive ? `
          inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3),
          0 2px 8px rgba(0, 0, 0, 0.2)
        ` : 'none',
      }}
    >
      {children}
      
      {/* Glass reflection effect on hover - disabled for tilt logo */}
      {!isTiltLogo && (
        <div 
          className="
            absolute inset-0 
            bg-gradient-to-br from-white/10 via-transparent to-transparent
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
          "
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(255, 255, 255, 0.15) 0%, 
                rgba(255, 255, 255, 0.05) 50%, 
                transparent 100%
              )
            `,
          }}
        />
      )}
      
      {/* Subtle inner glow on hover - disabled for tilt logo */}
      {!isTiltLogo && (
        <div 
          className="
            absolute inset-0 
            rounded-lg
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
          "
          style={{
            boxShadow: 'inset 0 0 8px rgba(255, 255, 255, 0.1)',
          }}
        />
      )}
    </button>
  );
}