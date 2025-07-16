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
    completeExecution 
  } = useTestRunner();
  
  const { 
    config, 
    messages, 
    setMessages, 
    addMessage
  } = useApp();
  
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
    
    console.log('🔥 TestRunner: Starting agent execution for test:', executingTest.name);
    
    // Listen for user messages to inject into the conversation
    const handleUserMessage = (event: CustomEvent) => {
      const userMessage = {
        role: 'user' as const,
        content: event.detail.message
      };
      console.log('🔥 Injecting user message into conversation:', event.detail.message);
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
    
    // Convert test steps to instructions
    console.log('🔥 Test steps raw:', executingTest.steps);
    console.log('🔥 Test steps type:', typeof executingTest.steps);
    console.log('🔥 Test steps length:', executingTest.steps?.length);
    
    const instructions = executingTest.steps.filter(step => step.trim() !== '');
    console.log('🔥 Filtered instructions:', instructions);
    
    if (instructions.length === 0) {
      console.log('No instructions to execute - test has no steps defined');
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
    const taskSystemPrompt = `
${config.custom_system_prompt || ''}

TASK ID: ${executingTest.id}
TASK NAME: ${executingTest.name}

You are executing a test with the following steps:
${instructions.map((instruction, i) => `${i + 1}. ${instruction}`).join('\n')}

Execute each step carefully and provide detailed feedback about what you're doing.

When you have completed all steps, use the mongodb_reporter tool to save the test result.
`;

    console.log('🔥 STARTING API CALL with instructions:', instructions);
    console.log('🔥 STARTING API CALL with system prompt:', taskSystemPrompt);
    console.log('🔥 CHECKING apiClient:', apiClient);
    console.log('🔥 CHECKING apiClient.sendChatStream:', apiClient.sendChatStream);
    console.log('🔥 TYPEOF apiClient.sendChatStream:', typeof apiClient.sendChatStream);
    console.log('🔥 CONFIG:', config);
    console.log('🔥 API KEY EXISTS:', !!config.api_key);
    console.log('🔥 CALLING apiClient.sendChatStream...');
    
    try {
      await apiClient.sendChatStream({
        messages: messagesForApi,
        system_prompt_suffix: taskSystemPrompt,
        only_n_most_recent_images: config.only_n_most_recent_images || 5,
        tool_version: config.tool_version || 'computer_20241022',
        max_tokens: config.output_tokens || 2000,
        thinking_budget: config.thinking ? config.thinking_budget : undefined,
        token_efficient_tools_beta: config.token_efficient_tools_beta,
      }, (event) => {
        console.log('🔥 Received event:', event.type, event);
        
        switch (event.type) {
          case 'text':
            streamingMessageRef.current += event.text || '';
            
            // Add to thoughts
            if (event.text?.trim()) {
              currentThoughtsRef.current = [...currentThoughtsRef.current, event.text];
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
            break;
            
          case 'tool_result':
            // Handle tool results, especially screenshots
            if (event.base64_image) {
              const screenshotData = `data:image/png;base64,${event.base64_image}`;
              currentScreenshotRef.current = screenshotData;
              currentScreenshotsRef.current = [...currentScreenshotsRef.current, screenshotData];
              updateExecutionData({ 
                screenshot: screenshotData,
                screenshots: [...currentScreenshotsRef.current],
                thoughts: [...currentThoughtsRef.current],
                actions: [...currentActionsRef.current]
              });
            }
            break;
            
          case 'done':
            console.log('🔥 Agent execution completed');
            
            // Cleanup event listener
            window.removeEventListener('userMessage', handleUserMessage as EventListener);
            
            // Add final assistant message
            if (streamingMessageRef.current) {
              addMessage({
                role: 'assistant',
                content: streamingMessageRef.current
              });
            }
            
            // Mark as completed but keep panel open for navigation
            completeExecution();
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