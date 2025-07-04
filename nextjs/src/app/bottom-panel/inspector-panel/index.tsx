import React, { useEffect, useRef, useState } from 'react';
import { BottomPanel } from '../bottom-panel';
import { PanelBody } from '../panel-body';
import { useApp } from '../../context';

interface InspectorPanelProps {
  isFloating?: boolean;
}

type InspectorTab = 'javascript' | 'network';

export function InspectorPanel({ isFloating = false }: InspectorPanelProps) {
  const { 
    jsInspectorResult, 
    setOnJsInspectorUpdate,
    networkInspectorResult,
    setOnNetworkInspectorUpdate 
  } = useApp();
  const [activeTab, setActiveTab] = useState<InspectorTab>('javascript');
  const panelRef = useRef<{ maximize: () => void; minimize: () => void; toggle: () => void } | null>(null);



  // Always show panel - users should be able to access tabs even without data
  const hasAnyData = (jsInspectorResult !== null && jsInspectorResult !== undefined) ||
                     (networkInspectorResult !== null && networkInspectorResult !== undefined);

  const content = (
    <PanelBody>
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
            >
              Network
              {networkInspectorResult && (
                <span className="ml-1 w-2 h-2 bg-green-400 rounded-full inline-block"></span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'javascript' && jsInspectorResult ? (
              <div className="h-full flex flex-col">
                {jsInspectorResult.error ? (
                  <div className="text-red-400 text-sm p-4">
                    Error: {jsInspectorResult.error}
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-zinc-900 rounded border border-zinc-600">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap p-4 font-mono leading-relaxed">
                      {JSON.stringify(jsInspectorResult.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : activeTab === 'network' && networkInspectorResult ? (
              <div className="h-full flex flex-col">
                {networkInspectorResult.error ? (
                  <div className="text-red-400 text-sm p-4">
                    Error: {networkInspectorResult.error}
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-zinc-900 rounded border border-zinc-600">
                    <div className="p-4">
                      {networkInspectorResult.requests.map((request, index) => (
                        <div key={index} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-300 font-medium text-sm">
                              {request.method} {request.url}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(request.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {request.postData && (
                            <div className="mt-2 pt-2 border-t border-zinc-600">
                              <div className="text-xs text-gray-400 mb-2">Request Body:</div>
                              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                {request.postData}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {activeTab === 'javascript' ? 'No JavaScript data available' : 'No network data available'}
              </div>
            )}
          </div>
        </div>
    </PanelBody>
  );

  if (isFloating) {
    return content;
  }

  return (
    <BottomPanel 
      title="Inspector" 
      ref={panelRef}
      defaultCollapsed={!hasAnyData}
    >
      {content}
    </BottomPanel>
  );
}