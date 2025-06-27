'use client';

import React, { useState, useEffect } from 'react';

interface Variable {
  name: string;
  value: string;
}

interface VariableInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (variables: Record<string, string>) => void;
  variables: string[];
  taskTitle: string;
  isRunningAll?: boolean;
}

export function VariableInputModal({ 
  isOpen, 
  onClose, 
  onStart, 
  variables, 
  taskTitle,
  isRunningAll = false 
}: VariableInputModalProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize variables with empty values
      const initialValues: Record<string, string> = {};
      variables.forEach(variable => {
        initialValues[variable] = '';
      });
      setVariableValues(initialValues);
    }
  }, [isOpen, variables]);

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const handleStart = () => {
    // Validate all variables have values
    const missingVariables = variables.filter(variable => !variableValues[variable]?.trim());
    if (missingVariables.length > 0) {
      alert(`Please fill in all variables: ${missingVariables.join(', ')}`);
      return;
    }
    
    onStart(variableValues);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleStart();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isRunningAll ? 'Configure Variables for All Tasks' : `Configure Variables`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!isRunningAll && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Task: {taskTitle}</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              {isRunningAll 
                ? 'These variables will be used across all tasks that reference them:'
                : 'Please provide values for the following variables:'
              }
            </p>
            
            <div className="space-y-4">
              {variables.map((variable) => (
                <div key={variable}>
                  <label htmlFor={variable} className="block text-sm font-medium text-gray-700 mb-1">
                    {variable}
                  </label>
                  <input
                    id={variable}
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter value for ${variable}`}
                    autoComplete="off"
                  />
                  {variable === 'URL' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Example: http://172.17.0.1:3000
                    </p>
                  )}
                  {variable === 'MONGODB_URI' && (
                    <p className="text-xs text-gray-500 mt-1">
                      MongoDB connection string with credentials
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Start Agent
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Press Ctrl+Enter to start, or Esc to cancel
          </div>
        </div>
      </div>
    </div>
  );
}