'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const defaultTheme: ThemeContextType = {
  accentColor: '#3b82f6', // Default blue
  setAccentColor: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultTheme);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [accentColor, setAccentColorState] = useState('#3b82f6');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('tilt-theme');
    console.log('Loading theme from localStorage:', savedTheme);
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        if (theme.accentColor) {
          console.log('Setting accent color from localStorage:', theme.accentColor);
          setAccentColorState(theme.accentColor);
          // Immediately set CSS properties
          document.documentElement.style.setProperty('--accent-color', theme.accentColor);
          document.documentElement.style.setProperty('--accent-color-hover', theme.accentColor + 'dd');
          document.documentElement.style.setProperty('--accent-color-light', theme.accentColor + '20');
          document.documentElement.style.setProperty('--accent-color-border', theme.accentColor + '30');
        }
      } catch (error) {
        console.warn('Failed to parse saved theme:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded from localStorage first
    
    const theme = { accentColor };
    console.log('Saving theme to localStorage:', theme);
    localStorage.setItem('tilt-theme', JSON.stringify(theme));
    
    // Update CSS custom properties
    console.log('Setting CSS custom properties for accent color:', accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--accent-color-hover', accentColor + 'dd');
    document.documentElement.style.setProperty('--accent-color-light', accentColor + '20');
    document.documentElement.style.setProperty('--accent-color-border', accentColor + '30');
  }, [accentColor, isLoaded]);

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}