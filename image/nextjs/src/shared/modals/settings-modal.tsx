'use client';

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey: string;
  onApiKeyUpdate: (apiKey: string) => void;
  accentColor: string;
  onAccentColorUpdate: (color: string) => void;
}

export function SettingsModal({ isOpen, onClose, currentApiKey, onApiKeyUpdate, accentColor, onAccentColorUpdate }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine if this is a blocking modal (no API key exists)
  const isBlocking = !currentApiKey || currentApiKey.trim() === '';

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentApiKey || '');
      setShowApiKey(false);
      setError('');
    }
  }, [isOpen, currentApiKey]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required to use the application');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Anthropic API keys start with "sk-ant-"');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'anthropic_key',
          value: apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API key');
      }

      onApiKeyUpdate(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    // Block escape key if no API key (blocking mode)
    if (e.key === 'Escape' && isBlocking) {
      e.preventDefault();
    }
  };

  // Block clicking outside if no API key (blocking mode)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (isBlocking) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 2147483647, // Maximum possible z-index
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        pointerEvents: 'all'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-zinc-900 border border-zinc-600 rounded-lg w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          pointerEvents: 'all',
          zIndex: 2147483647
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-600 bg-zinc-800">
          <h3 className="text-lg font-medium text-white">
            {isBlocking ? 'API Key Required' : 'Settings'}
          </h3>
          {/* Only show close button if not blocking */}
          {!isBlocking && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="mb-6">
            {isBlocking ? (
              <p className="text-zinc-300 mb-4">
                Please enter your Anthropic API key to use the application. 
                The application cannot function without a valid API key.
              </p>
            ) : (
              <h4 className="text-md font-medium text-white mb-3">Anthropic API Key</h4>
            )}
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="sk-ant-..."
                  className="w-full p-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 font-mono text-sm"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {!isBlocking && currentApiKey && (
                <div className="text-sm text-zinc-400">
                  <p>Status: <span className="text-green-400">✓ Configured</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Color Picker Section */}
          {!isBlocking && (
            <div className="mb-6 pt-6 border-t border-zinc-700">
              <h4 className="text-md font-medium text-white mb-3">Theme</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => onAccentColorUpdate(e.target.value)}
                      className="w-16 h-10 rounded-lg border border-zinc-600 cursor-pointer bg-transparent"
                      title="Pick accent color"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => onAccentColorUpdate(e.target.value)}
                        className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    This color is used for accents throughout the interface
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {!isBlocking && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isLoading || !apiKey.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Validating...' : (isBlocking ? 'Save & Continue' : 'Save')}
            </button>
          </div>

          <div className="mt-4 text-sm text-zinc-400">
            <p>
              Your API key will be stored securely in the database and used to communicate with the Anthropic API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}