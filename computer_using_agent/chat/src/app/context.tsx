'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppConfig, ChatMessage } from '@/types';

interface JsInspectorResult {
  code: string;
  result: any;
  resultType: string;
  timestamp: string;
  error?: string;
}

interface NetworkInspectorResult {
  requests: any[];
  operation: string;
  timestamp: string;
  error?: string;
}

interface AppContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  jsInspectorResult: JsInspectorResult | null;
  setJsInspectorResult: (result: JsInspectorResult | null) => void;
  onJsInspectorUpdate?: () => void;
  setOnJsInspectorUpdate: (callback: (() => void) | undefined) => void;
  networkInspectorResult: NetworkInspectorResult | null;
  setNetworkInspectorResult: (result: NetworkInspectorResult | null) => void;
  onNetworkInspectorUpdate?: () => void;
  setOnNetworkInspectorUpdate: (callback: (() => void) | undefined) => void;
  viewMode: 'single' | 'dual';
  setViewMode: (mode: 'single' | 'dual') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isChatPoppedOut: boolean;
  setIsChatPoppedOut: (popped: boolean) => void;
  showVncPanel: boolean;
  setShowVncPanel: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultConfig: AppConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  api_key: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  only_n_most_recent_images: 3,
  custom_system_prompt: '',
  hide_images: false,
  token_efficient_tools_beta: false,
  tool_version: 'computer_use_20250124',
  output_tokens: 8192,
  thinking_budget: 8192,
  thinking: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jsInspectorResult, setJsInspectorResult] = useState<JsInspectorResult | null>(null);
  const [onJsInspectorUpdate, setOnJsInspectorUpdate] = useState<(() => void) | undefined>(undefined);
  const [networkInspectorResult, setNetworkInspectorResult] = useState<NetworkInspectorResult | null>(null);
  const [onNetworkInspectorUpdate, setOnNetworkInspectorUpdate] = useState<(() => void) | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'single' | 'dual'>('dual');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatPoppedOut, setIsChatPoppedOut] = useState(false);
  const [showVncPanel, setShowVncPanel] = useState(false);

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };


  return (
    <AppContext.Provider value={{
      config,
      updateConfig,
      messages,
      setMessages,
      addMessage,
      isLoading,
      setIsLoading,
      jsInspectorResult,
      setJsInspectorResult,
      onJsInspectorUpdate,
      setOnJsInspectorUpdate,
      networkInspectorResult,
      setNetworkInspectorResult,
      onNetworkInspectorUpdate,
      setOnNetworkInspectorUpdate,
      viewMode,
      setViewMode,
      isSettingsOpen,
      setIsSettingsOpen,
      isChatPoppedOut,
      setIsChatPoppedOut,
      showVncPanel,
      setShowVncPanel,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}