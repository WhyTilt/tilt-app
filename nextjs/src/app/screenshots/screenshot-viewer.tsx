import React from 'react';
import { CurrentScreenshot } from './current-screenshot';
import { PreviousScreenshot } from './previous-screenshot';
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
      <ScreenshotBackground screenshot={currentScreenshot} />
      
      <div className="absolute inset-0 flex items-center justify-center p-0">
        {viewMode === 'single' ? (
          // Single screenshot mode - only show current screenshot, centered
          <CurrentScreenshot screenshot={currentScreenshot} viewMode={viewMode} />
        ) : (
          // Dual screenshot mode - show previous and current side by side
          <div className="flex gap-1 items-center justify-center">
            {previousScreenshot ? (
              <PreviousScreenshot screenshot={previousScreenshot} />
            ) : (
              // Placeholder div to maintain layout when no previous screenshot
              <div 
                className="flex-shrink-0"
                style={{ 
                  width: '39.93vw',
                  height: '39.93vh'
                }}
              />
            )}
            <CurrentScreenshot screenshot={currentScreenshot} viewMode={viewMode} />
          </div>
        )}
      </div>
    </div>
  );
}