'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiKeysContextType {
  apiKeys: Record<string, string>;
  updateApiKey: (provider: string, key: string) => void;
  loadApiKeys: () => Promise<void>;
  saveApiKeys: () => Promise<void>;
  isLoading: boolean;
  hasAnthropicKey: boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/api-keys');
      const data = await response.json();
      
      if (data.api_keys) {
        setApiKeys(data.api_keys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKeys = async () => {
    try {
      await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys: apiKeys }),
      });
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  };

  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key,
    }));
  };

  const hasAnthropicKey = Boolean(apiKeys.anthropic && apiKeys.anthropic.trim());

  useEffect(() => {
    loadApiKeys();
  }, []);

  return (
    <ApiKeysContext.Provider
      value={{
        apiKeys,
        updateApiKey,
        loadApiKeys,
        saveApiKeys,
        isLoading,
        hasAnthropicKey,
      }}
    >
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
}