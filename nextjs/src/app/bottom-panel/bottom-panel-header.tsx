import React from 'react';

interface BottomPanelHeaderProps {
  title: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function BottomPanelHeader({ title, isCollapsed = false, onToggle }: BottomPanelHeaderProps) {
  return (
    <div className="px-4 py-2 flex-shrink-0 flex items-center justify-between">
      <div className="text-white text-sm font-bold">
        {title}
      </div>
      {onToggle && (
        <button
          onClick={onToggle}
          className="text-white hover:text-gray-300 p-1 transition-colors"
          aria-label={isCollapsed ? "Maximize panel" : "Minimize panel"}
        >
          {isCollapsed ? (
            // Maximize icon (square)
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          ) : (
            // Minimize icon (line)
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="7" width="12" height="2" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}