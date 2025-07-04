import React from 'react';

interface CurrentScreenshotProps {
  screenshot: string;
  viewMode?: 'single' | 'dual';
}

export function CurrentScreenshot({ screenshot, viewMode = 'dual' }: CurrentScreenshotProps) {
  if (!screenshot) return null;

  const imageUrl = `data:image/png;base64,${screenshot}`;

  return (
    <img
      src={imageUrl}
      alt=""
      className="max-w-none border-2 border-blue-600"
      style={ viewMode === 'single' ? {
        height: '100%',
        maxWidth: '100%',
        objectFit: 'contain'
      } : { 
        width: 'auto',
        height: 'auto',
        maxWidth: '58.9875vw',
        maxHeight: '58.9875vh'
      }}
    />
  );
}