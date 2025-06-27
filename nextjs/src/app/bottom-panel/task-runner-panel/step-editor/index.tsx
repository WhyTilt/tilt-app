'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '../index';

interface StepEditorProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, steps: string[], label?: string) => Promise<void>;
  onCreate?: (instructions: string[], label?: string) => Promise<void>;
}

export function StepEditor({ task, isOpen, onClose, onSave, onCreate }: StepEditorProps) {
  const [instructions, setInstructions] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const isCreating = !task;

  useEffect(() => {
    if (task) {
      // Editing existing task
      if (task.instructions && Array.isArray(task.instructions) && task.instructions.length > 0) {
        setInstructions(task.instructions.join('\n'));
      } else {
        setInstructions('');
      }
      setLabel(task.label || '');
    } else {
      // Creating new task
      setInstructions('');
      setLabel('');
    }
  }, [task]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const steps = instructions.split('\n').filter(step => step.trim());
      if (steps.length === 0) {
        alert('Please add at least one instruction step.');
        return;
      }
      
      if (isCreating) {
        // Creating new task
        if (!onCreate) {
          throw new Error('onCreate function not provided');
        }
        await onCreate(steps, label.trim() || undefined);
      } else {
        // Editing existing task
        if (!task) return;
        await onSave(task.id, steps, label.trim() || undefined);
      }
      
      setInstructions('');
      setLabel('');
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[80] bg-zinc-900 flex flex-col p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 z-10"
        title="Close (Esc)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Label field */}
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Task label (optional)"
        className="w-full p-3 mb-4 bg-transparent border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 placeholder-gray-500"
      />

      {/* Instructions textarea */}
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Enter task instructions, one per line..."
        className="flex-1 w-full p-4 bg-transparent border border-zinc-600 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 placeholder-gray-500"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
      />

      {/* Save button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}