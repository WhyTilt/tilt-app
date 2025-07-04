import React from 'react';

interface PreviousScreenshotProps {
  screenshot: string;
}

export function PreviousScreenshot({ screenshot }: PreviousScreenshotProps) {
  if (!screenshot) return null;

  const imageUrl = `data:image/png;base64,${screenshot}`;

  return (
    <img
      src={imageUrl}
      alt=""
      className="max-w-none"
      style={{ 
        width: '39.93vw',
        height: '39.93vh',
        objectFit: 'contain'
      }}
    />
  );
}