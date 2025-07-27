'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context';
import { useTask } from '../../task/context';
import { useTaskRunner, Task } from '../../task-runner/context';
import { apiClient } from '@/lib/api-client';
import { StepEditor } from './step-editor';
import { VariableInputModal } from './variable-input-modal';
import { 
  extractVariables, 
  interpolateVariables, 
  interpolateVariablesInString,
  getAllVariablesFromTasks, 
  hasVariables 
} from './utils/variable-utils';
import { runAllLogger } from './utils/run-all-logger';
import { TestExecutionReportModal } from '../../modals/test-execution-report';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface TaskRunnerPanelProps {
  onScreenshotAdded?: (screenshot: string) => void;
  onSubmit?: () => void;
  onTaskStart?: (task: Task) => void;
  onTaskComplete?: (task?: Task) => void;
  panelMode?: 'minimized' | 'default' | 'maximized';
  onModeChange?: (mode: 'minimized' | 'default' | 'maximized') => void;
  onThought?: (thought: {
    id: string;
    content: string;
    timestamp: string;
    step?: number;
  }) => void;
  onAction?: (action: {
    id: string;
    content: string;
    action?: string;
    details?: string;
    status?: 'pending' | 'running' | 'completed' | 'error';
    timestamp: string;
    step?: number;
  }) => void;
  onClearThoughts?: () => void;
  onClearActions?: () => void;
  onAgentStarting?: (isStarting: boolean) => void;
}

