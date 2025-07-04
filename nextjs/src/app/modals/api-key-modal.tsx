'use client';

import { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApiKeySaved: () => void;
  existingKey?: string;
}

export function ApiKeyModal({ isVisible, onClose, onApiKeySaved, existingKey }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(existingKey || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingKey) {
      setApiKey(existingKey);
    } else if (isVisible) {
      // Fetch existing key when modal opens
      fetchExistingKey();
    }
  }, [existingKey, isVisible]);

  const fetchExistingKey = async () => {
    try {
      const response = await fetch('/api/v1/config');
      const data = await response.json();
      if (data.has_api_key) {
        // We can't get the actual key for security, but we can show a placeholder
        setApiKey(''); // Leave empty so user must re-enter
      }
    } catch (error) {
      console.error('Failed to fetch existing key:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    if (!apiKey.startsWith('sk-ant-api03-')) {
      setError('Invalid Anthropic API key format');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      onApiKeySaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-zinc-900 border border-zinc-600 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            {existingKey ? 'Update API Key' : 'Configure API Key'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-300 mb-2">
              Anthropic API Key
            </label>
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Enter your Anthropic API key. You can get a new at <a href="https://console.anthropic.com/settings/keys">Anthropic</a>.            </p>
          </div>


          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !apiKey.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:text-zinc-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}