'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, FileText, Play, Square, Tag, Plus, X, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { useTestRunner } from '@/app/v2/test-runner/context';

interface Test {
  id: string;
  name: string;
  tags: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
  status?: string;
  lastRun?: {
    status: 'pending' | 'running' | 'completed' | 'error' | 'passed' | 'failed';
    timestamp?: string;
  } | string;
}

interface Tag {
  name: string;
  color: string;
  description: string;
}

interface TestFilterListProps {
  className?: string;
  onTestSelect?: (test: Test) => void;
  onTestEdit?: (test: Test) => void;
  onTagEditorOpen?: () => void;
  onTestCreate?: (test: Test) => void;
  onSelectedTestsChange?: (tests: Test[]) => void;
}

export function TestFilterList({ className = '', onTestSelect, onTestEdit, onTagEditorOpen, onTestCreate, onSelectedTestsChange }: TestFilterListProps) {
  const { startExecution, stopExecution, runState } = useTestRunner();
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTests, setSelectedTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to get tag color by name
  const getTagColor = (tagName: string): string => {
    const tag = allTags.find(t => t.name === tagName);
    return tag?.color || '#3b82f6';
  };

  // Helper function to get test status
  const getTestStatus = (test: Test): { status: string; color: string; bgColor: string } => {
    const lastRunStatus = typeof test.lastRun === 'object' ? test.lastRun?.status : null;
    const testStatus = test.status || 'pending';
    
    // Prioritize lastRun status over test status
    const effectiveStatus = lastRunStatus || testStatus;
    
    switch (effectiveStatus) {
      case 'completed':
      case 'passed':
        return { status: 'PASS', color: '#10b981', bgColor: '#10b981/10' };
      case 'error':
      case 'failed':
        return { status: 'FAIL', color: '#ef4444', bgColor: '#ef4444/10' };
      case 'running':
        return { status: 'RUN', color: '#f59e0b', bgColor: '#f59e0b/10' };
      case 'pending':
      default:
        return { status: 'PEND', color: '#6b7280', bgColor: '#6b7280/10' };
    }
  };

  // Helper function to toggle tag filter selection
  const toggleTagFilter = (tagName: string) => {
    setSelectedTagFilters(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Helper function to clear all tag filters
  const clearTagFilters = () => {
    setSelectedTagFilters([]);
  };

  // Fetch tests and extract tags
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const testsResponse = await fetch('/api/v2/tests');
        if (!testsResponse.ok) {
          throw new Error('Failed to fetch tests');
        }
        const testsData = await testsResponse.json();
        
        setTests(testsData);
        setFilteredTests(testsData);
        
        // Update selected tests with fresh data to reflect tag changes
        setSelectedTests(prev => 
          prev.map(selectedTest => {
            const updatedTest = testsData.find(t => t.id === selectedTest.id);
            return updatedTest || selectedTest;
          }).filter(test => testsData.some(t => t.id === test.id)) // Remove any tests that no longer exist
        );
        
        // Fetch all tags from the tags API
        const tagsResponse = await fetch('/api/v2/tags');
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setAllTags(tagsData);
        } else {
          // Fallback to extracting tags from tests if API fails
          const uniqueTagNames = [...new Set(testsData.flatMap((test: Test) => test.tags || []))];
          const fallbackTags = uniqueTagNames.map(tagName => ({
            name: tagName,
            color: '#3b82f6', // Default blue color
            description: ''
          }));
          setAllTags(fallbackTags);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Removed auto-open to prevent excessive API calls

  // Filter tests
  useEffect(() => {
    let filtered = tests;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTagFilters.length > 0) {
      filtered = filtered.filter(test =>
        selectedTagFilters.some(tagFilter => 
          test.tags && test.tags.includes(tagFilter)
        )
      );
    }

    setFilteredTests(filtered);
  }, [tests, searchTerm, selectedTagFilters]);

  // Notify parent component when selected tests change
  useEffect(() => {
    if (onSelectedTestsChange) {
      onSelectedTestsChange(selectedTests);
    }
  }, [selectedTests, onSelectedTestsChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const toggleTestSelection = (test: Test) => {
    // Don't allow selection of tests without steps
    if (!hasValidSteps(test)) {
      return;
    }
    
    setSelectedTests(prev =>
      prev.some(t => t.id === test.id)
        ? prev.filter(t => t.id !== test.id)
        : [...prev, test]
    );
  };

  const hasValidSteps = (test: Test) => {
    return test.steps && test.steps.length > 0 && test.steps.some(step => step.trim() !== '');
  };


  const handleRunTests = () => {
    if (selectedTests.length > 0) {
      startExecution(selectedTests[0]);
    }
  };

  const handleCreateTest = async () => {
    try {
      const response = await fetch('/api/v2/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Test',
          tags: allTags.length > 0 ? [allTags[0].name] : [], // Use first tag name if available, empty array if none
          steps: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to create test');

      const newTest = await response.json();
      
      // Refresh data
      const testsResponse = await fetch('/api/v2/tests');
      const testsData = await testsResponse.json();
      setTests(testsData);
      setFilteredTests(testsData);
      
      // Open the existing TaskEditorPanel with the new test
      if (onTestCreate) {
        onTestCreate(newTest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Attempting to delete test with ID:', testId);
      
      const response = await fetch(`/api/v2/tests/${testId}`, { 
        method: 'DELETE' 
      });
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete error response:', errorData);
        throw new Error(errorData.error || `Failed to delete test (${response.status})`);
      }
      
      const result = await response.json();
      console.log('Delete success:', result);
      
      // Refresh data
      const testsResponse = await fetch('/api/v2/tests');
      const testsData = await testsResponse.json();
      setTests(testsData);
      setFilteredTests(testsData);
      
      // Remove from selected tests if it was selected
      setSelectedTests(prev => prev.filter(t => t.id !== testId));
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Delete test error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete test');
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 ${className}`}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 ${className}`}>
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-zinc-700/50">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors"
          />
        </div>

        {/* Tag Filter and Controls Row */}
        <div className="flex items-center gap-2">
          {/* Tag Filter */}
          <div className="relative flex-1" ref={tagDropdownRef}>
            <button
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm hover:border-[var(--accent-color)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-gray-400" />
                <span className="text-gray-400">
                  {selectedTagFilters.length === 0 
                    ? 'Filter by tags...' 
                    : `${selectedTagFilters.length} tag${selectedTagFilters.length === 1 ? '' : 's'} selected`
                  }
                </span>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isTagDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  {/* Clear filters option */}
                  {selectedTagFilters.length > 0 && (
                    <button
                      onClick={clearTagFilters}
                      className="w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-zinc-700 rounded"
                    >
                      Clear all filters
                    </button>
                  )}
                  
                  {/* Tag options */}
                  {allTags.length > 0 ? (
                    allTags.map(tag => (
                      <button
                        key={tag.name}
                        onClick={() => toggleTagFilter(tag.name)}
                        className="w-full text-left px-2 py-1 hover:bg-zinc-700 rounded flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-white text-sm">{tag.name}</span>
                        </div>
                        {selectedTagFilters.includes(tag.name) && (
                          <div className="w-4 h-4 bg-[var(--accent-color)] rounded flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-xs text-gray-400">No tags available</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-2">
            {/* Action Icons */}
            <button
              onClick={handleCreateTest}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Create New Test"
            >
              <FileText size={16} />
            </button>
            
            <button
              onClick={() => onTagEditorOpen && onTagEditorOpen()}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Manage Tags"
            >
              <Tag size={16} />
            </button>
            
            {/* Check All Checkbox */}
            <div
              onClick={() => {
                const allChecked = filteredTests.length > 0 && selectedTests.length === filteredTests.length;
                if (allChecked) {
                  setSelectedTests([]);
                } else {
                  setSelectedTests(filteredTests);
                }
              }}
              className={`
                w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer
                ${filteredTests.length > 0 && selectedTests.length === filteredTests.length
                  ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' 
                  : 'border-gray-400 bg-transparent hover:border-[var(--accent-color)]'
                }
              `}
              title="Select All Tests"
            >
              {filteredTests.length > 0 && selectedTests.length === filteredTests.length && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Selected tag filters display */}
        {selectedTagFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTagFilters.map(tagName => (
              <span
                key={tagName}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: getTagColor(tagName) }}
              >
                {tagName}
                <button
                  onClick={() => toggleTagFilter(tagName)}
                  className="hover:bg-black/20 rounded"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

      </div>


      {/* Test List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">No tests found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTests.map(test => {
              const hasSteps = hasValidSteps(test);
              const isSelected = selectedTests.some(t => t.id === test.id);
              
              return (
                <div
                  key={test.id}
                  className={`
                    p-3 rounded-lg border transition-colors group
                    ${!hasSteps 
                      ? 'bg-zinc-800/30 border-zinc-700/30 opacity-60' 
                      : isSelected
                        ? 'bg-[var(--accent-color-light)] border-[var(--accent-color-border)]'
                        : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50'
                    }
                    ${hasSteps ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => hasSteps && toggleTestSelection(test)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {/* Status Badge and Agent Head */}
                        {(() => {
                          const statusInfo = getTestStatus(test);
                          return (
                            <>
                              <img 
                                src="/agent-head.png" 
                                alt="Agent Status"
                                className={`w-4 h-4 ${!hasSteps ? "opacity-30" : ""}`}
                                style={{
                                  filter: !hasSteps 
                                    ? "grayscale(1) opacity(0.3)" 
                                    : statusInfo.status === 'PASS'
                                      ? "brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)" // green
                                      : statusInfo.status === 'FAIL'
                                        ? "brightness(0) saturate(100%) invert(18%) sepia(77%) saturate(7496%) hue-rotate(358deg) brightness(97%) contrast(94%)" // red
                                        : statusInfo.status === 'RUN'
                                          ? "brightness(0) saturate(100%) invert(82%) sepia(60%) saturate(2141%) hue-rotate(2deg) brightness(119%) contrast(115%)" // yellow
                                          : "grayscale(1) opacity(0.6)" // gray for pending
                                }}
                              />
                              <div 
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                                  !hasSteps ? 'opacity-30' : ''
                                }`}
                                style={{ backgroundColor: statusInfo.color }}
                                title={`Status: ${statusInfo.status}`}
                              >
                                {statusInfo.status}
                              </div>
                            </>
                          );
                        })()}
                        <span className={`font-medium text-sm ${hasSteps ? "text-white" : "text-gray-400"} truncate`}>
                          {test.name}
                        </span>
                      </div>
                      
                      {/* Show tags */}
                      {test.tags && test.tags.length > 0 && (
                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                          {test.tags.map(tag => {
                            const tagName = typeof tag === 'string' ? tag : tag.name;
                            return (
                              <span 
                                key={tagName}
                                className="px-2 py-1 rounded-md text-xs font-medium text-white"
                                style={{ backgroundColor: getTagColor(tagName) }}
                              >
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      {!hasSteps && (
                        <span className="text-yellow-400 text-xs font-medium flex items-center gap-1 mb-2">
                          <X size={12} />
                          No steps defined
                        </span>
                      )}
                      
                      {test.description && (
                        <p className="text-gray-400 text-xs mb-1">{test.description}</p>
                      )}
                      {hasSteps && (
                        <p className="text-gray-500 text-xs">
                          {test.steps.filter(step => step.trim() !== '').length} step{test.steps.filter(step => step.trim() !== '').length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTestEdit) {
                            onTestEdit(test);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-all"
                        title="Edit Test"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(test.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                        title="Delete Test"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      {/* Custom Checkbox */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasSteps) toggleTestSelection(test);
                        }}
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                          ${isSelected 
                            ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' 
                            : 'border-gray-400 bg-transparent hover:border-[var(--accent-color)]'
                          }
                          ${!hasSteps ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test Runner Controls */}
      <div className="p-4 border-t border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={handleRunTests}
            disabled={selectedTests.length === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedTests.length === 0
                ? 'bg-zinc-700 text-gray-400 cursor-not-allowed'
                : runState === 'running'
                  ? 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]'
                  : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]'
              }
            `}
          >
            {runState === 'running' ? (
              <>
                <Square size={16} />
                Stop
              </>
            ) : (
              <>
                <Play size={16} />
                Run Tests
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}