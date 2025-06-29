'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/app/context';
import { useTask } from '@/app/task/context';
import { useTaskRunner, Task } from '@/app/task-runner/context';
import { usePanelPreferences } from '@/app/panel-preferences/context';
import { useApiKeys } from '@/app/api-keys/context';
import { ScreenshotsPanel } from '@/app/screenshots/panel';
import { VncPanel } from '@/app/screenshots/vnc/panel';
import {
  ThinkingPanel,
  ActionPanel,
  InspectorPanel
} from './bottom-panel';
import { FloatingPanel } from './bottom-panel/floating-panel';
import { LogPanel } from './bottom-panel/log-panel';
import { TaskRunnerPanel } from './bottom-panel/task-runner-panel';
import { SettingsModal } from './modals/settings';

export default function Home() {
  const { 
    messages, 
    viewMode,
    setViewMode,
    isChatPoppedOut,
    setIsChatPoppedOut,
    showVncPanel,
    setShowVncPanel
  } = useApp();
  
  const {
    screenshots,
    setScreenshots,
    actions,
    setActions,
    thoughts,
    setThoughts,
    selectedScreenshot,
    setSelectedScreenshot,
    setStepData,
    setCompletedTask,
    setShowTaskReport
  } = useTask();
  
  const {
    currentTask: currentRunningTask,
    setCurrentTask: setCurrentRunningTask
  } = useTaskRunner();
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [taskState, setTaskState] = useState<'idle' | 'running'>('idle');
  const [taskRunnerMode, setTaskRunnerMode] = useState<'minimized' | 'default' | 'maximized'>('maximized');
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [isAgentStarting, setIsAgentStarting] = useState(false);
  
  // Panel preferences from context
  const { preferences, updatePanelState } = usePanelPreferences();
  
  // API keys from context
  const { hasAnthropicKey, isLoading: apiKeysLoading } = useApiKeys();
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);


  // Handle initial loading - only on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show settings modal if no API key exists (after API keys are loaded)
  useEffect(() => {
    if (!apiKeysLoading && !hasAnthropicKey) {
      setShowSettingsModal(true);
    }
  }, [apiKeysLoading, hasAnthropicKey]);


  // Convert messages to thoughts and actions format
  useEffect(() => {
    const newThoughtsAndActions = messages.map((message, index) => {
      const timestamp = new Date().toLocaleTimeString();

      if (message.role === 'user') {
        // User messages are not shown in thoughts/actions panels
        return null;
      } else if (message.role === 'assistant') {
        // Check if this assistant message contains tool use
        if (Array.isArray(message.content)) {
          const hasToolUse = message.content.some(c => c.type === 'tool_use');
          if (hasToolUse) {
            // This is a tool use message - should be an action
            const toolUse = message.content.find(c => c.type === 'tool_use');
            const toolName = toolUse?.name || 'Tool';
            const displayName = toolName.charAt(0).toUpperCase() + toolName.slice(1).replace('_', ' ');

            // Create a detailed description by extracting tool input
            let description = `Executing ${displayName}`;
            const toolInput = toolUse?.input;
            
            if (toolName === 'computer' && toolInput) {
              const action = toolInput.action;
              if (action === 'screenshot') {
                description = 'Taking screenshot';
              } else if (action === 'left_click') {
                const coords = toolInput.coordinate ? `[${toolInput.coordinate[0]}, ${toolInput.coordinate[1]}]` : '[coords]';
                description = `Clicking ${coords}`;
              } else if (action === 'type') {
                const text = toolInput.text ? `"${toolInput.text.substring(0, 20)}${toolInput.text.length > 20 ? '...' : ''}"` : '[text]';
                description = `Typing ${text}`;
              } else if (action === 'key') {
                const key = toolInput.text || '[key]';
                // Handle common key combinations for better display
                const keyDisplayMap: { [key: string]: string } = {
                  'ctrl+a': 'Ctrl+A (Select All)',
                  'ctrl+c': 'Ctrl+C (Copy)',
                  'ctrl+v': 'Ctrl+V (Paste)',
                  'ctrl+shift+p': 'Ctrl+Shift+P',
                  'Return': 'Enter',
                  'F5': 'F5 (Refresh)',
                  'Escape': 'Escape'
                };
                const displayKey = keyDisplayMap[key] || key;
                description = `Pressing ${displayKey}`;
              } else if (action === 'scroll') {
                const direction = toolInput.scroll_direction || 'unknown direction';
                const amount = toolInput.scroll_amount || 1;
                description = `Scrolling ${direction} ${amount}`;
              } else if (action === 'right_click') {
                const coords = toolInput.coordinate ? `[${toolInput.coordinate[0]}, ${toolInput.coordinate[1]}]` : '[coords]';
                description = `Right clicking ${coords}`;
              } else if (action === 'double_click') {
                const coords = toolInput.coordinate ? `[${toolInput.coordinate[0]}, ${toolInput.coordinate[1]}]` : '[coords]';
                description = `Double clicking ${coords}`;
              } else {
                description = `Computer ${action}`;
              }
            } else if (toolName === 'bash' && toolInput) {
              const command = toolInput.command ? `"${toolInput.command.substring(0, 30)}${toolInput.command.length > 30 ? '...' : ''}"` : '[command]';
              description = `Running ${command}`;
            } else if (toolName === 'str_replace_editor') {
              description = 'Editing file';
            } else if (toolName === 'js_inspector' || toolName === 'inspect_js') {
              const code = toolInput?.code;
              if (code) {
                const shortCode = code.length > 50 ? code.substring(0, 50) + '...' : code;
                description = `Running JavaScript: ${shortCode}`;
              } else {
                description = 'Running JavaScript';
              }
            }

            return {
              id: `action-${index}`,
              type: 'action' as const,
              content: description,
              action: displayName,
              details: description,
              status: 'running' as const,
              timestamp: timestamp
            };
          }
        }

        // Regular assistant text message - becomes thought
        const content = typeof message.content === 'string' ? message.content :
          Array.isArray(message.content) ?
            message.content.filter(c => c.type === 'text').map(c => c.text).join(' ') :
            JSON.stringify(message.content);

        return {
          id: `thought-${index}`,
          type: 'thought' as const,
          content: content,
          timestamp: timestamp
        };
      } else if (message.role === 'tool') {
        // Tool results become actions
        let content = '';
        let actionName = 'Tool Result';

        if (Array.isArray(message.content)) {
          content = message.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join(' ');
        } else if (typeof message.content === 'string') {
          content = message.content;
        } else {
          // Don't show raw JSON, just indicate tool completed
          content = 'Tool executed successfully';
        }

        // Try to extract tool name from content for better action names
        const toolNames = ['screenshot', 'computer', 'bash', 'edit_tool', 'str_replace', 'js_inspector'];
        const detectedTool = toolNames.find(tool => content.toLowerCase().includes(tool));

        if (detectedTool) {
          actionName = detectedTool.charAt(0).toUpperCase() + detectedTool.slice(1).replace('_', ' ');
        }

        // Truncate very long content for better display
        const displayContent = content.length > 200 ? content.slice(0, 197) + '...' : content;

        return {
          id: `action-${index}`,
          type: 'action' as const,
          content: displayContent,
          action: actionName,
          details: displayContent,
          status: 'completed' as const,
          timestamp: timestamp
        };
      }
      return null;
    }).filter(Boolean);

    // Convert to separate thoughts and actions
    const newThoughts = newThoughtsAndActions.filter(item => item?.type === 'thought') as Array<{
      id: string;
      type: 'thought';
      content: string;
      timestamp: string;
      step?: number;
    }>;
    const newActions = newThoughtsAndActions.filter(item => item?.type === 'action') as Array<{
      id: string;
      type: 'action';
      content: string;
      action?: string;
      details?: string;
      status?: 'pending' | 'running' | 'completed' | 'error';
      timestamp: string;
      step?: number;
    }>;
    
    setThoughts(newThoughts);
    setActions(newActions);
  }, [messages]);

  // Function to add screenshots from ChatInterface
  const addScreenshot = (screenshot: string) => {
    setScreenshots(prev => {
      const newScreenshots = [...prev, screenshot];
      const newStepIndex = newScreenshots.length - 1;

      // Initialize step data for the new screenshot
      // For now, just use all messages and let the components filter them
      // We can refine this later to be more step-specific

      setStepData(prevStepData => ({
        ...prevStepData,
        [newStepIndex]: {
          actions: [...messages], // Use all messages for now
          chat: [...messages]     // Use all messages for now  
        }
      }));

      // Auto-select the newest screenshot
      setSelectedScreenshot(newStepIndex);
      return newScreenshots;
    });
  };

  // Get current step data
  const currentStepIndex = selectedScreenshot ?? (screenshots.length > 0 ? screenshots.length - 1 : null);


  // Handle chat submission
  const handleChatSubmit = () => {
    // Add initial thinking message when agent starts working
    const thinkingMessage = {
      id: `thinking-initial-${Date.now()}`,
      type: 'thought' as const,
      content: 'Thinking...',
      timestamp: new Date().toLocaleTimeString()
    };
    setThoughts(prev => [thinkingMessage, ...prev]);
    setTaskState('running');
  };

  // Task control handlers
  const handlePlay = () => {
    // Add initial thinking message when starting a task
    if (taskState === 'idle') {
      const thinkingMessage = {
        id: `thinking-initial-${Date.now()}`,
        type: 'thought' as const,
        content: 'Thinking...',
        timestamp: new Date().toLocaleTimeString()
      };
      setThoughts(prev => [thinkingMessage, ...prev]);
    }
    setTaskState('running');
  };


  const currentScreenshotIndex = selectedScreenshot ?? (screenshots.length > 0 ? screenshots.length - 1 : null);

  return (
    <div className="relative h-screen flex flex-col" style={{ backgroundColor: '#18181b' }}>

      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Current Task Label */}
        {currentRunningTask?.label && (
          <div className="flex items-center bg-zinc-800/20 backdrop-blur-sm rounded-lg p-2 border border-zinc-600/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-white font-medium text-sm">{currentRunningTask.label}</span>
            </div>
          </div>
        )}
        
        {/* Settings Gear Icon */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center justify-center w-10 h-10 bg-zinc-800/20 backdrop-blur-sm rounded-lg border border-zinc-600/30 hover:bg-zinc-800/30 transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Floating Logo - Bottom Right */}
      <div 
        className="fixed bottom-4 right-4 z-50 flex items-center bg-zinc-800/20 backdrop-blur-sm rounded-lg p-2 border border-zinc-600/30 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => window.open('https://whytilt.com', '_blank')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            window.open('https://whytilt.com', '_blank');
          }
        }}
      >
        <div className="relative w-6 h-6">
          <img 
            src="/logo.png"
            alt="Tilt Logo" 
            className="w-full h-full"
          />
        </div>
      </div>


      {/* Screenshots/VNC Panel - Full viewport height */}
      <div className="h-full relative">
        {showVncPanel ? (
          <VncPanel />
        ) : (
          (taskState !== 'idle' || isAgentStarting || screenshots.length > 0) && (
            <ScreenshotsPanel
              screenshots={screenshots}
              selectedIndex={currentScreenshotIndex || 0}
              onSelectScreenshot={setSelectedScreenshot}
              viewMode={viewMode}
              isAgentStarting={isAgentStarting}
            />
          )
        )}
      </div>

      {/* Control Panel - Floating at bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[70]">
        <div className="flex items-center space-x-1 bg-zinc-800/90 backdrop-blur-sm rounded-lg p-2 border border-zinc-600">
          {/* Screenshot/VNC Mode Controls */}
          {(taskState !== 'idle' || screenshots.length > 0) && (
            <>
              {/* Mode Toggle Button - Shows VNC when in screenshot mode, shows picture when in VNC mode */}
              <button
                onClick={() => setShowVncPanel(!showVncPanel)}
                className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
                title={showVncPanel ? "Show Screenshots" : "Show VNC"}
              >
                {showVncPanel ? (
                  /* Show picture icon when in VNC mode */
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  /* Show VNC text when in screenshot mode */
                  <div className="w-6 h-5 text-white flex items-center justify-center text-[9px] font-bold rounded px-1">
                    VNC
                  </div>
                )}
              </button>

            </>
          )}



          {/* Task Runner Button */}
          {taskRunnerMode === 'minimized' && (
            <button
              onClick={() => setTaskRunnerMode('maximized')}
              className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Open Task Runner"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </button>
          )}
        </div>
      </div>


      {/* Task Runner Panel Modal */}
      <TaskRunnerPanel
        onScreenshotAdded={addScreenshot}
        onSubmit={handleChatSubmit}
        onTaskStart={(task) => {
          setCurrentRunningTask(task);
          setTaskState('running');
        }}
        onTaskComplete={(task) => {
          // Clear current running task and show report modal
          setCurrentRunningTask(null);
          setTaskState('idle');
          if (task) {
            setCompletedTask(task);
            setShowTaskReport(true);
          }
        }}
        panelMode={taskRunnerMode}
        onModeChange={setTaskRunnerMode}
        onThought={(thought) => {
          setThoughts(prev => [...prev, {
            id: thought.id,
            type: 'thought',
            content: thought.content,
            timestamp: thought.timestamp,
            step: thought.step
          }]);
        }}
        onAction={(action) => {
          setActions(prev => [...prev, {
            id: action.id,
            type: 'action',
            content: action.content,
            action: action.action,
            details: action.details,
            status: action.status,
            timestamp: action.timestamp,
            step: action.step
          }]);
        }}
        onClearThoughts={() => {
          setThoughts([]);
        }}
        onClearActions={() => {
          setActions([]);
        }}
        onAgentStarting={setIsAgentStarting}
      />

      {/* Floating Chat Panel (when popped out) */}
      {isChatPoppedOut && (
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-4 w-[32rem] h-96 z-50 border border-gray-700 rounded-lg overflow-hidden shadow-2xl" style={{ backgroundColor: '#1f1f23' }}>
          <div className="h-full flex flex-col">
            {/* Chat header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600 flex-shrink-0" style={{ backgroundColor: '#2a2a2e' }}>
              <div className="text-white text-sm font-medium">Chat (Popped Out)</div>
              <button
                onClick={() => {
                  setIsChatPoppedOut(false);
                }}
                className="text-gray-200 hover:text-white transition-colors p-1 hover:bg-gray-600 rounded"
                title="Close popup and restore to panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat content */}
            <div className="flex-1 flex flex-col min-h-0">
              <TaskRunnerPanel
                onScreenshotAdded={addScreenshot}
                onSubmit={handleChatSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Log Panel */}
      <LogPanel
        isVisible={showLogPanel}
        onClose={() => setShowLogPanel(false)}
      />



      {/* Initial Instruction Panel - Show when idle with no data */}
      {messages.length === 0 && taskState === 'idle' && !currentRunningTask && thoughts.length === 0 && actions.length === 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-96 z-40">
          <TaskRunnerPanel
            onScreenshotAdded={addScreenshot}
            onSubmit={handleChatSubmit}
            panelMode="default"
            onModeChange={() => {}}
            onTaskStart={(task) => {
              setCurrentRunningTask(task);
              setTaskState('running');
            }}
            onTaskComplete={(task) => {
              setCurrentRunningTask(null);
              setTaskState('idle');
              if (task) {
                setCompletedTask(task);
                setShowTaskReport(true);
              }
            }}
            onThought={() => {}}
            onAction={() => {}}
            onClearThoughts={() => {}}
            onClearActions={() => {}}
            onAgentStarting={setIsAgentStarting}
          />
        </div>
      )}

      {/* Floating Panels */}
      <FloatingPanel
        title="Thinking"
        panelName="thinking"
        defaultPosition={{ x: 9, y: 5 }}
        defaultSize={{ width: 400, height: 300 }}
        defaultVisible={preferences.thinking.visible}
      >
        <div className="p-4 h-full overflow-auto">
          <ThinkingPanel isFloating={true} messages={thoughts.map(t => ({ ...t, type: 'thought' as const }))} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Actions"
        panelName="actions"
        defaultPosition={{ x: 1513, y: 657 }}
        defaultSize={{ width: 400, height: 300 }}
        defaultVisible={preferences.actions.visible}
      >
        <div className="p-4 h-full overflow-auto">
          <ActionPanel isFloating={true} messages={actions.map(a => ({ 
            ...a, 
            type: 'action' as const, 
            content: a.content || a.details || '',
            action: a.action || 'Action'
          }))} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Inspector"
        panelName="inspector"
        defaultPosition={{ x: 439, y: 9 }}
        defaultSize={{ width: 500, height: 400 }}
        defaultVisible={preferences.inspector.visible}
      >
        <div className="h-full">
          <InspectorPanel isFloating={true} />
        </div>
      </FloatingPanel>

      {/* Minimized Panel Tabs - Bottom Left */}
      <div className="fixed bottom-4 left-4 z-[70] flex gap-2">
        {/* Thinking Tab */}
        {!preferences.thinking.visible && (
          <button
            onClick={() => updatePanelState('thinking', { visible: true })}
            className="px-3 py-2 bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 hover:bg-zinc-700/90 rounded-lg transition-colors text-white text-sm"
            title="Open Thinking Panel"
          >
            Thinking
          </button>
        )}

        {/* Actions Tab */}
        {!preferences.actions.visible && (
          <button
            onClick={() => updatePanelState('actions', { visible: true })}
            className="px-3 py-2 bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 hover:bg-zinc-700/90 rounded-lg transition-colors text-white text-sm"
            title="Open Actions Panel"
          >
            Actions
          </button>
        )}

        {/* Inspector Tab */}
        {!preferences.inspector.visible && (
          <button
            onClick={() => updatePanelState('inspector', { visible: true })}
            className="px-3 py-2 bg-zinc-800/90 backdrop-blur-sm border border-zinc-600 hover:bg-zinc-700/90 rounded-lg transition-colors text-white text-sm"
            title="Open Inspector Panel"
          >
            Inspector
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        canClose={hasAnthropicKey}
      />

    </div>
  );
}