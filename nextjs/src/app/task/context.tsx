'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StepTrackingState {
  currentStep: number;
  actions: Array<{
    tool: string;
    action: string;
    details: string;
    timestamp: string;
    step: number;
  }>;
  screenshots: Array<{
    image: string;
    timestamp: string;
    step: number;
  }>;
  thoughts: Array<{
    content: string;
    timestamp: string;
    step: number;
  }>;
}

interface Instruction {
  id: string;
  content: string;
  timestamp: string;
}

interface Action {
  id: string;
  action: string;
  details?: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
}

interface Thought {
  id: string;
  content: string;
  timestamp: string;
}

// Import Task from TaskRunnerContext
import type { Task } from '../task-runner/context';

interface TaskContextType {
  stepTracking: StepTrackingState;
  addThought: (content: string) => number;
  addAction: (tool: string, action: string, details: string) => number;
  addScreenshot: (image: string) => number;
  resetStepTracking: () => void;
  // Core data types (gets reset after each task)
  instructions: Instruction[];
  screenshots: string[];
  actions: Action[];
  thoughts: Thought[];
  setInstructions: (instructions: Instruction[]) => void;
  setScreenshots: (screenshots: string[]) => void;
  setActions: (actions: Action[]) => void;
  setThoughts: (thoughts: Thought[]) => void;
  addInstruction: (content: string) => void;
  addScreenshotToList: (image: string) => void;
  addActionToList: (action: string, details?: string, status?: Action['status']) => void;
  addThoughtToList: (content: string) => void;
  clearAllData: () => void;
  // UI state for individual task
  selectedScreenshot: number | null;
  setSelectedScreenshot: (index: number | null) => void;
  stepData: { [key: number]: { actions: any[], chat: any[] } };
  setStepData: (data: { [key: number]: { actions: any[], chat: any[] } }) => void;
  completedTask: Task | null;
  setCompletedTask: (task: Task | null) => void;
  showTaskReport: boolean;
  setShowTaskReport: (show: boolean) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [stepTracking, setStepTracking] = useState<StepTrackingState>({
    currentStep: 0,
    actions: [],
    screenshots: [],
    thoughts: []
  });

  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  
  // UI state for individual task
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
  const [stepData, setStepData] = useState<{ [key: number]: { actions: any[], chat: any[] } }>({});
  const [completedTask, setCompletedTask] = useState<Task | null>(null);
  const [showTaskReport, setShowTaskReport] = useState(false);

  const addThought = (content: string): number => {
    let stepNumber: number;
    setStepTracking(prev => {
      stepNumber = prev.currentStep;
      return {
        ...prev,
        thoughts: [...prev.thoughts, {
          content,
          timestamp: new Date().toISOString(),
          step: stepNumber
        }],
        currentStep: prev.currentStep + 1
      };
    });
    return stepNumber!;
  };

  const addAction = (tool: string, action: string, details: string): number => {
    let stepNumber: number;
    setStepTracking(prev => {
      stepNumber = prev.currentStep;
      return {
        ...prev,
        actions: [...prev.actions, {
          tool,
          action,
          details,
          timestamp: new Date().toISOString(),
          step: stepNumber
        }],
        currentStep: prev.currentStep + 1
      };
    });
    return stepNumber!;
  };

  const addScreenshot = (image: string): number => {
    let stepNumber: number;
    setStepTracking(prev => {
      stepNumber = prev.currentStep;
      return {
        ...prev,
        screenshots: [...prev.screenshots, {
          image,
          timestamp: new Date().toISOString(),
          step: stepNumber
        }],
        currentStep: prev.currentStep + 1
      };
    });
    return stepNumber!;
  };

  const resetStepTracking = () => {
    setStepTracking({
      currentStep: 0,
      actions: [],
      screenshots: [],
      thoughts: []
    });
  };


  const addInstruction = (content: string) => {
    setInstructions(prev => [...prev, {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString()
    }]);
  };

  const addScreenshotToList = (image: string) => {
    setScreenshots(prev => [...prev, image]);
  };

  const addActionToList = (action: string, details?: string, status: Action['status'] = 'completed') => {
    setActions(prev => [...prev, {
      id: Date.now().toString(),
      action,
      details,
      status,
      timestamp: new Date().toISOString()
    }]);
  };

  const addThoughtToList = (content: string) => {
    setThoughts(prev => [...prev, {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearAllData = () => {
    setInstructions([]);
    setScreenshots([]);
    setActions([]);
    setThoughts([]);
    resetStepTracking();
  };

  return (
    <TaskContext.Provider value={{
      stepTracking,
      addThought,
      addAction,
      addScreenshot,
      resetStepTracking,
      instructions,
      screenshots,
      actions,
      thoughts,
      setInstructions,
      setScreenshots,
      setActions,
      setThoughts,
      addInstruction,
      addScreenshotToList,
      addActionToList,
      addThoughtToList,
      clearAllData,
      selectedScreenshot,
      setSelectedScreenshot,
      stepData,
      setStepData,
      completedTask,
      setCompletedTask,
      showTaskReport,
      setShowTaskReport,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}