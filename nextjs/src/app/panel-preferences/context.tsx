'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PanelState {
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
  isLocked: boolean;
}

export interface PanelPreferences {
  thinking: PanelState;
  actions: PanelState;
  inspector: PanelState;
}

interface PanelPreferencesContextType {
  preferences: PanelPreferences;
  updatePanelState: (panelName: keyof PanelPreferences, updates: Partial<PanelState>) => void;
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;
  isLoading: boolean;
}

const defaultPreferences: PanelPreferences = {
  thinking: {
    visible: false,
    position: { x: 9, y: 5 },
    size: { width: 400, height: 300 },
    isMaximized: false,
    isLocked: false,
  },
  actions: {
    visible: false,
    position: { x: 1513, y: 657 },
    size: { width: 400, height: 300 },
    isMaximized: false,
    isLocked: false,
  },
  inspector: {
    visible: false,
    position: { x: 439, y: 9 },
    size: { width: 500, height: 400 },
    isMaximized: false,
    isLocked: false,
  },
};

const PanelPreferencesContext = createContext<PanelPreferencesContextType | undefined>(undefined);

export function PanelPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<PanelPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/v1/panels');
      const data = await response.json();
      
      if (data.preferences) {
        setPreferences(data.preferences);
        
        // Check if this was a first run
        if (data.isFirstRun) {
          console.log('🎉 Welcome! This is your first time running AutomagicIT. Default panel positions have been set up for you.');
        }
      }
    } catch (error) {
      console.error('Failed to load panel preferences:', error);
      // Keep default preferences on error
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      await fetch('/api/v1/panels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });
    } catch (error) {
      console.error('Failed to save panel preferences:', error);
    }
  };

  const updatePanelState = (panelName: keyof PanelPreferences, updates: Partial<PanelState>) => {
    setPreferences(prev => ({
      ...prev,
      [panelName]: {
        ...prev[panelName],
        ...updates,
      },
    }));
  };

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Auto-save preferences when they change (debounced)
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        savePreferences();
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [preferences, isLoading]);

  return (
    <PanelPreferencesContext.Provider
      value={{
        preferences,
        updatePanelState,
        loadPreferences,
        savePreferences,
        isLoading,
      }}
    >
      {children}
    </PanelPreferencesContext.Provider>
  );
}

export function usePanelPreferences() {
  const context = useContext(PanelPreferencesContext);
  if (context === undefined) {
    throw new Error('usePanelPreferences must be used within a PanelPreferencesProvider');
  }
  return context;
}