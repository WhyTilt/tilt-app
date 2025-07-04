'use client';

import React from 'react';
import { useTaskRunner, SessionStepLog } from '../../task-runner/context';

interface LogPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function LogPanel({ isVisible, onClose }: LogPanelProps) {
  const { sessionStepLogs, clearSessionStepLogs } = useTaskRunner();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-600 rounded-lg w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-600">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h2 className="text-white text-lg font-semibold">Session Step Logs</h2>
            <span className="text-zinc-400 text-sm">({sessionStepLogs.length} entries)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearSessionStepLogs}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              title="Clear all logs"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-700 rounded transition-colors"
              title="Close log panel"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {sessionStepLogs.length === 0 ? (
            <div className="text-center text-zinc-400 py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">No session logs yet</p>
              <p className="text-sm mt-2">Step logs will appear here as tasks are executed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionStepLogs.map((log, index) => (
                <LogEntry key={index} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LogEntryProps {
  log: SessionStepLog;
}

function LogEntry({ log }: LogEntryProps) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      {/* Header with task/step info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
            Task {log.task}
          </span>
          <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
            Step {log.step}
          </span>
        </div>
        <span className="text-zinc-400 text-xs">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Thought */}
        {log.thought && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Thought
            </h4>
            <div className="bg-zinc-900 p-3 rounded border border-zinc-600">
              <p className="text-zinc-300 text-sm leading-relaxed">{log.thought}</p>
            </div>
          </div>
        )}

        {/* Action */}
        {log.action && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Action
            </h4>
            <div className="bg-zinc-900 p-3 rounded border border-zinc-600">
              <p className="text-zinc-300 text-sm leading-relaxed">{log.action}</p>
            </div>
          </div>
        )}

        {/* Screenshot */}
        {log.screenshot && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h16V6H4zm2 2h2v2H6V8zm4 0h8v2h-8V8zm-4 4h2v2H6v-2zm4 0h8v2h-8v-2z" />
              </svg>
              Screenshot
            </h4>
            <div className="bg-zinc-900 p-2 rounded border border-zinc-600">
              <img
                src={log.screenshot}
                alt={`Task ${log.task} Step ${log.step} Screenshot`}
                className="max-w-full h-auto rounded"
                style={{ maxHeight: '200px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}