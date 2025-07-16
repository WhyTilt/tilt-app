'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Square, Pause, Send, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExecutionPanelProps {
  test: any | null;
  status: 'starting' | 'running' | 'paused' | 'completed';
  isOpen: boolean;
  onClose: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSendMessage?: (message: string) => void;
  screenshot?: string | null;
  screenshots?: string[];
  thoughts?: string[];
  actions?: string[];
  chatMessages?: Array<{
    id: string;
    message: string;
    timestamp: string;
    from: 'user' | 'agent';
  }>;
}

export function ExecutionPanel({ test, status, isOpen, onClose, onPlay, onPause, onStop, onSendMessage, screenshot, screenshots = [], thoughts = [], actions = [], chatMessages = [] }: ExecutionPanelProps) {
  const [localThoughts, setLocalThoughts] = useState<string[]>([]);
  const [localActions, setLocalActions] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === 'starting' || status === 'running') {
      if (thoughts.length === 0) {
        setLocalThoughts(['Agent is starting their virtual desktop']);
      }
      setLocalActions([]);
    }
  }, [status, thoughts.length]);

  // Use props if provided, otherwise use local state
  const displayThoughts = thoughts.length > 0 ? thoughts : localThoughts;
  const displayActions = actions.length > 0 ? actions : localActions;
  
  // Update current step index when new thoughts/actions arrive
  useEffect(() => {
    if (status === 'running') {
      const maxIndex = Math.max(displayThoughts.length, displayActions.length) - 1;
      setCurrentStepIndex(Math.max(0, maxIndex));
    }
  }, [displayThoughts.length, displayActions.length, status]);

  const maxSteps = Math.max(displayThoughts.length, displayActions.length);
  const canNavigateBack = currentStepIndex > 0;
  const canNavigateForward = currentStepIndex < maxSteps - 1;
  
  // Get the current screenshot for this step
  const currentScreenshot = screenshots.length > 0 ? screenshots[Math.min(currentStepIndex, screenshots.length - 1)] : screenshot;

  const handlePrevStep = () => {
    if (canNavigateBack) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleNextStep = () => {
    if (canNavigateForward) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim() && onSendMessage) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
      setIsChatExpanded(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-expand chat when agent is running
  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      setIsChatExpanded(true);
    }
  }, [status]);

  if (!isOpen || !test) return null;

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-medium text-lg">Now running "{test.name}"</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Play/Pause/Stop controls */}
            <div className="flex items-center gap-1">
              {status === 'running' && onPause && (
                <button
                  onClick={onPause}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Pause execution"
                >
                  <Pause size={16} />
                </button>
              )}
              
              {status === 'paused' && onPlay && (
                <button
                  onClick={onPlay}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Resume execution"
                >
                  <Play size={16} />
                </button>
              )}
              
              {(status === 'running' || status === 'paused') && onStop && (
                <button
                  onClick={onStop}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Stop execution"
                >
                  <Square size={16} />
                </button>
              )}
            </div>
            
            {/* Navigation controls */}
            {maxSteps > 1 && status !== 'running' && status !== 'starting' && (
              <div className="flex items-center gap-1 mr-4">
                <button
                  onClick={handlePrevStep}
                  disabled={!canNavigateBack}
                  className={`p-1 rounded transition-colors ${
                    canNavigateBack 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!canNavigateForward}
                  className={`p-1 rounded transition-colors ${
                    canNavigateForward 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Main execution content */}
          <div className="flex-1 overflow-hidden">
            {(status === 'running' || status === 'starting') && (displayThoughts.length === 0 || !screenshot) ? (
              /* HERO CENTERED LOADING LAYOUT */
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {/* Loading Text */}
                  <div className="text-white text-2xl font-medium mb-8">
                    The agent is starting up.
                  </div>
                  
                  {/* Animated Loading Dots */}
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-4 h-4 bg-[var(--accent-color)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-4 h-4 bg-[var(--accent-color)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-4 h-4 bg-[var(--accent-color)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Two pane layout for actual execution with thoughts */
              <div className="flex h-full">
                {/* Left Pane - Thoughts */}
                <div className="w-1/3 flex flex-col border-r border-zinc-700/50">
                  <div className="flex-1 p-4 overflow-y-auto flex justify-center">
                    <div className="w-full max-w-none">
                    {displayThoughts.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                        <div className="w-3 h-3 bg-[var(--accent-color)] rounded-full animate-pulse"></div>
                        <span className="text-gray-300">Agent is thinking...</span>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto p-8">
                        {displayThoughts.length > 0 && (
                          <div className="prose prose-invert prose-lg max-w-none">
                            <ReactMarkdown 
                              components={{
                                p: ({ children }) => <p className="mb-8 text-gray-300 leading-loose text-lg font-extralight tracking-wide">{children}</p>,
                                ul: ({ children }) => <ul className="my-8 space-y-4 text-gray-300 pl-6">{children}</ul>,
                                ol: ({ children }) => <ol className="my-8 space-y-4 text-gray-300 pl-6 list-decimal">{children}</ol>,
                                li: ({ children }) => <li className="text-gray-300 leading-loose text-lg font-extralight pl-2">{children}</li>,
                                strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
                                em: ({ children }) => <em className="italic text-gray-200 font-light">{children}</em>,
                                code: ({ children }) => (
                                  <code className="px-2 py-1 bg-zinc-800/50 text-emerald-400 rounded font-mono text-base font-normal">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children }) => (
                                  <pre className="bg-zinc-900/40 border border-zinc-700/30 rounded-lg p-6 my-8 overflow-x-auto font-mono text-sm leading-relaxed">
                                    {children}
                                  </pre>
                                ),
                                h1: ({ children }) => <h1 className="text-2xl font-light text-white mb-8 pb-4 border-b border-zinc-700/20 leading-relaxed">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xl font-light text-gray-100 mb-6 mt-12 leading-relaxed">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-lg font-normal text-gray-200 mb-5 mt-10 leading-relaxed">{children}</h3>,
                                h4: ({ children }) => <h4 className="text-base font-normal text-gray-300 mb-4 mt-8 leading-relaxed">{children}</h4>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-zinc-600/40 pl-6 py-3 my-8 bg-zinc-800/20 italic text-gray-400 font-light leading-loose">
                                    {children}
                                  </blockquote>
                                ),
                                hr: () => <hr className="my-12 border-zinc-700/30" />,
                                a: ({ children, href }) => (
                                  <a href={href} className="text-blue-300 hover:text-blue-200 underline decoration-blue-300/30 hover:decoration-blue-200/50 transition-colors font-normal">
                                    {children}
                                  </a>
                                ),
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-8">
                                    <table className="min-w-full border border-zinc-700/20 rounded-lg overflow-hidden">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                th: ({ children }) => (
                                  <th className="bg-zinc-800/30 text-gray-200 font-normal p-4 text-left border-b border-zinc-700/20 leading-relaxed">
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="bg-zinc-900/10 text-gray-300 font-light p-4 border-b border-zinc-800/20 leading-relaxed">
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {displayThoughts[Math.min(currentStepIndex, displayThoughts.length - 1)]}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                    
                    </div>
                  </div>
                  
                  {/* Chat Interface - only in left panel */}
                  {(status === 'running' || status === 'paused') && onSendMessage && (
                    <>
                      {isChatExpanded ? (
                        <div className="border-t border-zinc-700/50 bg-zinc-800/30 backdrop-blur-sm">
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Send size={16} className="text-blue-400" />
                                  <span className="text-sm text-blue-400 font-medium">Chat with Agent</span>
                                </div>
                                <div className="flex items-end gap-2">
                                  <textarea
                                    ref={chatInputRef}
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Send additional instructions or information to the agent..."
                                    className="flex-1 bg-zinc-900/50 border border-zinc-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                                    rows={2}
                                  />
                                  <button
                                    onClick={handleSendMessage}
                                    disabled={!chatMessage.trim()}
                                    className="p-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Send message to agent"
                                  >
                                    <Send size={16} />
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Press Enter to send • Additional instructions will be provided to the agent
                                </div>
                              </div>
                              <button
                                onClick={() => setIsChatExpanded(false)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Hide chat"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-zinc-700/50 bg-zinc-800/30 relative">
                          {/* Floating Chat Messages - shown above the collapsed chat button */}
                          {chatMessages.length > 0 && (
                            <div className="absolute bottom-full left-4 mb-2 z-50 max-w-sm">
                              {(() => {
                                const latestMessage = chatMessages[chatMessages.length - 1];
                                return (
                                  <div
                                    key={latestMessage.id}
                                    className={`p-3 rounded-lg shadow-lg backdrop-blur-sm border transition-all duration-300 ${
                                      latestMessage.from === 'user' 
                                        ? 'bg-zinc-800/90 text-gray-200 border-zinc-600/50' 
                                        : 'bg-blue-900/90 text-blue-100 border-blue-600/50'
                                    }`}
                                  >
                                    <div className="text-xs mb-1 opacity-80">
                                      <span className="font-medium">
                                        {latestMessage.from === 'user' ? 'You' : 'Agent'}
                                      </span>
                                      <span className="text-gray-400 ml-2">
                                        {new Date(latestMessage.timestamp).toLocaleTimeString()}
                                      </span>
                                      {chatMessages.length > 1 && (
                                        <span className="text-gray-400 ml-2">
                                          (+{chatMessages.length - 1} more)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm leading-relaxed">
                                      {latestMessage.message}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              setIsChatExpanded(true);
                              setTimeout(() => chatInputRef.current?.focus(), 100);
                            }}
                            className="w-full p-3 text-left text-gray-400 hover:text-white hover:bg-zinc-700/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Send size={16} className="text-blue-400" />
                              <span className="text-sm">Click to chat with agent</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right Pane - Screenshot */}
                <div className="w-2/3 flex items-center justify-center bg-zinc-950/50">
                  {currentScreenshot ? (
                    <img 
                      src={currentScreenshot} 
                      alt="Desktop Screenshot" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="text-gray-400 text-sm mb-2">No screenshot available</div>
                      <div className="text-gray-500 text-xs">Screenshot will appear here during execution</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}