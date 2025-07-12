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
            "description": "Capture network requests from a website. Automatically starts monitoring when you visit a site and shows you the requests.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "url_filter": {
                        "type": "string",
                        "description": "Only show requests containing this text (e.g. 'analytics', 'track', 'api')"
                    },
                    "filter_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Show only specific data from request body (e.g. ['events.analytics', 'user.id'])"
                    }
                },
                "required": []
            }
        }
    
    def __init__(self):
        super().__init__()
        self._captured_requests = []
        self._monitoring = False
        self._monitoring_tab = None
        self._url_filter = None
        self._method_filter = None
    
    def _get_chromium_browser(self) -> Optional[pychrome.Browser]:
        """Get Chromium browser instance."""
        try:
            browser = pychrome.Browser(url="http://localhost:9222")
            return browser
        except Exception:
            return None
    
    def _start_monitoring(self, url_filter: Optional[str] = None, method_filter: Optional[str] = None) -> Dict[str, Any]:
        """Start network monitoring without blocking."""
        browser = self._get_chromium_browser()
        if not browser:
            return {"error": "Chromium remote debugging not available. Ensure Chromium is running with --remote-debugging-port=9222"}
        
        try:
            # Get the first tab
            tabs = browser.list_tab()
            if not tabs:
                return {"error": "No Chromium tabs available"}
            
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
        import datetime
        return {
            "output": f"Retrieved {len(self._captured_requests)} captured requests",
            "requests": self._captured_requests,
            "timestamp": datetime.datetime.now().isoformat()
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
        """Simple interface: just capture and return network requests with optional filters."""
        try:
            url_filter = kwargs.get("url_filter")
            filter_keys = kwargs.get("filter_keys", [])
            
            # If monitoring isn't running, start it
            if not self._monitoring:
                start_result = self._start_monitoring(url_filter, None)
                if "error" in start_result:
                    return ToolResult(error=start_result["error"])
                
                # Wait a moment for requests to be captured
                import asyncio
                await asyncio.sleep(2)
            
            # Get all captured requests
            result = self._get_requests()
            if "error" in result:
                return ToolResult(error=result["error"])
            
            # Find the LAST request matching the filter
            matching_requests = []
            if "requests" in result and result["requests"]:
                for req in result["requests"]:
                    # Apply URL filter if provided
                    if url_filter and url_filter.lower() not in req.get('url', '').lower():
                        continue
                    matching_requests.append(req)
            
            if not matching_requests:
                return ToolResult(output=f"No network requests found matching filter: {url_filter or 'any'}")
            
            # Get the LAST (most recent) matching request
            last_request = matching_requests[-1]
            
            # Format output for the last matching request
            output = f"Found {len(matching_requests)} matching requests. Showing the most recent:\n\n"
            output += f"[{last_request['method']}] {last_request['url']}\n"
            
            # Extract filtered data if filter_keys provided
            filtered_data = None
            if filter_keys and last_request.get('postData'):
                try:
                    import json as json_module
                    parsed_body = json_module.loads(last_request['postData'])
                    filtered_data = {}
                    
                    for key_path in filter_keys:
                        keys = key_path.split('.')
                        current = parsed_body
                        
                        # Navigate to the key path
                        for key in keys:
                            if current is None:
                                break
                            if isinstance(current, list):
                                if key.isdigit():
                                    idx = int(key)
                                    current = current[idx] if idx < len(current) else None
                                else:
                                    # For lists, look in first item if it's a dict
                                    current = current[0].get(key, {}) if current and isinstance(current[0], dict) else None
                            elif isinstance(current, dict):
                                current = current.get(key, {})
                            else:
                                current = None
                                break
                        
                        filtered_data[key_path] = current
                    
                    output += f"\nFiltered Data:\n{json_module.dumps(filtered_data, indent=2)}\n"
                except Exception as e:
                    output += f"\nError extracting filtered data: {str(e)}\n"
                    filtered_data = None
            elif last_request.get('postData'):
                # Show full body if no filter keys
                output += f"\nRequest Body:\n{last_request['postData']}\n"
            
            # Create a copy of the request for frontend with filtered data only
            import json as json_module
            frontend_request = {
                "requestId": last_request.get("requestId", ""),
                "url": last_request.get("url", ""),
                "method": last_request.get("method", ""),
                "headers": last_request.get("headers", {}),
                "timestamp": last_request.get("timestamp", "")
            }
            
            # Only include filtered data in postData, not the full request body
            if filtered_data:
                frontend_request["postData"] = json_module.dumps(filtered_data, indent=2)
            elif last_request.get('postData') and not filter_keys:
                # Only include full body if no filtering was requested
                frontend_request["postData"] = last_request['postData']
            
            # Add structured data for frontend inspector panel
            frontend_data = {
                "requests": [frontend_request],  # Only the filtered request data
                "operation": "capture",
                "timestamp": result.get("timestamp", ""),
                "url_filter": url_filter,
                "filter_keys": filter_keys,
                "total_matching": len(matching_requests)
            }
            
            # Add structured data markers for frontend parsing
            output += f"\n\n<inspector>\n{json_module.dumps(frontend_data, indent=2)}\n</inspector>\n"
            
            return ToolResult(output=output)
            
        except Exception as e:
            return ToolResult(error=f"Network inspection failed: {str(e)}")


# Global instance for reuse
inspect_network = NetworkInspectorTool()