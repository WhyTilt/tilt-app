'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Test {
  id: string;
  name: string;
  description?: string;
  suite_id: string;
  steps: string[];
  created_at: string;
  updated_at: string;
}

export interface ExecutionData {
  screenshot?: string;
  screenshots?: string[];
  thoughts?: string[];
  actions?: string[];
}

interface TestRunnerContextType {
  // Execution state
  runState: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  executingTest: Test | null;
  executionData: ExecutionData;
  errorType: 'credit' | 'general' | null;
  
  // UI state
  isExecutionPanelOpen: boolean;
  
  // Actions
  startExecution: (test: Test) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => Promise<void>;
  completeExecution: () => Promise<void>;
  setExecutionError: (errorType: 'credit' | 'general') => void;
  updateExecutionData: (data: ExecutionData) => void;
  setExecutionPanelOpen: (isOpen: boolean) => void;
  cleanupBrowserOnly: () => Promise<void>;
}

const TestRunnerContext = createContext<TestRunnerContextType | undefined>(undefined);

export function useTestRunner() {
  const context = useContext(TestRunnerContext);
  if (!context) {
    throw new Error('useTestRunner must be used within a TestRunnerProvider');
  }
  return context;
}

interface TestRunnerProviderProps {
  children: ReactNode;
}

export function TestRunnerProvider({ children }: TestRunnerProviderProps) {
  const [runState, setRunState] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [executingTest, setExecutingTest] = useState<Test | null>(null);
  const [executionData, setExecutionData] = useState<ExecutionData>({});
  const [errorType, setErrorType] = useState<'credit' | 'general' | null>(null);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState(false);

  const cleanupBrowserOnly = useCallback(async () => {
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
  }, []);

  const startExecution = useCallback((test: Test) => {
    setExecutingTest(test);
    setRunState('running');
    setIsExecutionPanelOpen(true);
    setExecutionData({});
    setErrorType(null);
  }, []);

  const setExecutionError = useCallback(async (errorType: 'credit' | 'general') => {
    setRunState('error');
    setErrorType(errorType);
    
    // Save execution artifacts even when errored
    if (executingTest && (executionData.thoughts?.length || executionData.screenshots?.length)) {
      try {
        const maxLength = Math.max(
          executionData.thoughts?.length || 0,
          executionData.screenshots?.length || 0
        );
        
        const artifacts = [];
        for (let i = 0; i < maxLength; i++) {
          artifacts.push({
            timestamp: new Date().toISOString(),
            thought: executionData.thoughts?.[i],
            screenshotPath: executionData.screenshots?.[i]
          });
        }

        await fetch(`/api/v2/tests/${executingTest.id}/execution`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifacts,
            status: 'error'
          })
        });
        
        console.log('Error execution artifacts saved successfully');
      } catch (error) {
        console.error('Failed to save error execution artifacts:', error);
      }
    }
  }, [executingTest, executionData]);

  const pauseExecution = useCallback(() => {
    if (runState === 'running') {
      setRunState('paused');
    }
  }, [runState]);

  const resumeExecution = useCallback(() => {
    if (runState === 'paused') {
      setRunState('running');
    }
  }, [runState]);

  const stopExecution = useCallback(async () => {
    setRunState('idle');
    setIsExecutionPanelOpen(false);
    setExecutingTest(null);
    setExecutionData({});
    setErrorType(null);
    
    // Cleanup browser state AFTER execution stops (like original implementation)
    try {
      await cleanupBrowserOnly();
      console.log('Browser cleanup completed after stopping execution');
    } catch (cleanupError) {
      console.error('Cleanup after stop failed:', cleanupError);
    }
  }, [cleanupBrowserOnly]);

  const completeExecution = useCallback(async () => {
    setRunState('completed');
    
    // Save execution artifacts if we have a test
    if (executingTest && (executionData.thoughts?.length || executionData.screenshots?.length)) {
      try {
        // Prepare artifacts array combining thoughts and screenshots
        const maxLength = Math.max(
          executionData.thoughts?.length || 0,
          executionData.screenshots?.length || 0
        );
        
        const artifacts = [];
        for (let i = 0; i < maxLength; i++) {
          artifacts.push({
            timestamp: new Date().toISOString(),
            thought: executionData.thoughts?.[i],
            screenshotPath: executionData.screenshots?.[i]
          });
        }

        // Save to MongoDB
        await fetch(`/api/v2/tests/${executingTest.id}/execution`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifacts,
            status: 'completed'
          })
        });
        
        console.log('Execution artifacts saved successfully');
      } catch (error) {
        console.error('Failed to save execution artifacts:', error);
      }
    }
    
    // Keep panel open and test data for navigation
    
    // Cleanup browser state AFTER execution completes (like original implementation)
    try {
      await cleanupBrowserOnly();
      console.log('Browser cleanup completed after test completion');
    } catch (cleanupError) {
      console.error('Cleanup after completion failed:', cleanupError);
    }
  }, [cleanupBrowserOnly, executingTest, executionData]);

  const updateExecutionData = useCallback((data: ExecutionData) => {
    setExecutionData(prevData => ({ ...prevData, ...data }));
  }, []);

  const setExecutionPanelOpen = useCallback((isOpen: boolean) => {
    setIsExecutionPanelOpen(isOpen);
  }, []);

  return (
    <TestRunnerContext.Provider
      value={{
        runState,
        executingTest,
        executionData,
        isExecutionPanelOpen,
        startExecution,
        pauseExecution,
        resumeExecution,
        stopExecution,
        completeExecution,
        updateExecutionData,
        setExecutionPanelOpen,
        cleanupBrowserOnly,
      }}
    >
      {children}
    </TestRunnerContext.Provider>
  );
}