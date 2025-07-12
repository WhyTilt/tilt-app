'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppConfig, ChatMessage } from '@/types';

interface JsInspectorResult {
  code: string;
  operation: string;
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
  isApiKeyModalOpen: boolean;
  setIsApiKeyModalOpen: (open: boolean) => void;
  isCheckingApiKey: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultConfig: AppConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  api_key: '',
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false); // Start with modal closed
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true); // Loading state for API key check

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // Load API key from database on mount
  useEffect(() => {
    const loadApiKey = async () => {
      setIsCheckingApiKey(true);
      try {
        const response = await fetch('/api/v1/settings?key=anthropic_key');
        if (response.ok) {
          const data = await response.json();
          if (data.value && data.value.trim()) {
            setConfig(prev => ({ ...prev, api_key: data.value }));
            setIsApiKeyModalOpen(false); // Keep modal closed - we have a key
          } else {
            setIsApiKeyModalOpen(true); // Open modal - no valid key
          }
        } else {
          setIsApiKeyModalOpen(true); // Open modal - API error
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
        setIsApiKeyModalOpen(true); // Open modal - fetch failed
      } finally {
        setIsCheckingApiKey(false);
      }
    };

    loadApiKey();
  }, []);


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
      isApiKeyModalOpen,
      setIsApiKeyModalOpen,
      isCheckingApiKey,
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