import React, { useEffect, useRef, useState } from 'react';
import { BottomPanel } from '../bottom-panel';
import { PanelBody } from '../panel-body';
import { useApp } from '../../context';

interface InspectorPanelProps {}

type InspectorTab = 'javascript' | 'network';

export function InspectorPanel({}: InspectorPanelProps) {
  const { 
    jsInspectorResult, 
    setOnJsInspectorUpdate,
    networkInspectorResult,
    setOnNetworkInspectorUpdate 
  } = useApp();
  const [activeTab, setActiveTab] = useState<InspectorTab>('javascript');
  const panelRef = useRef<{ maximize: () => void; minimize: () => void; toggle: () => void } | null>(null);

  // Set up callbacks to maximize panel and switch tabs when data is received
  useEffect(() => {
    setOnJsInspectorUpdate(() => {
      setActiveTab('javascript');
      if (panelRef.current?.maximize) {
        panelRef.current.maximize();
      }
    });

    return () => {
      setOnJsInspectorUpdate(undefined);
    };
  }, [setOnJsInspectorUpdate]);

  useEffect(() => {
    setOnNetworkInspectorUpdate(() => {
      setActiveTab('network');
      if (panelRef.current?.maximize) {
        panelRef.current.maximize();
      }
    });

    return () => {
      setOnNetworkInspectorUpdate(undefined);
    };
  }, [setOnNetworkInspectorUpdate]);

  // Show panel if either JS or Network data is available
  const hasData = (jsInspectorResult !== null && jsInspectorResult !== undefined) ||
                  (networkInspectorResult !== null && networkInspectorResult !== undefined);

  return (
    <BottomPanel 
      title="Inspector" 
      ref={panelRef}
      defaultCollapsed={!hasData}
    >
      <PanelBody>
        {hasData ? (
          <div className="h-full flex flex-col">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-600 mb-3">
              <button
                onClick={() => setActiveTab('javascript')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'javascript'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                disabled={!jsInspectorResult}
              >
                JavaScript
                {jsInspectorResult && (
                  <span className="ml-1 w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'network'
                    ? 'text-green-300 border-b-2 border-green-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                disabled={!networkInspectorResult}
              >
                Network
                {networkInspectorResult && (
                  <span className="ml-1 w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'javascript' && jsInspectorResult ? (
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
              ) : activeTab === 'network' && networkInspectorResult ? (
                <div className="space-y-4">
                  <div className="border-b border-gray-600 pb-2">
                    <div className="text-xs text-gray-400 mb-1">Operation:</div>
                    <code className="text-sm text-green-300 bg-gray-800 px-2 py-1 rounded">
                      {networkInspectorResult.operation}
                    </code>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      Network Requests ({networkInspectorResult.requests.length} captured):
                    </div>
                    {networkInspectorResult.error ? (
                      <div className="text-red-400 text-sm">
                        Error: {networkInspectorResult.error}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-auto">
                        {networkInspectorResult.requests.map((request, index) => (
                          <div key={index} className="bg-gray-800 p-3 rounded text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-green-300 font-medium">
                                {request.method} {request.url}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(request.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {request.postData && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-xs text-gray-400 mb-1">Request Body:</div>
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                  {request.postData}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Captured: {new Date(networkInspectorResult.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {activeTab === 'javascript' ? 'No JavaScript data available' : 'No network data available'}
                </div>
              )}
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