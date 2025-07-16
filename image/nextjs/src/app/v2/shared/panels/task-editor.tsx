'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, List, Edit3, GripVertical } from 'lucide-react';

interface Test {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
}

interface TaskEditorPanelProps {
  test: Test | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Test) => void;
}

export function TaskEditorPanel({ test, isOpen, onClose, onSave }: TaskEditorPanelProps) {
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editMode, setEditMode] = useState<'textarea' | 'steps'>('textarea');
  const [stepsText, setStepsText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTagOperation, setIsTagOperation] = useState(false);
  const [allTags, setAllTags] = useState<{name: string, color: string}[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showTagSearch, setShowTagSearch] = useState(false);

  useEffect(() => {
    if (test) {
      console.log('Editor received test with ID:', test.id, 'Type:', typeof test.id);
      const testWithSteps = { ...test };
      // If no steps exist, start with one empty step for step mode
      if (testWithSteps.steps.length === 0) {
        testWithSteps.steps = [''];
      }
      setEditingTest(testWithSteps);
      setStepsText(testWithSteps.steps.join('\n'));
    }
  }, [test]);

  // Fetch all unique tags from tests
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/v2/tags');
        if (response.ok) {
          const tags = await response.json();
          setAllTags(tags);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);


  const handleAutoSaveWithData = async (testData: any) => {
    if (!testData) return;

    try {
      // Convert textarea to steps array if in textarea mode
      const steps = editMode === 'textarea' 
        ? stepsText.split('\n').filter(step => step.trim() !== '')
        : testData.steps;

      const updatedTest = {
        ...testData,
        steps
      };

      console.log('Auto-saving test with data:', updatedTest.name, 'tags:', updatedTest.tags, 'Length:', updatedTest.name.length, 'with steps:', updatedTest.steps);

      const response = await fetch(`/api/v2/tests/${testData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedTest.name,
          tags: updatedTest.tags,
          steps: updatedTest.steps
        }),
      });

      if (!response.ok) {
        throw new Error(`Auto-save failed: ${response.status}`);
      }

      const savedTest = await response.json();
      console.log('Auto-save successful:', savedTest.name, 'tags:', savedTest.tags, 'Length:', savedTest.name.length);
      
      // Call onSave to update parent state with saved data
      onSave(savedTest);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAutoSave = async () => {
    if (!editingTest) return;

    try {
      // Convert textarea to steps array if in textarea mode
      const steps = editMode === 'textarea' 
        ? stepsText.split('\n').filter(step => step.trim() !== '')
        : editingTest.steps;

      const updatedTest = {
        ...editingTest,
        steps
      };

      console.log('Auto-saving test:', updatedTest.name, 'Length:', updatedTest.name.length, 'with steps:', updatedTest.steps);

      const response = await fetch(`/api/v2/tests/${editingTest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedTest.name,
          tags: updatedTest.tags,
          steps: updatedTest.steps
        }),
      });

      if (!response.ok) {
        throw new Error(`Auto-save failed: ${response.status}`);
      }

      const savedTest = await response.json();
      console.log('Auto-save successful:', savedTest.name, 'Length:', savedTest.name.length);
      
      // Call onSave to update parent state with saved data
      onSave(savedTest);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const debouncedAutoSave = () => {
    if (isTagOperation) return; // Don't auto-save during tag operations
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      console.log('Debounced auto-save triggered for:', editingTest?.name);
      handleAutoSave();
    }, 1000); // Save 1 second after user stops typing
    setSaveTimeout(timeout);
  };

  const handleStepChange = (index: number, value: string) => {
    if (!editingTest) return;
    
    const newSteps = [...editingTest.steps];
    newSteps[index] = value;
    setEditingTest({ ...editingTest, steps: newSteps });
  };

  const addStep = () => {
    if (!editingTest) return;
    
    setEditingTest({
      ...editingTest,
      steps: [...editingTest.steps, '']
    });
  };

  const removeStep = (index: number) => {
    if (!editingTest) return;
    
    const newSteps = editingTest.steps.filter((_, i) => i !== index);
    setEditingTest({ ...editingTest, steps: newSteps });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    if (!editingTest) return;

    const newSteps = [...editingTest.steps];
    const draggedStep = newSteps[draggedIndex];
    
    // Remove the dragged step
    newSteps.splice(draggedIndex, 1);
    
    // Insert at the new position
    newSteps.splice(dropIndex, 0, draggedStep);
    
    setEditingTest({ ...editingTest, steps: newSteps });
    setDraggedIndex(null);
    
    // Auto-save after reordering
    setTimeout(() => handleAutoSave(), 100);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTextareaChange = (value: string) => {
    setStepsText(value);
    if (editingTest) {
      const steps = value.split('\n').filter(step => step.trim() !== '');
      setEditingTest({ ...editingTest, steps });
    }
  };


  if (!isOpen || !editingTest) return null;

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-medium text-lg">Edit Test</h2>
            <span className="text-gray-400 text-sm">({editingTest.name})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              <button
                onClick={() => setEditMode('textarea')}
                className={`p-2 rounded transition-colors border ${
                  editMode === 'textarea' 
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-light)] text-[var(--accent-color)]' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
                title="Textarea Mode"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => setEditMode('steps')}
                className={`p-2 rounded transition-colors border ${
                  editMode === 'steps' 
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-light)] text-[var(--accent-color)]' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
                title="Step Mode"
              >
                <List size={16} />
              </button>
            </div>
            
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="space-y-6">
            {/* Test Name */}
            <div>
              <label className="block text-white font-medium mb-2">Test Name</label>
              <input
                type="text"
                value={editingTest.name}
                onChange={(e) => {
                  setEditingTest({ ...editingTest, name: e.target.value });
                  debouncedAutoSave();
                }}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                placeholder="Enter test name..."
              />
            </div>

            {/* Tag Selector */}
            <div>
              <label className="block text-white font-medium mb-2">Tags</label>
              
              {/* Selected Tags */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Show current tags */}
                  {editingTest.tags && editingTest.tags.length > 0 && editingTest.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={async () => {
                        setIsTagOperation(true);
                        // Remove tag from current test only
                        const updatedTags = editingTest.tags.filter(t => t !== tag);
                        setEditingTest({
                          ...editingTest,
                          tags: updatedTags
                        });
                        // Trigger auto-save
                        debouncedAutoSave();
                        setIsTagOperation(false);
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--accent-color-light)] border border-[var(--accent-color)] text-[var(--accent-color)] rounded-md text-xs hover:bg-[var(--accent-color)] hover:text-white transition-colors"
                    >
                      {tag}
                      <span className="text-xs">×</span>
                    </button>
                  ))}
                  
                  {/* Add new tag button */}
                  <button
                    onClick={() => {
                      setShowTagSearch(true);
                      setTagSearchTerm('');
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-700 border border-zinc-600 text-gray-300 rounded-md text-xs hover:bg-zinc-600 transition-colors"
                  >
                    + add tag
                  </button>
                </div>
              </div>

              {/* Search Field - only show when searching */}
              {showTagSearch && (
                <>
                  <input
                    type="text"
                    value={tagSearchTerm.trim()}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowTagSearch(false);
                        setTagSearchTerm('');
                      }
                    }}
                    onBlur={() => {
                      // Small delay to allow clicks on tag buttons
                      setTimeout(() => setShowTagSearch(false), 150);
                    }}
                    placeholder="Type to search and add tags..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none mb-3"
                    autoFocus
                  />

                  {/* Available Tags */}
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {allTags
                      .filter(tag => 
                        (tagSearchTerm.trim() === '' || tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase().trim())) &&
                        !(editingTest.tags || []).includes(tag.name)
                      )
                      .map(tag => (
                        <button
                          key={tag.name}
                          onClick={() => {
                            const updatedTest = { 
                              ...editingTest, 
                              tags: [...(editingTest.tags || []), tag.name] 
                            };
                            setEditingTest(updatedTest);
                            setTagSearchTerm('');
                            setShowTagSearch(false);
                            debouncedAutoSave();
                          }}
                          className="w-full text-left px-3 py-2 bg-zinc-800/50 border border-zinc-700 text-gray-300 hover:bg-zinc-700/50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium">{tag.name}</span>
                          </div>
                        </button>
                      ))}
                    
                    {/* Option to create new tag */}
                    {tagSearchTerm.trim() && !allTags.some(tag => 
                      tag.name.toLowerCase() === tagSearchTerm.toLowerCase().trim()
                    ) && (
                      <button
                        onClick={() => {
                          const newTag = tagSearchTerm.trim();
                          const updatedTest = { 
                            ...editingTest, 
                            tags: [...(editingTest.tags || []), newTag] 
                          };
                          setEditingTest(updatedTest);
                          setAllTags(prev => [...prev, { name: newTag, color: '#3b82f6' }]);
                          setTagSearchTerm('');
                          setShowTagSearch(false);
                          debouncedAutoSave();
                        }}
                        className="w-full text-left px-3 py-2 bg-zinc-700/50 border border-zinc-600 text-[var(--accent-color)] hover:bg-zinc-600/50 rounded-lg transition-colors"
                      >
                        <span className="font-medium">+ Create "{tagSearchTerm.trim()}"</span>
                      </button>
                    )}
                    
                  </div>
                </>
              )}
            </div>

            {/* Steps Editor */}
            <div>
              <label className="block text-white font-medium mb-2">Test Steps</label>
              
              {editMode === 'textarea' ? (
                <div>
                  <p className="text-gray-400 text-sm mb-3">
                    Enter each step on a new line. Empty lines will be ignored.
                  </p>
                  <div className="relative">
                    <textarea
                      value={stepsText}
                      onChange={(e) => {
                        handleTextareaChange(e.target.value);
                        debouncedAutoSave();
                      }}
                      onBlur={() => {
                        handleAutoSave();
                      }}
                      className="w-full h-96 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none resize-none font-mono text-sm"
                      placeholder=""
                    />
                    {stepsText.trim() === '' && (
                      <div className="absolute top-4 left-4 text-gray-500 pointer-events-none font-mono text-sm leading-relaxed">
                        Go to x.com<br/>
                        Click the search field and search for diamond ring<br/>
                        Click one of the results<br/>
                        Use the inspect js tool to assert window.adobeDataLayer.find(item =&gt; item.event === "internalSearch")
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {editingTest.steps.length} steps
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">
                      Edit steps individually. Use the + button to add new steps.
                    </p>
                    <button
                      onClick={addStep}
                      className="flex items-center gap-2 px-3 py-1 border border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color-light)] rounded-lg transition-colors text-sm"
                    >
                      <Plus size={14} />
                      Add Step
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {editingTest.steps.map((step, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg transition-all ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div 
                          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 transition-colors"
                          title="Drag to reorder"
                        >
                          <GripVertical size={16} />
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 border border-[var(--accent-color)] bg-[var(--accent-color-light)] rounded-full flex items-center justify-center text-[var(--accent-color)] font-medium text-sm">
                          {index + 1}
                        </div>
                        <textarea
                          value={step}
                          onChange={(e) => {
                            handleStepChange(index, e.target.value);
                            debouncedAutoSave();
                          }}
                          className="flex-1 bg-transparent border border-zinc-700 rounded px-3 py-2 text-white focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] outline-none resize-none min-h-[60px] break-words"
                          placeholder="Enter step instructions..."
                          style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                        />
                        <button
                          onClick={() => removeStep(index)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove step"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {editingTest.steps.length === 0 && (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-zinc-700 rounded-lg">
                      <p className="text-sm mb-3">No steps added yet</p>
                      <button
                        onClick={addStep}
                        className="px-4 py-2 border border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color-light)] rounded-lg transition-colors"
                      >
                        Add First Step
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}