import React from 'react';

interface ActionProps {
  action: string;
  details?: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  timestamp?: string;
}

export function Action({ action, details, status = 'completed', timestamp }: ActionProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'bg-yellow-600';
      case 'running': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📋';
    }
  };

  return (
    <div className="mb-4">
      <div className={`${getStatusColor()}/20 text-white px-4 py-3 rounded-lg`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-5 h-5 ${getStatusColor()} rounded-full flex items-center justify-center`}>
            <span className="text-xs">{getStatusIcon()}</span>
          </div>
          <span className="font-medium text-sm">{action}</span>
        </div>
        {details && details !== action && (
          <div className="text-sm opacity-90 leading-relaxed">
            {details}
          </div>
        )}
        {timestamp && (
          <div className="text-xs opacity-70 mt-2">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}