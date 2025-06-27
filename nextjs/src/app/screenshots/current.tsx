import React from 'react';

interface CurrentScreenshotProps {
  screenshot: string;
  index: number;
  previousScreenshot?: string | null;
}

export function CurrentScreenshot({ screenshot, index, previousScreenshot }: CurrentScreenshotProps) {
  if (!screenshot) return null;

  const imageUrl = `data:image/png;base64,${screenshot}`;

  return (
    <img
      src={imageUrl}
      alt=""
      className="max-w-none"
      style={{ 
        width: '48.75vw',
        height: '48.75vh',
        objectFit: 'contain'
      }}
    />
  );
}