import asyncio
import json
import logging
import pychrome
import warnings
import time
from typing import Dict, Any, List, Optional
from anthropic.types.beta import BetaToolUnionParam
from .base import BaseAnthropicTool, ToolResult

# Suppress pychrome WebSocket warnings/errors during cleanup
logging.getLogger('pychrome.tab').setLevel(logging.CRITICAL)
warnings.filterwarnings('ignore', module='pychrome')


class NetworkInspectorTool(BaseAnthropicTool):
    """Tool to monitor network requests in Chromium using pychrome library."""
    
    name: str = "inspect_network"
    
    def to_params(self) -> BetaToolUnionParam:
        return {
            "name": self.name,
            "description": "Monitor and inspect network requests in Chromium browser using pychrome library. Can start monitoring, capture requests with filters, and extract request bodies with specific JSON structure filtering.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["start", "monitor_start", "stop", "get_requests", "clear"],
                        "description": "Action to perform: start monitoring (blocking), monitor_start (non-blocking), stop monitoring, get captured requests, or clear requests"
                    },
                    "duration": {
                        "type": "number",
                        "description": "For 'start' action: duration in seconds to monitor (default: 30)",
                        "default": 30
                    },
                    "url_filter": {
                        "type": "string",
                        "description": "Optional URL pattern to filter requests (regex supported)"
                    },
                    "method_filter": {
                        "type": "string",
                        "description": "Optional HTTP method to filter (GET, POST, etc.)"
                    },
                    "filter_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional JSON key paths to filter from request body (e.g., ['events.0.xdm._experience.analytics'])"
                    }
                },
                "required": ["action"]
            }
        }
    
    def __init__(self):
        super().__init__()
        self._captured_requests = []
        self._monitoring = False
        self._monitoring_tab = None
        self._url_filter = None
        self._method_filter = None
    
    def _get_chrome_browser(self) -> Optional[pychrome.Browser]:
        """Get Chrome browser instance."""
        try:
            browser = pychrome.Browser(url="http://localhost:9222")
            return browser
        except Exception:
            return None
    
    def _start_monitoring(self, url_filter: Optional[str] = None, method_filter: Optional[str] = None) -> Dict[str, Any]:
        """Start network monitoring without blocking."""
        browser = self._get_chrome_browser()
        if not browser:
            return {"error": "Chrome remote debugging not available. Ensure Chrome is running with --remote-debugging-port=9222"}
        
        try:
            # Get the first tab
            tabs = browser.list_tab()
            if not tabs:
                return {"error": "No Chrome tabs available"}
            
            # Store tab reference for later cleanup
            self._monitoring_tab = tabs[0]
            self._monitoring_tab.start()
            
            # Enable Network domain
            self._monitoring_tab.Network.enable()
            
            # Store filters
            self._url_filter = url_filter
            self._method_filter = method_filter
            
            # Set up event listener for network requests
            def request_interceptor(**kwargs):
                try:
                    # Extract request data from the event
                    request_data = kwargs.get("request", {})
                    request_id = kwargs.get("requestId", "")
                    timestamp = kwargs.get("timestamp", "")
                    
                    # Apply filters
                    if self._url_filter and self._url_filter.lower() not in request_data.get("url", "").lower():
                        return
                    
                    if self._method_filter and request_data.get("method", "").upper() != self._method_filter.upper():
                        return
                    
                    request_info = {
                        "requestId": request_id,
                        "url": request_data.get("url", ""),
                        "method": request_data.get("method", ""),
                        "headers": request_data.get("headers", {}),
                        "timestamp": timestamp,
                        "postData": request_data.get("postData", "")
                    }
                    
                    self._captured_requests.append(request_info)
                    
                except Exception:
                    pass  # Ignore individual request processing errors
            
            # Set up the event listener
            self._monitoring_tab.set_listener("Network.requestWillBeSent", request_interceptor)
            
            self._monitoring = True
            
            return {"output": "Network monitoring started. Use 'get_requests' to retrieve captured requests or 'stop' to end monitoring."}
            
        except Exception as e:
            return {"error": f"Failed to start network monitoring: {str(e)}"}
    
    def _monitor_network_requests(self, duration: int, url_filter: Optional[str] = None, method_filter: Optional[str] = None) -> Dict[str, Any]:
        """Monitor network requests for a specified duration (blocking)."""
        # Start monitoring
        start_result = self._start_monitoring(url_filter, method_filter)
        if "error" in start_result:
            return start_result
        
        # Wait for specified duration
        time.sleep(duration)
        
        # Get results
        result = self._get_requests()
        
        # Stop monitoring
        self._stop_monitoring()
        
        return result
    
    def _get_requests(self) -> Dict[str, Any]:
        """Get all captured network requests."""
        return {
            "output": f"Retrieved {len(self._captured_requests)} captured requests",
            "requests": self._captured_requests
        }
    
    def _clear_requests(self) -> Dict[str, Any]:
        """Clear all captured network requests."""
        count = len(self._captured_requests)
        self._captured_requests.clear()
        return {"output": f"Cleared {count} captured requests"}
    
    def _stop_monitoring(self) -> Dict[str, Any]:
        """Stop network monitoring."""
        self._monitoring = False
        
        # Clean up the tab connection
        if self._monitoring_tab:
            try:
                self._monitoring_tab.Network.disable()
                time.sleep(0.1)
                self._monitoring_tab.stop()
                time.sleep(0.1)
            except Exception:
                pass
            self._monitoring_tab = None
        
        return {"output": "Network monitoring stopped"}
    
    async def __call__(self, **kwargs) -> ToolResult:
        action = kwargs.get("action", "")
        
        if not action:
            return ToolResult(error="Action parameter is required")
        
        try:
            if action == "start":
                duration = kwargs.get("duration", 30)
                url_filter = kwargs.get("url_filter")
                method_filter = kwargs.get("method_filter")
                
                result = self._monitor_network_requests(duration, url_filter, method_filter)
                
            elif action == "monitor_start":
                url_filter = kwargs.get("url_filter")
                method_filter = kwargs.get("method_filter")
                
                result = self._start_monitoring(url_filter, method_filter)
                
            elif action == "stop":
                result = self._stop_monitoring()
                
            elif action == "get_requests":
                result = self._get_requests()
                
            elif action == "clear":
                result = self._clear_requests()
                
            else:
                return ToolResult(error=f"Unknown action: {action}")
            
            if "error" in result:
                return ToolResult(error=result["error"])
            
            # Get filter keys for JSON filtering
            filter_keys = kwargs.get("filter_keys", [])
            
            # Format output for requests  
            output = result["output"]
            if "requests" in result and result["requests"]:
                output += "\n\nCaptured Requests:\n"
                for i, req in enumerate(result["requests"], 1):
                    output += f"{i}. [{req['method']}] {req['url']}\n"
                    if req.get('postData'):
                        body_data = req['postData']
                        
                        # If filter keys provided, extract specific data
                        if filter_keys:
                            try:
                                import json as json_module
                                parsed_body = json_module.loads(body_data)
                                filtered_data = {}
                                
                                for key_path in filter_keys:
                                    keys = key_path.split('.')
                                    current = parsed_body
                                    
                                    # Navigate to the key path
                                    for key in keys:
                                        if key.isdigit():
                                            current = current[int(key)]
                                        else:
                                            current = current.get(key, {})
                                    
                                    filtered_data[key_path] = current
                                
                                output += f"   Filtered Data: {json_module.dumps(filtered_data, indent=2)}\n"
                            except Exception as e:
                                output += f"   Error filtering data: {str(e)}\n"
                        else:
                            # Show full body if no filters
                            output += f"   Full Body: {body_data}\n"
            
            
            # If we have filtered data, add it as structured JSON to the output for the agent
            if "requests" in result and result["requests"] and filter_keys:
                for req in result["requests"]:
                    if req.get('postData'):
                        try:
                            import json as json_module
                            parsed_body = json_module.loads(req['postData'])
                            filtered_data = {}
                            
                            for key_path in filter_keys:
                                keys = key_path.split('.')
                                current = parsed_body
                                
                                # Navigate to the key path
                                for key in keys:
                                    if key.isdigit():
                                        current = current[int(key)]
                                    else:
                                        current = current.get(key, {})
                                
                                filtered_data[key_path] = current
                            
                            # Add structured data as JSON at the end of output for programmatic access
                            output += f"\n\n### STRUCTURED_DATA_START ###\n{json_module.dumps(filtered_data, indent=2)}\n### STRUCTURED_DATA_END ###\n"
                            break
                        except Exception:
                            pass
            
            return ToolResult(output=output)
            
        except Exception as e:
            return ToolResult(error=f"Network inspection failed: {str(e)}")


# Global instance for reuse
inspect_network = NetworkInspectorTool()