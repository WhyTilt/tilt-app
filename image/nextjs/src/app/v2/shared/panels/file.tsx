'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Pencil, Play, Pause, Square } from 'lucide-react';
import { useTestRunner } from '@/app/v2/test-runner/context';

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

interface Test {
  id: string;
  name: string;
  description?: string;
  suite_id: string;
  steps: string[];
  created_at: string;
  updated_at: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
  data?: TestSuite | Test;
}

interface FilePanelProps {
  className?: string;
  onTestSelect?: (test: Test) => void;
  onSuiteSelect?: (suite: TestSuite) => void;
  onTestEdit?: (test: Test) => void;
}

export function FilePanel({ className = '', onTestSelect, onSuiteSelect, onTestEdit }: FilePanelProps) {
  const { startExecution, pauseExecution, resumeExecution, stopExecution, runState } = useTestRunner();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedTests, setSelectedTests] = useState<Test[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);

  // Fetch test suites and tests from MongoDB
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch test suites
        const suitesResponse = await fetch('/api/v2/test-suites');
        if (!suitesResponse.ok) {
          throw new Error('Failed to fetch test suites');
        }
        const suitesData = await suitesResponse.json();
        setTestSuites(suitesData);

        // Fetch tests
        const testsResponse = await fetch('/api/v2/tests');
        if (!testsResponse.ok) {
          throw new Error('Failed to fetch tests');
        }
        const testsData = await testsResponse.json();
        setTests(testsData);
        
        // Build tree structure
        setTreeNodes(buildTreeNodes(suitesData, testsData));
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Build tree structure
  const buildTreeNodes = (suites: TestSuite[], tests: Test[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create folder nodes for test suites
    suites.forEach(suite => {
      const node: TreeNode = {
        id: suite.id,
        name: suite.name,
        type: 'folder',
        children: [],
        expanded: false,
        checked: false,
        data: suite
      };
      nodeMap.set(suite.id, node);
    });

    // Build hierarchy
    suites.forEach(suite => {
      const node = nodeMap.get(suite.id);
      if (!node) return;

      if (suite.parent_id) {
        const parent = nodeMap.get(suite.parent_id);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add tests to their parent suites
    tests.forEach(test => {
      const testNode: TreeNode = {
        id: test.id,
        name: test.name,
        type: 'file',
        checked: false,
        data: test
      };

      const parentSuite = nodeMap.get(test.suite_id);
      if (parentSuite) {
        parentSuite.children!.push(testNode);
      }
    });

    return rootNodes;
  };

  const toggleNode = (nodeId: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    
    setTreeNodes(updateNodes(treeNodes));
  };

  const toggleCheckbox = (nodeId: string) => {
    // Helper function to recursively update children
    const updateNodeAndChildren = (node: TreeNode, checked: boolean): TreeNode => {
      const updatedNode = { ...node, checked };
      
      // Update selected tests list for test files
      if (node.type === 'file' && node.data) {
        const testData = node.data as Test;
        if (checked) {
          setSelectedTests(prev => {
            const exists = prev.some(test => test.id === testData.id);
            return exists ? prev : [...prev, testData];
          });
        } else {
          setSelectedTests(prev => prev.filter(test => test.id !== node.id));
        }
      }
      
      // Recursively update children if it's a folder
      if (node.children) {
        updatedNode.children = node.children.map(child => 
          updateNodeAndChildren(child, checked)
        );
      }
      
      return updatedNode;
    };

    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          const newChecked = !node.checked;
          return updateNodeAndChildren(node, newChecked);
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    
    setTreeNodes(updateNodes(treeNodes));
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node.id);
    
    if (node.type === 'folder') {
      toggleNode(node.id);
      if (node.data && onSuiteSelect) {
        onSuiteSelect(node.data as TestSuite);
      }
    } else if (node.type === 'file') {
      if (node.data && onTestSelect) {
        onTestSelect(node.data as Test);
      }
    }
  };

  const handleDoubleClick = (node: TreeNode) => {
    setEditingNode(node.id);
  };

  const handleNameChange = async (nodeId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const node = findNodeById(treeNodes, nodeId);
    if (!node) return;

    try {
      if (node.type === 'folder') {
        const response = await fetch(`/api/v2/test-suites/${nodeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        });
        if (!response.ok) throw new Error('Failed to update test suite');
      } else {
        const response = await fetch(`/api/v2/tests/${nodeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        });
        if (!response.ok) throw new Error('Failed to update test');
      }
      
      // Refresh data
      const suitesResponse = await fetch('/api/v2/test-suites');
      const testsResponse = await fetch('/api/v2/tests');
      const suitesData = await suitesResponse.json();
      const testsData = await testsResponse.json();
      setTestSuites(suitesData);
      setTests(testsData);
      setTreeNodes(buildTreeNodes(suitesData, testsData));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    }
    
    setEditingNode(null);
  };

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const createNewItem = async (type: 'folder' | 'file', parentId?: string) => {
    if (type === 'folder') {
      // Create new test suite
      try {
        const response = await fetch('/api/v2/test-suites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'New Test Suite',
            description: '',
            parent_id: parentId || null,
          }),
        });
        if (!response.ok) throw new Error('Failed to create test suite');
        
        // Refresh data
        const suitesResponse = await fetch('/api/v2/test-suites');
        const testsResponse = await fetch('/api/v2/tests');
        const suitesData = await suitesResponse.json();
        const testsData = await testsResponse.json();
        setTestSuites(suitesData);
        setTests(testsData);
        setTreeNodes(buildTreeNodes(suitesData, testsData));
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create test suite');
      }
    } else {
      // Create new test - need a parent folder
      if (!parentId) {
        setError('Please select a test suite to add a test to');
        return;
      }
      
      try {
        const response = await fetch('/api/v2/tests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'New Test',
            description: '',
            suite_id: parentId,
            steps: [],
          }),
        });
        if (!response.ok) throw new Error('Failed to create test');
        
        // Refresh data
        const suitesResponse = await fetch('/api/v2/test-suites');
        const testsResponse = await fetch('/api/v2/tests');
        const suitesData = await suitesResponse.json();
        const testsData = await testsResponse.json();
        setTestSuites(suitesData);
        setTests(testsData);
        setTreeNodes(buildTreeNodes(suitesData, testsData));
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create test');
      }
    }
  };

  const deleteItem = async (nodeId: string) => {
    const node = findNodeById(treeNodes, nodeId);
    if (!node) return;

    try {
      if (node.type === 'folder') {
        await fetch(`/api/v2/test-suites/${nodeId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/v2/tests/${nodeId}`, { method: 'DELETE' });
      }
      
      // Refresh data
      const suitesResponse = await fetch('/api/v2/test-suites');
      const testsResponse = await fetch('/api/v2/tests');
      const suitesData = await suitesResponse.json();
      const testsData = await testsResponse.json();
      setTestSuites(suitesData);
      setTests(testsData);
      setTreeNodes(buildTreeNodes(suitesData, testsData));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const getSelectedTests = (): Test[] => {
    const selectedTests: Test[] = [];
    
    const collectTests = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.checked) {
          if (node.type === 'file' && node.data) {
            selectedTests.push(node.data as Test);
          } else if (node.type === 'folder' && node.children) {
            // If folder is selected, add all its tests
            const addAllTests = (childNodes: TreeNode[]) => {
              childNodes.forEach(child => {
                if (child.type === 'file' && child.data) {
                  selectedTests.push(child.data as Test);
                } else if (child.type === 'folder' && child.children) {
                  addAllTests(child.children);
                }
              });
            };
            addAllTests(node.children);
          }
        }
        if (node.children) {
          collectTests(node.children);
        }
      });
    };
    
    collectTests(treeNodes);
    return selectedTests;
  };

  const runSelectedTests = () => {
    const selectedTests = getSelectedTests();
    
    if (selectedTests.length === 0) {
      setError('Please select tests to run');
      return;
    }

    // Just start execution of the first test
    // The TestRunner component will handle the actual execution
    const firstTest = selectedTests[0];
    startExecution(firstTest);
    setRunningTestId(firstTest.id);
  };

  const handleRunButtonClick = async () => {
    console.log('handleRunButtonClick called, runState:', runState, 'selectedTests:', selectedTests);
    
    if (runState === 'idle' || runState === 'completed') {
      if (selectedTests.length > 0) {
        console.log('Starting execution with test:', selectedTests[0]);
        // Start with the first selected test
        startExecution(selectedTests[0]);
      }
    } else if (runState === 'running') {
      console.log('Stopping execution');
      await stopExecution();
    } else if (runState === 'paused') {
      console.log('Resuming execution');
      resumeExecution();
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0, disabled: boolean = false) => {
    const isSelected = selectedNode === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isEditing = editingNode === node.id;
    const isHovered = hoveredNode === node.id;
    const isRunningTest = runningTestId === node.id;
    
    return (
      <div key={node.id}>
        <div
          className={`
            group flex items-center py-1 px-2 cursor-pointer text-sm
            hover:bg-white/10 transition-colors relative
            ${isSelected ? 'bg-rose-500/10' : ''}
            ${isRunningTest ? 'bg-rose-500/10 border-l-2 border-rose-500' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Checkbox */}
          <div className="w-4 flex justify-center mr-2">
            <input
              type="checkbox"
              checked={node.checked || false}
              onChange={() => toggleCheckbox(node.id)}
              onClick={(e) => e.stopPropagation()}
              disabled={disabled}
              className={`w-3 h-3 bg-transparent border-gray-300 rounded focus:ring-2 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                accentColor: 'var(--accent-color)',
              }}
            />
          </div>

          {/* Triangle/Caret */}
          <div className="w-4 flex justify-center">
            {node.type === 'folder' && hasChildren ? (
              node.expanded ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )
            ) : null}
          </div>
          
          {/* Icon */}
          <div className="w-5 flex justify-center mr-2">
            {node.type === 'folder' ? (
              node.expanded ? (
                <FolderOpen size={16} className="text-rose-500" />
              ) : (
                <Folder size={16} className="text-rose-500" />
              )
            ) : (
              <FileText size={16} className="text-rose-500" />
            )}
          </div>
          
          {/* Name */}
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                defaultValue={node.name}
                className="bg-transparent text-white border-b border-gray-500 focus:border-rose-500 outline-none font-medium"
                onBlur={(e) => handleNameChange(node.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNameChange(node.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingNode(null);
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="text-white select-none font-medium"
                onDoubleClick={() => handleDoubleClick(node)}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* Hover Actions */}
          {isHovered && !disabled && (
            <div className="flex items-center gap-1 ml-2">
              {node.type === 'folder' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewItem('folder', node.id);
                    }}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="New Folder"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewItem('file', node.id);
                    }}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="New File"
                  >
                    <FileText size={14} />
                  </button>
                </>
              )}
              {node.type === 'file' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const test = node.data as Test;
                    if (onTestEdit) {
                      onTestEdit(test);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(node.id);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* Children */}
        {node.type === 'folder' && node.expanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1, disabled))}
          </div>
        )}
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
        <h3 className="text-white font-medium text-sm">Test Explorer</h3>
      </div>

      {/* Tree */}
      <div className="h-1/2 overflow-y-auto p-2 border-b border-zinc-700/50">
        {treeNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Folder size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm mb-3">No test suites found</p>
            <button
              onClick={() => createNewItem('folder')}
              className="px-3 py-1 border border-rose-500 text-rose-400 hover:bg-rose-500/10 rounded text-sm transition-colors"
            >
              Create Test Suite
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {treeNodes.map(node => renderTreeNode(node, 0, runState === 'running'))}
          </div>
        )}
      </div>

      {/* Test Runner Panel - 50% height */}
      <div className="h-1/2 bg-zinc-900/50 flex flex-col">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium text-sm">Test Runner</h4>
            {selectedTests.length > 0 && (
              <span className="text-xs text-gray-400">({selectedTests.length} selected)</span>
            )}
          </div>
          
          <button
            onClick={() => {
              console.log('Button clicked!');
              handleRunButtonClick();
            }}
            disabled={(runState === 'idle' || runState === 'completed') && selectedTests.length === 0}
            className={`
              p-2 transition-colors text-sm font-medium pointer-events-auto relative z-10
              ${selectedTests.length === 0 
                ? 'text-zinc-400 cursor-not-allowed opacity-50' 
                : runState === 'running' 
                  ? 'text-rose-400 animate-pulse cursor-pointer' 
                  : 'text-rose-400 hover:text-rose-300 cursor-pointer'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={
              selectedTests.length === 0 
                ? 'Please select tests to run' 
                : runState === 'running' 
                  ? 'Stop tests' 
                  : 'Run selected tests'
            }
          >
            {runState === 'running' ? (
              <Square size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
        </div>
        
        {/* Selected Tests List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {selectedTests.length > 0 ? (
            <div className="space-y-1">
              {selectedTests.map(test => (
                <div key={test.id} className="text-xs text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-rose-400 rounded-full"></div>
                  {test.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No tests selected
            </div>
          )}
        </div>
      </div>

    </div>
  );
}