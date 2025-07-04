import React, { useState, useEffect } from 'react';
import { ScreenshotViewer } from './screenshot-viewer';
import { ScreenshotLoading } from './screenshot-loading';

interface ScreenshotsPanelProps {
  screenshots: string[];
  selectedIndex: number;
  onSelectScreenshot: (index: number) => void;
  viewMode?: 'single' | 'dual';
  isAgentStarting?: boolean;
}

export function ScreenshotsPanel({ screenshots, selectedIndex, onSelectScreenshot, viewMode = 'dual', isAgentStarting = false }: ScreenshotsPanelProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right'>('right');

  if (screenshots.length === 0 || isAgentStarting) return <ScreenshotLoading />;

  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < screenshots.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious && !isAnimating) {
      setAnimationDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        onSelectScreenshot(selectedIndex - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleNext = () => {
    if (canGoNext && !isAnimating) {
      setAnimationDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        onSelectScreenshot(selectedIndex + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Main Screenshot Display with slide animation */}
      <div className={`h-full transition-transform duration-300 ease-in-out ${
        isAnimating 
          ? animationDirection === 'right' 
            ? '-translate-x-full' 
            : 'translate-x-full'
          : 'translate-x-0'
      }`}>
        <ScreenshotViewer 
          currentScreenshot={screenshots[selectedIndex]} 
          previousScreenshot={selectedIndex > 0 ? screenshots[selectedIndex - 1] : null}
          viewMode={viewMode}
        />
      </div>


      {/* Left Chevron */}
      {canGoPrevious && (
        <button
          onClick={handlePrevious}
          disabled={isAnimating}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right Chevron */}
      {canGoNext && (
        <button
          onClick={handleNext}
          disabled={isAnimating}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}