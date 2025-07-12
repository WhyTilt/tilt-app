/**
 * Debug logging utility specifically for Run All sequential execution issue
 * Creates detailed logs in ./logs/run-all-debug.log to track state transitions
 */

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  location: string;
  message: string;
  data?: any;
}

class RunAllLogger {
  private logs: LogEntry[] = [];
  private isEnabled = true;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(level: LogEntry['level'], location: string, message: string, data?: any): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      location,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
  }

  info(location: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    const entry = this.createLogEntry('INFO', location, message, data);
    this.logs.push(entry);
    console.log(`🔥 RUN-ALL [${entry.level}] ${entry.location}: ${entry.message}`, data || '');
  }

  warn(location: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    const entry = this.createLogEntry('WARN', location, message, data);
    this.logs.push(entry);
    console.warn(`🔥 RUN-ALL [${entry.level}] ${entry.location}: ${entry.message}`, data || '');
  }

  error(location: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    const entry = this.createLogEntry('ERROR', location, message, data);
    this.logs.push(entry);
    console.error(`🔥 RUN-ALL [${entry.level}] ${entry.location}: ${entry.message}`, data || '');
  }

  debug(location: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    const entry = this.createLogEntry('DEBUG', location, message, data);
    this.logs.push(entry);
    console.log(`🔥 RUN-ALL [${entry.level}] ${entry.location}: ${entry.message}`, data || '');
  }

  // Log critical state for debugging queue issues
  logQueueState(location: string, state: {
    taskQueue: any[];
    autoRunning: boolean;
    isLoading: boolean;
    currentTask: any;
    isAnyTaskRunning: boolean;
    isBatchRun: boolean;
    pendingTasks?: any[];
    completedTaskForReport?: any;
  }) {
    this.debug(location, 'QUEUE STATE SNAPSHOT', {
      queueLength: state.taskQueue.length,
      queueTaskIds: state.taskQueue.map(t => t.id),
      autoRunning: state.autoRunning,
      isLoading: state.isLoading,
      currentTaskId: state.currentTask?.id || null,
      isAnyTaskRunning: state.isAnyTaskRunning,
      isBatchRun: state.isBatchRun,
      pendingTasksCount: state.pendingTasks?.length || 0,
      completedTaskId: state.completedTaskForReport?.id || null
    });
  }

  // Log task execution flow
  logTaskExecution(location: string, action: string, taskId: string, additionalData?: any) {
    this.info(location, `TASK ${action.toUpperCase()}: ${taskId}`, additionalData);
  }

  // Log race condition detection
  logRaceCondition(location: string, message: string, data?: any) {
    this.warn(location, `RACE CONDITION DETECTED: ${message}`, data);
  }

  // Export logs to file (for browser download)
  exportLogs(): string {
    const logText = this.logs.map(entry => {
      let line = `[${entry.timestamp}] ${entry.level} ${entry.location}: ${entry.message}`;
      if (entry.data) {
        line += '\n' + entry.data;
      }
      return line;
    }).join('\n\n');

    // Also create a downloadable file
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-all-debug-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return logText;
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.log('🔥 RUN-ALL: Debug logs cleared');
  }

  // Get current log count
  getLogCount(): number {
    return this.logs.length;
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🔥 RUN-ALL: Logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const runAllLogger = new RunAllLogger();

// Export types for use in components
export type { LogEntry };