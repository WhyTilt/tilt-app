'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Trash2, Plus } from 'lucide-react';

interface Test {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
}

interface TagEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function TagEditorPanel({ isOpen, onClose, onSave }: TagEditorPanelProps) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch all unique tags from tests
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v2/tests');
      if (!response.ok) throw new Error('Failed to fetch tests');
      
      const tests: Test[] = await response.json();
      const uniqueTags = [...new Set(tests.flatMap(test => test.tags || []))];
      setAllTags(uniqueTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const startCreating = () => {
    setEditingTag(null);
    setTagName('');
    setIsCreating(true);
  };

  const startEditing = (tag: string) => {
    setEditingTag(tag);
    setTagName(tag);
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setTagName('');
    setIsCreating(false);
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) return;

    try {
      if (editingTag) {
        // Rename existing tag across all tests
        const testsResponse = await fetch('/api/v2/tests');
        const tests: Test[] = await testsResponse.json();
        
        const testsToUpdate = tests.filter(test => test.tags && test.tags.includes(editingTag));
        
        for (const test of testsToUpdate) {
          const updatedTags = test.tags.map(tag => tag === editingTag ? tagName : tag);
          
          await fetch(`/api/v2/tests/${test.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tags: updatedTags
            })
          });
        }
      } else {
        // Creating a new tag - check if it already exists
        if (allTags.includes(tagName.trim())) {
          setError('Tag already exists');
          return;
        }
        
        // Add new tag to local state - it will become available system-wide when assigned to a test
        setAllTags(prev => [...prev, tagName.trim()]);
      }

      await fetchTags();
      cancelEditing();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    console.log('DELETE BUTTON CLICKED FOR:', tagToDelete);
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all tests.')) {
      return;
    }

    console.log('MAKING DELETE REQUEST TO:', `/api/v2/tags/${encodeURIComponent(tagToDelete)}`);
    try {
      const response = await fetch(`/api/v2/tags/${encodeURIComponent(tagToDelete)}`, {
        method: 'DELETE',
      });
      console.log('DELETE RESPONSE:', response.status);
      
      await fetchTags();
      onSave();
    } catch (err) {
      console.error('DELETE ERROR:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <h2 className="text-white font-medium text-lg">Tag Management</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      <div className="p-4 border-b border-zinc-700">
        {!isCreating ? (
          <button
            onClick={startCreating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color-hover)] transition-colors"
          >
            <Plus size={16} />
            Create New Tag
          </button>
        ) : (
          <div className="space-y-4">
            <h3 className="text-white font-medium">
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tag Name
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                placeholder="Enter tag name"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveTag}
                disabled={!tagName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color-hover)] transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {editingTag ? 'Update' : 'Create'}
              </button>
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-zinc-700 text-gray-300 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tags List */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Existing Tags</h3>
        
        {isLoading ? (
          <div className="text-gray-400 text-sm text-center py-8">
            Loading tags...
          </div>
        ) : allTags.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">
            No tags found. Create your first tag above.
          </div>
        ) : (
          <div className="space-y-3">
            {allTags.map(tag => (
              <div
                key={tag}
                className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">
                    {tag}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => startEditing(tag)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteTag(tag);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}