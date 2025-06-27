import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { usePanelPreferences, PanelState } from '../panel-preferences/context';

interface FloatingPanelProps {
  children: React.ReactNode;
  title: string;
  panelName: 'thinking' | 'actions' | 'inspector';
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  defaultVisible?: boolean;
  className?: string;
}

interface FloatingPanelRef {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  maximize: () => void;
  minimize: () => void;
}

export const FloatingPanel = forwardRef<FloatingPanelRef, FloatingPanelProps>(
  ({ 
    children, 
    title, 
    panelName,
    defaultPosition = { x: 20, y: 20 },
    defaultSize = { width: 400, height: 300 },
    defaultVisible = false,
    className = ''
  }, ref) => {
    const { preferences, updatePanelState, isLoading } = usePanelPreferences();
    const panelState = preferences[panelName];
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartHeight, setResizeStartHeight] = useState(0);
    const [resizeStartY, setResizeStartY] = useState(0);
    
    // Use persisted state or fallback to defaults
    const isVisible = panelState?.visible ?? defaultVisible;
    const isMaximized = panelState?.isMaximized ?? false;
    const isLocked = panelState?.isLocked ?? false;
    const position = panelState?.position ?? defaultPosition;
    const size = panelState?.size ?? defaultSize;

    const show = () => updatePanelState(panelName, { visible: true });
    const hide = () => updatePanelState(panelName, { visible: false });
    const toggle = () => updatePanelState(panelName, { visible: !isVisible });
    
    const maximize = () => {
      updatePanelState(panelName, { isMaximized: true, visible: true });
    };
    
    const minimize = () => {
      updatePanelState(panelName, { isMaximized: false });
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
      toggle,
      maximize,
      minimize,
    }));

    const handleMouseDown = (e: React.MouseEvent) => {
      if (isLocked) return;
      
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isLocked) return;
      
      // Calculate desired position
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Header height (approximate - the draggable area)
      const headerHeight = 40;
      
      // Edge detection - keep header visible
      // Left edge: don't let panel go completely off screen (keep some header visible)
      newX = Math.max(-size.width + 100, newX); // Keep at least 100px of header visible on left
      
      // Right edge: don't let panel header go off right side
      newX = Math.min(viewportWidth - 100, newX); // Keep at least 100px of header visible on right
      
      // Top edge: don't let panel header go above viewport
      newY = Math.max(0, newY);
      
      // Bottom edge: don't let panel header go below viewport
      newY = Math.min(viewportHeight - headerHeight, newY);
      
      const newPosition = { x: newX, y: newY };
      updatePanelState(panelName, { position: newPosition });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent dragging when resizing
      setIsResizing(true);
      setResizeStartHeight(size.height);
      setResizeStartY(e.clientY);
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - resizeStartY;
      const newHeight = Math.max(150, resizeStartHeight + deltaY); // Minimum height of 150px
      
      updatePanelState(panelName, { 
        size: { 
          ...size, 
          height: newHeight 
        } 
      });
    };

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, dragOffset]);

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleResizeMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isResizing, resizeStartHeight, resizeStartY]);

    if (!isVisible) return null;

    const panelStyle = isMaximized
      ? {
          position: 'fixed' as const,
          left: position.x,
          top: 60, // Expand to near top (leaving space for title bar)
          bottom: 20, // Expand to near bottom  
          width: size.width,
          zIndex: isDragging ? 60 : 50, // Higher z-index when dragging
        }
      : {
          position: 'fixed' as const,
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: isDragging ? 60 : 40, // Higher z-index when dragging
        };

    return (
      <div 
        className={`bg-zinc-900 border border-zinc-600 rounded-lg shadow-2xl flex flex-col ${className}`}
        style={panelStyle}
      >
        {/* Header */}
        <div 
          className={`flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-lg border-b border-zinc-600 ${isLocked ? 'cursor-default' : 'cursor-move'}`}
          onMouseDown={handleMouseDown}
        >
          <div className="text-white text-sm font-medium">{title}</div>
          <div className="flex items-center space-x-2">
            {/* Lock/Unlock Button */}
            <button
              onClick={() => updatePanelState(panelName, { isLocked: !isLocked })}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-zinc-700 rounded"
              title={isLocked ? "Unlock (enable dragging)" : "Lock (disable dragging)"}
            >
              {isLocked ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 10a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8zM8 8V6a4 4 0 118 0 2 2 0 11-4 0v2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            {/* Maximize/Restore Button */}
            <button
              onClick={() => updatePanelState(panelName, { isMaximized: !isMaximized })}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-zinc-700 rounded"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8l4-4 4 4m0 8l-4 4-4-4" />
                </svg>
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={hide}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-zinc-700 rounded"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Resize Handle - Bottom Edge */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-zinc-600/50 transition-colors group"
            title="Drag to resize height"
          >
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-600/30 group-hover:bg-zinc-500/60 transition-colors" />
          </div>
        )}
      </div>
    );
  }
);

FloatingPanel.displayName = 'FloatingPanel';