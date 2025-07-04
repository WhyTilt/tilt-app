import React, { useState, useRef, useEffect } from 'react';

interface DraggableScreenshotViewerProps {
  screenshot: string;
  className?: string;
}

export function DraggableScreenshotViewer({ screenshot, className = '' }: DraggableScreenshotViewerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 20 }); // Start position as percentage
  const [size, setSize] = useState({ width: 600, height: 400 }); // Default size in pixels
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  const viewerRef = useRef<HTMLDivElement>(null);

  if (!screenshot) return null;

  const imageUrl = `data:image/png;base64,${screenshot}`;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
      setIsDragging(true);
      const rect = viewerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging && !isResizing) return;

    if (isDragging) {
      // Convert to percentage-based positioning
      const newX = ((e.clientX - dragOffset.x) / window.innerWidth) * 100;
      const newY = ((e.clientY - dragOffset.y) / window.innerHeight) * 100;
      
      // Keep within viewport bounds
      const clampedX = Math.max(0, Math.min(100 - (size.width / window.innerWidth) * 100, newX));
      const clampedY = Math.max(0, Math.min(100 - (size.height / window.innerHeight) * 100, newY));
      
      setPosition({ x: clampedX, y: clampedY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Calculate new size with minimum constraints
      const minWidth = Math.max(200, window.innerWidth * 0.1); // 10% of viewport width
      const minHeight = Math.max(150, window.innerHeight * 0.2); // 20% of viewport height
      
      const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.height + deltaY);
      
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  return (
    <div
      ref={viewerRef}
      className={`fixed border-2 border-blue-600 rounded-lg overflow-hidden shadow-2xl cursor-move ${className}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: isDragging ? 60 : 50,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Screenshot Image */}
      <img
        src={imageUrl}
        alt="Current screenshot"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {/* Resize Handle - Bottom Right Corner */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-600/20 hover:bg-blue-600/40 transition-colors group"
        title="Drag to resize"
      >
        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-blue-600/60 group-hover:border-blue-500 transition-colors" />
      </div>
      
      {/* Right Edge Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize bg-transparent hover:bg-blue-600/20 transition-colors"
        title="Drag to resize width"
      />
      
      {/* Bottom Edge Resize Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-blue-600/20 transition-colors"
        title="Drag to resize height"
      />
    </div>
  );
}