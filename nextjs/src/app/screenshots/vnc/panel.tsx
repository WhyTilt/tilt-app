import React from 'react';

interface VncPanelProps {
  className?: string;
}

export function VncPanel({ className = '' }: VncPanelProps) {
  // noVNC runs on port 6080 based on the startup script
  const vncUrl = `${window.location.protocol}//${window.location.hostname}:6080/vnc.html?autoconnect=true&resize=scale`;

  return (
    <div className={`h-full w-full ${className}`}>
      <iframe
        src={vncUrl}
        className="w-full h-full border-0"
        title="VNC Viewer"
        allow="fullscreen"
      />
    </div>
  );
}