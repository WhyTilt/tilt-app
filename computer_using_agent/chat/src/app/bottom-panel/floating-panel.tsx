import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface FloatingPanelProps {
  children: React.ReactNode;
  title: string;
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
    defaultPosition = { x: 20, y: 20 },
    defaultSize = { width: 400, height: 300 },
    defaultVisible = false,
    className = ''
  }, ref) => {
    const [isVisible, setIsVisible] = useState(defaultVisible);
    
    // Sync with prop changes
    React.useEffect(() => {
      setIsVisible(defaultVisible);
    }, [defaultVisible]);
    const [isMaximized, setIsMaximized] = useState(false);
    const [position, setPosition] = useState(defaultPosition);
    const [size, setSize] = useState(defaultSize);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const show = () => setIsVisible(true);
    const hide = () => setIsVisible(false);
    const toggle = () => setIsVisible(!isVisible);
    
    const maximize = () => {
      setIsMaximized(true);
      show();
    };
    
    const minimize = () => {
      setIsMaximized(false);
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
      toggle,
      maximize,
      minimize,
    }));

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
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

    if (!isVisible) return null;

    const panelStyle = isMaximized
      ? {
          position: 'fixed' as const,
          left: position.x,
          top: 60, // Expand to near top (leaving space for title bar)
          bottom: 20, // Expand to near bottom  
          width: size.width,
          zIndex: 50,
        }
      : {
          position: 'fixed' as const,
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 40,
        };

    return (
      <div 
        className={`bg-zinc-900 border border-zinc-600 rounded-lg shadow-2xl flex flex-col ${className}`}
        style={panelStyle}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-lg border-b border-zinc-600 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="text-white text-sm font-medium">{title}</div>
          <div className="flex items-center space-x-2">
            {/* Maximize/Restore Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
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
      </div>
    );
  }
);

FloatingPanel.displayName = 'FloatingPanel';