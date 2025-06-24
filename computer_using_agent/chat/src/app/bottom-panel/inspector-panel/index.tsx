import React, { useEffect, useRef } from 'react';
import { BottomPanel } from '../bottom-panel';
import { PanelBody } from '../panel-body';
import { useApp } from '../../context';

interface InspectorPanelProps {}

export function InspectorPanel({}: InspectorPanelProps) {
  const { jsInspectorResult, setOnJsInspectorUpdate } = useApp();
  const panelRef = useRef<{ maximize: () => void; minimize: () => void; toggle: () => void } | null>(null);

  // Set up the callback to maximize panel when js_inspector data is received
  useEffect(() => {
    setOnJsInspectorUpdate(() => {
      if (panelRef.current?.maximize) {
        panelRef.current.maximize();
      }
    });

    return () => {
      setOnJsInspectorUpdate(undefined);
    };
  }, [setOnJsInspectorUpdate]);

  // Only show js_inspector results, ignore any other data
  const hasData = jsInspectorResult !== null && jsInspectorResult !== undefined;

  return (
    <BottomPanel 
      title="Inspector" 
      ref={panelRef}
      defaultCollapsed={!hasData}
    >
      <PanelBody>
        {jsInspectorResult ? (
          <div className="space-y-4">
            <div className="border-b border-gray-600 pb-2">
              <div className="text-xs text-gray-400 mb-1">JavaScript Code:</div>
              <code className="text-sm text-blue-300 bg-gray-800 px-2 py-1 rounded">
                {jsInspectorResult.code}
              </code>
            </div>
            
            <div>
              <div className="text-xs text-gray-400 mb-1">
                Result ({jsInspectorResult.resultType}):
              </div>
              {jsInspectorResult.error ? (
                <div className="text-red-400 text-sm">
                  Error: {jsInspectorResult.error}
                </div>
              ) : (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded">
                  {typeof jsInspectorResult.result === 'string' 
                    ? jsInspectorResult.result
                    : JSON.stringify(jsInspectorResult.result, null, 2)
                  }
                </pre>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              Executed: {new Date(jsInspectorResult.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No data to inspect
          </div>
        )}
      </PanelBody>
    </BottomPanel>
  );
}