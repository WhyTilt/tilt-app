import React from 'react';
import { DraggableScreenshotViewer } from './draggable-screenshot-viewer';
import { ScreenshotBackground } from './screenshot-background';

interface ScreenshotViewerProps {
  currentScreenshot: string;
  previousScreenshot?: string | null;
  viewMode?: 'single' | 'dual';
}

export function ScreenshotViewer({ currentScreenshot, previousScreenshot, viewMode = 'dual' }: ScreenshotViewerProps) {
  if (!currentScreenshot) return null;

  return (
    <div className="h-full relative overflow-hidden">
      {/* Keep the blurred background */}
      <ScreenshotBackground screenshot={currentScreenshot} />
      
      {/* Single draggable screenshot viewer */}
      <DraggableScreenshotViewer screenshot={currentScreenshot} />
    </div>
  );
}