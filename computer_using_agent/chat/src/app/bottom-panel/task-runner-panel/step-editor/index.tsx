'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '../index';

interface StepEditorProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, steps: string[]) => Promise<void>;
}

export function StepEditor({ task, isOpen, onClose, onSave }: StepEditorProps) {
  const [instructions, setInstructions] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      if (task.instructions && Array.isArray(task.instructions) && task.instructions.length > 0) {
        setInstructions(task.instructions.join('\n'));
      } else {
        setInstructions('');
      }
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    
    setIsSaving(true);
    try {
      const steps = instructions.split('\n').filter(step => step.trim());
      await onSave(task.id, steps);
      onClose();
    } catch (error) {
      console.error('Failed to save steps:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div 
      className="fixed inset-0 z-[80] bg-zinc-900 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-600 bg-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-white">Step Editor</h2>
          <p className="text-sm text-gray-400 mt-1">Task ID: {task.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Task Instructions</h3>
            <p className="text-gray-400 text-sm">
              Enter each instruction on a new line. Each line will be executed as a separate step by the AI agent.
            </p>
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter task instructions, one per line..."
            className="w-full h-96 p-4 bg-transparent border border-zinc-600 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 placeholder-gray-500"
            style={{ 
              background: 'transparent',
              boxShadow: 'none'
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-600 bg-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="text-sm text-gray-400">
            {instructions.split('\n').filter(line => line.trim()).length} step{instructions.split('\n').filter(line => line.trim()).length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}