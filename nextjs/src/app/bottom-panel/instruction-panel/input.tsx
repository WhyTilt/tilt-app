import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Type your message...",
  disabled = false,
  isLoading = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const maxHeight = 200; // Match the maxHeight in style
      
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      if (scrollHeight <= maxHeight) {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex-shrink-0 px-4 py-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? "" : placeholder}
        disabled={disabled || isLoading}
        className={`w-full px-0 py-0 resize-none border-none outline-none focus:ring-0 text-sm text-white placeholder-gray-400 ${
          disabled || isLoading ? 'cursor-not-allowed' : ''
        }`}
        style={{
          backgroundColor: 'transparent',
          caretColor: '#f97316', // orange-500
          minHeight: '24px', // Minimum height for single line
          maxHeight: '120px', // Reduced max height to fit better in panels
          lineHeight: '1.5'
        }}
      />
    </div>
  );
}