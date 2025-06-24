import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ThoughtProps {
  content: string;
  timestamp?: string;
}

export function Thought({ content, timestamp }: ThoughtProps) {
  return (
    <div className="mb-4">
      <div className="text-white px-4 py-3 rounded-lg">
        <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {timestamp && (
          <div className="text-xs text-gray-300/70 mt-2">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}