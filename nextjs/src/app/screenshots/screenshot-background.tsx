import React from 'react';

interface ScreenshotBackgroundProps {
  screenshot: string;
}

export function ScreenshotBackground({ screenshot }: ScreenshotBackgroundProps) {
  if (!screenshot) return null;

  const imageUrl = `data:image/png;base64,${screenshot}`;

  return (
    <div 
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url(${imageUrl})`,
        filter: 'blur(8px)',
      }}
    />
  );
}