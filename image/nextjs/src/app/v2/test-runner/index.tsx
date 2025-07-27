'use client';

import React, { useEffect, useRef } from 'react';
import { useTestRunner } from './context';
import { useApp } from '@/app/context';
import { apiClient } from '@/lib/api-client';

export function TestRunner() {
  const { 
    runState, 
    executingTest, 
    updateExecutionData,
    stopExecution,
    completeExecution,
    setExecutionError 
  } = useTestRunner();
  
  const { 
    config, 
    messages, 
    setMessages, 
    addMessage
  } = useApp();

  // Helper function to log to server console
  const debugLog = async (level: string, message: string, data?: any) => {
    try {
      await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, data })
      });
    } catch (error) {
      console.error('Failed to send debug log:', error);
    }
  };
  
  const streamingMessageRef = useRef('');
  const currentThoughtsRef = useRef<string[]>([]);
  const currentActionsRef = useRef<string[]>([]);
  const currentScreenshotRef = useRef<string | null>(null);
  const currentScreenshotsRef = useRef<string[]>([]);

  useEffect(() => {
    if (runState === 'running' && executingTest) {
      executeTestWithAgent();
    }
  }, [runState, executingTest]);

  const executeTestWithAgent = async () => {
    if (!executingTest) return;
    
    // Starting agent execution
    
    // Listen for user messages to inject into the conversation
    const handleUserMessage = (event: CustomEvent) => {
      const userMessage = {
        role: 'user' as const,
        content: event.detail.message
      };
      // Injecting user message into conversation
      addMessage(userMessage);
    };
    
    window.addEventListener('userMessage', handleUserMessage as EventListener);
    
    // Reset state
    streamingMessageRef.current = '';
    currentThoughtsRef.current = [];
    currentActionsRef.current = [];
    currentScreenshotRef.current = null;
    currentScreenshotsRef.current = [];
    
    // Clear messages before starting
    setMessages([]);
    
    // Initialize test run as 'running' in database
    try {
      await fetch(`/api/v2/tests/${executingTest.id}/execution`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifacts: [],
          status: 'running'
        })
      });
      // Initialized test run as running
    } catch (error) {
      console.error('🔥 REAL-TIME: Failed to initialize test run:', error);
    }
    
    // Convert test steps to instructions
    // Processing test steps
    
    const instructions = executingTest.steps.filter(step => step.trim() !== '');
    // Filtered instructions processed
    
    if (instructions.length === 0) {
      // No instructions to execute - test has no steps defined
      await stopExecution();
      return;
    }

    // Create user message exactly like the working code
    const userMessage = {
      role: 'user' as const,
      content: `Execute this test: ${executingTest.name}

Test Instructions:
${instructions.map((instruction, i) => `${i + 1}. ${instruction}`).join('\n')}`
    };

    // Add user message to UI
    addMessage(userMessage);
    
    // Create messages array for API
    const messagesForApi = [userMessage];

    // Create system prompt exactly like working code
    const testSystemPrompt = `
${config.custom_system_prompt || ''}

TEST ID: ${executingTest.id}
TEST NAME: ${executingTest.name}

You are executing a test with the following steps:
${instructions.map((instruction, i) => `${i + 1}. ${instruction}`).join('\n')}

Execute each step carefully and provide detailed feedback about what you're doing.

When you have completed all steps, use the mongodb_reporter tool to save the test result with test_id="${executingTest.id}".
`;

    // Starting API call with configuration
    
    try {
      await apiClient.sendChatStream({
        messages: messagesForApi,
        system_prompt_suffix: testSystemPrompt,
        only_n_most_recent_images: config.only_n_most_recent_images || 5,
        tool_version: config.tool_version || 'computer_20241022',
        max_tokens: config.output_tokens || 2000,
        thinking_budget: config.thinking ? config.thinking_budget : undefined,
        token_efficient_tools_beta: config.token_efficient_tools_beta,
        test_id: executingTest.id,
      }, (event) => {
        // No console logging - use debug API instead
        
        switch (event.type) {
          case 'text':
            debugLog('info', '🔍 TEXT event received', { text: event.text });
            streamingMessageRef.current += event.text || '';
            
            // Add to thoughts
            if (event.text?.trim()) {
              currentThoughtsRef.current = [...currentThoughtsRef.current, event.text];
              debugLog('info', '🔍 Updated thoughts count', { count: currentThoughtsRef.current.length });
              updateExecutionData({ 
                thoughts: [...currentThoughtsRef.current],
                screenshot: currentScreenshotRef.current || undefined,
                screenshots: [...currentScreenshotsRef.current],
                actions: [...currentActionsRef.current]
              });
            }
            break;
            
          case 'message':
            // Handle assistant messages
            if (event.role === 'assistant' && event.content) {
              streamingMessageRef.current += event.content;
              
              // Add to thoughts
              if (event.content.trim()) {
                currentThoughtsRef.current = [...currentThoughtsRef.current, event.content];
                updateExecutionData({ 
                  thoughts: [...currentThoughtsRef.current],
                  screenshot: currentScreenshotRef.current || undefined,
                  screenshots: [...currentScreenshotsRef.current],
                  actions: [...currentActionsRef.current]
                });
              }
            }
            break;
            
          case 'tool_use':
            // Handle tool usage - create detailed action descriptions
            const toolName = event.tool_name || 'unknown';
            const toolInput = (event as any).input || {};
            
            let actionDescription = `Using ${toolName}`;
            
            if (toolName === 'computer') {
              const action = toolInput.action || 'unknown';
              
              switch (action) {
                case 'screenshot':
                  actionDescription = 'Taking screenshot';
                  break;
                case 'click':
                case 'left_click':
                  actionDescription = `Clicking at [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}]`;
                  break;
                case 'right_click':
                  actionDescription = `Right-clicking at [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}]`;
                  break;
                case 'double_click':
                  actionDescription = `Double-clicking at [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}]`;
                  break;
                case 'type':
                  actionDescription = `Typing: "${toolInput.text || ''}"`;
                  break;
                case 'key':
                  actionDescription = `Pressing key: ${toolInput.text || ''}`;
                  break;
                case 'scroll':
                  actionDescription = `Scrolling at [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}] direction: ${toolInput.direction || 'unknown'}`;
                  break;
                case 'mouse_move':
                  actionDescription = `Moving mouse to [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}]`;
                  break;
                case 'left_click_drag':
                  actionDescription = `Dragging from [${toolInput.coordinate?.[0] || 0}, ${toolInput.coordinate?.[1] || 0}] to [${toolInput.coordinate2?.[0] || 0}, ${toolInput.coordinate2?.[1] || 0}]`;
                  break;
                default:
                  actionDescription = `Computer: ${action}`;
              }
            } else if (toolName === 'bash') {
              actionDescription = `Running bash command: ${toolInput.command || ''}`;
            } else if (toolName === 'mongodb_reporter') {
              actionDescription = `Saving test result: ${toolInput.status || 'unknown'}`;
            }
            
            currentActionsRef.current = [...currentActionsRef.current, actionDescription];
            updateExecutionData({ 
              thoughts: [...currentThoughtsRef.current],
              screenshot: currentScreenshotRef.current || undefined,
              screenshots: [...currentScreenshotsRef.current],
              actions: [...currentActionsRef.current]
            });
            
            // SAVE ACTION ARTIFACTS IN REAL-TIME immediately when tool is used
            (async () => {
              try {
                const artifact = {
                  timestamp: new Date().toISOString(),
                  thought: actionDescription,
                  screenshotPath: currentScreenshotRef.current || undefined
                };
                
                await fetch(`/api/v2/tests/${executingTest.id}/execution`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    artifacts: [artifact],
                    status: 'running'
                  })
                });
                
                // Action artifact saved immediately
              } catch (error) {
                console.error('🔥 REAL-TIME: Failed to save action artifact:', error);
              }
            })();
            break;
            
          case 'tool_result':
            debugLog('info', '🔍 TOOL_RESULT event received', { hasImage: !!event.base64_image });
            // Handle tool results, especially screenshots
            if (event.base64_image) {
              debugLog('info', '🔍 Found screenshot in tool result');
              const screenshotData = `data:image/png;base64,${event.base64_image}`;
              currentScreenshotRef.current = screenshotData;
              currentScreenshotsRef.current = [...currentScreenshotsRef.current, screenshotData];
              debugLog('info', '🔍 Updated screenshots count', { count: currentScreenshotsRef.current.length });
              updateExecutionData({ 
                screenshot: screenshotData,
                screenshots: [...currentScreenshotsRef.current],
                thoughts: [...currentThoughtsRef.current],
                actions: [...currentActionsRef.current]
              });
              
              // SAVE ARTIFACTS IN REAL-TIME immediately when we get a screenshot
              (async () => {
                try {
                  const artifact = {
                    timestamp: new Date().toISOString(),
                    thought: currentThoughtsRef.current[currentThoughtsRef.current.length - 1] || 'Screenshot taken',
                    screenshotPath: screenshotData
                  };
                  
                  await fetch(`/api/v2/tests/${executingTest.id}/execution`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      artifacts: [artifact],
                      status: 'running'
                    })
                  });
                  
                  // Screenshot artifact saved immediately
                } catch (error) {
                  console.error('🔥 REAL-TIME: Failed to save screenshot artifact:', error);
                }
              })();
            }
            break;
            
          case 'done':
            // Agent execution completed
            
            // Cleanup event listener
            window.removeEventListener('userMessage', handleUserMessage as EventListener);
            
            // Add final assistant message
            if (streamingMessageRef.current) {
              addMessage({
                role: 'assistant',
                content: streamingMessageRef.current
              });
            }
            
            // Delay completion to allow final events to be processed
            setTimeout(() => {
              completeExecution();
            }, 2000); // Wait 2 seconds for any remaining events
            break;
            
          case 'error':
            console.error('🔥 Agent error:', event);
            
            // Cleanup event listener
            window.removeEventListener('userMessage', handleUserMessage as EventListener);
            
            // Check for credit balance error
            const errorMessage = event.message || '';
            const isCreditError = errorMessage.includes('credit balance is too low') || 
                                errorMessage.includes('Your credit balance is too low') ||
                                errorMessage.includes('Plans & Billing');
            
            if (isCreditError) {
              // Set credit error type to trigger full screen error display
              setExecutionError('credit');
            } else {
              // Add general error message
              if (streamingMessageRef.current) {
                addMessage({
                  role: 'assistant',
                  content: streamingMessageRef.current
                });
              } else {
                addMessage({
                  role: 'assistant', 
                  content: `❌ **Test Execution Failed**

${errorMessage || 'An unexpected error occurred during test execution.'}`
                });
              }
            }
            
            stopExecution();
            break;
        }
      });
    } catch (error) {
      console.error('🔥 Agent execution failed:', error);
      
      // Cleanup event listener
      window.removeEventListener('userMessage', handleUserMessage as EventListener);
      
      // Check for credit balance error
      const errorMessage = (error as any)?.message || error?.toString() || '';
      const isCreditError = errorMessage.includes('credit balance is too low') || 
                          errorMessage.includes('Your credit balance is too low') ||
                          errorMessage.includes('Anthropic API error: 400') ||
                          errorMessage.includes('Plans & Billing');
      
      if (isCreditError) {
        // Set credit error type to trigger full screen error display
        setExecutionError('credit');
      } else {
        // Add general error message
        if (streamingMessageRef.current) {
          addMessage({
            role: 'assistant',
            content: streamingMessageRef.current
          });
        } else {
          addMessage({
            role: 'assistant',
            content: `❌ **Test Execution Failed**

${errorMessage || 'An unexpected error occurred during test execution.'}`
          });
        }
      }
      
      stopExecution();
    }
  };

  return null; // This is a headless component that manages execution
}