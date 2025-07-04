import React from 'react';

interface InstructionProps {
  content: string;
}

export function Instruction({ content }: InstructionProps) {
  return (
    <div className="flex space-x-3 py-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
      
      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="bg-gray-600 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-100">
            <pre className="whitespace-pre-wrap font-sans">{content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}