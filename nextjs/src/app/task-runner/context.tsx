'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Task {
  id: string;
  instructions: string[] | null;
  label?: string;
  status: 'pending' | 'running' | 'passed' | 'completed' | 'error' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_run?: string;
  result?: any;
  error?: string;
  tool_use?: {
    tool: string;
    arguments: Record<string, any>;
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


export interface SessionStepLog {
  task: number;
  step: number;
  screenshot?: string;
  thought?: string;
  action?: string;
  timestamp: string;
}

interface TaskRunnerContextType {
  // Task variables and queue (persists across tasks)
  taskVariables: Record<string, string>;
  setTaskVariables: (variables: Record<string, string>) => void;
  taskQueue: string[];
  setTaskQueue: (queue: string[]) => void;
  addToTaskQueue: (taskId: string) => void;
  clearTaskQueue: () => void;
  // Auto-run state
  autoRunning: boolean;
  setAutoRunning: (running: boolean) => void;
  isAnyTaskRunning: boolean;
  setIsAnyTaskRunning: (running: boolean) => void;
  // Current task being executed
  currentTask: Task | null;
  setCurrentTask: (task: Task | null) => void;
  // Session step logs
  sessionStepLogs: SessionStepLog[];
  addSessionStepLog: (taskNumber: number, type: 'thought' | 'action' | 'screenshot', content: string) => void;
  clearSessionStepLogs: () => void;
}

const TaskRunnerContext = createContext<TaskRunnerContextType | undefined>(undefined);

export function TaskRunnerProvider({ children }: { children: ReactNode }) {
  // Task runner variables and queue (persists across tasks)
  const [taskVariables, setTaskVariablesInternal] = useState<Record<string, string>>({});
  const [taskQueue, setTaskQueue] = useState<string[]>([]);
  
  // Auto-run state
  const [autoRunning, setAutoRunning] = useState(false);
  const [isAnyTaskRunning, setIsAnyTaskRunning] = useState(false);
  
  // Current task being executed
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  
  // Session step logs
  const [sessionStepLogs, setSessionStepLogs] = useState<SessionStepLog[]>([]);
  const [sessionStepCounter, setSessionStepCounter] = useState(0);

  // Wrapper for setTaskVariables with debugging
  const setTaskVariables = (variables: Record<string, string>) => {
    console.log('🔥 TASK-RUNNER-CONTEXT - SETTING VARIABLES:', variables);
    setTaskVariablesInternal(variables);
  };

  const addToTaskQueue = (taskId: string) => {
    setTaskQueue(prev => [...prev, taskId]);
  };

  const clearTaskQueue = () => {
    setTaskQueue([]);
  };

  const addSessionStepLog = (taskNumber: number, type: 'thought' | 'action' | 'screenshot', content: string) => {
    setSessionStepLogs(prev => {
      // Find the most recent step for this task
      const currentTaskSteps = prev.filter(log => log.task === taskNumber);
      let currentStep = currentTaskSteps.length > 0 ? currentTaskSteps[currentTaskSteps.length - 1] : null;
      
      // Check if current step is complete (has all three: screenshot, thought, action)
      const isCurrentStepComplete = currentStep && 
        currentStep.screenshot && 
        currentStep.thought && 
        currentStep.action;
      
      if (!currentStep || isCurrentStepComplete) {
        // Create new step
        const newStepNumber = currentTaskSteps.length;
        const newLog: SessionStepLog = {
          task: taskNumber,
          step: newStepNumber,
          screenshot: type === 'screenshot' ? content : undefined,
          thought: type === 'thought' ? content : undefined,
          action: type === 'action' ? content : undefined,
          timestamp: new Date().toISOString()
        };
        return [...prev, newLog];
      } else {
        // Update existing step
        const updatedLogs = [...prev];
        const stepIndex = updatedLogs.findIndex(log => 
          log.task === taskNumber && log.step === currentStep!.step
        );
        
        if (stepIndex >= 0) {
          if (type === 'screenshot' && !updatedLogs[stepIndex].screenshot) {
            updatedLogs[stepIndex].screenshot = content;
          } else if (type === 'thought' && !updatedLogs[stepIndex].thought) {
            updatedLogs[stepIndex].thought = content;
          } else if (type === 'action' && !updatedLogs[stepIndex].action) {
            updatedLogs[stepIndex].action = content;
          }
        }
        
        return updatedLogs;
      }
    });
  };

  const clearSessionStepLogs = () => {
    setSessionStepLogs([]);
    setSessionStepCounter(0);
  };

  // Debug: Track taskVariables changes
  useEffect(() => {
    console.log('🔥 TASK-RUNNER-CONTEXT - VARIABLES STATE CHANGED:', taskVariables);
  }, [taskVariables]);

  return (
    <TaskRunnerContext.Provider value={{
      taskVariables,
      setTaskVariables,
      taskQueue,
      setTaskQueue,
      addToTaskQueue,
      clearTaskQueue,
      autoRunning,
      setAutoRunning,
      isAnyTaskRunning,
      setIsAnyTaskRunning,
      currentTask,
      setCurrentTask,
      sessionStepLogs,
      addSessionStepLog,
      clearSessionStepLogs,
    }}>
      {children}
    </TaskRunnerContext.Provider>
  );
}

export function useTaskRunner() {
  const context = useContext(TaskRunnerContext);
  if (context === undefined) {
    throw new Error('useTaskRunner must be used within a TaskRunnerProvider');
  }
  return context;
}