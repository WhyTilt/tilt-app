'use client';

import React, { useState } from 'react';
import { useApiKeys } from '../api-keys/context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose?: boolean; // If false, modal cannot be dismissed
}

export function SettingsModal({ isOpen, onClose, canClose = true }: SettingsModalProps) {
  const { apiKeys, updateApiKey, saveApiKeys, isLoading } = useApiKeys();
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize local keys when modal opens
  React.useEffect(() => {
    if (isOpen && !isLoading) {
      setLocalKeys({ ...apiKeys });
      setSaveError(null);
    }
  }, [isOpen, apiKeys, isLoading]);

  const validateApiKey = async (provider: string, apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Validate Anthropic API key if provided
      if (localKeys.anthropic && localKeys.anthropic.trim()) {
        setIsValidating(true);
        const isValid = await validateApiKey('anthropic', localKeys.anthropic.trim());
        setIsValidating(false);
        
        if (!isValid) {
          setSaveError('Invalid Anthropic API key or insufficient credits. Please check your key and try again.');
          return;
        }
      }

      // Update context with local changes
      Object.entries(localKeys).forEach(([provider, key]) => {
        updateApiKey(provider, key);
      });

      // Save to backend using localKeys directly
      console.log('Saving API keys:', localKeys);
      await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys: localKeys }),
      });
      
      // Close modal if we now have a valid key or if closing was already allowed
      if (canClose || hasValidAnthropicKey) {
        onClose();
      }
    } catch (error) {
      setSaveError('Failed to save API keys. Please try again.');
      console.error('Error saving API keys:', error);
    } finally {
      setIsSaving(false);
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    if (canClose) {
      setLocalKeys({ ...apiKeys }); // Reset to original values
      setSaveError(null);
      onClose();
    }
  };

  const hasValidAnthropicKey = Boolean(localKeys.anthropic && localKeys.anthropic.trim().startsWith('sk-'));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-zinc-900 border border-zinc-600 rounded-lg w-[90vw] max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-600 bg-zinc-800">
          <h3 className="text-lg font-medium text-white">
            Settings
          </h3>
          {canClose && (
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          {!canClose && (
            <div className="mb-4 p-3 bg-amber-900 bg-opacity-30 border border-amber-600 rounded-lg">
              <p className="text-amber-400 text-sm">
                An Anthropic API key is required to use Tilt. Please add your API key below.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Anthropic API Key */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Anthropic API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={localKeys.anthropic || ''}
                  onChange={(e) => {
                    console.log('Input changed:', e.target.value);
                    setLocalKeys(prev => {
                      const newKeys = { ...prev, anthropic: e.target.value };
                      console.log('New localKeys:', newKeys);
                      return newKeys;
                    });
                  }}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {hasValidAnthropicKey ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Get your API key from{' '}
                <a 
                  href="https://console.anthropic.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>

          {saveError && (
            <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
              <p className="text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-6">
            {canClose && (
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || isValidating || (!canClose && !hasValidAnthropicKey)}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}