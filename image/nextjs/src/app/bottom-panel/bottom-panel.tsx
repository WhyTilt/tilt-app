import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { BottomPanelHeader } from './bottom-panel-header';

interface BottomPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  defaultCollapsed?: boolean;
}

interface BottomPanelRef {
  maximize: () => void;
  minimize: () => void;
  toggle: () => void;
}

export const BottomPanel = forwardRef<BottomPanelRef, BottomPanelProps>(
  ({ children, title, className = '', defaultCollapsed = false }, ref) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const maximize = () => {
    setIsCollapsed(false);
  };

  const minimize = () => {
    setIsCollapsed(true);
  };

  useImperativeHandle(ref, () => ({
    maximize,
    minimize,
    toggle: toggleCollapse,
  }));

  return (
    <div 
      className={`border border-gray-600 rounded-t-md flex flex-col relative transition-transform duration-300 ease-in-out h-full ${className}`} 
      style={{ 
        backgroundColor: 'var(--panel-bg)',
        transform: isCollapsed ? 'translateY(calc(100% - 42px))' : 'translateY(0)'
      }}
    >
      {title && (
        <BottomPanelHeader 
          title={title} 
          isCollapsed={isCollapsed}
          onToggle={toggleCollapse}
        />
      )}
      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'h-0 opacity-0' : 'flex-1 opacity-100 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
});