'use client';

import React from 'react';

interface Task {
  id: string;
  instructions: string[] | null;
  status: 'pending' | 'running' | 'passed' | 'completed' | 'error' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_run?: string;
  result?: any;
  error?: string;
  tool_use?: {
    tool: string;
    arguments: string[];
  };
  execution_report?: {
    js_validation?: {
      expression: string;
      success: boolean;
      result?: any;
      error?: string;
    };
    final_result?: any;
    screenshots?: string[];
    actions_taken?: Array<{
      tool: string;
      action: string;
      details: string;
      timestamp: string;
    }>;
    tool_outputs?: Array<{
      tool: string;
      output: string;
      timestamp: string;
    }>;
  };
}

interface TaskExecutionReportModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskExecutionReportModal({ task, isOpen, onClose }: TaskExecutionReportModalProps) {
  if (!isOpen || !task) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900 bg-opacity-95">
      <div className="bg-zinc-900 border border-zinc-600 rounded-lg w-[90vw] max-w-4xl h-[100vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-600 bg-zinc-800">
          <h3 className="text-lg font-medium text-white">
            Task Execution Report
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-120px)]">
          {/* Task Info */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-white mb-2">Task Information</h4>
            <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
              <div><span className="text-zinc-400">ID:</span> <span className="text-white">{task.id}</span></div>
              <div><span className="text-zinc-400">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  task.status === 'passed' ? 'bg-green-600 text-white' :
                  task.status === 'failed' ? 'bg-red-600 text-white' :
                  task.status === 'error' ? 'bg-red-600 text-white' :
                  'bg-zinc-600 text-white'
                }`}>
                  {task.status.toUpperCase()}
                </span>
              </div>
              <div><span className="text-zinc-400">Instructions:</span> 
                <div className="text-white mt-2">
                  {task.instructions && Array.isArray(task.instructions) ? (
                    task.instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2 mb-2">
                        <span className="text-zinc-400 text-sm">{index + 1}.</span>
                        <span>{instruction}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-zinc-500">No instructions</span>
                  )}
                </div>
              </div>
              <div><span className="text-zinc-400">Created:</span> <span className="text-white">{formatDate(task.created_at)}</span></div>
              <div><span className="text-zinc-400">Last Run:</span> <span className="text-white">{formatDate(task.last_run)}</span></div>
              {task.tool_use && (
                <div><span className="text-zinc-400">Tool:</span> <span className="text-zinc-300">{task.tool_use.tool}</span></div>
              )}
            </div>
          </div>

          {/* JavaScript Validation */}
          {task.execution_report?.js_validation && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-2">JavaScript Validation</h4>
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    task.execution_report.js_validation.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={task.execution_report.js_validation.success ? 'text-green-400' : 'text-red-400'}>
                    {task.execution_report.js_validation.success ? 'Validation Passed' : 'Validation Failed'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div><span className="text-zinc-400">Expression:</span> <code className="text-zinc-300 bg-zinc-900 px-2 py-1 rounded text-sm">{task.execution_report.js_validation.expression}</code></div>
                  {task.execution_report.js_validation.result !== undefined && (
                    <div><span className="text-zinc-400">Result:</span> <code className="text-green-400 bg-zinc-900 px-2 py-1 rounded text-sm">{JSON.stringify(task.execution_report.js_validation.result)}</code></div>
                  )}
                  {task.execution_report.js_validation.error && (
                    <div><span className="text-zinc-400">Error:</span> <code className="text-red-400 bg-zinc-900 px-2 py-1 rounded text-sm">{task.execution_report.js_validation.error}</code></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions Taken */}
          {task.execution_report?.actions_taken && task.execution_report.actions_taken.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-2">Actions Taken ({task.execution_report.actions_taken.length})</h4>
              <div className="bg-zinc-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {task.execution_report.actions_taken.map((action, index) => (
                    <div key={index} className="border-l-2 border-zinc-500 pl-3">
                      <div className="text-sm text-white">{action.action}</div>
                      <div className="text-xs text-zinc-400">{action.details}</div>
                      <div className="text-xs text-zinc-500">{new Date(action.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tool Outputs */}
          {task.execution_report?.tool_outputs && task.execution_report.tool_outputs.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-2">Tool Outputs ({task.execution_report.tool_outputs.length})</h4>
              <div className="bg-zinc-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {task.execution_report.tool_outputs.map((output, index) => (
                    <div key={index} className="border-l-2 border-green-500 pl-3">
                      <div className="text-sm text-white font-medium">{output.tool}</div>
                      <div className="text-xs text-zinc-300 mt-1 whitespace-pre-wrap">{output.output}</div>
                      <div className="text-xs text-zinc-500">{new Date(output.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Screenshots */}
          {task.execution_report?.screenshots && task.execution_report.screenshots.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-2">Screenshots ({task.execution_report.screenshots.length})</h4>
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.execution_report.screenshots.map((screenshot, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`data:image/png;base64,${screenshot}`}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-zinc-600 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(`data:image/png;base64,${screenshot}`, '_blank')}
                      />
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Final Result */}
          {task.execution_report?.final_result && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-2">Final Result</h4>
              <div className="bg-zinc-800 rounded-lg p-4">
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap">{task.execution_report.final_result}</pre>
              </div>
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-red-400 mb-2">Error</h4>
              <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-4">
                <pre className="text-sm text-red-300 whitespace-pre-wrap">{task.error}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}