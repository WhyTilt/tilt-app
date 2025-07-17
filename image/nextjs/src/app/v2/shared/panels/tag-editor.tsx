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

interface Tag {
  name: string;
  color: string;
  description: string;
}

interface TagEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedTests?: Test[];
}

export function TagEditorPanel({ isOpen, onClose, onSave, selectedTests = [] }: TagEditorPanelProps) {
  // Ensure selectedTests is always an array
  const safeSelectedTests = Array.isArray(selectedTests) ? selectedTests : [];
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');
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
      console.log('Fetching tags from /api/v2/tags...');
      const response = await fetch('/api/v2/tags');
      console.log('Fetch tags response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to fetch tags');
      
      const tags: Tag[] = await response.json();
      // console.log('Fetched tags count:', tags.length);
      // Ensure all tags have proper structure
      const validTags = tags.map(tag => ({
        name: typeof tag === 'string' ? tag : tag.name,
        color: typeof tag === 'string' ? '#3b82f6' : (tag.color || '#3b82f6'),
        description: typeof tag === 'string' ? '' : (tag.description || '')
      }));
      setAllTags(validTags);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const startCreating = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('#3b82f6');
    setIsCreating(true);
  };

  const startEditing = (tagName: string) => {
    const tag = allTags.find(t => t.name === tagName);
    setEditingTag(tagName);
    setTagName(tagName);
    setTagColor(tag?.color || '#3b82f6');
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('#3b82f6');
    setIsCreating(false);
  };

  const updateTagColor = async (tagName: string, color: string) => {
    try {
      const response = await fetch(`/api/v2/tags/${encodeURIComponent(tagName)}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color })
      });
      
      if (!response.ok) throw new Error('Failed to update tag color');
      return true;
    } catch (error) {
      console.error('Error updating tag color:', error);
      return false;
    }
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) return;

    try {
      if (editingTag) {
        // First delete the old tag from the tags collection
        await fetch(`/api/v2/tags/${encodeURIComponent(editingTag)}`, {
          method: 'DELETE',
        });
        
        // Create the new tag in the tags collection with color
        await fetch(`/api/v2/tags/${encodeURIComponent(tagName.trim())}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: tagColor })
        });
        
        // Rename existing tag across all tests
        const testsResponse = await fetch('/api/v2/tests');
        const tests: Test[] = await testsResponse.json();
        
        const testsToUpdate = tests.filter(test => test.tags && test.tags.includes(editingTag));
        console.log(`Renaming tag "${editingTag}" to "${tagName}" across ${testsToUpdate.length} tests`);
        
        for (const test of testsToUpdate) {
          const updatedTags = test.tags.map(tag => tag === editingTag ? tagName.trim() : tag);
          
          const response = await fetch(`/api/v2/tests/${test.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tags: updatedTags
            })
          });
          
          if (!response.ok) {
            console.error(`Failed to update test ${test.id}:`, await response.text());
            throw new Error(`Failed to rename tag for test: ${test.name}`);
          }
        }
      } else {
        // Creating a new tag - check if it already exists
        if (allTags.some(tag => tag.name === tagName.trim())) {
          setError('Tag already exists');
          return;
        }
        
        // Create new tag via API
        console.log('Creating tag:', tagName.trim());
        const createResponse = await fetch(`/api/v2/tags/${encodeURIComponent(tagName.trim())}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: tagColor })
        });
        
        console.log('Create response status:', createResponse.status);
        const createResult = await createResponse.json();
        console.log('Create response body:', createResult);
        
        if (!createResponse.ok) {
          const errorMessage = createResult.error || 'Failed to create tag';
          console.error('Tag creation failed:', errorMessage);
          throw new Error(errorMessage);
        }
        
        // Immediately add to local state so it shows up right away
        const newTag = { name: tagName.trim(), color: tagColor, description: '' };
        setAllTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      }

      await fetchTags();
      cancelEditing();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  };

  const handleBulkTagToggle = async (tag: string) => {
    if (safeSelectedTests.length === 0) return;

    try {
      // Check how many selected tests have this tag
      const testsWithTag = safeSelectedTests.filter(test => test.tags && test.tags.includes(tag));
      const shouldAddTag = testsWithTag.length < safeSelectedTests.length;
      const action = shouldAddTag ? 'add' : 'remove';
      
      console.log(`Bulk ${action} tag "${tag}" for ${safeSelectedTests.length} tests`);

      // Single API call for bulk operation
      const response = await fetch('/api/v2/tests/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testIds: safeSelectedTests.map(test => test.id),
          tag: tag,
          action: action
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Bulk tag operation failed:', errorData);
        throw new Error(`Failed to ${action} tag: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Bulk tag operation result:', result);

      // Update the selected tests with the returned data
      if (result.updatedTests && result.updatedTests.length > 0) {
        // Update selectedTests state to reflect changes
        const updatedTestsMap = new Map(result.updatedTests.map(test => [test.id, test]));
        
        // Notify parent component about the updates
        if (onSave) {
          onSave();
        }
      }

      await fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tags');
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveTag();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditing();
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                placeholder="Enter tag name"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tag Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-12 h-8 rounded cursor-pointer border border-zinc-700"
                />
                <div 
                  className="px-3 py-1 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: tagColor }}
                >
                  {tagName.trim() || 'Sample Tag'}
                </div>
                <span className="text-xs text-gray-400">{tagColor}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveTag();
                }}
                disabled={!tagName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-color-hover)] transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
                type="button"
              >
                <Save size={16} />
                {editingTag ? 'Update' : 'Create'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  cancelEditing();
                }}
                className="px-4 py-2 bg-zinc-700 text-gray-300 rounded-lg hover:bg-zinc-600 transition-colors"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Tests Info */}
      {safeSelectedTests.length > 0 && (
        <div className="p-4 border-b border-zinc-700 bg-zinc-800/30">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Bulk Tag Operations</h3>
          <p className="text-xs text-gray-400">
            {safeSelectedTests.length} test{safeSelectedTests.length !== 1 ? 's' : ''} selected. Click tags below to toggle them for all selected tests.
          </p>
        </div>
      )}

      {/* Tags List */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">
          {safeSelectedTests.length > 0 ? 'Click tags to toggle for selected tests' : 'Existing Tags'}
        </h3>
        
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
            {allTags.map(tag => {
              // Calculate tag state for selected tests
              const testsWithTag = safeSelectedTests.filter(test => test.tags && test.tags.includes(tag.name));
              const hasTag = testsWithTag.length > 0;
              const partialTag = testsWithTag.length > 0 && testsWithTag.length < safeSelectedTests.length;
              const isClickable = safeSelectedTests.length > 0;
              
              return (
                <div
                  key={tag.name}
                  onClick={isClickable ? () => handleBulkTagToggle(tag.name) : undefined}
                  className={`
                    flex items-center justify-between p-3 border rounded-lg transition-colors
                    ${isClickable ? 'cursor-pointer' : ''}
                    ${hasTag && isClickable
                      ? partialTag
                        ? 'bg-[var(--accent-color)]/30 border-[var(--accent-color)]/50 hover:bg-[var(--accent-color)]/40'
                        : 'bg-[var(--accent-color)]/50 border-[var(--accent-color)] hover:bg-[var(--accent-color)]/60'
                      : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50'
                    }
                  `}
                  title={
                    isClickable
                      ? partialTag 
                        ? `${testsWithTag.length}/${safeSelectedTests.length} tests have this tag - click to toggle`
                        : hasTag 
                          ? 'All selected tests have this tag - click to remove'
                          : 'None of the selected tests have this tag - click to add'
                      : undefined
                  }
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div 
                      className="px-3 py-1 rounded-md text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </div>
                    {partialTag && isClickable && (
                      <span className="text-xs text-gray-400">({testsWithTag.length}/{safeSelectedTests.length})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(tag.name);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteTag(tag.name);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}