export function TaskRunnerPanel({ onScreenshotAdded, onSubmit, onTaskStart, onTaskComplete, panelMode: externalPanelMode, onModeChange, onThought, onAction, onClearThoughts, onClearActions, onAgentStarting }: TaskRunnerPanelProps) {
  const { config, messages, addMessage, setMessages, isLoading, setIsLoading, setJsInspectorResult, onJsInspectorUpdate, setNetworkInspectorResult, onNetworkInspectorUpdate } = useApp();
  const { addThought, addAction, addScreenshot, resetStepTracking, clearAllData } = useTask();
  const [tasks, setTasks] = useState<Task[]>([]);
  const streamingMessageRef = useRef('');
  const [internalPanelMode, setInternalPanelMode] = useState<'minimized' | 'default' | 'maximized'>('maximized');
  
  
  const [currentExecutionReport, setCurrentExecutionReport] = useState<Task['execution_report']>({
    actions_taken: [],
    screenshots: []
  });
  const [selectedTaskReport, setSelectedTaskReport] = useState<Task | null>(null);
  const [stepEditorTask, setStepEditorTask] = useState<Task | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [isBatchRun, setIsBatchRun] = useState(false);
  // Get task runner state from TaskRunnerContext
  const { 
    taskVariables, 
    setTaskVariables, 
    taskQueue, 
    addToTaskQueue, 
    clearTaskQueue,
    setTaskQueue,
    autoRunning,
    setAutoRunning,
    isAnyTaskRunning,
    setIsAnyTaskRunning,
    currentTask,
    setCurrentTask,
    addSessionStepLog
  } = useTaskRunner();
  const [currentTaskForVariables, setCurrentTaskForVariables] = useState<Task | null>(null);
  const [currentTaskNumber, setCurrentTaskNumber] = useState(0);
  const [isAgentStarting, setIsAgentStarting] = useState(false);
  const [isProcessingNextTask, setIsProcessingNextTask] = useState(false);
  const [initialQueueSize, setInitialQueueSize] = useState(0); // Track initial queue size to determine execution mode
  const [lastJsCode, setLastJsCode] = useState<string>(''); // Store the last JavaScript code executed
  
  // Use external mode if provided, otherwise use internal state
  const panelMode = externalPanelMode || internalPanelMode;
  const setPanelMode = onModeChange || setInternalPanelMode;

  // Simple minimize icon
  const getMinimizeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="12" width="12" height="2" />
    </svg>
  );

  // Fetch tasks from MongoDB
  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks from:', `${API_BASE_URL}/tasks`);
      const response = await fetch(`${API_BASE_URL}/tasks`);
      const data = await response.json();
      console.log('Tasks response:', data);
      if (data.tasks) {
        setTasks(data.tasks);
        // Check if any tasks are currently running
        const hasRunningTasks = data.tasks.some((task: Task) => task.status === 'running');
        setIsAnyTaskRunning(hasRunningTasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };


  // Clean up browser state only (preserve UI for inspection)  
  const cleanupBrowserOnly = async () => {
    try {
      console.log('Cleaning up browser state...');
      
      // Call API to cleanup browser and reset VNC
      const response = await fetch(`${API_BASE_URL}/cleanup-browser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Browser cleanup result:', result.message);
      } else {
        console.warn('Browser cleanup failed:', response.status);
      }
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('Error during browser cleanup:', error);
    }
  };

  // Process next task in queue (unified queuing mechanism)
  const processNextTaskInQueue = async () => {
    console.log('🔥 PROCESS_NEXT: Called with queue state', {
      queueLength: taskQueue.length,
      queue: [...taskQueue],
      initialQueueSize,
      autoRunning,
      isAnyTaskRunning,
      tasksLength: tasks.length
    });
    
    // Find tasks that haven't been completed yet
    const remainingTaskIds = taskQueue.filter(taskId => {
      const task = tasks.find(t => t.id === taskId);
      const isIncluded = task && task.status !== 'passed' && task.status !== 'completed' && task.status !== 'failed';
      console.log('🔥 TASK FILTER:', {
        taskId,
        task: task ? { id: task.id, status: task.status } : 'NOT_FOUND',
        isIncluded
      });
      return isIncluded;
    });
    
    console.log('🔥 REMAINING PENDING TASKS:', remainingTaskIds);
    console.log('🔥 ALL TASKS:', tasks.map(t => ({ id: t.id, status: t.status })));
    
    if (remainingTaskIds.length > 0) {
      const isBatchMode = initialQueueSize > 1;
      
      console.log('🔥 QUEUE PROCESSING: Processing next task from queue', {
        remainingTaskIds: remainingTaskIds.length,
        initialQueueSize,
        isBatchMode,
        currentMode: isBatchMode ? 'BATCH' : 'SINGLE'
      });
      
      // Get the next task ID (first pending task)
      const nextTaskId = remainingTaskIds[0];
      
      // Find the actual task from the tasks database
      const nextTask = tasks.find(task => task.id === nextTaskId);
      
      if (nextTask && nextTask.status === 'pending') {
        console.log('🔥 QUEUE PROCESSING: Found next pending task, executing', nextTask.id);
        
        // Execute the next task with variables
        try {
          await executeTaskWithVariables(nextTask, taskVariables);
        } catch (error) {
          console.error('🔥 ERROR executing task:', error);
          // Continue with next task even if this one fails
          setTimeout(() => processNextTaskInQueue(), 1000);
        }
      } else {
        console.log('🔥 QUEUE PROCESSING: No pending tasks found, trying next');
        // Remove non-pending tasks and continue
        setTaskQueue((prev: string[]) => prev.filter((id: string) => id !== nextTaskId));
        setTimeout(() => processNextTaskInQueue(), 100);
      }
    } else {
      console.log('🔥 QUEUE PROCESSING: All tasks completed, stopping execution');
      setIsBatchRun(false);
      setAutoRunning(false);
      setIsAnyTaskRunning(false);
      setInitialQueueSize(0);
      setPanelMode('maximized');
    }
  };

  // Legacy cleanup function (for compatibility)
  const cleanupBetweenTasks = async () => {
    await cleanupBrowserOnly();
    await processNextTaskInQueue();
  };


  // Execute a task with optional variables
  const executeTaskWithVariables = async (task: Task, variables?: Record<string, string>) => {
    console.log('🔥 TASK EXECUTION START:', {
      taskId: task.id,
      isBatchRun,
      autoRunning,
      taskQueue: taskQueue.length,
      isAnyTaskRunning
    });
    
    runAllLogger.info('executeTaskWithVariables-start', `Starting execution of task ${task.id}`);
    
    // Log comprehensive state at task start
    runAllLogger.logQueueState('executeTaskWithVariables-start', {
      taskQueue,
      autoRunning,
      isLoading,
      currentTask,
      isAnyTaskRunning,
      isBatchRun
    });
    
    runAllLogger.debug('executeTaskWithVariables-start', 'Task variables and state', {
      taskRunnerContextVariables: taskVariables,
      passedVariables: variables,
      taskId: task.id,
      taskInstructions: task.instructions
    });
    
    // FIX: Add null safety and better error handling
    if (!task || !task.id) {
      runAllLogger.error('executeTaskWithVariables-start', 'Invalid task provided', { task });
      return;
    }
    
    if (isLoading || isAnyTaskRunning) {
      runAllLogger.warn('executeTaskWithVariables-start', 'Task execution blocked by current state', {
        isLoading,
        isAnyTaskRunning,
        taskId: task.id
      });
      return;
    }
    
    runAllLogger.logTaskExecution('executeTaskWithVariables-start', 'proceeding with execution', task.id);
    
    setCurrentTask(task);
    setIsAnyTaskRunning(true);
    let completedTaskForReport: Task | null = null;
    let hasStreamErrors = false;
    let hasToolErrors = false;
    
    // Clear UI state from previous task (thoughts, actions, step tracking, inspector data)
    resetStepTracking();
    clearAllData();
    
    // Clear inspector panel data from previous task
    setJsInspectorResult(null);
    setNetworkInspectorResult(null);
    
    // Reset execution report for new task
    setCurrentExecutionReport({
      actions_taken: [],
      screenshots: [],
      tool_outputs: [],
      final_result: null
    });
    
    // Clear messages to avoid tool role messages from previous tasks
    setMessages([]);
    
    // Clear thoughts and actions from previous tasks
    if (onClearThoughts) {
      onClearThoughts();
    }
    if (onClearActions) {
      onClearActions();
    }
    
    // Mark task as running
    try {
      await fetch(`${API_BASE_URL}/tasks/${task.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      // Update local task status
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id ? { ...t, status: 'running' as const } : t
        )
      );
    } catch (error) {
      console.error('Failed to mark task as running:', error);
    }
    
    // Interpolate variables in task instructions if provided
    let processedInstructions = task.instructions;
    let processedToolUse = task.tool_use;
    console.log('🔥 BEFORE INTERPOLATION - instructions:', task.instructions);
    console.log('🔥 BEFORE INTERPOLATION - variables:', variables);
    
    if (variables && Object.keys(variables).length > 0) {
      processedInstructions = interpolateVariables(task.instructions, variables);
      console.log('🔥 AFTER INTERPOLATION - instructions:', processedInstructions);
      
      // Also interpolate variables in tool_use arguments
      if (task.tool_use && task.tool_use.arguments) {
        processedToolUse = {
          ...task.tool_use,
          arguments: Object.fromEntries(
            Object.entries(task.tool_use.arguments).map(([key, value]) => [
              key,
              typeof value === 'string' ? interpolateVariablesInString(value, variables) : value
            ])
          )
        };
        console.log('🔥 AFTER INTERPOLATION - tool_use:', processedToolUse);
      }
    } else {
      console.log('🔥 NO VARIABLES TO INTERPOLATE');
    }
    
    // Create instructions for AI agent - include FULL task data
    console.log('🔥 STEP 1: About to join instructions');
    console.log('🔥 processedInstructions:', processedInstructions);
    // FIX: Add proper spacing between steps with double line breaks
    let instructions = processedInstructions ? processedInstructions.join('\n\n') : 'No instructions provided';
    console.log('🔥 STEP 1 COMPLETE: instructions joined');
    
    if (processedToolUse) {
      console.log('🔥 STEP 2: About to process tool use');
      console.log('🔥 processedToolUse:', processedToolUse);
      console.log('🔥 processedToolUse.tool:', processedToolUse.tool);
      console.log('🔥 processedToolUse.arguments:', processedToolUse.arguments);
      
      // Add the exact tool use data that the AI must execute
      instructions += `\n\nUse the ${processedToolUse.tool} tool\n with ${JSON.stringify(processedToolUse.arguments)}`;
      console.log('🔥 STEP 2 COMPLETE: tool use processed');
    }

    // Create enhanced task object with complete instructions
    console.log('🔥 STEP 3: About to create enhanced task');
    console.log('🔥 task:', task);
    console.log('🔥 instructions:', instructions);
    const enhancedTask = {
      ...task,
      instructions: instructions
    };
    console.log('🔥 STEP 3 COMPLETE: enhanced task created');

    // Only minimize panel when not auto-running
    console.log('🔥 STEP 4: About to check autoRunning');
    console.log('🔥 autoRunning:', autoRunning);
    if (!autoRunning) {
      console.log('🔥 STEP 4a: About to setPanelMode');
      setPanelMode('minimized');
      console.log('🔥 STEP 4a COMPLETE: setPanelMode called');
    }
    if (onTaskStart) {
      console.log('🔥 STEP 4b: About to call onTaskStart');
      // Increment task number for session step logging
      setCurrentTaskNumber(prev => prev + 1);
      onTaskStart(enhancedTask);
      console.log('🔥 STEP 4b COMPLETE: onTaskStart called');
    }

    // Call onSubmit to trigger panel minimization and task state update (only when not auto-running)
    if (onSubmit && !autoRunning) {
      console.log('🔥 STEP 4c: About to call onSubmit');
      onSubmit();
      console.log('🔥 STEP 4c COMPLETE: onSubmit called');
    }

    try {
      // Add task context to system prompt
      console.log('🔥 STEP 5: About to create task system prompt');
      console.log('🔥 config.custom_system_prompt:', config.custom_system_prompt);
      console.log('🔥 task.id:', task.id);
      let taskSystemPrompt = `${config.custom_system_prompt}\n\n<TASK_CONTEXT>\nCurrent Task ID: ${task.id}\n\nIMPORTANT: When you complete this task, you MUST call the mongodb_reporter tool with:\n- action: "report_result"\n- task_id: "${task.id}"\n- data: {success: true, result: "your result data here"}\n`;
      console.log('🔥 STEP 5 COMPLETE: task system prompt created');
      
      if (processedToolUse) {
        taskSystemPrompt += `\nCRITICAL CONSTRAINT: You are REQUIRED to use the ${processedToolUse.tool} tool with EXACTLY these arguments: ${JSON.stringify(processedToolUse.arguments)}\n`;
        taskSystemPrompt += `DO NOT:\n- Generate your own JavaScript code\n- Modify the provided arguments\n- Create new tool calls\n- Use any other tools unless explicitly required\n`;
        taskSystemPrompt += `YOU MUST: Use ONLY the ${processedToolUse.tool} tool with the exact arguments provided above. Then report completion with mongodb_reporter.\n`;
      }
      
      taskSystemPrompt += `</TASK_CONTEXT>`;
      
      // Use the shared streaming logic with custom system prompt
      console.log('🔥 CREATING USER MESSAGE with instructions:', instructions);
      const userMessage = {
        role: 'user' as const,
        content: instructions
      };
      console.log('🔥 USER MESSAGE CREATED:', userMessage);
      
      // Create the message array for the API (current messages + new message)
      console.log('🔥 CURRENT MESSAGES:', messages);
      const messagesForApi = [...messages, userMessage];
      console.log('🔥 MESSAGES FOR API CREATED:', messagesForApi);
      
      // Add message to UI state
      console.log('🔥 ABOUT TO ADD MESSAGE TO UI');
      console.log('🔥 CHECKING addMessage FUNCTION:', addMessage);
      console.log('🔥 TYPEOF addMessage:', typeof addMessage);
      addMessage(userMessage);
      console.log('🔥 MESSAGE ADDED TO UI SUCCESSFULLY');

      console.log('🔥 STARTING API CALL with instructions:', instructions);
      console.log('🔥 STARTING API CALL with system prompt:', taskSystemPrompt);
      console.log('🔥 CHECKING apiClient:', apiClient);
      console.log('🔥 CHECKING apiClient.sendChatStream:', apiClient.sendChatStream);
      console.log('🔥 TYPEOF apiClient.sendChatStream:', typeof apiClient.sendChatStream);
      
      try {
        console.log('🔥 CALLING apiClient.sendChatStream...');
        await apiClient.sendChatStream({
          messages: messagesForApi,
          system_prompt_suffix: taskSystemPrompt,
          only_n_most_recent_images: config.only_n_most_recent_images,
          tool_version: config.tool_version,
          max_tokens: config.output_tokens,
          thinking_budget: config.thinking ? config.thinking_budget : undefined,
          token_efficient_tools_beta: config.token_efficient_tools_beta,
        }, (event) => {
          console.log('🔥 Received event:', event.type);
        switch (event.type) {
          case 'text':
            streamingMessageRef.current += event.text;
            
            // FIX: Smarter thought tracking to avoid counting JSON fragments as separate steps
            if (event.text.trim()) {
              const stepNumber = addThought(event.text);
              
              // Add to session step logs
              addSessionStepLog(currentTaskNumber, 'thought', event.text);
              
              // Create thought for assistant text
              if (onThought) {
                console.log('Creating thought with step:', stepNumber, 'text:', event.text);
                onThought({
                  id: `thought-${Date.now()}-${Math.random()}`,
                  content: event.text,
                  timestamp: new Date().toLocaleTimeString(),
                  step: stepNumber
                });
              }
            }
            break;
          case 'message':
            // Handle assistant messages from the API
            if (event.role === 'assistant' && event.content) {
              streamingMessageRef.current += event.content;
              
              // Create thought for assistant text
              if (onThought && event.content.trim()) {
                const stepNumber = addThought(event.content);
                
                // Add to session step logs
                addSessionStepLog(currentTaskNumber, 'thought', event.content);
                
                console.log('Creating thought from message:', event.content);
                onThought({
                  id: `thought-${Date.now()}-${Math.random()}`,
                  content: event.content,
                  timestamp: new Date().toLocaleTimeString()
                });
              }
            }
            break;
          case 'tool_use':
            // Handle tool use events (when AI calls a tool)
            if (onAction && event.tool_name) {
              const toolDisplayName = event.tool_name.charAt(0).toUpperCase() + event.tool_name.slice(1).replace('_', ' ');
              let description = `Using ${toolDisplayName}`;
              let details = description;
              
              // Track action in execution report
              const actionRecord = {
                tool: event.tool_name,
                action: description,
                details: details,
                timestamp: new Date().toISOString()
              };
              
              // Track action in step-by-step execution
              const stepNumber = addAction(event.tool_name, description, details);
              
              if (event.tool_name === 'computer') {
                // Extract detailed computer action information
                if (event.tool_input && event.tool_input.action) {
                  const action = event.tool_input.action;
                  const input = event.tool_input;
                  
                  if (action === 'screenshot') {
                    description = 'Taking screenshot';
                    details = 'Taking screenshot';
                  } else if (action === 'left_click') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Clicking ${coords}`;
                    details = `Clicking at coordinates ${coords}`;
                  } else if (action === 'type') {
                    const text = input.text ? `"${input.text.substring(0, 30)}${input.text.length > 30 ? '...' : ''}"` : '[unknown text]';
                    description = `Typing ${text}`;
                    details = `Typing text: ${text}`;
                  } else if (action === 'key') {
                    const key = input.text || 'unknown key';
                    description = `Pressing ${key}`;
                    details = `Pressing key: ${key}`;
                  } else if (action === 'scroll') {
                    const direction = input.scroll_direction || 'unknown direction';
                    const amount = input.scroll_amount || 1;
                    description = `Scrolling ${direction} (${amount})`;
                    details = `Scrolling ${direction} ${amount} times`;
                  } else if (action === 'right_click') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Right clicking ${coords}`;
                    details = `Right clicking at coordinates ${coords}`;
                  } else if (action === 'double_click') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Double clicking ${coords}`;
                    details = `Double clicking at coordinates ${coords}`;
                  } else if (action === 'middle_click') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Middle clicking ${coords}`;
                    details = `Middle clicking at coordinates ${coords}`;
                  } else if (action === 'triple_click') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Triple clicking ${coords}`;
                    details = `Triple clicking at coordinates ${coords}`;
                  } else if (action === 'mouse_move') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Moving mouse to ${coords}`;
                    details = `Moving mouse to coordinates ${coords}`;
                  } else if (action === 'left_click_drag') {
                    const coords = input.coordinate ? `[${input.coordinate[0]}, ${input.coordinate[1]}]` : '[unknown coords]';
                    description = `Dragging to ${coords}`;
                    details = `Click and drag to coordinates ${coords}`;
                  } else if (action === 'cursor_position') {
                    description = 'Getting cursor position';
                    details = 'Getting current cursor position';
                  } else if (action === 'left_mouse_down') {
                    description = 'Mouse down';
                    details = 'Pressing left mouse button down';
                  } else if (action === 'left_mouse_up') {
                    description = 'Mouse up';
                    details = 'Releasing left mouse button';
                  } else if (action === 'hold_key') {
                    const key = input.text || 'unknown key';
                    const duration = input.duration || 0;
                    description = `Holding ${key} (${duration}s)`;
                    details = `Holding key ${key} for ${duration} seconds`;
                  } else if (action === 'wait') {
                    const duration = input.duration || 0;
                    description = `Waiting ${duration}s`;
                    details = `Waiting for ${duration} seconds`;
                  } else {
                    description = `Computer ${action}`;
                    details = `Computer action: ${action}`;
                  }
                } else {
                  description = 'Using computer';
                  details = 'Using computer tool';
                }
              } else if (event.tool_name === 'bash') {
                const command = event.tool_input?.command ? `"${event.tool_input.command.substring(0, 40)}${event.tool_input.command.length > 40 ? '...' : ''}"` : '[unknown command]';
                description = `Running ${command}`;
                details = `Running bash command: ${command}`;
              } else if (event.tool_name === 'js_inspector' || event.tool_name === 'inspect_js') {
                // Capture the JavaScript code for later use in inspector panel
                const jsCode = event.tool_input?.code || 'JavaScript code';
                setLastJsCode(jsCode);
                
                description = 'Executing JavaScript';
                details = `Executing JavaScript: ${jsCode.substring(0, 50)}${jsCode.length > 50 ? '...' : ''}`;
              } else if (event.tool_name === 'mongodb_reporter') {
                description = 'Reporting to database';
                details = 'Reporting task result to database';
              }
              
              // Update action record with finalized description
              actionRecord.action = description;
              actionRecord.details = details;
              
              // Add to session step logs
              addSessionStepLog(currentTaskNumber, 'action', description);
              
              // Add to execution report
              setCurrentExecutionReport(prev => ({
                ...prev,
                actions_taken: [...(prev.actions_taken || []), actionRecord]
              }));
              
              console.log('Creating action with step:', stepNumber, 'tool:', event.tool_name, 'description:', description);
              onAction({
                id: `action-${Date.now()}-${Math.random()}`,
                content: description,
                action: toolDisplayName,
                details: details,
                status: 'running',
                timestamp: new Date().toLocaleTimeString(),
                step: stepNumber
              });
            }
            break;
          case 'tool_result':
            // Handle tool results (no actions - those are created on tool_use)
            
            if (event.base64_image) {
              if (onScreenshotAdded) {
                onScreenshotAdded(event.base64_image);
              }
              
              // Track screenshot in execution report
              setCurrentExecutionReport(prev => ({
                ...prev,
                screenshots: [...(prev.screenshots || []), event.base64_image]
              }));
              
              // Track screenshot in step-by-step execution
              const stepNumber = addScreenshot(event.base64_image);
              
              // Add to session step logs
              addSessionStepLog(currentTaskNumber, 'screenshot', `data:image/png;base64,${event.base64_image}`);
            }
            
            // Handle js_inspector and inspect_js tool results (both output and error cases)
            if ((event.output || event.error) && (event.tool_name === 'js_inspector' || event.tool_name === 'inspect_js' || (event.output && event.output.includes('JavaScript execution')))) {
              try {
                let result;
                
                // For inspect_js tool, the output is the direct result, and we use the captured code
                if (event.tool_name === 'inspect_js') {
                  result = {
                    code: lastJsCode || 'JavaScript code',
                    result: event.output || 'Error occurred',
                    resultType: 'text',
                    error: event.error
                  };
                } else {
                  // For js_inspector, try to parse JSON first
                  try {
                    result = JSON.parse(event.output);
                  } catch {
                    if (event.output.includes('Result:') || event.output.includes('JavaScript execution')) {
                      result = {
                        code: 'JavaScript execution',
                        result: event.output,
                        resultType: 'text'
                      };
                    } else {
                      result = {
                        code: 'Unknown',
                        result: event.output,
                        resultType: 'text'
                      };
                    }
                  }
                }
                
                const jsResult = {
                  code: result.code || 'JavaScript execution',
                  operation: event.tool_name === 'inspect_js' ? 'inspect_js' : 'js_inspector',
                  result: result.result || event.output,
                  resultType: result.resultType || 'unknown',
                  timestamp: new Date().toISOString(),
                  error: result.error
                };
                
                setJsInspectorResult(jsResult);
                
                // Track JS validation in execution report
                setCurrentExecutionReport(prev => ({
                  ...prev,
                  js_validation: {
                    expression: jsResult.code,
                    success: !jsResult.error && jsResult.result !== undefined,
                    result: jsResult.result,
                    error: jsResult.error
                  },
                  // Also capture the raw tool output
                  tool_outputs: [...(prev.tool_outputs || []), {
                    tool: event.tool_name, // Use actual tool name (js_inspector or inspect_js)
                    output: event.output,
                    timestamp: new Date().toISOString()
                  }]
                }));
                
                if (onJsInspectorUpdate) {
                  onJsInspectorUpdate();
                }
              } catch (parseError) {
                console.warn('Failed to parse js_inspector result:', parseError);
                
                setJsInspectorResult({
                  code: 'JavaScript execution',
                  result: event.output,
                  resultType: 'text',
                  timestamp: new Date().toISOString(),
                  error: (parseError as Error).message
                });
                
                if (onJsInspectorUpdate) {
                  onJsInspectorUpdate();
                }
              }
            }
            
            // Handle inspect_network tool results
            if (event.output && event.tool_name === 'inspect_network') {
              try {
                let networkResult;
                
                // Try to parse structured data from the output
                if (event.output.includes('<inspector>')) {
                  const startMarker = '<inspector>';
                  const endMarker = '</inspector>';
                  const startIndex = event.output.indexOf(startMarker);
                  const endIndex = event.output.indexOf(endMarker);
                  
                  if (startIndex !== -1 && endIndex !== -1) {
                    const structuredDataStr = event.output.slice(
                      startIndex + startMarker.length,
                      endIndex
                    ).trim();
                    
                    try {
                      networkResult = JSON.parse(structuredDataStr);
                    } catch {
                      // Fall back to basic parsing
                      networkResult = {
                        requests: [],
                        operation: 'Network monitoring',
                        error: 'Failed to parse structured data'
                      };
                    }
                  }
                } else {
                  // Basic parsing for non-structured output
                  networkResult = {
                    requests: [],
                    operation: 'Network monitoring',
                    rawOutput: event.output
                  };
                }
                
                const finalNetworkResult = {
                  requests: networkResult.requests || [],
                  operation: networkResult.operation || 'Network monitoring',
                  timestamp: new Date().toISOString(),
                  error: networkResult.error
                };
                
                setNetworkInspectorResult(finalNetworkResult);
                
                // Track network monitoring in execution report
                setCurrentExecutionReport(prev => ({
                  ...prev,
                  tool_outputs: [...(prev.tool_outputs || []), {
                    tool: 'inspect_network',
                    output: event.output,
                    timestamp: new Date().toISOString()
                  }]
                }));
                
                if (onNetworkInspectorUpdate) {
                  onNetworkInspectorUpdate();
                }
              } catch (parseError) {
                console.warn('Failed to parse inspect_network result:', parseError);
                
                setNetworkInspectorResult({
                  requests: [],
                  operation: 'Network monitoring',
                  timestamp: new Date().toISOString(),
                  error: (parseError as Error).message
                });
                
                if (onNetworkInspectorUpdate) {
                  onNetworkInspectorUpdate();
                }
              }
            }
            
            // Capture tool outputs for all tools (except js_inspector/inspect_js and inspect_network which are handled above)
            if ((event.output || event.error) && event.tool_name !== 'js_inspector' && event.tool_name !== 'inspect_js' && event.tool_name !== 'inspect_network') {
              setCurrentExecutionReport(prev => ({
                ...prev,
                tool_outputs: [...(prev?.tool_outputs || []), {
                  tool: event.tool_name || 'unknown',
                  output: event.output || event.error || '',
                  timestamp: new Date().toISOString()
                }]
              }));
            }
            
            // Only add tool messages to UI for certain tools, not js_inspector instructions
            if (event.output || event.error) {
              // Don't show js_inspector/inspect_js tool results to user (they're shown in inspector panel)
            }
            break;
          case 'error':
            hasStreamErrors = true;
            console.error('Stream error:', event.error);
            break;
          case 'done':
            // Stream completed successfully
            console.log('🔥 Stream completed');
            break;
        }
        });
        
        console.log('🔥 sendChatStream completed successfully');
      } catch (error) {
        console.error('🔥 ERROR in sendChatStream call:', error);
        throw error;
      }

      if (streamingMessageRef.current) {
        addMessage({
          role: 'assistant',
          content: streamingMessageRef.current
        });
        
        // Determine final status based on various failure conditions
        let finalStatus: Task['status'] = 'passed';
        
        // Check for various failure conditions
        if (hasStreamErrors || hasToolErrors) {
          finalStatus = 'failed';
        } else if (currentExecutionReport.js_validation) {
          finalStatus = currentExecutionReport.js_validation.success ? 'passed' : 'failed';
        } else if (streamingMessageRef.current.toLowerCase().includes('task failed') || 
                   streamingMessageRef.current.toLowerCase().includes('step failed') ||
                   streamingMessageRef.current.toLowerCase().includes('execution failed') ||
                   streamingMessageRef.current.toLowerCase().includes('could not complete') ||
                   streamingMessageRef.current.toLowerCase().includes('unable to complete')) {
          finalStatus = 'failed';
        }
        
        // Set final result in execution report
        const finalExecutionReport = {
          ...currentExecutionReport,
          final_result: streamingMessageRef.current
        };
        
        // Only mark task as completed if we got an actual response
        console.log('🔥 SAVING TASK WITH LABEL:', task.label, 'ID:', task.id);
        await fetch(`${API_BASE_URL}/tasks/${task.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...task, // Preserve all task fields including label
            result: streamingMessageRef.current,
            execution_report: finalExecutionReport,
            status: finalStatus,
            completed_at: new Date().toISOString()
          })
        });
        
        // Update local task status and store completed task for report
        setTasks(prevTasks => {
          const updatedTasks = prevTasks.map(t => {
            if (t.id === task.id) {
              completedTaskForReport = { 
                ...t, 
                status: finalStatus, 
                completed_at: new Date().toISOString(),
                execution_report: finalExecutionReport,
                result: streamingMessageRef.current
              };
              return completedTaskForReport;
            }
            return t;
          });
          return updatedTasks;
        });
        
        // FIX: Handle next task continuation HERE in success path
        console.log('🔥 TASK COMPLETION CHECK:', {
          isBatchRun,
          autoRunning,
          condition: isBatchRun || autoRunning,
          taskId: task.id
        });
        
        // Continue to next task if auto-running or batch mode
        if (isBatchRun || autoRunning) {
          console.log('🔥 TASK COMPLETED - CURRENT QUEUE:', [...taskQueue]);
          console.log('🔥 TASKS REMAINING AFTER COMPLETION:', taskQueue.filter(id => id !== task.id));
          runAllLogger.info('executeTaskWithVariables-success', 'Task completed, processing next in sequence');
          
          // Process next task immediately - no complex state updates
          setTimeout(async () => {
            try {
              // Simply process the next task in the queue
              console.log('🔥 PROCESSING NEXT TASK IN QUEUE');
              await processNextTaskInQueue();
            } catch (error) {
              console.error('🔥 ERROR PROCESSING NEXT TASK:', error);
              setAutoRunning(false);
              setIsAnyTaskRunning(false);
              setIsBatchRun(false);
            }
          }, 1000); // Shorter delay
        }
      } else {
        console.log('No response received - not marking task as complete');
      }

    } catch (error) {
      runAllLogger.error('executeTaskWithVariables-error', 'Error executing task', {
        taskId: task.id,
        error: String(error),
        autoRunning,
        isBatchRun
      });
      
      // Set error in execution report
      const errorExecutionReport = {
        ...currentExecutionReport,
        final_result: null,
        error: String(error)
      };
      
      // Mark task as failed
      try {
        await fetch(`${API_BASE_URL}/tasks/${task.id}/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: String(error),
            execution_report: errorExecutionReport
          })
        });
        runAllLogger.info('executeTaskWithVariables-error', 'Task marked as failed in database', {
          taskId: task.id
        });
      } catch (apiError) {
        runAllLogger.error('executeTaskWithVariables-error', 'Failed to update task status in database', {
          taskId: task.id,
          apiError: String(apiError)
        });
      }
      
      // Update local task status
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            status: 'error' as const, 
            error: String(error),
            execution_report: errorExecutionReport 
          } : t
        )
      );
      
      // Set completed task for report even if it failed
      completedTaskForReport = {
        ...task,
        status: 'error' as const,
        error: String(error),
        execution_report: errorExecutionReport
      };
    } finally {
      runAllLogger.debug('executeTaskWithVariables-finally', 'Task execution cleanup starting', {
        taskId: task.id,
        completedTaskExists: !!completedTaskForReport,
        autoRunning,
        isBatchRun,
        isProcessingNextTask
      });
      
      setIsLoading(false);
      streamingMessageRef.current = '';
      setCurrentTask(null);
      
      // Notify parent when task completes
      if (onTaskComplete) {
        runAllLogger.debug('executeTaskWithVariables-finally', 'Notifying parent of task completion');
        onTaskComplete(completedTaskForReport);
      }
      
      // Refresh tasks
      try {
        await fetchTasks();
        runAllLogger.debug('executeTaskWithVariables-finally', 'Tasks refreshed successfully');
        
        // Additional safety check: if no tasks are running and queue is empty, ensure states are cleared
        setTimeout(() => {
          if (taskQueue.length === 0 && !tasks.some(t => t.status === 'running')) {
            console.log('🔥 SAFETY CHECK: Clearing all running states');
            setIsAnyTaskRunning(false);
            setAutoRunning(false);
            setIsBatchRun(false);
            setCurrentTask(null);
          }
        }, 500); // Increased timeout to ensure all state updates complete
      } catch (fetchError) {
        runAllLogger.error('executeTaskWithVariables-finally', 'Failed to refresh tasks', {
          error: String(fetchError)
        });
      }
      
      // Clean up browser state only (preserve UI for inspection)
      try {
        await cleanupBrowserOnly();
        runAllLogger.debug('executeTaskWithVariables-finally', 'Browser cleanup completed, UI preserved for inspection');
      } catch (cleanupError) {
        runAllLogger.error('executeTaskWithVariables-finally', 'Cleanup between tasks failed', {
          error: String(cleanupError)
        });
      }
      
      // Check remaining tasks in queue (more reliable than checking database state)
      const remainingTasksInQueue = taskQueue.length;
      
      // Determine if we should continue automatically based on initial queue size
      const isBatchMode = initialQueueSize > 1;
      // Use task queue as the authoritative source for remaining work
      const shouldContinueAutomatically = isBatchMode && remainingTasksInQueue > 0;
      
      runAllLogger.info('executeTaskWithVariables-completion', 'Task completion logic', {
        initialQueueSize,
        currentQueueLength: taskQueue.length,
        remainingTasksInQueue,
        isBatchMode,
        shouldContinueAutomatically,
        completedTaskId: task.id,
        autoRunning,
        isBatchRun
      });
      
      if (shouldContinueAutomatically) {
        runAllLogger.info('executeTaskWithVariables-completion', 'Batch mode: automatically processing next task');
        
        // Log the current state before processing next task
        runAllLogger.logQueueState('executeTaskWithVariables-before-next', {
          taskQueue,
          autoRunning,
          isLoading,
          currentTask,
          isAnyTaskRunning,
          isBatchRun,
          completedTaskForReport
        });
        
        // Batch mode: automatically continue to next task
        console.log('🔥 COMPLETION: About to call processNextTaskInQueue', {
          currentQueueLength: taskQueue.length,
          remainingTasksInQueue,
          taskQueue: [...taskQueue]
        });
        await processNextTaskInQueue();
      } else {
        // Single mode: pause and preserve UI for inspection
        runAllLogger.info('executeTaskWithVariables-completion', 'Single mode: pausing for inspection, UI preserved');
        setIsAnyTaskRunning(false);
        
        runAllLogger.info('🔥 BATCH MODE DEBUG', 'SINGLE MODE PATH', {
          initialQueueSize,
          isBatchMode,
          completedTaskForReport: !!completedTaskForReport,
          willShowModal: !!(completedTaskForReport && !isBatchMode)
        });
        
        // NEVER show task report automatically - only when eye icon is clicked
        runAllLogger.info('🔥 TASK COMPLETED', 'Task execution report available - click eye icon to view');
      }
    }
  };

  // Execute a single task using the simple queue
  const executeTask = async (task: Task) => {
    console.log('🔥 SINGLE TASK RUN CLICKED:', task.id);
    
    // Set up single task execution
    setAutoRunning(true);
    setIsAnyTaskRunning(true);
    setIsBatchRun(false);
    setInitialQueueSize(1);
    
    console.log('🔥 STARTING SINGLE TASK EXECUTION:', task.id);
    
    // Execute the task directly
    try {
      await executeTaskWithVariables(task, taskVariables);
    } catch (error) {
      console.error('🔥 ERROR executing single task:', error);
      setAutoRunning(false);
      setIsAnyTaskRunning(false);
    }
  };

  // Handle variable modal submission for single task
  const handleSingleTaskVariables = async (variables: Record<string, string>) => {
    if (currentTaskForVariables) {
      setTaskVariables(variables);
      await executeTaskWithVariables(currentTaskForVariables, variables);
      setCurrentTaskForVariables(null);
    }
  };

  // Handle variable modal submission for all tasks
  const handleAllTasksVariables = async (variables: Record<string, string>) => {
    runAllLogger.info('handleAllTasksVariables', 'Setting variables and starting execution', { variables });
    setTaskVariables(variables);
    setAutoRunning(true);
    
    runAllLogger.logQueueState('handleAllTasksVariables', {
      taskQueue,
      autoRunning: true,
      isLoading,
      currentTask,
      isAnyTaskRunning,
      isBatchRun
    });
    
    // Start with the first pending task with variables, the queue will handle the rest
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const firstTask = pendingTasks[0];
    if (firstTask) {
      runAllLogger.logTaskExecution('handleAllTasksVariables', 'starting first task with variables', firstTask.id);
      await executeTaskWithVariables(firstTask, variables);
    } else {
      runAllLogger.error('handleAllTasksVariables', 'No first task found');
      setAutoRunning(false);
    }
  };

  // Close variable modal
  const closeVariableModal = () => {
    setShowVariableModal(false);
    setCurrentTaskForVariables(null);
    // Don't set isBatchRun(false) here - keep it true for queue processing
  };
  

  // Simple queue processor
  const processQueue = async () => {
    runAllLogger.info('processQueue', `🔥 CALLED - Queue length: ${taskQueue.length}`);
    
    if (taskQueue.length === 0) {
      runAllLogger.info('processQueue', '🔥 QUEUE EMPTY - STOPPING ALL RUNNING');
      setAutoRunning(false);
      setIsAnyTaskRunning(false);
      setIsBatchRun(false);
      return;
    }
    
    // Get next task ID and pop it off
    const nextTaskId = taskQueue[0];
    runAllLogger.info('processQueue', `🔥 Next task ID: ${nextTaskId}`);
    setTaskQueue(prev => prev.slice(1)); // Pop off the first ID
    
    // Find the task
    const task = tasks.find(t => t.id === nextTaskId);
    if (!task) {
      runAllLogger.error('processQueue', `🔥 TASK NOT FOUND: ${nextTaskId}`, {
        availableTaskIds: tasks.map(t => t.id)
      });
      processQueue(); // Continue with next
      return;
    }
    
    runAllLogger.info('processQueue', `🔥 Processing task: ${task.id}, remaining: ${taskQueue.length - 1}`);
    
    // Execute the task
    await executeTaskWithVariables(task);
    
    // Process next task in queue (executeTaskWithVariables handles completion)
    setTimeout(() => processQueue(), 1000);
  };

  // Start auto-running ALL tasks
  const startAutoRun = async () => {
    runAllLogger.info('startAutoRun', '🔥 RUN ALL BUTTON CLICKED');
    
    // First ensure we have fresh task data
    await fetchTasks();
    
    // Get only pending tasks to avoid re-running completed ones
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    const allTaskIds = pendingTasks.map(task => task.id);
    runAllLogger.info('startAutoRun', `🔥 Found ${allTaskIds.length} pending tasks`, { taskIds: allTaskIds });
    
    if (allTaskIds.length === 0) {
      runAllLogger.warn('startAutoRun', '🔥 NO PENDING TASKS TO RUN');
      return;
    }
    
    // Set up queue with ALL pending task IDs
    clearTaskQueue();
    allTaskIds.forEach(taskId => addToTaskQueue(taskId));
    setAutoRunning(true);
    setIsBatchRun(true);
    setInitialQueueSize(allTaskIds.length);
    setIsAnyTaskRunning(true);
    
    runAllLogger.info('startAutoRun', '🔥 Queue populated, starting first task execution');
    
    // Execute the first task directly
    const firstTask = pendingTasks[0];
    if (firstTask) {
      console.log('🔥 STARTING FIRST TASK DIRECTLY:', firstTask.id);
      try {
        await executeTaskWithVariables(firstTask, taskVariables);
      } catch (error) {
        console.error('🔥 ERROR executing first task:', error);
        runAllLogger.error('startAutoRun', 'Failed to execute first task', { error: String(error) });
        // Reset states on error
        setAutoRunning(false);
        setIsBatchRun(false);
        setIsAnyTaskRunning(false);
      }
    } else {
      runAllLogger.error('startAutoRun', 'No first task found despite having task IDs');
      setAutoRunning(false);
      setIsBatchRun(false);
      setIsAnyTaskRunning(false);
    }
  };

  // Stop auto-running
  const stopAutoRun = () => {
    runAllLogger.warn('stopAutoRun', 'Manually stopping auto-run');
    
    runAllLogger.logQueueState('stopAutoRun', {
      taskQueue,
      autoRunning,
      isLoading,
      currentTask,
      isAnyTaskRunning,
      isBatchRun
    });
    
    setAutoRunning(false);
    setIsAnyTaskRunning(false);
    setIsBatchRun(false);
    setIsAgentStarting(false);
    
    // Also clear current task if it's not actually running
    if (currentTask && !isLoading) {
      runAllLogger.info('stopAutoRun', 'Clearing stuck current task', {
        currentTaskId: currentTask.id
      });
      setCurrentTask(null);
    }
    
    // Clear task queue
    clearTaskQueue();
    
    runAllLogger.info('stopAutoRun', 'Auto-run stopped successfully');
  };

  // Stop current task
  const stopCurrentTask = async () => {
    if (currentTask) {
      try {
        await fetch(`${API_BASE_URL}/tasks/${currentTask.id}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Update local task status
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === currentTask.id ? { ...t, status: 'pending' as const } : t
          )
        );
      } catch (error) {
        console.error('Failed to stop task:', error);
      }
    }
    
    setCurrentTask(null);
    setIsLoading(false);
    setAutoRunning(false);
    streamingMessageRef.current = '';
  };

  // Save steps to MongoDB
  const saveSteps = async (taskId: string, steps: string[], label?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instructions: steps,
          label: label
        })
      });
      
      if (response.ok) {
        // Update local tasks with array format
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId ? { ...t, instructions: steps, label: label } : t
          )
        );
      } else {
        throw new Error('Failed to save steps');
      }
    } catch (error) {
      console.error('Error saving steps:', error);
      throw error;
    }
  };

  // Create new task
  const createTask = async (instructions: string[], label?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instructions: instructions,
          label: label
        })
      });
      
      if (response.ok) {
        // Refresh tasks to show the new task
        await fetchTasks();
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Refresh tasks to show updated list
        await fetchTasks();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // Handle delete with confirmation
  const handleDeleteTask = (task: Task) => {
    const taskLabel = task.label || `Task ${task.id.substring(0, 8)}`;
    const confirmed = window.confirm(`Are you sure you want to delete "${taskLabel}"?\n\nThis action cannot be undone.`);
    if (confirmed) {
      deleteTask(task.id);
    }
  };

  // Load tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Removed safety mechanism - deterministic code doesn't need backup systems

  // Status configuration for flexible status handling
  const statusConfig = {
    pending: { color: 'bg-zinc-700', textColor: 'text-gray-300', label: 'PENDING' },
    running: { color: 'bg-yellow-500', textColor: 'text-yellow-300', label: 'RUNNING', animated: true },
    passed: { color: 'bg-green-500', textColor: 'text-green-300', label: 'PASSED' },
    completed: { color: 'bg-green-500', textColor: 'text-green-300', label: 'PASSED' }, // backward compatibility
    failed: { color: 'bg-red-500', textColor: 'text-red-300', label: 'FAILED' },
    error: { color: 'bg-red-500', textColor: 'text-red-300', label: 'ERRORED' },
  };

  const getStatusConfig = (task: Task) => {
    let status = task.status;
    
    // Handle validation-based status override
    if ((status === 'passed' || status === 'completed') && task.execution_report?.js_validation) {
      status = task.execution_report.js_validation.success ? 'passed' : 'failed';
    }
    
    return statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-500',
      textColor: 'text-gray-300',
      label: 'UNKNOWN'
    };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const getInstructionsText = (instructions: string[] | null) => {
    if (!instructions || !Array.isArray(instructions)) {
      return 'No instructions';
    }
    // FIX: Join with better spacing for display
    return instructions.join(' → ');
  };

  const getModalStyles = () => {
    switch (panelMode) {
      case 'maximized':
        return 'fixed top-[100px] inset-x-0 bottom-0 z-[60] w-full';
      case 'default':
        return 'fixed inset-4 z-[60] w-auto h-auto max-w-4xl max-h-[80vh] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'minimized':
        return 'hidden'; // Completely hide when minimized
      default:
        return 'fixed inset-0 z-[60] w-full h-full';
    }
  };

  return (
    <div className={`${getModalStyles()} bg-zinc-900 border border-zinc-600 rounded-lg overflow-hidden shadow-2xl`} style={{backgroundColor: '#18181b'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-600 bg-zinc-800" style={{backgroundColor: '#27272a'}}>
        <h2 className="text-white text-lg font-medium">Task Runner</h2>
        <div className="flex items-center gap-2">
          {/* Only minimize button */}
          <button
            onClick={() => setPanelMode('minimized')}
            className="text-white hover:text-gray-300 p-1 transition-colors"
            title="Minimize"
          >
            {getMinimizeIcon()}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col max-h-[calc(100vh-150px)]">
        {/* Controls - hidden when minimized */}
        {panelMode !== 'minimized' && (
          <div className="p-4 border-b border-zinc-600">
            <div className="flex items-center gap-3 flex-wrap">
              {(taskQueue.length > 0 || isAnyTaskRunning || tasks.some(t => t.status === 'running')) && (
                <button
                  onClick={stopAutoRun}
                  className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => {
                  setStepEditorTask(null); // null means creating new task
                  setShowTaskCreator(true);
                }}
                disabled={isLoading || isAnyTaskRunning}
                className="px-3 py-2 text-sm bg-transparent hover:bg-pink-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded border border-zinc-600 transition-colors"
              >
                Add Task
              </button>
              <div className="text-sm text-gray-400 ml-4 flex-1 min-w-0">
                {!API_BASE_URL ? 'API not configured' :
                 currentTask ? `Running: ${getInstructionsText(currentTask.instructions).substring(0, 50)}...` : 
                 isAgentStarting ? 'Agent starting...' :
                 autoRunning ? 'Waiting for next task...' : 'Idle'}
              </div>
            </div>

          </div>
        )}

        {/* Tasks Table - hidden when minimized */}
        {panelMode !== 'minimized' && (
          <div className="flex-1 overflow-y-auto m-6">
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-gray-500">
                {!API_BASE_URL ? (
                  <div>
                    <div className="text-red-500">API not configured</div>
                    <div className="text-sm mt-2">API_BASE_URL: {API_BASE_URL || 'undefined'}</div>
                  </div>
                ) : (
                  'No tasks found. Add tasks to MongoDB to get started.'
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Instructions</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Last Run</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Report</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`group border-b border-zinc-700 hover:bg-blue-900/30 transition-colors ${
                        currentTask?.id === task.id ? 'bg-zinc-700/50 ring-1 ring-zinc-500' : ''
                      } ${
                        task.status === 'running' ? 'animate-pulse' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">
                          {task.label ? (
                            <span className="text-blue-300 font-medium">{task.label}</span>
                          ) : (
                            <span className="text-gray-500 italic">No name</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          onClick={() => {
                            if (task && task.id) {
                              setStepEditorTask(task);
                            }
                          }}
                          className="text-sm text-white max-w-md cursor-pointer hover:bg-blue-900/30 p-2 rounded transition-colors"
                          title="Click to edit steps"
                        >
                          {(() => {
                            const instructionsText = getInstructionsText(task.instructions);
                            return instructionsText.length > 100 ? 
                              `${instructionsText.substring(0, 100)}...` : 
                              instructionsText;
                          })()}
                        </div>
                        {task.error && (
                          <div className="text-xs text-red-400 mt-1 truncate">
                            Error: {task.error}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const config = getStatusConfig(task);
                            return (
                              <>
                                <div className={`w-3 h-3 rounded-full ${config.color} ${config.animated ? 'animate-pulse' : ''}`}></div>
                                <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
                                {task.status === 'running' && (
                                  <svg className="w-4 h-4 text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDate(task.last_run || task.started_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(task.execution_report || task.result || task.error || task.last_run) ? (
                          <button
                            onClick={() => setSelectedTaskReport(task)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-blue-900/30 rounded transition-colors"
                            title="View execution report"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => executeTask(task)}
                            disabled={isLoading || task.status === 'running' || isAnyTaskRunning}
                            className="px-3 py-1 text-sm bg-zinc-700 hover:bg-blue-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded transition-colors"
                          >
                            {task.status === 'running' ? (
                              <span className="flex items-center gap-2">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Running
                              </span>
                            ) : 'Run'}
                          </button>
                          
                          {/* Delete button - only visible on row hover */}
                          <button
                            onClick={() => handleDeleteTask(task)}
                            disabled={task.status === 'running'}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            title="Delete task"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {task.status === 'completed' && (
                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {task.status === 'error' && (
                            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      
        {/* Minimized state - show current task status */}
        {panelMode === 'minimized' && (
          <div className="flex-1 flex items-center px-4 py-3 text-sm text-gray-300">
            {currentTask ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Running: {getInstructionsText(currentTask.instructions).substring(0, 80)}...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span>{tasks.filter(t => t.status === 'pending').length} pending tasks</span>
              </div>
            )}
          </div>
        )}
      </div>
      

      
      {/* Step Editor - handles both creating and editing */}
      <StepEditor
        task={stepEditorTask}
        isOpen={!!stepEditorTask || showTaskCreator}
        onClose={() => {
          try {
            setStepEditorTask(null);
            setShowTaskCreator(false);
          } catch (error) {
            console.error('Error closing step editor:', error);
          }
        }}
        onSave={saveSteps}
        onCreate={createTask}
      />
      
      {/* Variable Input Modal */}
      <VariableInputModal
        isOpen={showVariableModal}
        onClose={closeVariableModal}
        onStart={isBatchRun ? handleAllTasksVariables : handleSingleTaskVariables}
        variables={
          isBatchRun 
            ? getAllVariablesFromTasks(tasks)
            : extractVariables(currentTaskForVariables?.instructions)
        }
        taskTitle={currentTaskForVariables?.id || 'All Tasks'}
        isRunningAll={isBatchRun}
      />
      
      {/* Test Execution Report Modal */}
      {selectedTaskReport && (
        <TestExecutionReportModal
          test={selectedTaskReport as any}
          isOpen={!!selectedTaskReport}
          onClose={() => setSelectedTaskReport(null)}
        />
      )}
    </div>
  );
}