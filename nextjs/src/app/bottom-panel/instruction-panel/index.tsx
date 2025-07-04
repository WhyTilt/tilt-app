import React, { useState, useRef, useEffect } from 'react';
import { BottomPanel } from '../bottom-panel';
import { useApp } from '../../context';
import { apiClient, StreamEvent } from '@/lib/api-client';
import { ChatInput } from './input';
import { Instruction } from './instruction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface InstructionPanelProps {
  onScreenshotAdded?: (screenshot: string) => void;
  onSubmit?: () => void;
  inputOnly?: boolean;
  isInitialLoading?: boolean;
  initialPrompt?: string;
  taskId?: string;
  onStreamRequest?: (prompt: string) => Promise<void>;
}

export function InstructionPanel({ onScreenshotAdded, onSubmit, inputOnly = true, isInitialLoading = false, initialPrompt, taskId, onStreamRequest }: InstructionPanelProps) {
  const { config, messages, addMessage, isLoading, setIsLoading, setJsInspectorResult, onJsInspectorUpdate } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const streamingMessageRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Set initial prompt if provided
  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
      // For initialPrompt, TaskRunner has already submitted the message
      // so we don't need to auto-submit here, just display the prompt
    }
  }, [initialPrompt]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const promptToSend = inputValue.trim();
    
    // If we have a custom stream request handler, use it instead
    if (onStreamRequest) {
      setInputValue('');
      setIsLoading(true);
      
      // Call onSubmit to minimize chat
      if (onSubmit) {
        onSubmit();
      }
      
      try {
        await onStreamRequest(promptToSend);
      } catch (error) {
        addMessage({
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    const userMessage = {
      role: 'user' as const,
      content: promptToSend
    };
    
    // Add user message immediately
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage('');
    streamingMessageRef.current = '';
    
    // Call onSubmit to minimize chat
    if (onSubmit) {
      onSubmit();
    }
    
    try {
      await apiClient.sendChatStream({
        messages: [...messages, userMessage],
        system_prompt_suffix: config.custom_system_prompt,
        only_n_most_recent_images: config.only_n_most_recent_images,
        tool_version: config.tool_version,
        max_tokens: config.output_tokens,
        thinking_budget: config.thinking ? config.thinking_budget : undefined,
        token_efficient_tools_beta: config.token_efficient_tools_beta,
      }, (event: StreamEvent) => {
        switch (event.type) {
          case 'message':
            if (event.role === 'assistant' && event.content) {
              if (streamingMessageRef.current === '') {
                streamingMessageRef.current = event.content;
              } else {
                streamingMessageRef.current += event.content;
              }
              setStreamingMessage(streamingMessageRef.current);
            }
            break;
          case 'tool_use':
            if (streamingMessageRef.current) {
              addMessage({
                role: 'assistant',
                content: streamingMessageRef.current
              });
              setStreamingMessage('');
              streamingMessageRef.current = '';
            }
            
            addMessage({
              role: 'assistant',
              content: [{
                type: 'tool_use',
                name: event.tool_name,
                input: event.tool_input
              }]
            });
            break;
          case 'tool_result':
            if (event.base64_image) {
              if (onScreenshotAdded) {
                onScreenshotAdded(event.base64_image);
              }
            }
            
            // Handle js_inspector tool results specifically
            if (event.output && (event.tool_name === 'js_inspector' || event.output.includes('JavaScript execution'))) {
              console.log('js_inspector tool result detected:', { tool_name: event.tool_name, output: event.output });
              
              try {
                let result;
                
                // Try to parse as JSON first
                try {
                  result = JSON.parse(event.output);
                } catch {
                  // If not JSON, check if it contains JavaScript execution results
                  if (event.output.includes('Result:') || event.output.includes('JavaScript execution')) {
                    // Create a simple result object from the text output
                    result = {
                      code: 'JavaScript execution',
                      result: event.output,
                      resultType: 'text'
                    };
                  } else {
                    // Fallback: treat the entire output as the result
                    result = {
                      code: 'Unknown',
                      result: event.output,
                      resultType: 'text'
                    };
                  }
                }
                
                setJsInspectorResult({
                  code: result.code || 'JavaScript execution',
                  result: result.result || event.output,
                  resultType: result.resultType || 'unknown',
                  timestamp: new Date().toISOString(),
                  error: result.error
                });
                
                // Trigger inspector panel to maximize if minimized
                if (onJsInspectorUpdate) {
                  onJsInspectorUpdate();
                }
              } catch (parseError) {
                console.warn('Failed to parse js_inspector result:', parseError);
                
                // Fallback: just show the raw output
                setJsInspectorResult({
                  code: 'JavaScript execution',
                  result: event.output,
                  resultType: 'text',
                  timestamp: new Date().toISOString(),
                  error: parseError.message
                });
                
                if (onJsInspectorUpdate) {
                  onJsInspectorUpdate();
                }
              }
            }
            
            if (event.output || event.error) {
              const toolContent: any[] = [];
              
              if (event.output) {
                toolContent.push({
                  type: 'text',
                  text: event.output
                });
              }
              
              if (event.error) {
                toolContent.push({
                  type: 'text',
                  text: `Error: ${event.error}`
                });
              }
              
            }
            break;
          case 'done':
            if (streamingMessageRef.current) {
              addMessage({
                role: 'assistant',
                content: streamingMessageRef.current
              });
              setStreamingMessage('');
              streamingMessageRef.current = '';
            } else {
              addMessage({
                role: 'assistant',
                content: 'No response was generated. Please check your API configuration or try again.'
              });
            }
            break;
          case 'error':
            addMessage({
              role: 'assistant',
              content: `Error: ${event.message || 'Unknown error occurred'}`
            });
            break;
        }
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
      streamingMessageRef.current = '';
    }
  };

  return (
    <BottomPanel title={taskId ? `Instructions - Task ${taskId}` : "Instructions"}>
      <div className="flex flex-col h-full">
        {inputOnly ? (
          <>
            <div className="p-4">
              {initialPrompt ? (
                // Read-only instruction display for TaskRunner
                <div className="min-h-[60px] p-3 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {initialPrompt}
                  </div>
                </div>
              ) : (
                // Editable input for manual use
                <ChatInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                  placeholder="Enter the agent instructions here..."
                  disabled={isLoading || isInitialLoading}
                  isLoading={isInitialLoading}
                />
              )}
            </div>
          </>
        
        ) : (
          <>
            {/* Messages - scrollable area */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {messages
                .filter(message => message.role === 'user')
                .map((message, index) => (
                  <Instruction
                    key={index}
                    content={typeof message.content === 'string' ? message.content : 'User instruction'}
                  />
                ))}
              
              {/* Invisible div to mark the end of messages for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - locked to bottom */}
            <div className="flex-shrink-0 border-t border-gray-600">
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                placeholder="Agent task instructions"
                disabled={isLoading || isInitialLoading}
                isLoading={isInitialLoading}
              />
            </div>
          </>
        )}
      </div>
    </BottomPanel>
  );
}