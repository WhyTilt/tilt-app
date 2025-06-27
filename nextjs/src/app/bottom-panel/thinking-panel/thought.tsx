import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ThoughtProps {
  content: string;
  timestamp?: string;
}

export function Thought({ content, timestamp }: ThoughtProps) {
  return (
    <div className="mb-6">
      <div className="text-white px-5 py-4 rounded-lg bg-zinc-800/30 border border-zinc-700/40">
        <div className="text-sm leading-7 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown 
            components={{
              p: ({ children }) => <p className="mb-3 text-gray-200 leading-7">{children}</p>,
              ul: ({ children }) => <ul className="my-3 space-y-1 text-gray-200">{children}</ul>,
              ol: ({ children }) => <ol className="my-3 space-y-1 text-gray-200">{children}</ol>,
              li: ({ children }) => <li className="ml-4 text-gray-200 leading-6">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-100">{children}</em>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 bg-zinc-700/60 text-green-300 rounded text-xs font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-zinc-900/60 border border-zinc-600 rounded-md p-3 my-3 overflow-x-auto">
                  {children}
                </pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {timestamp && (
          <div className="text-xs text-gray-400/80 mt-3 pt-2 border-t border-zinc-700/30">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}