'use client';

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Test {
  id: string;
  name: string;
  tags: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
}

interface TaskEditorPanelProps {
  test: Test | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Test) => void;
}

export function TaskEditorPanel({ test, isOpen, onClose, onSave }: TaskEditorPanelProps) {
  const [name, setName] = useState('');
  const [stepsText, setStepsText] = useState('');

  useEffect(() => {
    if (test) {
      setName(test.name || '');
      setStepsText(test.steps?.join('\n') || '');
    }
  }, [test]);

  const handleSave = async () => {
    if (!test) return;

    const steps = stepsText.split('\n').filter(step => step.trim() !== '');
    const updatedTest = {
      ...test,
      name,
      steps
    };

    try {
      const response = await fetch(`/api/v2/tests/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTest),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      const savedTest = await response.json();
      onSave(savedTest);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  if (!isOpen || !test) return null;

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-medium text-lg">Edit Test</h2>
            <span className="text-gray-400 text-sm">({name || 'New Test'})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color-hover)] transition-colors"
            >
              <Save size={16} />
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Test Name */}
            <div>
              <label className="block text-white font-medium mb-2">Test Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                placeholder="Enter test name..."
              />
            </div>

            {/* Test Steps */}
            <div>
              <label className="block text-white font-medium mb-2">Test Steps</label>
              <p className="text-gray-400 text-sm mb-3">
                Enter each step on a new line. Empty lines will be ignored.
              </p>
              <textarea
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                onBlur={handleSave}
                className="w-full h-96 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none resize-none font-mono text-sm"
                placeholder="Enter test steps, one per line..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}