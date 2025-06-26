'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/app/context';
import { useTask } from '@/app/task/context';
import { useTaskRunner, Task } from '@/app/task-runner/context';
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
import { TaskExecutionReportModal } from './modals/task-execution-report';

export default function Home() {
  const { 
    messages, 
    setMessages, 
    setJsInspectorResult, 
    setIsLoading,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
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
    instructions,
    selectedScreenshot,
    setSelectedScreenshot,
    stepData,
    setStepData,
    completedTask,
    setCompletedTask,
    showTaskReport,
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
  
  // Floating panel states
  const [showThinkingPanel, setShowThinkingPanel] = useState(false);
  const [showActionsPanel, setShowActionsPanel] = useState(false);
  const [showInspectorPanel, setShowInspectorPanel] = useState(false);


  // Handle initial loading - only on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);


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

      {/* Top background bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-zinc-800 opacity-60 z-10"></div>

      {/* Logo */}
      <div className="absolute top-4 left-4 z-40 flex items-center ">
        <div className="relative w-8 h-8 z-20">
          <img 
            src="/favicon-32x32.png" 
            alt="AutomagicIT Logo" 
            className="w-full h-full"
          />
        </div>

        <span className="text-white font-semibold text-lg ml-2">AutomagicIT</span>
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
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-1 bg-zinc-800/90 backdrop-blur-sm rounded-lg p-2 border border-zinc-600">
          {/* Screenshot/VNC Mode Controls */}
          {(taskState !== 'idle' || screenshots.length > 0) && (
            <>
              {/* VNC Toggle */}
              <button
                onClick={() => setShowVncPanel(!showVncPanel)}
                className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
                title={showVncPanel ? "Show Screenshots" : "Show VNC"}
              >
                {showVncPanel ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m4 4 16 16M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                  </svg>
                ) : (
                  <div className="w-6 h-5 text-white flex items-center justify-center text-[9px] font-bold rounded px-1">
                    VNC
                  </div>
                )}
              </button>

              {/* Screenshot Mode Indicators - only show when in screenshot mode and have screenshots */}
              {!showVncPanel && screenshots.length > 0 && (
                <>
                  {/* Show current mode number and toggle to other mode */}
                  <button
                    onClick={() => setViewMode(viewMode === 'single' ? 'dual' : 'single')}
                    className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
                    title={`Switch to ${viewMode === 'single' ? 'dual' : 'single'} screenshot view`}
                  >
                    <div className="w-5 h-5 text-white flex items-center justify-center text-sm font-bold">
                      {viewMode === 'single' ? '2' : '1'}
                    </div>
                  </button>
                </>
              )}

            </>
          )}


          {/* Panel Controls */}
          
          {/* Thinking Panel Button */}
          <button
            onClick={() => setShowThinkingPanel(true)}
            className={`p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors ${
              thoughts.length === 0 && taskState === 'idle' ? 'opacity-50' : ''
            }`}
            title="Open Thinking Panel"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>

          {/* Actions Panel Button */}
          <button
            onClick={() => setShowActionsPanel(true)}
            className={`p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors ${
              actions.length === 0 && taskState === 'idle' ? 'opacity-50' : ''
            }`}
            title="Open Actions Panel"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* Inspector Panel Button */}
          <button
            onClick={() => setShowInspectorPanel(true)}
            className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Open Inspector Panel"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Log Panel Button */}
          <button
            onClick={() => setShowLogPanel(true)}
            className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Open Session Logs"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Task Runner Button */}
          {taskRunnerMode === 'minimized' && (
            <button
              onClick={() => setTaskRunnerMode('maximized')}
              className="p-2 bg-transparent border border-zinc-600 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Open Task Runner"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
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

      {/* Task Completion Report Modal */}
      <TaskExecutionReportModal
        task={completedTask}
        isOpen={showTaskReport}
        onClose={() => {
          setShowTaskReport(false);
          setCompletedTask(null);
        }}
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
        defaultPosition={{ x: 20, y: 0 }}
        defaultSize={{ width: 400, height: 300 }}
        defaultVisible={showThinkingPanel}
      >
        <div className="p-4 h-full overflow-auto">
          <ThinkingPanel isFloating={true} messages={thoughts.map(t => ({ ...t, type: 'thought' as const }))} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Actions"
        defaultPosition={{ x: 440, y: 0 }}
        defaultSize={{ width: 400, height: 300 }}
        defaultVisible={showActionsPanel}
      >
        <div className="p-4 h-full overflow-auto">
          <ActionPanel isFloating={true} messages={actions.map(a => ({ ...a, type: 'action' as const, content: a.content || a.details || '' }))} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        title="Inspector"
        defaultPosition={{ x: 860, y: 0 }}
        defaultSize={{ width: 500, height: 400 }}
        defaultVisible={showInspectorPanel}
      >
        <div className="h-full">
          <InspectorPanel />
        </div>
      </FloatingPanel>

    </div>
  );
}