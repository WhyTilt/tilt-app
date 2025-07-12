'use client';

import { useState, useEffect } from 'react';

interface TimingStats {
  total_steps: number;
  average_step_time: number;
  min_step_time?: number;
  max_step_time?: number;
  total_time: number;
  longest_step: {
    step_number: number;
    duration: number;
  };
  avg_screenshot_time?: number;
  avg_anthropic_time?: number;
  avg_tool_time?: number;
}

interface StepTiming {
  step_number: number;
  start_time: number;
  end_time: number;
  total_duration: number;
  screenshot_duration?: number;
  anthropic_call_duration?: number;
  anthropic_response_duration?: number;
  tool_execution_duration?: number;
  automation_duration?: number;
  tool_calls: string[];
  error_occurred: boolean;
  error_message?: string;
}

export default function TimingPanel() {
  const [stats, setStats] = useState<TimingStats | null>(null);
  const [history, setHistory] = useState<StepTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTimingData = async () => {
    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetch('/api/v1/timing/statistics'),
        fetch('/api/v1/timing/history')
      ]);

      if (statsResponse.ok && historyResponse.ok) {
        const statsData = await statsResponse.json();
        const historyData = await historyResponse.json();
        
        setStats(statsData.data);
        setHistory(historyData.data.steps || []);
        setError(null);
      } else {
        setError('Failed to fetch timing data');
      }
    } catch (err) {
      setError('Error fetching timing data: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetTimingData = async () => {
    try {
      const response = await fetch('/api/v1/timing/reset', { method: 'DELETE' });
      if (response.ok) {
        await fetchTimingData();
      } else {
        setError('Failed to reset timing data');
      }
    } catch (err) {
      setError('Error resetting timing data: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    fetchTimingData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchTimingData, 2000); // Refresh every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (loading) return <div className="p-4">Loading timing data...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!stats) return <div className="p-4">No timing data available</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Performance Timing</h1>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchTimingData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={resetTimingData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Data
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Steps</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total_steps}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Average Step Time</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.average_step_time.toFixed(2)}s</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Time</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total_time.toFixed(2)}s</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Longest Step</h3>
          <p className="text-2xl font-bold text-gray-900">#{stats.longest_step.step_number}</p>
          <p className="text-sm text-gray-600">{stats.longest_step.duration.toFixed(2)}s</p>
        </div>
        
        {stats.avg_anthropic_time && (
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">Avg API Time</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.avg_anthropic_time.toFixed(2)}s</p>
          </div>
        )}
      </div>

      {/* Sub-timing Averages */}
      {(stats.avg_screenshot_time || stats.avg_tool_time) && (
        <div className="bg-white p-6 rounded-lg shadow border mb-8">
          <h2 className="text-lg font-semibold mb-4">Average Sub-timings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.avg_screenshot_time && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Screenshot</h4>
                <p className="text-xl font-bold text-blue-600">{stats.avg_screenshot_time.toFixed(3)}s</p>
              </div>
            )}
            {stats.avg_anthropic_time && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Anthropic API</h4>
                <p className="text-xl font-bold text-green-600">{stats.avg_anthropic_time.toFixed(3)}s</p>
              </div>
            )}
            {stats.avg_tool_time && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tool Execution</h4>
                <p className="text-xl font-bold text-orange-600">{stats.avg_tool_time.toFixed(3)}s</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step History */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Step History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Step</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screenshot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Call</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tools</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Automation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((step) => (
                <tr key={step.step_number} className={step.error_occurred ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{step.step_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.total_duration?.toFixed(3)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.screenshot_duration?.toFixed(3) || '-'}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.anthropic_call_duration?.toFixed(3) || '-'}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.anthropic_response_duration?.toFixed(3) || '-'}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.tool_execution_duration?.toFixed(3) || '-'}s
                    {step.tool_calls.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {step.tool_calls.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.automation_duration?.toFixed(3) || '-'}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {step.error_occurred ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Success
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}