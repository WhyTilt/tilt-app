"""
Timing utilities for diagnosing agent performance and step execution times.
"""

import time
import logging
from contextlib import contextmanager
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from threading import Lock
import json

@dataclass
class TimingRecord:
    """A single timing measurement."""
    name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def finish(self, metadata: Optional[Dict[str, Any]] = None) -> float:
        """Mark the timing as finished and return duration."""
        self.end_time = time.perf_counter()
        self.duration = self.end_time - self.start_time
        if metadata:
            self.metadata.update(metadata)
        return self.duration

@dataclass 
class StepTiming:
    """Complete timing information for a single agent step."""
    step_number: int
    start_time: float
    end_time: Optional[float] = None
    total_duration: Optional[float] = None
    
    # Sub-timings for different phases
    screenshot_duration: Optional[float] = None
    anthropic_call_duration: Optional[float] = None
    anthropic_response_duration: Optional[float] = None
    tool_execution_duration: Optional[float] = None
    automation_duration: Optional[float] = None
    
    # Metadata
    tool_calls: List[str] = field(default_factory=list)
    error_occurred: bool = False
    error_message: Optional[str] = None
    
    def finish(self) -> float:
        """Mark the step as finished and return total duration."""
        self.end_time = time.perf_counter()
        self.total_duration = self.end_time - self.start_time
        return self.total_duration
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'step_number': self.step_number,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'total_duration': self.total_duration,
            'screenshot_duration': self.screenshot_duration,
            'anthropic_call_duration': self.anthropic_call_duration,
            'anthropic_response_duration': self.anthropic_response_duration,
            'tool_execution_duration': self.tool_execution_duration,
            'automation_duration': self.automation_duration,
            'tool_calls': self.tool_calls,
            'error_occurred': self.error_occurred,
            'error_message': self.error_message
        }

class TimingCollector:
    """Central collector for all timing data."""
    
    def __init__(self):
        self._lock = Lock()
        self._current_step: Optional[StepTiming] = None
        self._step_history: List[StepTiming] = []
        self._active_timings: Dict[str, TimingRecord] = {}
        self.logger = logging.getLogger('timing')
    
    def start_step(self, step_number: int) -> StepTiming:
        """Start timing a new step."""
        with self._lock:
            if self._current_step and not self._current_step.end_time:
                # Finish previous step if not completed
                self._current_step.finish()
                self._step_history.append(self._current_step)
            
            self._current_step = StepTiming(
                step_number=step_number,
                start_time=time.perf_counter()
            )
            self.logger.info(f"Started timing step {step_number}")
            return self._current_step
    
    def finish_current_step(self, error_occurred: bool = False, error_message: Optional[str] = None) -> Optional[StepTiming]:
        """Finish timing the current step."""
        with self._lock:
            if not self._current_step:
                return None
            
            self._current_step.error_occurred = error_occurred
            self._current_step.error_message = error_message
            duration = self._current_step.finish()
            
            self._step_history.append(self._current_step)
            step = self._current_step
            self._current_step = None
            
            self.logger.info(f"Finished step {step.step_number} in {duration:.3f}s")
            return step
    
    def time_screenshot(self, duration: float):
        """Record screenshot timing for current step."""
        if self._current_step:
            self._current_step.screenshot_duration = duration
            self.logger.debug(f"Screenshot took {duration:.3f}s")
    
    def time_anthropic_call(self, duration: float):
        """Record Anthropic API call timing for current step."""
        if self._current_step:
            self._current_step.anthropic_call_duration = duration
            self.logger.debug(f"Anthropic call took {duration:.3f}s")
    
    def time_anthropic_response(self, duration: float):
        """Record Anthropic response processing timing for current step."""
        if self._current_step:
            self._current_step.anthropic_response_duration = duration
            self.logger.debug(f"Anthropic response processing took {duration:.3f}s")
    
    def time_tool_execution(self, duration: float, tool_name: str):
        """Record tool execution timing for current step."""
        if self._current_step:
            self._current_step.tool_execution_duration = (
                self._current_step.tool_execution_duration or 0
            ) + duration
            self._current_step.tool_calls.append(tool_name)
            self.logger.debug(f"Tool {tool_name} took {duration:.3f}s")
    
    def time_automation(self, duration: float):
        """Record automation action timing for current step."""
        if self._current_step:
            self._current_step.automation_duration = (
                self._current_step.automation_duration or 0
            ) + duration
            self.logger.debug(f"Automation action took {duration:.3f}s")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive timing statistics."""
        with self._lock:
            if not self._step_history:
                return {"total_steps": 0}
            
            durations = [step.total_duration for step in self._step_history if step.total_duration]
            
            if not durations:
                return {"total_steps": len(self._step_history)}
            
            stats = {
                "total_steps": len(self._step_history),
                "average_step_time": sum(durations) / len(durations),
                "min_step_time": min(durations),
                "max_step_time": max(durations),
                "total_time": sum(durations),
                "longest_step": {
                    "step_number": max(self._step_history, key=lambda s: s.total_duration or 0).step_number,
                    "duration": max(durations)
                }
            }
            
            # Average sub-timings
            screenshot_times = [s.screenshot_duration for s in self._step_history if s.screenshot_duration]
            anthropic_times = [s.anthropic_call_duration for s in self._step_history if s.anthropic_call_duration]
            tool_times = [s.tool_execution_duration for s in self._step_history if s.tool_execution_duration]
            
            if screenshot_times:
                stats["avg_screenshot_time"] = sum(screenshot_times) / len(screenshot_times)
            if anthropic_times:
                stats["avg_anthropic_time"] = sum(anthropic_times) / len(anthropic_times)
            if tool_times:
                stats["avg_tool_time"] = sum(tool_times) / len(tool_times)
            
            return stats
    
    def get_step_history(self) -> List[Dict[str, Any]]:
        """Get all step timing history as dictionaries."""
        with self._lock:
            return [step.to_dict() for step in self._step_history]
    
    def log_statistics(self):
        """Log current timing statistics."""
        stats = self.get_statistics()
        if stats["total_steps"] > 0:
            self.logger.info(f"Timing Statistics: {json.dumps(stats, indent=2)}")

@contextmanager
def time_operation(collector: TimingCollector, operation_name: str, **metadata):
    """Context manager for timing operations."""
    start_time = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start_time
        
        # Route to appropriate collector method based on operation name
        if operation_name == "screenshot":
            collector.time_screenshot(duration)
        elif operation_name == "anthropic_call":
            collector.time_anthropic_call(duration)
        elif operation_name == "anthropic_response":
            collector.time_anthropic_response(duration)
        elif operation_name.startswith("tool_"):
            tool_name = metadata.get("tool_name", operation_name)
            collector.time_tool_execution(duration, tool_name)
        elif operation_name == "automation":
            collector.time_automation(duration)

# Global timing collector instance
timing_collector = TimingCollector()